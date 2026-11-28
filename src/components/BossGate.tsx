import { useEffect, useMemo, useRef, useState } from 'react'
import { ENEMIES } from '../data/bosses'
import { CHAPTERS, chapterTag, chapterTopic } from '../data/chapters'
import { enemyName } from '../data/en'
import { gearStats } from '../data/equipment'
import { bossArt, hasBossArt } from '../game/bossArt'
import { useKeys } from '../game/keys'
import { useInputMode } from '../game/inputMode'
import { isEn, tr } from '../game/lang'
import { maxHp } from '../game/progress'
import { scaleEnemy } from '../game/scaling'
import { sfx } from '../game/sound'
import type { GameState } from '../game/types'
import type { Creature } from '../game/sprites'
import { SpriteView } from './SpriteView'
import './BossGate.css'

/** ボスに 挑む 前の 確認（App が 出し、たたかうか どうかを 受け取る） */
export interface BossGateReq {
  bossId: string
  /** フィールドの 絵（ボスの 大きな 絵が ない とき） */
  creature?: Creature
  close(fight: boolean): void
}

/**
 * ボスの 挑戦カード：ボスの 絵・章・出る 問題、「正解 約◯回で たおせる」「まちがい 約◯回まで 耐えられる」の
 * 見通し、自分の HP と やくそうを 並べ、「たたかう」か「じゅんびする」を 選ぶ。
 * 文字だけの「◯◯と たたかいますか？」では 勝てそうか・何が 出るかが わからなかった
 */
export function BossGate({ req, gs }: { req: BossGateReq; gs: GameState }) {
  const base = ENEMIES[req.bossId]
  const boss = useMemo(() => scaleEnemy(base, gs.level), [base, gs.level])
  const ch = CHAPTERS.find((c) => c.bosses.includes(base.id))
  const gear = gearStats(gs)
  const mhp = maxHp(gs.level)
  // 戦闘の 計算（Battle.tsx）と 同じ 式で、連続正解の 上のせを 入れない ふつうの 1発
  const hit = 10 + gs.level * 2 + gear.atk
  const hits = boss.hits ?? Math.max(1, Math.ceil(boss.hp / hit))
  const avgHurt = Math.max(1, Math.round((boss.attack[0] + boss.attack[1]) / 2 - Math.floor(gear.def * 0.7)))
  const maxHurt = Math.max(1, boss.attack[1] - Math.floor(gear.def * 0.7))
  const minHurt = Math.max(1, boss.attack[0] - Math.floor(gear.def * 0.7))
  const misses = Math.max(0, Math.ceil(gs.hp / avgHurt) - 1)
  const low = gs.hp < mhp * 0.6
  const danger = misses <= 1
  const herbs = gs.items.herb ?? 0
  const topics = ch ? chapterTopic(ch).split(isEn() ? /,\s*/ : /・/).map((t) => t.trim()).filter(Boolean) : []

  const art = useMemo(() => (hasBossArt(base.sprite) ? bossArt(base.sprite).toDataURL() : ''), [base.sprite])

  const keyboard = useInputMode() === 'keyboard'
  const [focus, setFocus] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const done = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    sfx('encounter')
    return () => clearTimeout(timer.current)
  }, [])

  const pick = (fight: boolean) => {
    if (done.current) return
    done.current = true
    sfx(fight ? 'select' : 'cancel')
    setPicked(fight ? 0 : 1)
    // 押した ボタンが 沈んで 光るのを 見せてから
    timer.current = setTimeout(() => req.close(fight), fight ? 220 : 120)
  }

  useKeys((k) => {
    if (done.current) return
    if (k === 'left' || k === 'up') {
      if (focus !== 0) sfx('cursor')
      setFocus(0)
    } else if (k === 'right' || k === 'down') {
      if (focus !== 1) sfx('cursor')
      setFocus(1)
    } else if (k === 'ok') pick(focus === 0)
    else if (k === 'cancel') pick(false)
  })

  const name = enemyName(base)
  const hpPct = Math.round((gs.hp / mhp) * 100)

  return (
    <div className={`bg-layer ${picked === 0 ? 'go' : ''}`} role="dialog" aria-label={tr(`${name}に 挑む`, `Challenge ${name}`)} onClick={(e) => e.target === e.currentTarget && pick(false)}>
      <div className="bg-card">
        <div className="bg-stage" aria-hidden="true">
          <div className="bg-rays" />
          <div className="bg-aura" />
          <div className="bg-foe">{art ? <img src={art} alt="" /> : req.creature ? <SpriteView creature={req.creature} /> : null}</div>
          <div className="bg-floor" />
        </div>

        <div className="bg-body">
          <div className="bg-tags">
            <span className="bg-tag boss">⚠ BOSS</span>
            {ch && <span className="bg-tag ch">{chapterTag(ch)}</span>}
          </div>
          <h3>{name}</h3>

          <div className="bg-stats">
            <div className="bg-stat atk" style={{ animationDelay: '0.08s' }}>
              <span className="bg-ico">⚔️</span>
              <b>
                {boss.hits ? '' : tr('約', '~')}
                {hits}
                <small>{tr('回', 'x')}</small>
              </b>
              <span>{tr('正解で たおせる', 'right answers to win')}</span>
            </div>
            <div className="bg-stat hurt" style={{ animationDelay: '0.16s' }}>
              <span className="bg-ico">💥</span>
              <b>
                {minHurt === maxHurt ? maxHurt : tr(`${minHurt}〜${maxHurt}`, `${minHurt}–${maxHurt}`)}
              </b>
              <span>{tr('まちがえた ときの ダメージ', 'damage when you miss')}</span>
            </div>
            <div className={`bg-stat life ${danger ? 'warn' : ''}`} style={{ animationDelay: '0.24s' }}>
              <span className="bg-ico">🛡️</span>
              <b>
                {tr('約', '~')}
                {misses}
                <small>{tr('回', 'x')}</small>
              </b>
              <span>{tr('まちがえても 耐えられる', 'misses you can survive')}</span>
            </div>
          </div>

          {topics.length > 0 && (
            <div className="bg-topics" style={{ animationDelay: '0.3s' }}>
              <span className="bg-label">📝 {tr('出る 問題', 'Topics')}</span>
              <div className="bg-chips">
                {topics.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className={`bg-me ${low ? 'low' : ''}`} style={{ animationDelay: '0.36s' }}>
            <span className="bg-label">❤️ HP</span>
            <div className="bg-bar">
              <i style={{ width: `${hpPct}%` }} />
            </div>
            <b>
              {gs.hp}
              <small>/{mhp}</small>
            </b>
            <span className={`bg-herb ${herbs ? '' : 'none'}`} title={tr('やくそう', 'Herbs')}>
              🌿×{herbs}
            </span>
          </div>

          <p className={`bg-tip ${low || danger ? 'warn' : ''}`} style={{ animationDelay: '0.42s' }}>
            {low
              ? tr('HPが へっている。宿や 泉で 回復してから 挑むと 安心', 'Your HP is low. Rest at an inn or spring first to be safe')
              : danger
                ? tr('まちがいに 弱い 相手。やくそうや そうびで じゅんびすると 安心', 'This one hits hard. Herbs or better gear will help')
                : tr('ボスの 問題に 正解すると、うける ダメージを へらせる', "Answer the boss's questions right to cut the damage you take")}
          </p>

          <div className={`bg-btns ${keyboard ? 'ring' : ''}`}>
            <button type="button" className={`bg-btn main ${focus === 0 ? 'f' : ''} ${picked === 0 ? 'picked' : ''}`} onClick={() => pick(true)}>
              ⚔️ {tr('たたかう', 'Fight')}
            </button>
            <button type="button" className={`bg-btn sub ${focus === 1 ? 'f' : ''} ${picked === 1 ? 'picked' : ''}`} onClick={() => pick(false)}>
              {tr('じゅんびする', 'Not yet')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
