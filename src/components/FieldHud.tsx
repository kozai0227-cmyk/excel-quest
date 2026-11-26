import { useEffect, useRef, useState } from 'react'
import { tr } from '../game/lang'
import { LEVEL_EXP, expToNext, maxHp } from '../game/progress'
import type { GameState } from '../game/types'

/**
 * フィールドの 状態ウインドウ・依頼の 進み具合。
 * 戦闘や 依頼から もどったとき、前に 見た 値から 新しい 値へ バーが のびる（増えたら 光る）。
 * HUD は 場面が 変わると 消えるので、前の 値は モジュールに 覚えておく。
 */
const seen: Record<string, { rate: number; epoch: number }> = {}

function useGrow(id: string, rate: number, epoch = 0) {
  // 初めて 見る 値は そのまま。レベルが 変わった 経験値バーは 0 から のばす
  const [shown, setShown] = useState(() => {
    const prev = seen[id]
    return !prev ? rate : prev.epoch !== epoch ? 0 : prev.rate
  })
  const [gained, setGained] = useState(false)
  useEffect(() => {
    seen[id] = { rate, epoch }
    if (shown === rate) return
    const up = rate > shown
    const t = setTimeout(() => {
      setShown(rate)
      setGained(up)
    }, 260)
    return () => clearTimeout(t)
  }, [id, rate, epoch]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gained) return
    const t = setTimeout(() => setGained(false), 1400)
    return () => clearTimeout(t)
  }, [gained])
  return { shown, gained }
}

function Bar({ id, rate, kind, epoch, low }: { id: string; rate: number; kind: 'hp' | 'exp'; epoch?: number; low?: boolean }) {
  const { shown, gained } = useGrow(id, rate, epoch)
  return (
    <div className={`hud-bar ${kind}${low ? ' low' : ''}${gained ? ' gain' : ''}`}>
      <div style={{ width: `${shown * 100}%` }} />
    </div>
  )
}

export function FieldStatus({ gs }: { gs: GameState }) {
  const hpMax = maxHp(gs.level)
  const hpRate = Math.min(1, Math.max(0, gs.hp / hpMax))
  const base = LEVEL_EXP[gs.level] ?? 0
  const next = LEVEL_EXP[gs.level + 1]
  const expRate = next === undefined ? 1 : Math.min(1, Math.max(0, (gs.exp - base) / (next - base)))
  const toNext = expToNext(gs)
  const expLabel = toNext === null ? 'EXP MAX' : tr(`次の レベルまで あと ${toNext}`, `${toNext} EXP to next level`)
  return (
    <div className="win hud" aria-label={tr('いまの 状態', 'Current status')}>
      <div className="hud-head">
        <span className="hud-name">{gs.name}</span>
        <span className="hud-lv">Lv {gs.level}</span>
      </div>
      <div className="hud-row">
        <span className="hud-key">HP</span>
        <Bar id="hp" kind="hp" rate={hpRate} low={hpRate <= 0.3} />
        <span className="hud-val">
          {gs.hp}/{hpMax}
        </span>
      </div>
      <div className="hud-row" title={expLabel} aria-label={expLabel}>
        <span className="hud-key">EX</span>
        <Bar id="exp" kind="exp" rate={expRate} epoch={gs.level} />
        <span className="hud-val">{toNext === null ? 'MAX' : tr(`あと${toNext}`, `${toNext} left`)}</span>
      </div>
      <div className="hud-gold">{gs.gold} G</div>
    </div>
  )
}

/** 次に 話す 依頼人（ナビ）。where は 主人公と 相手の いまの マス */
export interface QuestNav {
  name: string
  /** 家の 中に いる（矢印は ドアを さす） */
  inside: boolean
  where(): { px: number; py: number; tx: number; ty: number } | null
  onGo(): void
}

/** 依頼人の 方向を さす 矢印と 歩数（主人公が 動くたびに 追いかける） */
function useHeading(nav?: QuestNav) {
  const [h, setH] = useState<{ deg: number; steps: number } | null>(null)
  const last = useRef('')
  useEffect(() => {
    if (!nav) return
    const tick = () => {
      const w = nav.where()
      if (!w) return
      const dx = w.tx - w.px
      const dy = w.ty - w.py
      const steps = Math.abs(dx) + Math.abs(dy)
      // 上が 0°、時計回り
      const deg = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI)
      const key = `${deg},${steps}`
      if (key === last.current) return
      last.current = key
      setH({ deg, steps })
    }
    tick()
    const t = setInterval(tick, 150)
    return () => clearInterval(t)
  }, [nav])
  return h
}

/** 町の 依頼の 進み具合：解決した 数だけ マスが 埋まる（新しく 埋まった マスは ポンと はねる）。下に 次の 依頼人への ナビ */
export function QuestProgress({ town, solved, total, nav }: { town: string; solved: number; total: number; nav?: QuestNav }) {
  const id = `quest-${town}`
  const prev = seen[id]
  const [before] = useState(prev ? Math.round(prev.rate * total) : solved)
  useEffect(() => {
    seen[id] = { rate: total ? solved / total : 0, epoch: 0 }
  }, [id, solved, total])
  const h = useHeading(nav)
  // 前回の 角度から 近い 向きへ 回す（359°→1° で 一周しない）
  const turn = useRef(0)
  if (h) turn.current += ((((h.deg - turn.current) % 360) + 540) % 360) - 180
  const near = !!h && h.steps <= 1
  return (
    <div className={`win hud-quest${nav ? ' has-nav' : ''}`}>
      <div className="hq-label">{tr(`悩み解決 ${solved}/${total}`, `Requests ${solved}/${total}`)}</div>
      <div className="hq-pips" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`${i < solved ? 'on' : ''}${i >= before && i < solved ? ' new' : ''}`}
            style={i >= before && i < solved ? { animationDelay: `${0.3 + (i - before) * 0.15}s` } : undefined}
          />
        ))}
      </div>
      {nav && (
        <button
          type="button"
          className={`hq-nav${near ? ' near' : ''}`}
          key={nav.name}
          onClick={nav.onGo}
          aria-label={tr(`次は ${nav.name}。押すと そこまで 歩く`, `Next: ${nav.name}. Tap to walk there`)}
        >
          <span className="hq-compass" aria-hidden>
            {near ? <b className="hq-here">!</b> : (
              <svg viewBox="0 0 24 24" style={{ transform: `rotate(${turn.current}deg)` }}>
                <path d="M12 2.5 19.5 20.5 12 16.2 4.5 20.5Z" />
              </svg>
            )}
          </span>
          <span className="hq-text">
            <span className="hq-top">
              <span className="hq-next">{nav.inside ? tr('次は 家の 中', 'Next · indoors') : tr('次は', 'Next')}</span>
              {h && (
                <span className="hq-steps" aria-hidden>
                  {near ? tr('すぐ そば', 'here') : `👣 ${h.steps}`}
                </span>
              )}
            </span>
            <span className="hq-who">{nav.name}</span>
          </span>
        </button>
      )}
    </div>
  )
}
