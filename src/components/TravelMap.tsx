import { useState } from 'react'
import { MAPS, mapName } from '../data/maps'
import { QUESTS } from '../data/quests'
import { SKILLS } from '../data/skills'
import { useKeys } from '../game/keys'
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

/** 旅の地図：行きたい 町を 選ぶ（ワールドマップの かわり） */
export function TravelMap({ gs, onPick, onClose }: Props) {
  useUnlocked()
  const here = MAPS[gs.mapId]?.town ?? gs.mapId
  const [cursor, setCursor] = useState(() => Math.max(0, TOWNS.findIndex((t) => t.id === here)))
  const n = TOWNS.length + 1

  const pick = (i: number) => {
    if (i >= TOWNS.length) {
      sfx('cancel')
      return onClose()
    }
    sfx('select')
    onPick(TOWNS[i].id)
  }

  useKeys((k) => {
    if (k === 'up' || k === 'down') {
      sfx('cursor')
      setCursor((c) => (c + (k === 'up' ? n - 1 : 1)) % n)
    } else if (k === 'ok') pick(cursor)
    else if (k === 'cancel') {
      sfx('cancel')
      onClose()
    }
  })

  return (
    <div className="travel-layer">
      <div className="win travel">
        <h3>{tr('旅の地図', 'Travel Map')}</h3>
        <p className="travel-note">{tr('行きたい 町を 選ぼう。どの 町から 学んでも いい。', 'Pick a town to travel to. You can learn in any order.')}</p>
        <div className="travel-list">
          {TOWNS.map((t, i) => {
            const qs = Object.values(QUESTS).filter((q) => q.town === t.id)
            const done = qs.filter((q) => gs.solved.includes(q.id)).length
            const cleared = gs.bosses.includes(t.boss)
            const lock = travelLock(t.id, gs)
            const skills = skillsOf(t.id)
            return (
              <div
                key={t.id}
                className={`travel-town ${i === cursor ? 'on' : ''} ${lock ? 'locked' : ''} ${cleared ? 'cleared' : ''}`}
                onPointerEnter={() => setCursor(i)}
                onClick={() => pick(i)}
              >
                <div className="tt-head">
                  <span className="tt-name">{mapName(t.id)}</span>
                  {t.id === here && <span className="tt-here">{tr('いまここ', 'You are here')}</span>}
                  {cleared && <span className="tt-clear">{tr('★ 解決', '★ Saved')}</span>}
                  {lock && <span className="tt-lock">🔒</span>}
                </div>
                <div className="tt-skills">{skills.length ? skills.join('・') : tr('総まとめ', 'Final review')}</div>
                <div className="tt-sub">
                  {lock === 'paid'
                    ? tr('全章解放で 遊べる', 'Play with Unlock All Chapters')
                    : lock === 'hope'
                      ? tr(`ほかの 町の ボスを あと ${hopeLeft(gs)}体 倒すと 行ける`, `Defeat ${hopeLeft(gs)} more town boss${hopeLeft(gs) > 1 ? 'es' : ''} to go here`)
                      : qs.length
                        ? tr(`悩み解決 ${done}/${qs.length}`, `Requests ${done}/${qs.length}`)
                        : ''}
                </div>
              </div>
            )
          })}
          <div className={`travel-town travel-close ${cursor === TOWNS.length ? 'on' : ''}`} onPointerEnter={() => setCursor(TOWNS.length)} onClick={() => pick(TOWNS.length)}>
            {tr('とじる', 'Close')}
          </div>
        </div>
      </div>
    </div>
  )
}
