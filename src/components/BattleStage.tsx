import { memo } from 'react'
import './BattleStage.css'

/**
 * 戦闘の 背景に 奥行きを 出す 飾り（遠くの 山なみ・地平線の もや・奥へ すぼまる 床・ただよう 光の 粒）。
 * 中身は 見た目だけで、さわっても 何も 起きない。色は 場面ごとに BattleStage.css の 変数で 変える
 */
type Scene = string

// 屋外の 場面だけ 遠景の シルエットを 出す（屋内は 床と 光だけ）
const SKYLINE: Record<string, 'hills' | 'trees' | 'rocks'> = { field: 'hills', forest: 'trees', cave: 'rocks' }

/** 0〜1 の 決まった 乱数（毎回 同じ 形に するため） */
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** 針葉樹の 並び：三角を 高さを 変えて すき間なく 並べる */
function treeLine(seed: number, base: number, min: number, max: number) {
  let d = `M0 60 L0 ${base}`
  let x = 0
  let i = seed
  while (x < 400) {
    const w = 10 + rnd(i++) * 14
    const h = min + rnd(i++) * (max - min)
    d += ` L${(x + w / 2).toFixed(1)} ${(base - h).toFixed(1)} L${Math.min(400, x + w).toFixed(1)} ${base}`
    x += w * 0.8
  }
  return `${d} L400 60 Z`
}

/** ごつごつした 岩場 */
function rockLine(seed: number, base: number, amp: number) {
  let d = `M0 60 L0 ${base}`
  let i = seed
  for (let x = 0; x <= 400; x += 16 + rnd(i++) * 18) d += ` L${x.toFixed(1)} ${(base - rnd(i++) * amp).toFixed(1)}`
  return `${d} L400 ${base} L400 60 Z`
}

const PATHS = {
  hills: [
    'M0 60 L0 30 Q40 8 92 24 T190 18 T292 26 T400 14 L400 60 Z',
    'M0 60 L0 44 Q70 24 140 40 T270 36 T400 42 L400 60 Z',
  ],
  trees: [treeLine(3, 40, 12, 26), treeLine(41, 54, 10, 22)],
  rocks: [rockLine(7, 34, 22), rockLine(29, 50, 14)],
}

// 光の 粒：位置・大きさ・速さを 少しずつ ずらす
const MOTES = Array.from({ length: 14 }, (_, i) => ({
  left: `${(rnd(i + 100) * 96 + 2).toFixed(1)}%`,
  top: `${(rnd(i + 200) * 80 + 6).toFixed(1)}%`,
  size: 2 + Math.round(rnd(i + 300) * 3),
  dur: `${(6 + rnd(i + 400) * 6).toFixed(1)}s`,
  delay: `${(-rnd(i + 500) * 10).toFixed(1)}s`,
}))

export const BattleStage = memo(function BattleStage({ scene }: { scene: Scene }) {
  const sky = SKYLINE[scene]
  return (
    <div className="bstage" aria-hidden="true">
      <div className="bstage-glow" />
      {sky && (
        <svg className="bstage-sky" viewBox="0 0 400 60" preserveAspectRatio="none">
          <path className="far" d={PATHS[sky][0]} />
          <path className="near" d={PATHS[sky][1]} />
        </svg>
      )}
      <div className="bstage-floor">
        <div className="bstage-grid" />
      </div>
      <div className="bstage-haze" />
      <div className="bstage-motes">
        {MOTES.map((m, i) => (
          <i key={i} style={{ left: m.left, top: m.top, width: m.size, height: m.size, animationDuration: m.dur, animationDelay: m.delay }} />
        ))}
      </div>
      <div className="bstage-vignette" />
    </div>
  )
})
