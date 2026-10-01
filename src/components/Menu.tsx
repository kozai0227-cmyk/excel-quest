import { useState } from 'react'
import { useKeys } from '../game/keys'
import { ITEMS, ITEM_IDS } from '../data/items'
import { SKILLS } from '../data/skills'
import { expToNext, maxHp } from '../game/progress'
import { PLAYER_SPEC } from '../data/maps'
import { Portrait } from './Portrait'
import { EQUIP, SLOTS, SLOT_NAME, effectText, gearStats, type Slot } from '../data/equipment'
import type { GameState, ItemId } from '../game/types'
import { setInputMode, useInputMode } from '../game/inputMode'
import { VOLUME_MAX, jingle, setVolume, sfx, useVolume, type Volume } from '../game/sound'

const VOL_ROWS: [keyof Volume, string][] = [
  ['bgm', 'BGM'],
  ['sfx', '効果音'],
]

const CMDS = ['つよさ', 'そうび', 'スキル', 'どうぐ', 'にゅうりょく', '設定', 'セーブ', 'とじる'] as const

interface Props {
  gs: GameState
  setGs(f: (g: GameState) => GameState): void
  onSave(): void
  onClose(): void
}

export function Menu({ gs, setGs, onSave, onClose }: Props) {
  const [cursor, setCursor] = useState(0)
  const [open, setOpen] = useState<(typeof CMDS)[number] | null>(null)
  const [icur, setIcur] = useState(0)
  const [note, setNote] = useState('')
  const items = ITEM_IDS.filter((id) => gs.items[id] > 0)
  const [eqSlot, setEqSlot] = useState<Slot | null>(null)
  const [ecur, setEcur] = useState(0)
  const gear = gearStats(gs)
  const inputMode = useInputMode()
  const volume = useVolume()
  /** 選んだ部位に装備できるもの（最後は「はずす」） */
  const candidates = eqSlot ? [...gs.gear.filter((id) => EQUIP[id]?.slot === eqSlot), null] : []

  /** 部位を選ぶ（カーソルは いま装備しているものに合わせる） */
  const openSlot = (slot: Slot) => {
    const list = [...gs.gear.filter((id) => EQUIP[id]?.slot === slot), null]
    setEqSlot(slot)
    setEcur(Math.max(0, list.indexOf(gs.equip[slot] ?? null)))
    setNote('')
  }

  const equip = (slot: Slot, id: string | null) => {
    setGs((g) => ({ ...g, equip: { ...g.equip, [slot]: id ?? undefined } }))
    setNote(id ? `${EQUIP[id].name}を そうびした！` : `${SLOT_NAME[slot]}を はずした。`)
    setEqSlot(null)
  }

  const useItem = (id: ItemId) => {
    if (id !== 'herb') return setNote('それは 戦闘中に つかう どうぐだ。')
    if (gs.hp >= maxHp(gs.level)) return setNote('HPは まんたんだ。')
    setGs((g) => ({ ...g, hp: Math.min(maxHp(g.level), g.hp + 30), items: { ...g.items, herb: g.items.herb - 1 } }))
    setNote('やくそうを つかった！ HPが かいふくした。')
  }

  /** 音量を 変えて、効果音なら 新しい 大きさで 鳴らして みせる */
  const changeVolume = (kind: keyof Volume, v: number) => {
    setVolume(kind, v)
    setTimeout(() => sfx(kind === 'sfx' ? 'hit' : 'select'), 90)
  }

  const select = (i: number) => {
    const c = CMDS[i]
    setNote('')
    if (c === 'とじる') return onClose()
    if (c === 'にゅうりょく') {
      const m = inputMode === 'touch' ? 'keyboard' : 'touch'
      setInputMode(m)
      setNote(
        m === 'touch'
          ? 'ボタンで 答える（スマホ向け）に した。依頼は、Excel の 知識を 1つずつ 選んで 答える 形に なる。'
          : 'キーボードで 打つ（PC向け）に した。依頼は、Excel と 同じ 操作で 表を 直す 形に なる。',
      )
      return
    }
    if (c === 'セーブ') {
      onSave()
      jingle('save')
      setNote('ぼうけんの きろくを かきこんだ。')
      return
    }
    setOpen(c)
    setIcur(0)
  }

  useKeys((k) => {
    if (k === 'up' || k === 'down') sfx('cursor')
    else if (k === 'ok') sfx('select')
    else if (k === 'cancel') sfx('cancel')
    if (open === '設定') {
      if (k === 'up' || k === 'down') setIcur((c) => (c + 1) % VOL_ROWS.length)
      else if (k === 'left' || k === 'right') changeVolume(VOL_ROWS[icur][0], volume[VOL_ROWS[icur][0]] + (k === 'right' ? 1 : -1))
      else if (k === 'ok' || k === 'cancel') setOpen(null)
      return
    }
    if (open === 'そうび') {
      if (eqSlot) {
        const n = candidates.length
        if (k === 'up') setEcur((c) => (c + n - 1) % n)
        else if (k === 'down') setEcur((c) => (c + 1) % n)
        else if (k === 'ok') equip(eqSlot, candidates[ecur])
        else if (k === 'cancel') setEqSlot(null)
        return
      }
      if (k === 'up') setIcur((c) => (c + SLOTS.length - 1) % SLOTS.length)
      else if (k === 'down') setIcur((c) => (c + 1) % SLOTS.length)
      else if (k === 'ok') openSlot(SLOTS[icur])
      else if (k === 'cancel') setOpen(null)
      return
    }
    if (open === 'どうぐ' && items.length) {
      if (k === 'up') setIcur((c) => (c + items.length - 1) % items.length)
      else if (k === 'down') setIcur((c) => (c + 1) % items.length)
      else if (k === 'ok') useItem(items[icur])
      else if (k === 'cancel') setOpen(null)
      return
    }
    if (open) {
      if (k === 'cancel' || k === 'ok') setOpen(null)
      return
    }
    if (k === 'up') setCursor((c) => (c + CMDS.length - 1) % CMDS.length)
    else if (k === 'down') setCursor((c) => (c + 1) % CMDS.length)
    else if (k === 'ok') select(cursor)
    else if (k === 'cancel') onClose()
  })

  const next = expToNext(gs)
  return (
    <div className="menu-layer">
      <div className="win menu-cmds">
        {CMDS.map((c, i) => (
          <div key={c} className={`opt ${i === cursor ? 'on' : ''}`} onClick={() => { setCursor(i); select(i) }}>
            {c}
            {c === 'にゅうりょく' && <small>：{inputMode === 'touch' ? 'ボタン' : 'キーボード'}</small>}
          </div>
        ))}
      </div>
      {open && (
        <div className="win menu-panel">
          {open === 'つよさ' && (
            <div className="stats-wrap">
            <Portrait src={{ spec: PLAYER_SPEC }} className="portrait big" />
            <dl className="stats">
              <dt>なまえ</dt><dd>{gs.name}</dd>
              <dt>しょくぎょう</dt><dd>{gs.level >= 7 ? '関数つかい' : gs.level >= 4 ? 'セル見習い' : '新入社員'}</dd>
              <dt>レベル</dt><dd>{gs.level}</dd>
              <dt>HP</dt><dd>{gs.hp} / {maxHp(gs.level)}</dd>
              <dt>けいけんち</dt><dd>{gs.exp}{next !== null && `（次まで ${next}）`}</dd>
              <dt>ゴールド</dt><dd>{gs.gold} G</dd>
              <dt>攻撃力</dt><dd>+{gear.atk}</dd>
              <dt>守備力</dt><dd>+{gear.def}{gear.time > 0 && `（回答時間 +${gear.time}秒）`}</dd>
              <dt>解決した悩み</dt><dd>{gs.solved.length} 件</dd>
            </dl>
            </div>
          )}
          {open === 'そうび' &&
            (eqSlot ? (
              <ul className="item-list">
                <li className="eq-head">{SLOT_NAME[eqSlot]}を えらぶ</li>
                {candidates.map((id, i) => (
                  <li key={id ?? 'none'} className={`opt ${i === ecur ? 'on' : ''}`} onClick={() => equip(eqSlot, id)}>
                    <b>
                      {id ? EQUIP[id].name : 'はずす'}
                      {id && gs.equip[eqSlot] === id && '（そうび中）'}
                    </b>
                    {id && <span>{effectText(EQUIP[id])}　{EQUIP[id].desc}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="item-list">
                {SLOTS.map((slot, i) => {
                  const id = gs.equip[slot]
                  return (
                    <li key={slot} className={`opt ${i === icur ? 'on' : ''}`} onClick={() => { setIcur(i); openSlot(slot) }}>
                      <b>
                        {SLOT_NAME[slot]}：{id ? EQUIP[id].name : 'なし'}
                      </b>
                      {id && <span>{effectText(EQUIP[id])}</span>}
                    </li>
                  )
                })}
                <li className="eq-total">
                  攻撃力 +{gear.atk}　守備力 +{gear.def}
                  {gear.time > 0 && `　回答時間 +${gear.time}秒`}
                  {gear.crit > 0 && '　一発決裁↑'}
                </li>
              </ul>
            ))}
          {open === '設定' && (
            <div className="settings">
              <h4>サウンド</h4>
              {VOL_ROWS.map(([kind, label], i) => (
                <div key={kind} className={`vol-row ${i === icur ? 'on' : ''}`} onClick={() => setIcur(i)}>
                  <span className="vol-label">{label}</span>
                  <button type="button" className="vol-btn" data-nosfx onClick={() => changeVolume(kind, volume[kind] - 1)} aria-label={`${label}を 小さく`}>
                    ◀
                  </button>
                  <div className="vol-bar">
                    {Array.from({ length: VOLUME_MAX }, (_, n) => (
                      <span key={n} className={n < volume[kind] ? 'lit' : ''} onClick={() => changeVolume(kind, n + 1 === volume[kind] ? n : n + 1)} />
                    ))}
                  </div>
                  <button type="button" className="vol-btn" data-nosfx onClick={() => changeVolume(kind, volume[kind] + 1)} aria-label={`${label}を 大きく`}>
                    ▶
                  </button>
                  <span className="vol-num">{volume[kind] === 0 ? 'OFF' : volume[kind]}</span>
                </div>
              ))}
              <p className="muted vol-help">◀ ▶（← →キー）で 調整。0 に すると 消える。</p>
            </div>
          )}
          {open === 'スキル' &&
            (gs.skills.length ? (
              <ul className="skill-list">
                {gs.skills.map((id) => (
                  <li key={id}>
                    <b>{SKILLS[id].name}</b>
                    <span>{SKILLS[id].desc}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>まだ なにも おぼえていない。</p>
            ))}
          {open === 'どうぐ' &&
            (items.length ? (
              <ul className="item-list">
                {items.map((id, i) => (
                  <li key={id} className={`opt ${i === icur ? 'on' : ''}`} onClick={() => { setIcur(i); useItem(id) }}>
                    <b>{ITEMS[id].name} ×{gs.items[id]}</b>
                    <span>{ITEMS[id].desc}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>どうぐを もっていない。</p>
            ))}
          {note && <p className="note">{note}</p>}
        </div>
      )}
      {!open && note && <div className="win menu-panel"><p className="note">{note}</p></div>}
    </div>
  )
}
