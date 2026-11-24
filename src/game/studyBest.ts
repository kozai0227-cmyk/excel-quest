/**
 * ふくしゅうの書：コースごとの 自己ベスト（いちばん 多く 正解した 数）。
 * 連続日数と 同じく セーブとは 別に 端末へ 保存する。
 */
const KEY = 'excel-quest-study-best-v1'

export interface BestRecord {
  /** いちばん 多く 正解した 数 */
  score: number
  /** その ときの 問題数 */
  total: number
  /** 終えた 回数 */
  plays: number
}

type Saved = Record<string, BestRecord>

function load(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (v && typeof v === 'object') return v as Saved
  } catch {
    /* 読めなければ 記録なし */
  }
  return {}
}

export const getBests = (): Saved => load()

/** コースを 終えた。自己ベストを 更新したら true */
export function recordBest(id: string, score: number, total: number): boolean {
  const s = load()
  const old = s[id]
  const better = !old || score / total > old.score / old.total
  s[id] = better ? { score, total, plays: (old?.plays ?? 0) + 1 } : { ...old, plays: old.plays + 1 }
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 保存できない環境では 何もしない */
  }
  return better
}
