/**
 * ふくしゅうの 連続日数（1日 1コース 終えると 1日 ふえる）。
 * セーブとは 別に 保存するので、タイトル画面の 復習モードからも 使える。
 * 日付は 端末の 現地時刻で「YYYY-MM-DD」として 記録する。
 */
const KEY = 'excel-quest-streak-v1'
/** 覚えておく 日数（週の 表示と 最高記録に 足りる分） */
const KEEP = 400

interface Saved {
  days: string[]
  best: number
}

export interface StreakInfo {
  /** いまの 連続日数（今日 まだでも、きのう までの 連続は 残る） */
  count: number
  /** 今日 もう 1コース 終えた */
  today: boolean
  /** これまでの 最高記録 */
  best: number
  /** 今日を 右端に した 直近 7日（やった日 = true） */
  week: { date: Date; done: boolean; isToday: boolean }[]
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

function load(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (v && Array.isArray(v.days)) return { days: v.days.filter((x: unknown) => typeof x === 'string'), best: Number(v.best) || 0 }
  } catch {
    /* 読めなければ 最初から */
  }
  return { days: [], best: 0 }
}

function store(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ days: s.days.slice(-KEEP), best: s.best }))
  } catch {
    /* 保存できない環境では 何もしない */
  }
}

function countFrom(set: Set<string>, now: Date) {
  // 今日 やっていれば 今日から、まだなら きのうから さかのぼる
  let d = set.has(dayKey(now)) ? now : addDays(now, -1)
  let n = 0
  while (set.has(dayKey(d))) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function getStreak(now = new Date()): StreakInfo {
  return getStreakFrom(load(), now)
}

/** コースを 1つ 終えた。今日 はじめての ときは 連続日数が のびる（grew = true） */
export function recordStudy(now = new Date()): StreakInfo & { grew: boolean } {
  const s = load()
  const k = dayKey(now)
  const grew = !s.days.includes(k)
  if (grew) s.days.push(k)
  const info = getStreakFrom(s, now)
  s.best = info.best
  store(s)
  return { ...info, grew }
}

function getStreakFrom(s: Saved, now: Date): StreakInfo {
  const set = new Set(s.days)
  const count = countFrom(set, now)
  return {
    count,
    today: set.has(dayKey(now)),
    best: Math.max(s.best, count),
    week: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(now, i - 6)
      return { date, done: set.has(dayKey(date)), isToday: i === 6 }
    }),
  }
}
