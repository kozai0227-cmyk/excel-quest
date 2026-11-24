import { useEffect, useRef, useState } from 'react'
import { MAPS, mapName } from '../data/maps'
import { QUESTS } from '../data/quests'
import { SKILLS } from '../data/skills'
import { useKeys } from '../game/keys'
import { useInputMode } from '../game/inputMode'
import { sfx } from '../game/sound'
import { tr } from '../game/lang'
import { chapterAllowed, useUnlocked } from '../game/store'
import type { GameState } from '../game/types'

/** 旅の 行き先（町の 順は 物語の 順。どこからでも 選べる） */
export const TOWNS: { id: string; chapter: number; boss: string }[] = [
  { id: 'celuno', chapter: 1, boss: 'slime' },
  { id: 'calculet', chapter: 1, boss: 'golem' },
  { id: 'sansho', chapter: 2, boss: 'mirage' },
  { id: 'ifport', chapter: 3, boss: 'captain' },
  { id: 'lookup', chapter: 4, boss: 'mitsukaranu' },
  { id: 'pivoria', chapter: 5, boss: 'barabaran' },
  { id: 'textria', chapter: 6, boss: 'mojibake' },
  { id: 'koyomi', chapter: 7, boss: 'shimekiris' },
  { id: 'hope', chapter: 8, boss: 'refera' },
]

/** 最果ての砦は、ほかの 8つの 町の ボスを 倒すと 行ける */
export const hopeLeft = (g: GameState) => TOWNS.filter((t) => t.id !== 'hope' && !g.bosses.includes(t.boss)).length

export type TravelLock = 'paid' | 'hope' | null
export const travelLock = (id: string, g: GameState): TravelLock => {
  const t = TOWNS.find((x) => x.id === id)
  if (!t) return null
  if (!chapterAllowed(t.chapter)) return 'paid'
  if (t.id === 'hope' && hopeLeft(g) > 0) return 'hope'
  return null
}

/** その 町で 学ぶ 関数（教会の 解説と 同じ 決め方） */
const skillsOf = (id: string) => {
  const name = MAPS[id].name
  return Object.values(SKILLS)
    .filter((s) => name.endsWith(s.town))
    .map((s) => s.name)
}

interface Props {
  gs: GameState
  onPick(id: string): void
  onClose(): void
}

/** 次に 行くと よい 町：物語の 順で、行けて まだ ボスを 倒していない 最初の 町 */
export const nextTown = (g: GameState) => TOWNS.find((t) => !travelLock(t.id, g) && !g.bosses.includes(t.boss))?.id

/**
 * 旅の地図：行きたい 町を 選ぶ（ワールドマップの かわり）。
 * 町を 物語の 順に 1本の 道で つなぎ、章の 丸・悩み解決の バー・おすすめの 町を 見せる
 */
export function TravelMap({ gs, onPick, onClose }: Props) {
  useUnlocked()
  const here = MAPS[gs.mapId]?.town ?? gs.mapId
  const rec = nextTown(gs)
  const [cursor, setCursor] = useState(() => Math.max(0, TOWNS.findIndex((t) => t.id === here)))
  // キーボード・十字ボタンで 動かした ときだけ カーソル枠を 出す（指で 押す ときは じゃまに なる）
  const keyboard = useInputMode() === 'keyboard'
  const [keyed, setKeyed] = useState(false)
  const ring = keyboard || keyed
  // 押した カードを 一瞬 光らせてから 進む。2度 押しも 防ぐ
  const [picked, setPicked] = useState<number | null>(null)
  const pickedRef = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const listRef = useRef<HTMLDivElement>(null)
  const n = TOWNS.length

  // 開いたら 今いる 町（無ければ おすすめ）が 見える 位置まで 送る
  useEffect(() => {
    const id = TOWNS.some((t) => t.id === here) ? here : rec
    const el = listRef.current?.querySelector<HTMLElement>(`[data-town="${id}"]`)
    const list = listRef.current
    if (el && list) list.scrollTop = Math.max(0, el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // キーで 動かしたら、選んでいる カードが 隠れないように
  useEffect(() => {
    if (!keyed && !keyboard) return
    listRef.current?.querySelector<HTMLElement>(`[data-i="${cursor}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [cursor]) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (pickedRef.current) return
    sfx('cancel')
    onClose()
  }
  const pick = (i: number) => {
    if (pickedRef.current) return
    pickedRef.current = true
    sfx('select')
    setCursor(i)
    setPicked(i)
    timer.current = setTimeout(() => onPick(TOWNS[i].id), 150)
  }

  useKeys((k) => {
    if (k === 'up' || k === 'down') {
      if (pickedRef.current) return
      sfx('cursor')
      setKeyed(true)
      setCursor((c) => (c + (k === 'up' ? n - 1 : 1)) % n)
    } else if (k === 'ok') pick(cursor)
    else if (k === 'cancel') close()
  })

  const savedCount = TOWNS.filter((t) => gs.bosses.includes(t.boss)).length

  return (
    <div className="travel-layer" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className={`win travel ${ring ? 'ring' : ''}`} role="dialog" aria-label={tr('旅の地図', 'Travel Map')}>
        <div className="travel-top">
          <div className="travel-title">
            <h3>{tr('旅の地図', 'Travel Map')}</h3>
            <span className="travel-count">
              {tr(`救った 町 ${savedCount}/${n}`, `Towns saved ${savedCount}/${n}`)}
            </span>
            <span className="travel-count travel-medals">🏅 {(gs.medals ?? []).length}/{n}</span>
          </div>
          <button type="button" className="travel-x" aria-label={tr('とじる', 'Close')} onClick={close}>
            ×
          </button>
        </div>
        <p className="travel-note">{tr('行きたい 町を 選ぼう。どの 町から 学んでも いい。', 'Pick a town to travel to. You can learn in any order.')}</p>
        <div className="travel-list" ref={listRef}>
          {TOWNS.map((t, i) => {
            const qs = Object.values(QUESTS).filter((q) => q.town === t.id)
            const done = qs.filter((q) => gs.solved.includes(q.id)).length
            const cleared = gs.bosses.includes(t.boss)
            const lock = travelLock(t.id, gs)
            const skills = skillsOf(t.id)
            const isHere = t.id === here
            const isRec = t.id === rec && !isHere
            const prevCleared = i > 0 && gs.bosses.includes(TOWNS[i - 1].boss)
            const node = lock ? '🔒' : cleared ? '★' : t.id === 'hope' ? '⚑' : String(i + 1)
            const cls = [
              'travel-town',
              i === cursor ? 'on' : '',
              picked === i ? 'picked' : '',
              lock ? 'locked' : '',
              cleared ? 'cleared' : '',
              isHere ? 'here' : '',
              isRec ? 'rec' : '',
              prevCleared ? 'path-done' : '',
            ].join(' ')
            return (
              <div
                key={t.id}
                data-town={t.id}
                data-i={i}
                className={cls}
                style={{ '--i': i } as React.CSSProperties}
                role="button"
                tabIndex={-1}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setCursor(i)}
                onClick={() => pick(i)}
              >
                <div className="tt-node" aria-hidden>
                  <span>{node}</span>
                </div>
                <div className="tt-card">
                  <div className="tt-head">
                    <span className="tt-name">{mapName(t.id)}</span>
                    {isHere && <span className="tt-pill tt-here">📍 {tr('いまここ', 'You are here')}</span>}
                    {isRec && <span className="tt-pill tt-rec">{tr('つぎは ここ！', 'Up next!')}</span>}
                  </div>
                  <div className="tt-skills">{skills.length ? skills.join('・') : tr('総まとめ', 'Final review')}</div>
                  {lock ? (
                    <div className="tt-sub tt-locknote">
                      {lock === 'paid'
                        ? tr('全章解放で 遊べる', 'Play with Unlock All Chapters')
                        : tr(`ほかの 町の ボスを あと ${hopeLeft(gs)}体 倒すと 行ける`, `Defeat ${hopeLeft(gs)} more town boss${hopeLeft(gs) > 1 ? 'es' : ''} to go here`)}
                    </div>
                  ) : (
                    <div className="tt-progress">
                      {qs.length > 0 && (
                        <>
                          <div className="tt-bar" aria-hidden>
                            <i style={{ width: `${(done / qs.length) * 100}%` }} />
                          </div>
                          <span className="tt-sub">{tr(`悩み解決 ${done}/${qs.length}`, `Requests ${done}/${qs.length}`)}</span>
                        </>
                      )}
                      <span className={`tt-boss ${cleared ? 'won' : ''}`}>{cleared ? tr('★ 町を 救った', '★ Saved') : tr('ボス 未撃破', 'Boss ahead')}</span>
                      {(gs.medals ?? []).includes(t.boss) && <span className="tt-medal" title={tr('ボスメダル', 'Boss Medal')}>🏅</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <button type="button" className="travel-close" onClick={close}>
          {tr('とじる', 'Close')}
        </button>
      </div>
    </div>
  )
}
