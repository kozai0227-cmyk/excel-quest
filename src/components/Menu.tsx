import { useEffect, useState } from 'react'
import { useKeys } from '../game/keys'
import { ITEM_IDS, itemDesc, itemName } from '../data/items'
import { SKILLS } from '../data/skills'
import { expToNext, maxHp } from '../game/progress'
import { PLAYER_SPEC } from '../data/maps'
import { Portrait } from './Portrait'
import { EQUIP, SLOTS, effectText, equipDesc, equipName, gearStats, slotName, type Slot } from '../data/equipment'
import { isEn, langSwitchVisible, setLang, tr } from '../game/lang'
import type { GameState, ItemId } from '../game/types'
import { setInputMode, useInputMode } from '../game/inputMode'
import { isTouchDevice } from '../game/layout'
import { isNative } from '../game/native'
import { DocView } from './DocView'
import { totalPercent } from '../data/chapters'
import { FREE_CHAPTERS, openUnlock, useUnlockScreen, useUnlocked } from '../game/store'
import { VOLUME_MAX, jingle, setVolume, sfx, useVolume, type Volume } from '../game/sound'

const VOL_ROWS: [keyof Volume, () => string][] = [
  ['bgm', () => 'BGM'],
  ['sfx', () => tr('効果音', 'SFX')],
]

const ALL_CMDS = ['つよさ', 'そうび', 'スキル', 'どうぐ', 'ふくしゅう', 'にゅうりょく', '設定', 'セーブ', 'タイトルへ', 'とじる'] as const
type Cmd = (typeof ALL_CMDS)[number]
/** コマンドの 表示名（今の 言語） */
const CMD_LABEL: Record<Cmd, string> = {
  つよさ: 'Status',
  そうび: 'Equip',
  スキル: 'Skills',
  どうぐ: 'Items',
  ふくしゅう: 'Review',
  にゅうりょく: 'Input',
  設定: 'Settings',
  セーブ: 'Save',
  タイトルへ: 'Title',
  とじる: 'Close',
}
const cmdLabel = (c: Cmd) => tr(c, CMD_LABEL[c])
/** タイトルへ もどる ときの 選択肢 */
const TITLE_OPTS = () => [tr('セーブして もどる', 'Save and return'), tr('セーブせずに もどる', 'Return without saving'), tr('やめる', 'Cancel')]
/** 設定の 音量より 下の 行（言語は 切りかえを 出すときだけ） */
type SetRow = 'lang' | 'lic' | 'privacy' | 'unlock'
const setRows = (): SetRow[] => (langSwitchVisible() ? ['lang', 'lic', 'privacy', 'unlock'] : ['lic', 'privacy', 'unlock'])
/** iPhone アプリでは 入力方式の 切り替えを 出さない（ボタン入力 だけ） */
const CMDS = ALL_CMDS.filter((c) => !(isNative && c === 'にゅうりょく'))

interface Props {
  gs: GameState
  setGs(f: (g: GameState) => GameState): void
  onSave(): void
  onClose(): void
  /** ふくしゅうの書を ひらく */
  onReview(): void
  /** タイトル画面へ もどる */
  onTitle(): void
}

export function Menu({ gs, setGs, onSave, onClose, onReview, onTitle }: Props) {
  const [cursor, setCursor] = useState(0)
  const [open, setOpen] = useState<Cmd | null>(null)
  const [icur, setIcur] = useState(0)
  const [note, setNote] = useState('')
  const items = ITEM_IDS.filter((id) => gs.items[id] > 0)
  const [eqSlot, setEqSlot] = useState<Slot | null>(null)
  const [ecur, setEcur] = useState(0)
  const gear = gearStats(gs)
  const inputMode = useInputMode()
  const volume = useVolume()
  /** 設定：ライセンス表記を 開いているか（中身は public/licenses.txt） */
  const [lic, setLic] = useState<string | null>(null)
  const openLicenses = () => {
    setLic(tr('よみこみ中……', 'Loading...'))
    fetch('/licenses.txt')
      .then((r) => r.text())
      .then(setLic)
      .catch(() => setLic(tr('ライセンス表記を 読みこめませんでした。', 'Could not load the license notices.')))
  }
  /** 設定：プライバシーポリシーを 開いているか */
  const [privacy, setPrivacy] = useState(false)
  const unlocked = useUnlocked()
  const unlockOpen = useUnlockScreen()
  useEffect(() => {
    if (open !== '設定') {
      setLic(null)
      setPrivacy(false)
    }
  }, [open])
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
    setNote(id ? tr(`${EQUIP[id].name}を そうびした！`, `Equipped the ${equipName(id)}!`) : tr(`${slotName(slot)}を はずした。`, `Removed your ${slotName(slot).toLowerCase()}.`))
    setEqSlot(null)
  }

  const useItem = (id: ItemId) => {
    if (id !== 'herb') return setNote(tr('それは 戦闘中に つかう どうぐだ。', 'That item is for use in battle.'))
    if (gs.hp >= maxHp(gs.level)) return setNote(tr('HPは まんたんだ。', 'HP is already full.'))
    setGs((g) => ({ ...g, hp: Math.min(maxHp(g.level), g.hp + 30), items: { ...g.items, herb: g.items.herb - 1 } }))
    setNote(tr('やくそうを つかった！ HPが かいふくした。', 'Used a Herb! HP was restored.'))
  }

  /** 言語を 切りかえる（ページを 読みなおすので、先に セーブする） */
  const switchLang = () => {
    onSave()
    setLang(isEn() ? 'ja' : 'en')
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
    if (c === 'ふくしゅう') return onReview()
    if (c === 'にゅうりょく') {
      const m = inputMode === 'touch' ? 'keyboard' : 'touch'
      setInputMode(m)
      setNote(
        m === 'touch'
          ? tr(
              'ボタンで 答える（スマホ向け）に した。依頼は、表計算の 知識を 1つずつ 選んで 答える 形に なる。',
              'Switched to button answers (for phones). Requests will be solved by choosing spreadsheet steps one at a time.',
            )
          : tr(
              'キーボードで 打つ（PC向け）に した。依頼は、表計算ソフトと 同じ 操作で 表を 直す 形に なる。',
              'Switched to keyboard typing (for PCs). Requests will be solved by fixing the sheet just like in a real spreadsheet app.',
            ),
      )
      return
    }
    if (c === 'タイトルへ') {
      setOpen(c)
      setIcur(0)
      return
    }
    if (c === 'セーブ') {
      onSave()
      jingle('save')
      setNote(tr('旅の 記録を 書きのこした。', 'Your journey has been recorded.'))
      return
    }
    setOpen(c)
    setIcur(0)
  }

  /** タイトルへ：0 セーブして もどる　1 セーブせずに もどる　2 やめる */
  const toTitle = (i: number) => {
    if (i === 2) return setOpen(null)
    if (i === 0) onSave()
    onTitle()
  }

  useKeys((k) => {
    // 購入画面は それ自身で キーを 受ける
    if (unlockOpen) return
    if (k === 'up' || k === 'down') sfx('cursor')
    else if (k === 'ok') sfx('select')
    else if (k === 'cancel') sfx('cancel')
    if (open === '設定') {
      // 行：BGM・効果音・（言語）・ライセンス表記・プライバシーポリシー・全章解放
      const rows = VOL_ROWS.length + setRows().length
      const row = setRows()[icur - VOL_ROWS.length]
      if (lic !== null || privacy) {
        if (k === 'ok' || k === 'cancel') {
          setLic(null)
          setPrivacy(false)
        }
        return
      }
      if (k === 'up') setIcur((c) => (c + rows - 1) % rows)
      else if (k === 'down') setIcur((c) => (c + 1) % rows)
      else if ((k === 'left' || k === 'right') && icur < VOL_ROWS.length) changeVolume(VOL_ROWS[icur][0], volume[VOL_ROWS[icur][0]] + (k === 'right' ? 1 : -1))
      else if ((k === 'ok' || k === 'left' || k === 'right') && row === 'lang') switchLang()
      else if (k === 'ok' && row === 'lic') openLicenses()
      else if (k === 'ok' && row === 'privacy') setPrivacy(true)
      else if (k === 'ok' && row === 'unlock') openUnlock()
      else if (k === 'ok' || k === 'cancel') setOpen(null)
      return
    }
    if (open === 'タイトルへ') {
      const n = TITLE_OPTS().length
      if (k === 'up') setIcur((c) => (c + n - 1) % n)
      else if (k === 'down') setIcur((c) => (c + 1) % n)
      else if (k === 'ok') toTitle(icur)
      else if (k === 'cancel') setOpen(null)
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
            {cmdLabel(c)}
            {c === 'にゅうりょく' && <small>{tr('：', ': ')}{inputMode === 'touch' ? tr('ボタン', 'Buttons') : tr('キーボード', 'Keyboard')}</small>}
          </div>
        ))}
      </div>
      {open && (
        <div className="win menu-panel">
          {open === 'つよさ' && (
            <div className="stats-wrap">
            <Portrait src={{ spec: PLAYER_SPEC }} className="portrait big" />
            <dl className="stats">
              <dt>{tr('なまえ', 'Name')}</dt><dd>{gs.name}</dd>
              <dt>{tr('しょくぎょう', 'Job')}</dt>
              <dd>{gs.level >= 7 ? tr('関数つかい', 'Function Wielder') : gs.level >= 4 ? tr('セル見習い', 'Cell Apprentice') : tr('新入社員', 'New Hire')}</dd>
              <dt>{tr('レベル', 'Level')}</dt><dd>{gs.level}</dd>
              <dt>HP</dt><dd>{gs.hp} / {maxHp(gs.level)}</dd>
              <dt>{tr('けいけんち', 'EXP')}</dt><dd>{gs.exp}{next !== null && tr(`（次まで ${next}）`, ` (${next} to next)`)}</dd>
              <dt>{tr('ゴールド', 'Gold')}</dt><dd>{gs.gold} G</dd>
              <dt>{tr('攻撃力', 'Attack')}</dt><dd>+{gear.atk}</dd>
              <dt>{tr('守備力', 'Defense')}</dt><dd>+{gear.def}{gear.time > 0 && tr(`（回答時間 +${gear.time}秒）`, ` (answer time +${gear.time}s)`)}</dd>
              <dt>{tr('解決した悩み', 'Requests')}</dt><dd>{tr(`${gs.solved.length} 件`, `${gs.solved.length} solved`)}</dd>
              <dt>{tr('達成率', 'Completion')}</dt><dd>{totalPercent(gs)}%</dd>
            </dl>
            </div>
          )}
          {open === 'そうび' &&
            (eqSlot ? (
              <ul className="item-list">
                <li className="eq-head">{tr(`${slotName(eqSlot)}を えらぶ`, `Choose a ${slotName(eqSlot).toLowerCase()}`)}</li>
                {candidates.map((id, i) => (
                  <li key={id ?? 'none'} className={`opt ${i === ecur ? 'on' : ''}`} onClick={() => equip(eqSlot, id)}>
                    <b>
                      {id ? equipName(id) : tr('はずす', 'Remove')}
                      {id && gs.equip[eqSlot] === id && tr('（そうび中）', ' (equipped)')}
                    </b>
                    {id && <span>{effectText(EQUIP[id])}　{equipDesc(id)}</span>}
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
                        {slotName(slot)}{tr('：', ': ')}{id ? equipName(id) : tr('なし', 'none')}
                      </b>
                      {id && <span>{effectText(EQUIP[id])}</span>}
                    </li>
                  )
                })}
                <li className="eq-total">
                  {tr('攻撃力', 'ATK')} +{gear.atk}　{tr('守備力', 'DEF')} +{gear.def}
                  {gear.time > 0 && tr(`　回答時間 +${gear.time}秒`, `　Time +${gear.time}s`)}
                  {gear.crit > 0 && tr('　一発決裁↑', '　Crit↑')}
                </li>
              </ul>
            ))}
          {open === '設定' && (
            <div className="settings">
              <h4>{tr('サウンド', 'Sound')}</h4>
              {VOL_ROWS.map(([kind, labelOf], i) => {
                const label = labelOf()
                return (
                <div key={kind} className={`vol-row ${i === icur ? 'on' : ''}`} onClick={() => setIcur(i)}>
                  <span className="vol-label">{label}</span>
                  <button type="button" className="vol-btn" data-nosfx onClick={() => changeVolume(kind, volume[kind] - 1)} aria-label={tr(`${label}を 小さく`, `${label} down`)}>
                    ◀
                  </button>
                  <div className="vol-bar">
                    {Array.from({ length: VOLUME_MAX }, (_, n) => (
                      <span key={n} className={n < volume[kind] ? 'lit' : ''} onClick={() => changeVolume(kind, n + 1 === volume[kind] ? n : n + 1)} />
                    ))}
                  </div>
                  <button type="button" className="vol-btn" data-nosfx onClick={() => changeVolume(kind, volume[kind] + 1)} aria-label={tr(`${label}を 大きく`, `${label} up`)}>
                    ▶
                  </button>
                  <span className="vol-num">{volume[kind] === 0 ? 'OFF' : volume[kind]}</span>
                </div>
                )
              })}
              <p className="muted vol-help">
                {isTouchDevice ? tr('◀ ▶ で 調整。', 'Adjust with ◀ ▶. ') : tr('◀ ▶（← →キー）で 調整。', 'Adjust with ◀ ▶ (← → keys). ')}
                {tr('0 に すると 消える。', '0 turns it off.')}
              </p>
              {setRows().map((row, j) => {
                const i = VOL_ROWS.length + j
                const on = icur === i ? 'on' : ''
                const pick = (f: () => void) => () => {
                  setIcur(i)
                  f()
                }
                if (row === 'lang')
                  return (
                    <div key={row}>
                      <h4>{tr('言語', 'Language')}</h4>
                      <div className={`opt lic-row ${on}`} onClick={pick(switchLang)}>
                        🌐 {isEn() ? 'English' : '日本語'}
                        <small>{tr('：選ぶと セーブして English に', ': select to save and switch to 日本語')}</small>
                      </div>
                    </div>
                  )
                if (row === 'lic')
                  return (
                    <div key={row}>
                      <h4>{tr('そのほか', 'Other')}</h4>
                      <div className={`opt lic-row ${on}`} onClick={pick(openLicenses)}>
                        {tr('ライセンス表記', 'License Notices')}
                      </div>
                    </div>
                  )
                if (row === 'privacy')
                  return (
                    <div key={row} className={`opt lic-row ${on}`} onClick={pick(() => setPrivacy(true))}>
                      {tr('プライバシーポリシー', 'Privacy Policy')}
                    </div>
                  )
                return (
                  <div key={row} className={`opt lic-row ${on}`} onClick={pick(openUnlock)}>
                    {tr('全章解放', 'Unlock All Chapters')}
                    <small>
                      {tr('：', ': ')}
                      {!isNative
                        ? unlocked
                          ? tr('Web版は 全章 遊べます', 'all open on the web')
                          : tr('アプリ版で 遊べます', 'in the iPhone app')
                        : unlocked
                          ? tr('購入ずみ', 'purchased')
                          : tr(`購入・復元（第${FREE_CHAPTERS + 1}章〜）`, `buy / restore (Ch. ${FREE_CHAPTERS + 1}+)`)}
                    </small>
                  </div>
                )
              })}
              {privacy && <DocView src={tr('/privacy.html', '/privacy.html#en')} title={tr('プライバシーポリシー', 'Privacy Policy')} onClose={() => setPrivacy(false)} />}
              {lic !== null && <DocView text={lic} title={tr('ライセンス表記', 'License Notices')} onClose={() => setLic(null)} />}
            </div>
          )}
          {open === 'タイトルへ' && (
            <div className="to-title">
              <p>{tr('タイトル画面に もどりますか？', 'Return to the title screen?')}</p>
              <p className="muted">{tr('セーブせずに もどると、最後に セーブした ところから 続きに なります。', "If you return without saving, you'll continue from your last save.")}</p>
              <ul className="item-list">
                {TITLE_OPTS().map((o, i) => (
                  <li key={o} className={`opt ${i === icur ? 'on' : ''}`} onClick={() => { setIcur(i); toTitle(i) }}>
                    <b>{o}</b>
                  </li>
                ))}
              </ul>
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
              <p>{tr('まだ なにも おぼえていない。', "You haven't learned anything yet.")}</p>
            ))}
          {open === 'どうぐ' &&
            (items.length ? (
              <ul className="item-list">
                {items.map((id, i) => (
                  <li key={id} className={`opt ${i === icur ? 'on' : ''}`} onClick={() => { setIcur(i); useItem(id) }}>
                    <b>{itemName(id)} ×{gs.items[id]}</b>
                    <span>{itemDesc(id)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{tr('どうぐを もっていない。', 'You have no items.')}</p>
            ))}
          {note && <p className="note">{note}</p>}
        </div>
      )}
      {!open && note && <div className="win menu-panel"><p className="note">{note}</p></div>}
    </div>
  )
}
