/**
 * ダンジョンの 探索の 記録（フロアごとに、見た マスの 番号）。
 * セーブデータとは 別に 保存する（大きく なりすぎない ように）
 */
const KEY = 'excel-quest-explore-v1'

let cache: Map<string, Set<number>> | null = null

function load() {
  if (cache) return cache
  cache = new Map()
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number[]>
    for (const [id, list] of Object.entries(raw)) cache.set(id, new Set(list))
  } catch {
    // 読めなければ 最初から
  }
  return cache
}

export function exploreSet(mapId: string) {
  const c = load()
  let s = c.get(mapId)
  if (!s) c.set(mapId, (s = new Set()))
  return s
}

let timer: ReturnType<typeof setTimeout> | undefined
/** 少し まとめてから 保存する（1歩ごとに 書かない） */
export function saveExplore() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      const out: Record<string, number[]> = {}
      for (const [id, s] of load()) out[id] = [...s]
      localStorage.setItem(KEY, JSON.stringify(out))
    } catch {
      // 保存できなくても 遊べる
    }
  }, 800)
}

/** はじめからの ときに 消す */
export function clearExplore() {
  cache = new Map()
  try {
    localStorage.removeItem(KEY)
  } catch {
    // なにもしない
  }
}
