import { ENEMIES, type QuestionSrc } from './bosses'
import { QUESTS } from './quests'
import { MAPS } from './maps'
import type { GameState } from '../game/types'

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
/** 問題の 出どころ（「敵ID#番号」）。苦手リストにも この形で 記録する */
export interface PracticeItem {
  key: string
  src: QuestionSrc
}

export const questionKey = (enemyId: string, i: number) => `${enemyId}#${i}`

export function resolveKey(key: string): PracticeItem | null {
  const [id, n] = key.split('#')
  const src = ENEMIES[id]?.questions[Number(n)]
  return src ? { key, src } : null
}

const shuffle = <T,>(a: T[]) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export const PRACTICE_SIZE = 5

/** 章の ボスと モンスターの 問題から、重ならないように 選ぶ */
export function chapterPractice(ch: ChapterDef, n = PRACTICE_SIZE): PracticeItem[] {
  const keys = [...ch.bosses, ...ch.enemies].flatMap((id) => ENEMIES[id].questions.map((_, i) => questionKey(id, i)))
  return shuffle(keys)
    .slice(0, n)
    .map((k) => resolveKey(k)!)
}

/** 苦手な 問題から 選ぶ */
export function weakPractice(g: GameState, n = PRACTICE_SIZE): PracticeItem[] {
  return shuffle(g.weak ?? [])
    .map(resolveKey)
    .filter((x): x is PracticeItem => !!x)
    .slice(0, n)
}

/** まちがえたら 苦手に 入れ、正解したら 外す */
export function markWeak(g: GameState, key: string, ok: boolean): GameState {
  const weak = g.weak ?? []
  if (ok) return weak.includes(key) ? { ...g, weak: weak.filter((k) => k !== key) } : g
  return weak.includes(key) ? g : { ...g, weak: [...weak, key].slice(-60) }
}
