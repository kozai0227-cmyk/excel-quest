import { ENEMIES, type QuestionSrc } from './bosses'
import { QUESTS } from './quests'
import { MAPS } from './maps'
import type { GameState } from '../game/types'
import { questionKey } from '../game/weak'

/** 章ごとの まとめ（復習モード・達成率で 使う） */
export interface ChapterDef {
  no: number
  title: string
  /** 何を 学ぶ 章か */
  topic: string
  /** 依頼の ある 町 */
  towns: string[]
  /** 石版の 謎の ある ダンジョン（QUESTS の town） */
  dungeons: string[]
  /** 宝箱を 数える マップ（id の 先頭） */
  maps: string[]
  bosses: string[]
  /** この章で 出会う モンスター（復習の 出題元） */
  enemies: string[]
}

export const CHAPTERS: ChapterDef[] = [
  { no: 1, title: '第1章　セルノとカルキュレ', topic: 'セル・オートフィル・四則演算・SUM／AVERAGE', towns: ['celuno', 'calculet'], dungeons: ['cave', 'tower'], maps: ['cave', 'tower'], bosses: ['slime', 'golem'], enemies: ['celime', 'frog', 'bat', 'ghost'] },
  { no: 2, title: '第2章　鏡の町サンショウ', topic: '相対参照・絶対参照（$）・ROUND', towns: ['sansho'], dungeons: ['temple'], maps: ['temple'], bosses: ['mirage'], enemies: ['kagamin', 'zuredori'] },
  { no: 3, title: '第3章　条件の港町イフポート', topic: 'IF・AND／OR・COUNTIF／SUMIF', towns: ['ifport'], dungeons: ['ship'], maps: ['ship'], bosses: ['captain'], enemies: ['jelly', 'crab'] },
  { no: 4, title: '第4章　検索の城下町ルックアップ', topic: 'VLOOKUP・XLOOKUP・IFERROR', towns: ['lookup'], dungeons: ['library'], maps: ['library'], bosses: ['mitsukaranu'], enemies: ['nainai', 'shiori'] },
  { no: 5, title: '第5章　集計の王都ピボリア', topic: 'SUMIFS・COUNTIFS・集計表', towns: ['pivoria'], dungeons: ['treasury'], maps: ['treasury'], bosses: ['barabaran'], enemies: ['dupli', 'chirakari'] },
  { no: 6, title: '第6章　文字の宿場町テキストリア', topic: '&・LEFT／MID・LEN・TRIM・FIND', towns: ['textria'], dungeons: ['printing'], maps: ['print'], bosses: ['mojibake'], enemies: ['kuuhaku', 'kirehashi'] },
  { no: 7, title: '第7章　暦の里コヨミノ', topic: '日付の計算・WEEKDAY・EDATE・DATEDIF', towns: ['koyomi'], dungeons: ['clock'], maps: ['clock'], bosses: ['shimekiris'], enemies: ['karendaru', 'tokeidori'] },
  { no: 8, title: '最終章　最果ての砦ホープ', topic: 'エラーの読み方と直し方・総まとめ', towns: ['hope'], dungeons: ['castle'], maps: ['castle'], bosses: ['refera'], enemies: ['zerowarin', 'nanashi'] },
]

/** 章を 開放したか（はじめの 町に 着いたら） */
export const chapterOpen = (ch: ChapterDef, g: GameState) =>
  ch.no === 1 || ch.towns.some((t) => g.flags[`visit_${t}`]) || ch.bosses.some((b) => g.bosses.includes(b))

export interface Progress {
  quests: [number, number]
  puzzles: [number, number]
  bosses: [number, number]
  chests: [number, number]
}

const ratio = (list: boolean[]): [number, number] => [list.filter(Boolean).length, list.length]

export function chapterProgress(ch: ChapterDef, g: GameState): Progress {
  const qs = Object.values(QUESTS)
  const chests = Object.values(MAPS)
    .filter((m) => ch.maps.some((p) => m.id.startsWith(p)))
    .flatMap((m) => m.npcs.filter((n) => n.kind === 'chest'))
  return {
    quests: ratio(qs.filter((q) => ch.towns.includes(q.town)).map((q) => g.solved.includes(q.id))),
    puzzles: ratio(qs.filter((q) => ch.dungeons.includes(q.town)).map((q) => g.solved.includes(q.id))),
    bosses: ratio(ch.bosses.map((b) => g.bosses.includes(b))),
    chests: ratio(chests.map((n) => !!g.flags[`chest_${n.id}`])),
  }
}

/** 達成率（0〜100）。依頼・謎・ボス・宝箱を すべて 1つずつ 数える */
export function percent(ps: Progress[]) {
  let done = 0
  let all = 0
  for (const p of ps)
    for (const [d, a] of Object.values(p)) {
      done += d
      all += a
    }
  return all ? Math.floor((done / all) * 100) : 0
}

export const totalPercent = (g: GameState) => percent(CHAPTERS.map((ch) => chapterProgress(ch, g)))

// ---------------------------------------------------------------- 復習の 出題
/** 1問ぶん（key は「敵ID#番号」） */
export interface PracticeItem {
  key: string
  src: QuestionSrc
  /** 苦手な 問題の 類題（同じ 敵の 別の 問題） */
  similar?: boolean
}

export function resolveKey(key: string): PracticeItem | null {
  const [id, n] = key.split('#')
  const src = ENEMIES[id]?.questions[Number(n)]
  return src ? { key, src } : null
}

/** 問題が どの 章の ものか */
export const chapterOfKey = (key: string) => {
  const id = key.split('#')[0]
  return CHAPTERS.find((ch) => ch.bosses.includes(id) || ch.enemies.includes(id))
}

const shuffle = <T,>(a: T[]) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

const keysOf = (id: string) => ENEMIES[id].questions.map((_, i) => questionKey(id, i))
const chapterKeys = (ch: ChapterDef) => [...ch.bosses, ...ch.enemies].flatMap(keysOf)

/** 章の 復習：ボスと モンスターの 問題から 重ならないように */
export function chapterCourse(ch: ChapterDef, n = 5): PracticeItem[] {
  return shuffle(chapterKeys(ch))
    .slice(0, n)
    .map((k) => resolveKey(k)!)
}

/** 全章まとめ：章を 順に まわして 1問ずつ（章の 順に 並べる） */
export function allCourse(chs: ChapterDef[], n = 10): PracticeItem[] {
  const decks = chs.map((ch) => shuffle(chapterKeys(ch)))
  const picked: string[][] = chs.map(() => [])
  for (let k = 0, got = 0; got < n && k < n * chs.length; k++) {
    const i = k % chs.length
    const key = decks[i].shift()
    if (key) {
      picked[i].push(key)
      got++
    }
  }
  return picked.flat().map((k) => resolveKey(k)!)
}

/**
 * 苦手克服：まちがえた 問題を 中心に、同じ 敵の 別の 問題（類題）を まぜる。
 * 自動生成の 問題は 出すたびに 数値が 変わるので、それ自体も 類題に なる
 */
export function weakCourse(weak: string[], n = 10): PracticeItem[] {
  const own = shuffle(weak)
    .map(resolveKey)
    .filter((x): x is PracticeItem => !!x)
    .slice(0, Math.ceil(n * 0.6))
  if (!own.length) return []
  const used = new Set(own.map((x) => x.key))
  const similar = shuffle([...new Set(own.map((x) => x.key.split('#')[0]))].flatMap(keysOf))
    .filter((k) => !used.has(k))
    .slice(0, n - own.length)
    .map((k) => ({ ...resolveKey(k)!, similar: true }))
  return shuffle([...own, ...similar])
}
