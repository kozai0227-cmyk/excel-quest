import { MAPS, mapName } from '../data/maps'
import { SKILLS } from '../data/skills'
import { tr } from '../game/lang'
import type { GameState } from '../game/types'
import { TOWNS } from './TravelMap'
import './SkillBook.css'

/** 町ごとの 絵と 色（図鑑の 見出しと カードの 丸） */
const TOWN_LOOK: Record<string, [string, string]> = {
  celuno: ['✏️', '#3a8dff'],
  calculet: ['🧮', '#f0a020'],
  sansho: ['📌', '#8a6cff'],
  ifport: ['⚖️', '#1aa3a1'],
  lookup: ['🔍', '#2fbf5a'],
  pivoria: ['📊', '#ff7a3d'],
  textria: ['🔤', '#e85d9a'],
  koyomi: ['📅', '#4f8cff'],
  hope: ['🛡️', '#d9a514'],
}

/** その 町で おぼえる スキルの ID（教会の 解説・旅の地図と 同じ 決め方：町の 名前の 終わりで 照らし合わせる） */
const skillIdsOf = (townId: string) => {
  const name = MAPS[townId]?.name ?? ''
  return Object.keys(SKILLS).filter((id) => SKILLS[id].town && name.endsWith(SKILLS[id].town))
}

interface Props {
  gs: GameState
  onClose(): void
}

/**
 * スキル図鑑：おぼえた スキルを 町（章）ごとの カードに まとめ、
 * まだ おぼえていない ものは「？？？」の 枠で 見せて、集める 楽しみと 次の 目標を つくる
 */
export function SkillBook({ gs, onClose }: Props) {
  const total = Object.keys(SKILLS).length
  const have = new Set(gs.skills)
  const got = gs.skills.filter((id) => SKILLS[id]).length
  const latest = [...gs.skills].reverse().find((id) => SKILLS[id])
  return (
    <div className="sb">
      <div className="sb-head">
        <span className="sb-book" aria-hidden>
          📘
        </span>
        <div className="sb-title">
          <b>{tr('スキル図鑑', 'Skill Book')}</b>
          <div className="sb-total">
            <div className="sb-bar">
              <div style={{ width: `${(got / total) * 100}%` }} />
            </div>
            <span>
              {got}
              <small>/{total}</small>
            </span>
          </div>
        </div>
        <button type="button" className="sb-x" onClick={onClose} aria-label={tr('とじる', 'Close')}>
          ✕
        </button>
      </div>
      {got === 0 && <p className="sb-empty">{tr('町の 悩みを 解決すると、ここに スキルが 増えていく。', 'Solve requests in towns, and your skills will be collected here.')}</p>}
      {TOWNS.map((t, ti) => {
        const ids = skillIdsOf(t.id)
        if (!ids.length) return null
        const n = ids.filter((id) => have.has(id)).length
        const [icon, color] = TOWN_LOOK[t.id] ?? ['📘', '#3a8dff']
        const done = n === ids.length
        return (
          <section key={t.id} className={`sb-town ${done ? 'done' : ''} ${n === 0 ? 'none' : ''}`} style={{ ['--tc' as string]: color, animationDelay: `${Math.min(ti, 6) * 0.05}s` }}>
            <header className="sb-town-head">
              <span className="sb-ticon" aria-hidden>
                {icon}
              </span>
              <span className="sb-tname">
                <small>{t.chapter === 8 ? tr('最終章', 'Final') : tr(`第${t.chapter}章`, `Ch. ${t.chapter}`)}</small>
                {mapName(t.id)}
              </span>
              <span className={`sb-count ${done ? 'gold' : ''}`}>{done ? tr('★ コンプリート', '★ Complete') : `${n}/${ids.length}`}</span>
            </header>
            <div className="sb-tbar" aria-hidden>
              <div style={{ width: `${(n / ids.length) * 100}%` }} />
            </div>
            {n === 0 ? (
              <div className="sb-locked">
                <span className="sb-dots" aria-hidden>
                  {ids.map((id) => (
                    <i key={id}>?</i>
                  ))}
                </span>
                {tr(`この町の 依頼で ${ids.length}つ おぼえられる`, `Learn ${ids.length} here by solving requests`)}
              </div>
            ) : (
              <ul className="sb-cards">
                {ids.map((id) =>
                  have.has(id) ? (
                    <li key={id} className="sb-card">
                      <b>
                        {SKILLS[id].name}
                        {id === latest && <span className="sb-new">{tr('さいきん', 'NEW')}</span>}
                      </b>
                      <span>{SKILLS[id].desc}</span>
                    </li>
                  ) : (
                    <li key={id} className="sb-card unknown">
                      <b>？？？</b>
                      <span>{tr('まだ おぼえていない', 'Not learned yet')}</span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
