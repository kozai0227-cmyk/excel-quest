import { addr, parseAddr } from './formula'

/** スマホ用の「数式ボタン」の ひとまとまり */
export interface ChipGroup {
  label: string
  chips: string[]
  /** 数字キーのように 決まった並びで 表示する */
  keypad?: boolean
}

/** 町（ダンジョン）の順番。ここまでに 習った関数だけを ボタンに出す */
const ORDER = ['celuno', 'cave', 'calculet', 'tower', 'sansho', 'temple', 'ifport', 'ship']
const FUNCS_AT: Record<string, string[]> = {
  calculet: ['SUM', 'AVERAGE', 'MAX', 'MIN', 'COUNT'],
  sansho: ['ROUND'],
  ifport: ['IF', 'AND', 'OR', 'COUNTIF', 'SUMIF'],
}
export const ALL_FUNCS = Object.values(FUNCS_AT).flat()

/** 覚えたスキル → 使える関数（戦闘の ひっかけ用。まだ習っていない関数は 出さない） */
const SKILL_FUNCS: Record<string, string[]> = {
  SUM: ['SUM'],
  AVERAGE: ['AVERAGE'],
  MAXMIN: ['MAX', 'MIN'],
  COUNT: ['COUNT'],
  round: ['ROUND'],
  if: ['IF'],
  andor: ['AND', 'OR'],
  countif: ['COUNTIF', 'SUMIF'],
}
export const learnedFuncs = (skills: string[]) => skills.flatMap((s) => SKILL_FUNCS[s] ?? [])

export function funcsFor(town: string): string[] {
  const n = ORDER.indexOf(town)
  const upto = n < 0 ? ORDER : ORDER.slice(0, n + 1)
  return upto.flatMap((t) => FUNCS_AT[t] ?? [])
}

const COMPARE = ['>=', '<=', '>', '<', '<>']
const ARITH = ['+', '-', '*', '/']
const PUNCT = ['(', ')', ':', ',']
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.']

/** 依頼（ミニExcel）用のボタン一式。セル番地は 表をタップして入れる */
export function questPad(town: string): ChipGroup[] {
  const funcs = funcsFor(town)
  const hasIf = funcs.includes('IF')
  return [
    ...(funcs.length ? [{ label: '関数', chips: funcs }] : []),
    { label: '記号', chips: ['=', ...PUNCT, ...ARITH, ...(hasIf ? [...COMPARE, '"'] : [])] },
    { label: '数字', chips: DIGITS, keypad: true },
  ]
}

const TOKEN = /"[^"]*"?|\$?[A-Z]{1,3}\$?\d+|[A-Z][A-Z0-9.]*|\d+(?:\.\d+)?|<>|>=|<=|[=+\-*/(),:<>&^]|./gu

/** 数式を ボタン単位に 区切る */
export function tokenize(s: string): string[] {
  return s.match(TOKEN) ?? []
}

/** ⌫：最後の ボタン1つぶん（参照・関数名・数値・"文字"・記号）を消す */
export function dropLast(s: string): string {
  const t = tokenize(s)
  return t.length ? s.slice(0, s.length - t[t.length - 1].length) : s
}

const isRef = (t: string) => /^\$?[A-Z]{1,3}\$?\d+$/.test(t)
const isFunc = (t: string) => ALL_FUNCS.includes(t)
const pickN = <T,>(a: T[], n: number) => [...a].sort(() => Math.random() - 0.5).slice(0, n)
const byAddr = (a: string, b: string) => {
  const p = parseAddr(a)
  const q = parseAddr(b)
  return p.c - q.c || p.r - q.r
}

/**
 * 戦闘の数式問題用のボタン。模範解答（hint）に使う部品に、まぎらわしい部品を まぜる。
 * $ は ボタンにせず、F4 で付ける（Excel と同じ 操作を 身につけるため）。
 */
export function battlePad(hint: string, rows: number, cols: number, target: string, known: string[]): ChipGroup[] {
  const toks = tokenize(hint.replace(/\$/g, '')).slice(1) // 先頭の = は 最初から 入っている

  const funcs = new Set(toks.filter(isFunc))
  for (const f of pickN(known.filter((f) => !funcs.has(f)), Math.max(2, 4 - funcs.size))) funcs.add(f)

  // セル：答えに使うもの ＋ そのとなり（ずれた参照の ひっかけ）
  const cells = new Set(toks.filter(isRef))
  const near: string[] = []
  for (const a of cells) {
    const { r, c } = parseAddr(a)
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      if (r + dr >= 0 && r + dr < rows && c + dc >= 0 && c + dc < cols) near.push(addr(r + dr, c + dc))
  }
  for (const a of pickN(near.filter((a) => !cells.has(a) && a !== target), 3)) cells.add(a)

  const values = [...new Set(toks.filter((t) => /^\d/.test(t) || t.startsWith('"')))]
  const hasCmp = toks.some((t) => COMPARE.includes(t) || t === '=')

  return [
    ...(funcs.size ? [{ label: '関数', chips: [...funcs].sort() }] : []),
    { label: 'セル', chips: [...cells].sort(byAddr) },
    { label: '記号', chips: [...PUNCT, ...ARITH, ...(hasCmp ? [...COMPARE, '='] : [])] },
    ...(values.length ? [{ label: '値', chips: values }] : []),
  ]
}
