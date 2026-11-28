import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import './MenuSheet.css'
import { useKeys } from '../game/keys'
import { ITEM_IDS, itemName } from '../data/items'
import { ItemPanel, type ItemFx } from './ItemPanel'
import { LEVEL_EXP, expToNext, maxHp } from '../game/progress'
import { EQUIP, SLOTS, equipName, slotName, type Slot } from '../data/equipment'
import { isEn, langSwitchVisible, setLang, tr } from '../game/lang'
import type { GameState, ItemId } from '../game/types'
import { setInputMode, useInputMode } from '../game/inputMode'
import { usePhoneLayout } from '../game/layout'
import { isNative } from '../game/native'
import { DocView } from './DocView'
import { EquipPanel, slotChoices } from './EquipPanel'
import { SkillBook } from './SkillBook'
import { StatusPanel } from './StatusPanel'
import { SettingsPanel, type SetRow } from './SettingsPanel'
import { chapterTag, totalPercent } from '../data/chapters'
import { PLAYER_SPEC, mapName } from '../data/maps'
import { Portrait } from './Portrait'
import { chapterOf } from './AreaBanner'
import { getStreak } from '../game/streak'
import { FREE_CHAPTERS, openUnlock, useUnlockScreen, useUnlocked } from '../game/store'
import { jingle, setVolume, sfx, useVolume, type Volume } from '../game/sound'

const VOL_ROWS: [keyof Volume, () => string][] = [
  ['bgm', () => 'BGM'],
  ['sfx', () => tr('効果音', 'SFX')],
]

const ALL_CMDS = ['つよさ', 'そうび', 'スキル', 'どうぐ', 'たび', 'ふくしゅう', 'にゅうりょく', '設定', 'セーブ', 'タイトルへ', 'とじる'] as const
type Cmd = (typeof ALL_CMDS)[number]
/** コマンドの 表示名（今の 言語） */
const CMD_LABEL: Record<Cmd, string> = {
  つよさ: 'Status',
  そうび: 'Equip',
  スキル: 'Skills',
  どうぐ: 'Items',
  たび: 'Travel',
  ふくしゅう: 'Review',
  にゅうりょく: 'Input',
  設定: 'Settings',
  セーブ: 'Save',
  タイトルへ: 'Title',
  とじる: 'Close',
}
const cmdLabel = (c: Cmd) => tr(c, CMD_LABEL[c])
/** コマンドの 絵（タイルの 丸に 出す） */
const CMD_ICON: Record<Cmd, string> = {
  つよさ: '📊',
  そうび: '🛡️',
  スキル: '✨',
  どうぐ: '🎒',
  たび: '🗺️',
  ふくしゅう: '📖',
  にゅうりょく: '⌨️',
  設定: '⚙️',
  セーブ: '💾',
  タイトルへ: '🏠',
  とじる: '✕',
}
/** 大きな タイルで 出す よく使う コマンド（残りは 下の 小さな タイル、とじるは いちばん下） */
const MAIN_CMDS: readonly Cmd[] = ['つよさ', 'そうび', 'スキル', 'どうぐ', 'たび', 'ふくしゅう']
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))
/** タイトルへ もどる ときの 選択肢 */
const TITLE_OPTS = () => [tr('セーブして もどる', 'Save and return'), tr('セーブせずに もどる', 'Return without saving'), tr('やめる', 'Cancel')]
/** 設定の 音量より 下の 行（言語は 切りかえを 出すときだけ） */
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
  /** 旅の地図を ひらく */
  onTravel(): void
  /** タイトル画面へ もどる */
  onTitle(): void
}

export function Menu({ gs, setGs, onSave, onClose, onReview, onTravel, onTitle }: Props) {
  const [cursor, setCursor] = useState(0)
  const phone = usePhoneLayout()
  /** タイルの 並び（行ごとの CMDS の 番号）。スマホは 3列＋小さな 列、PC は 2列 */
  const idx = (cs: readonly Cmd[]) => cs.filter((c) => CMDS.includes(c)).map((c) => CMDS.indexOf(c))
  const subCmds = CMDS.filter((c) => !MAIN_CMDS.includes(c) && c !== 'とじる')
  const rows = [...chunk(idx(MAIN_CMDS), phone ? 3 : 2), ...chunk(idx(subCmds), phone ? subCmds.length : 2), idx(['とじる'])]
  /** 押した タイルを 一瞬 光らせる（セーブなどの 手ごたえ） */
  const [flash, setFlash] = useState<{ i: number; n: number } | null>(null)
  // キーボード・十字ボタンで 動かした ときだけ カーソル枠を 出す（指で 押す ときは じゃまに なる）
  const [keyed, setKeyed] = useState(false)
  const [open, setOpen] = useState<Cmd | null>(null)
  const [icur, setIcur] = useState(0)
  const [note, setNote] = useState('')
  const items = ITEM_IDS.filter((id) => gs.items[id] > 0)
  const [eqSlot, setEqSlot] = useState<Slot | null>(null)
  const [ecur, setEcur] = useState(0)
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
  const candidates = eqSlot ? slotChoices(gs, eqSlot) : []
  /** 最後に そうびを 変えた 部位（カードを ポンと はねさせる） */
  const [lastEq, setLastEq] = useState<{ slot: Slot; n: number } | null>(null)

  /** 部位を選ぶ（カーソルは いま装備しているものに合わせる） */
  const openSlot = (slot: Slot) => {
    const list = slotChoices(gs, slot)
    if (!list.length) return setNote(tr(`${slotName(slot)}は まだ 持っていない。お店で さがそう。`, `You don't own a ${slotName(slot).toLowerCase()} yet. Check the shops.`))
    setEqSlot(slot)
    setEcur(Math.max(0, list.indexOf(gs.equip[slot] ?? null)))
    setNote('')
  }

  const equip = (slot: Slot, id: string | null) => {
    if (id && gs.equip[slot] === id) {
      // もう 着けている ものは そのまま もどる
      sfx('cancel')
      setNote('')
      return setEqSlot(null)
    }
    sfx(id ? 'guard' : 'cancel')
    setLastEq({ slot, n: Date.now() })
    setGs((g) => ({ ...g, equip: { ...g.equip, [slot]: id ?? undefined } }))
    setNote(id ? tr(`${EQUIP[id].name}を そうびした！`, `Equipped the ${equipName(id)}!`) : tr(`${slotName(slot)}を はずした。`, `Removed your ${slotName(slot).toLowerCase()}.`))
    setEqSlot(null)
  }

  /** どうぐを 使った ときの 手ごたえ（HP カードが 光る・カードが ゆれる） */
  const [itemFx, setItemFx] = useState<ItemFx | null>(null)
  const useItem = (id: ItemId) => {
    const fx = (kind: ItemFx['kind'], heal?: number) => setItemFx({ id, kind, heal, n: Date.now() })
    if (!gs.items[id]) {
      sfx('cancel')
      fx('none')
      return setNote(tr(`${itemName(id)}は 持っていない。町の 道具屋で 買えるよ。`, `You don't have any ${itemName(id)}. Item shops in town sell them.`))
    }
    if (id !== 'herb') {
      sfx('cancel')
      fx('battle')
      return setNote(tr('それは 戦闘中に つかう どうぐだ。戦闘で「どうぐ」を えらぼう。', 'That item is for use in battle. Choose "Items" during a fight.'))
    }
    const hpMax = maxHp(gs.level)
    if (gs.hp >= hpMax) {
      sfx('cancel')
      fx('full')
      return setNote(tr('HPは まんたんだ。', 'HP is already full.'))
    }
    const heal = Math.min(30, hpMax - gs.hp)
    sfx('heal')
    fx('heal', heal)
    setGs((g) => ({ ...g, hp: Math.min(maxHp(g.level), g.hp + 30), items: { ...g.items, herb: g.items.herb - 1 } }))
    setNote(tr(`やくそうを つかった！ HPが ${heal} かいふくした。`, `Used a Herb! Recovered ${heal} HP.`))
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
    setFlash((f) => ({ i, n: (f?.n ?? 0) + 1 }))
    if (c === 'とじる') return onClose()
    if (c === 'ふくしゅう') return onReview()
    if (c === 'たび') {
      if (!gs.flags.visit_celuno) return setNote(tr('まずは 森を 抜けて、人の いる 村を 目指そう。', "First, get through the forest and find a village."))
      return onTravel()
    }
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
    setItemFx(null)
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
      if (k === 'up' || k === 'down' || k === 'left' || k === 'right') setKeyed(true)
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
      if (k === 'up' || k === 'down') setKeyed(true)
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
    if (open === 'どうぐ') {
      const n = ITEM_IDS.length
      if (k === 'up' || k === 'down') setKeyed(true)
      if (k === 'up') setIcur((c) => (c + n - 1) % n)
      else if (k === 'down') setIcur((c) => (c + 1) % n)
      else if (k === 'ok') useItem(ITEM_IDS[icur])
      else if (k === 'cancel') setOpen(null)
      return
    }
    if (open === 'スキル' && (k === 'up' || k === 'down')) {
      // 図鑑は 長いので 上下で スクロール
      document.querySelector('.menu-panel.is-book')?.scrollBy({ top: k === 'down' ? 120 : -120, behavior: 'smooth' })
      return
    }
    if (open) {
      if (k === 'cancel' || k === 'ok') setOpen(null)
      return
    }
    if (k !== 'ok' && k !== 'cancel') setKeyed(true)
    if (k === 'left' || k === 'right') {
      sfx('cursor')
      setCursor((c) => (c + CMDS.length + (k === 'right' ? 1 : -1)) % CMDS.length)
    } else if (k === 'up' || k === 'down') {
      // 上下は 行を またいで、横の 位置が 近い タイルへ
      setCursor((c) => {
        const r = rows.findIndex((row) => row.includes(c))
        const pos = (rows[r].indexOf(c) + 0.5) / rows[r].length
        const to = rows[(r + rows.length + (k === 'down' ? 1 : -1)) % rows.length]
        return to[Math.min(to.length - 1, Math.floor(pos * to.length))]
      })
    } else if (k === 'ok') select(cursor)
    else if (k === 'cancel') onClose()
  })

  /** スマホ：シートの 取っ手を 下へ 引くと とじる（指に ついて くる） */
  const drag = useRef<{ y: number; id: number } | null>(null)
  const [pull, setPull] = useState(0)
  const onGrabDown = (e: RPointerEvent<HTMLDivElement>) => {
    drag.current = { y: e.clientY, id: e.pointerId }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onGrabMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return
    setPull(Math.max(0, e.clientY - drag.current.y))
  }
  const onGrabUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return
    const dy = e.clientY - drag.current.y
    drag.current = null
    setPull(0)
    if (dy > 70) {
      sfx('cancel')
      onClose()
    }
  }
  /** シートの 外（暗い ところ）を 押す：開いている 画面を とじる か、メニューを とじる */
  const onScrim = () => {
    sfx('cancel')
    if (open) {
      setEqSlot(null)
      setOpen(null)
      setNote('')
    } else onClose()
  }

  return (
    <div className={`menu-layer${open ? ' has-panel' : ''}`}>
      <div className="menu-scrim" onClick={onScrim} aria-hidden />
      <div className={`win menu-cmds${pull ? ' pulling' : ''}`} style={pull ? { transform: `translateY(${pull}px)` } : undefined}>
        {phone && (
          <div className="ms-grab" onPointerDown={onGrabDown} onPointerMove={onGrabMove} onPointerUp={onGrabUp} onPointerCancel={onGrabUp} aria-hidden>
            <span />
          </div>
        )}
        <MenuStatus gs={gs} />
        <div className={`menu-grid ${keyed || inputMode === 'keyboard' ? 'ring' : ''}`} role="menu">
          {rows.map((row, r) => (
            <div key={r} style={{ animationDelay: `${r * 40}ms` }} className={`mg-row ${r === rows.length - 1 ? 'close' : CMDS[row[0]] && MAIN_CMDS.includes(CMDS[row[0]]) ? 'main' : 'sub'}`}>
              {row.map((i) => {
                const c = CMDS[i]
                const sub = c === 'にゅうりょく' ? (inputMode === 'touch' ? tr('ボタン', 'Buttons') : tr('キーボード', 'Keyboard')) : null
                const count = c === 'どうぐ' ? items.reduce((n, id) => n + gs.items[id], 0) : c === 'スキル' ? gs.skills.length : 0
                return (
                  <button
                    key={c}
                    type="button"
                    role="menuitem"
                    data-nosfx
                    className={`mg-tile t-${i} ${i === cursor ? 'on' : ''} ${open === c ? 'open' : ''} ${flash?.i === i ? `flash-${flash.n % 2}` : ''}`}
                    onClick={() => {
                      sfx(c === 'とじる' ? 'cancel' : 'select')
                      setKeyed(false)
                      setCursor(i)
                      select(i)
                    }}
                  >
                    <span className="mg-icon" aria-hidden>
                      {c === 'にゅうりょく' && inputMode === 'touch' ? '📱' : CMD_ICON[c]}
                    </span>
                    <span className="mg-label">{cmdLabel(c)}</span>
                    {sub && <small className="mg-sub">{sub}</small>}
                    {count > 0 && <span className="mg-badge">{count}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {open && (
        <div className={`win menu-panel ${open === 'そうび' || open === 'どうぐ' || open === 'つよさ' || open === '設定' ? 'tall' : ''} ${open === 'スキル' ? 'is-book' : ''}`}>
          {open === 'つよさ' && (
            <StatusPanel
              gs={gs}
              onJump={(to) => {
                sfx('select')
                select(CMDS.indexOf(to))
              }}
            />
          )}
          {open === 'そうび' && (
            <EquipPanel
              gs={gs}
              slot={eqSlot}
              cur={eqSlot ? ecur : icur}
              ring={keyed || inputMode === 'keyboard'}
              last={lastEq}
              onSlot={(i) => {
                sfx('select')
                setKeyed(false)
                setIcur(i)
                openSlot(SLOTS[i])
              }}
              onEquip={(slot, id) => {
                setKeyed(false)
                equip(slot, id)
              }}
              onBack={() => {
                sfx('cancel')
                setEqSlot(null)
              }}
            />
          )}
          {open === '設定' && (
            <>
              <SettingsPanel
                volume={volume}
                volRows={VOL_ROWS}
                rows={setRows()}
                cur={icur}
                ring={keyed || inputMode === 'keyboard'}
                unlocked={unlocked}
                freeChapters={FREE_CHAPTERS}
                onPick={(i) => {
                  setKeyed(false)
                  setIcur(i)
                }}
                onVolume={changeVolume}
                onLang={switchLang}
                onLicenses={openLicenses}
                onPrivacy={() => setPrivacy(true)}
                onUnlock={openUnlock}
              />
              {privacy && <DocView src={tr('/privacy.html', '/privacy.html#en')} title={tr('プライバシーポリシー', 'Privacy Policy')} onClose={() => setPrivacy(false)} />}
              {lic !== null && <DocView text={lic} title={tr('ライセンス表記', 'License Notices')} onClose={() => setLic(null)} />}
            </>
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
          {open === 'スキル' && <SkillBook gs={gs} onClose={() => setOpen(null)} />}
          {open === 'どうぐ' && (
            <ItemPanel
              gs={gs}
              cur={icur}
              ring={keyed || inputMode === 'keyboard'}
              fx={itemFx}
              onUse={(i) => {
                setKeyed(false)
                setIcur(i)
                useItem(ITEM_IDS[i])
              }}
            />
          )}
          {note && <p className="note">{note}</p>}
        </div>
      )}
      {!open && note && <div className="win menu-panel"><p className="note">{note}</p></div>}
    </div>
  )
}

/** 状態カードの 顔（毎回 同じ ものを わたして 描きなおしを 防ぐ） */
const FACE = { spec: PLAYER_SPEC }

/** メニュー上部の プロフィールカード：顔・Lv・名前・いる場所・所持金、HP と 経験値の バー、達成率の 輪と 連続日数 */
function MenuStatus({ gs }: { gs: GameState }) {
  const hpMax = maxHp(gs.level)
  const base = LEVEL_EXP[gs.level] ?? 0
  const next = LEVEL_EXP[gs.level + 1]
  const expRate = next === undefined ? 1 : Math.min(1, Math.max(0, (gs.exp - base) / (next - base)))
  const toNext = expToNext(gs)
  const hpRate = Math.min(1, gs.hp / hpMax)
  const pct = totalPercent(gs)
  const ch = chapterOf(gs.mapId)
  const place = mapName(gs.mapId)
  const streak = getStreak()
  return (
    <div className={`menu-status${hpRate <= 0.3 ? ' low' : ''}`} aria-label={tr('いまの 状態', 'Current status')}>
      <div className="ms-top">
        <span className="ms-face" aria-hidden>
          <Portrait src={FACE} className="portrait ms-portrait" />
          <span className="ms-lv">
            <small>Lv</small>
            {gs.level}
          </span>
        </span>
        <span className="ms-who">
          <span className="ms-namerow">
            <b className="ms-name">{gs.name}</b>
            <span className="ms-gold" title={tr('所持金', 'Gold')}>
              <i className="ms-coin" aria-hidden />
              {gs.gold}
              <small>G</small>
            </span>
          </span>
          {place && (
            <span className="ms-place">
              {ch && <i>{chapterTag(ch)}</i>}
              <span>{place}</span>
            </span>
          )}
        </span>
      </div>
      <div className="ms-bars">
        <div className="ms-row">
          <span className="ms-key">HP</span>
          <div className={`ms-bar hp ${hpRate <= 0.3 ? 'low' : ''}`}>
            <div style={{ width: `${hpRate * 100}%` }} />
          </div>
          <span className="ms-val">
            {gs.hp}
            <small>/{hpMax}</small>
          </span>
        </div>
        <div className="ms-row">
          <span className="ms-key">EXP</span>
          <div className="ms-bar exp">
            <div style={{ width: `${expRate * 100}%` }} />
          </div>
          <span className="ms-val">{toNext === null ? 'MAX' : tr(`あと${toNext}`, `${toNext} to go`)}</span>
        </div>
      </div>
      <div className="ms-chips">
        <span className="ms-chip pct">
          <span className="ms-ring" style={{ ['--p' as string]: `${pct}` }} aria-hidden />
          <span>
            {tr('冒険の 達成率', 'Adventure')} <b>{pct}%</b>
          </span>
        </span>
        <span className={`ms-chip streak${streak.today ? ' today' : streak.count ? '' : ' none'}`}>
          <span className="ms-fire" aria-hidden>
            🔥
          </span>
          <span>
            {streak.count ? tr(`ふくしゅう ${streak.count}日 連続`, `${streak.count}-day review streak`) : tr('ふくしゅうで 連続記録', 'Start a review streak')}
          </span>
        </span>
      </div>
    </div>
  )
}
