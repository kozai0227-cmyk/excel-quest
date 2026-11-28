import { useEffect, useState } from 'react'
import './AreaBanner.css'
import { isEn, tr } from '../game/lang'
import type { GameState } from '../game/types'
import { MAPS, mapName } from '../data/maps'
import { QUESTS, townQuests } from '../data/quests'
import { CHAPTERS, chapterTag, chapterTopic } from '../data/chapters'
import { reduceMotion } from './QuestClear'

export interface AreaBannerReq {
  id: string
  /** はじめて 来た 場所か（「NEW」と 学ぶことを 出す） */
  first: boolean
  key: number
}

/** 出ている 時間（ms）。はじめての 場所は 学ぶことも 読めるよう 長め */
export const areaBannerMs = (first: boolean) => (first ? 3400 : 2600)

/**
 * 「はじまりの村 セルノ」→ 小さい 肩書き「はじまりの村」＋ 大きい 名前「セルノ」。
 * 「計算の塔 1階」のような 階は 名前を 大きく、階を 札に する。
 */
export function splitName(name: string): { sub?: string; main: string; floor?: string } {
  const floor = name.match(/^(.*?)\s*(\d+階|屋上|最上階|\d+F|Roof)$/)
  if (floor) return { main: floor[1], floor: floor[2] }
  if (isEn()) {
    const comma = name.indexOf(', ')
    if (comma > 0) return { main: name.slice(0, comma), sub: name.slice(comma + 2) }
    const colon = name.indexOf(': ')
    if (colon > 0) return { sub: name.slice(0, colon), main: name.slice(colon + 2) }
    return { main: name }
  }
  const sp = name.lastIndexOf(' ')
  return sp > 0 ? { sub: name.slice(0, sp), main: name.slice(sp + 1) } : { main: name }
}

const chapterOf = (id: string) => {
  const m = MAPS[id]
  if (!m) return undefined
  if (id === 'forest') return CHAPTERS[0]
  const town = m.town ?? id
  return CHAPTERS.find((ch) => ch.towns.includes(town) || ch.maps.some((p) => id.startsWith(p)))
}

interface Chip {
  ico: string
  text: string
  tone?: 'gold' | 'red' | 'done'
}

function chipsFor(id: string, gs: GameState, floor: boolean): Chip[] {
  const m = MAPS[id]
  const chips: Chip[] = []
  if (m.kind === 'town') {
    const qs = townQuests(m.town ?? id)
    const solved = qs.filter((q) => gs.solved.includes(q.id)).length
    if (m.bossId && gs.bosses.includes(m.bossId)) chips.push({ ico: '★', text: tr('平和に なった町', 'At peace'), tone: 'gold' })
    else if (qs.length) chips.push({ ico: '📜', text: tr(`悩み解決 ${solved}/${qs.length}`, `Requests ${solved}/${qs.length}`), tone: solved === qs.length ? 'done' : undefined })
  }
  if (m.kind === 'dungeon') {
    const ch = chapterOf(id)
    const key = ch?.dungeons.find((d) => id.startsWith(d))
    const puzzles = key ? Object.values(QUESTS).filter((q) => q.town === key) : []
    if (puzzles.length) {
      const d = puzzles.filter((q) => gs.solved.includes(q.id)).length
      chips.push({ ico: '🧩', text: tr(`石版の謎 ${d}/${puzzles.length}`, `Tablets ${d}/${puzzles.length}`), tone: d === puzzles.length ? 'done' : undefined })
    }
    const chests = m.npcs.filter((n) => n.kind === 'chest')
    if (chests.length) {
      const d = chests.filter((n) => gs.flags[`chest_${n.id}`]).length
      chips.push({ ico: '🎁', text: floor ? tr(`この階の 宝箱 ${d}/${chests.length}`, `Chests here ${d}/${chests.length}`) : tr(`宝箱 ${d}/${chests.length}`, `Chests ${d}/${chests.length}`), tone: d === chests.length ? 'done' : undefined })
    }
    const boss = m.npcs.find((n) => n.kind === 'boss' && n.bossId)?.bossId
    if (boss) chips.push(gs.bosses.includes(boss) ? { ico: '✓', text: tr('ボス撃破', 'Boss defeated'), tone: 'done' } : { ico: '👑', text: tr('ボスの 気配が する…', 'A boss lurks here...'), tone: 'red' })
  }
  return chips
}

const KIND: Record<string, () => string> = {
  town: () => tr('町', 'Town'),
  dungeon: () => tr('ダンジョン', 'Dungeon'),
  field: () => tr('フィールド', 'Field'),
  world: () => tr('フィールド', 'Field'),
}

/**
 * 町や ダンジョンに 入ったときの 場所カード。
 * 章と 種類・肩書きと 名前・その場所で やること（悩み解決・謎・宝箱・ボス）を 一瞬で 伝える。
 */
export function AreaBanner({ req, gs }: { req: AreaBannerReq; gs: GameState }) {
  const m = MAPS[req.id]
  const [out, setOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOut(true), areaBannerMs(req.first) - 450)
    return () => clearTimeout(t)
  }, [req])
  if (!m) return null
  const { sub, main, floor } = splitName(mapName(req.id))
  const ch = chapterOf(req.id)
  const kind = KIND[m.kind]?.()
  // 階の ある ダンジョン（「1階」「前殿」など 部屋が 分かれている）は「この階の」宝箱
  const floors = Object.keys(MAPS).filter((k) => MAPS[k].kind === 'dungeon' && k.replace(/\d+$/, '') === req.id.replace(/\d+$/, '')).length
  const chips = chipsFor(req.id, gs, floors > 1)
  // はじめて 町に 着いたら、その章で 学ぶことを 予告する
  const topic = req.first && m.kind === 'town' && ch && ch.towns[0] === (m.town ?? req.id) ? chapterTopic(ch) : null
  const still = reduceMotion()
  return (
    <div className={`area-banner k-${m.kind}${out ? ' out' : ''}${still ? ' still' : ''}`} role="status" aria-live="polite">
      <div className="ab-band">
        <div className="ab-kicker">
          {req.first && <span className="ab-new">NEW</span>}
          {ch && <span>{chapterTag(ch)}</span>}
          {ch && kind && <span className="ab-dot" />}
          {kind && <span>{kind}</span>}
        </div>
        {sub && <div className="ab-sub">{sub}</div>}
        <div className="ab-name">
          <span className="ab-line l" />
          <span className={`ab-main${main.length > (isEn() ? 16 : 9) ? ' long' : ''}`}>{main}</span>
          {floor && <span className="ab-floor">{floor}</span>}
          <span className="ab-line r" />
        </div>
        {topic && (
          <div className="ab-topic">
            <span className="ab-topic-label">{tr('この章で 学ぶ', 'You’ll learn')}</span>
            {topic}
          </div>
        )}
        {chips.length > 0 && (
          <div className="ab-chips">
            {chips.map((c, i) => (
              <span key={c.text} className={`ab-chip${c.tone ? ` ${c.tone}` : ''}`} style={{ animationDelay: `${0.55 + i * 0.09}s` }}>
                <span className="ab-chip-ico">{c.ico}</span>
                {c.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
