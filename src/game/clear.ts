/**
 * ボス戦の クリア評価。3つの 目標を 達成した 数が ★の 数。
 * ★の 数で けいけんち・ゴールドが 増え、★3つなら 初回だけ ボスメダル（攻撃力 +2）
 */
export interface ClearStars {
  stars: number
  noMiss: boolean
  noItem: boolean
  flinched: boolean
  /** けいけんち・ゴールドの 倍率 */
  mult: number
}

/** ★1つごとの 報酬の 増え方（★3つで 1.75倍） */
export const STAR_BONUS = 0.25

export function clearStars(r: { misses: number; usedItem: boolean; flinches: number }): ClearStars {
  const noMiss = r.misses === 0
  const noItem = !r.usedItem
  const flinched = r.flinches > 0
  const stars = [noMiss, noItem, flinched].filter(Boolean).length
  return { stars, noMiss, noItem, flinched, mult: 1 + STAR_BONUS * stars }
}

/** 再挑戦の 報酬の 割合 */
export const REMATCH_RATE = 0.5

/** 勝ったときの けいけんち・ゴールド（★の 倍率・再挑戦は 半分） */
export const winReward = (base: number, c?: { mult: number }, rematch?: boolean) => Math.round(base * (c?.mult ?? 1) * (rematch ? REMATCH_RATE : 1))
