import { CHAPTERS } from '../data/chapters'
import type { BossDef } from '../data/bosses'
import { maxHp } from './progress'

/**
 * 章ごとの「ちょうど いい レベル」。町は どの 順で 回っても よいので、
 * 敵の 強さを プレイヤーの レベルに 合わせて 調整する（この レベルの ときが 元の 強さ）
 */
const PLANNED_LEVEL = [3, 7, 10, 13, 16, 19, 22, 25]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * レベルに 合わせた 敵：体力は「こちらの 攻撃力の 伸び」、攻撃は「こちらの 最大HPの 伸び」に 合わせて 増減する。
 * 何回 正解すれば 倒せるか・何回 まちがえると 倒れるかが、どの レベルで 来ても 元の 設計と ほぼ 同じに なる
 */
export function scaleEnemy(b: BossDef, level: number): BossDef {
  // チュートリアル（決まった 回数で 倒れる）は そのまま
  if (b.hits) return b
  const ch = CHAPTERS.find((c) => c.bosses.includes(b.id) || c.enemies.includes(b.id))
  if (!ch) return b
  const planned = PLANNED_LEVEL[ch.no - 1]
  if (planned === level) return b
  const kHp = clamp((10 + level * 2) / (10 + planned * 2), 0.3, 2.5)
  const kAtk = clamp(maxHp(level) / maxHp(planned), 0.3, 2.5)
  return {
    ...b,
    hp: Math.max(1, Math.round(b.hp * kHp)),
    attack: [Math.max(1, Math.round(b.attack[0] * kAtk)), Math.max(1, Math.round(b.attack[1] * kAtk))],
  }
}
