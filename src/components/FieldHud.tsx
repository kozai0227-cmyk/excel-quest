import { useEffect, useState } from 'react'
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

/** 町の 依頼の 進み具合：解決した 数だけ マスが 埋まる（新しく 埋まった マスは ポンと はねる） */
export function QuestProgress({ town, solved, total }: { town: string; solved: number; total: number }) {
  const id = `quest-${town}`
  const prev = seen[id]
  const [before] = useState(prev ? Math.round(prev.rate * total) : solved)
  useEffect(() => {
    seen[id] = { rate: total ? solved / total : 0, epoch: 0 }
  }, [id, solved, total])
  return (
    <div className="win hud-quest">
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
    </div>
  )
}
