import { addr, parseAddr, toggleAbsAt } from './formula'

/** スマホ用の「数式ボタン」の ひとまとまり */
export interface ChipGroup {
  label: string
  chips: string[]
  /** 数字キーのように 決まった並びで 表示する */
  keypad?: boolean
}

/** 町（ダンジョン）の順番。ここまでに 習った関数だけを ボタンに出す */
const ORDER = ['celuno', 'cave', 'calculet', 'tower', 'sansho', 'temple', 'ifport', 'ship', 'lookup', 'library', 'pivoria', 'treasury', 'textria', 'printing', 'koyomi', 'clock']
const FUNCS_AT: Record<string, string[]> = {
  calculet: ['SUM', 'AVERAGE', 'MAX', 'MIN', 'COUNT'],
  sansho: ['ROUND'],
  ifport: ['IF', 'AND', 'OR', 'COUNTIF', 'SUMIF'],
  lookup: ['VLOOKUP', 'IFERROR', 'XLOOKUP'],
  pivoria: ['SUMIFS', 'COUNTIFS', 'AVERAGEIF', 'MAXIFS', 'MINIFS'],
  textria: ['LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM', 'SUBSTITUTE', 'FIND'],
  koyomi: ['YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'EDATE', 'EOMONTH', 'DATEDIF'],
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
  vlookup: ['VLOOKUP'],
  iferror: ['IFERROR'],
  xlookup: ['XLOOKUP'],
  countifs: ['COUNTIFS'],
  sumifs: ['SUMIFS'],
  averageif: ['AVERAGEIF', 'MAXIFS', 'MINIFS'],
  leftright: ['LEFT', 'RIGHT'],
  mid: ['MID'],
  len: ['LEN'],
  clean: ['TRIM', 'SUBSTITUTE'],
  find: ['FIND'],
  dateparts: ['YEAR', 'MONTH', 'DAY'],
  weekday: ['WEEKDAY'],
  edate: ['EDATE', 'EOMONTH'],
  datedif: ['DATEDIF'],
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
const TOKEN = /"[^"]*"?|\$?[A-Z]{1,3}\$?\d+|[A-Z][A-Z0-9.]*|\d+(?:\.\d+)?|<>|>=|<=|[=+\-*/(),:<>&^]|./gu

/** 数式を ボタン単位に 区切る */
export function tokenize(s: string): string[] {
  return s.match(TOKEN) ?? []
}

/** 数式を ボタン単位に 区切る。関数名は 最初の カッコと ひとまとめ（SUM( ）。先頭の = は 最初から 入っているので はずす */
export function formulaChips(s: string): string[] {
  const t = tokenize(s.replace(/\$/g, ''))
  const out: string[] = []
  for (let i = 0; i < t.length; i++) {
    if (/^[A-Z][A-Z0-9.]*$/.test(t[i]) && !isRef(t[i]) && t[i + 1] === '(') {
      out.push(t[i] + '(')
      i++
    } else out.push(t[i])
  }
  return out[0] === '=' ? out.slice(1) : out
}

const REF = /^\$?[A-Z]{1,3}\$?\d+$/
const RANGE = /^\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+$/
export const isRef = (t: string) => REF.test(t)
/** セル参照か 範囲（表を タップ・ドラッグして 入れた もの） */
export const isRefOrRange = (t: string) => REF.test(t) || RANGE.test(t)

/** F4：いちばん 最後の セル参照（範囲なら 両はし）の $ を 切り替える（A1 → $A$1 → A$1 → $A1 → A1） */
export function toggleLastRef(chips: string[]): string[] {
  for (let i = chips.length - 1; i >= 0; i--) {
    if (!isRefOrRange(chips[i])) continue
    const next = [...chips]
    next[i] = chips[i]
      .split(':')
      .map((a) => toggleAbsAt('=' + a, a.length + 1)?.text.slice(1) ?? a)
      .join(':')
    return next
  }
  return chips
}

/**
 * 表を タップ（ドラッグ）して 参照を 入れる。
 * 直前も 参照なら 置きかえる（Excel で 数式の 入力中に 別の セルを クリックしたときと 同じ）
 */
export function pickRef(chips: string[], ref: string): string[] {
  return chips.length && isRefOrRange(chips[chips.length - 1]) ? [...chips.slice(0, -1), ref] : [...chips, ref]
}
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
  const toks = formulaChips(hint) // 先頭の = は 最初から 入っている

  const funcs = new Set(toks.filter((t) => t.endsWith('(') && t.length > 1))
  for (const f of pickN(known.map((f) => f + '(').filter((f) => !funcs.has(f)), Math.max(2, 4 - funcs.size))) funcs.add(f)

  // セル：答えに使うもの ＋ そのとなり（ずれた参照の ひっかけ）
  const cells = new Set(toks.filter(isRef))
  const near: string[] = []
  for (const a of cells) {
    const { r, c } = parseAddr(a)
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      if (r + dr >= 0 && r + dr < rows && c + dc >= 0 && c + dc < cols) near.push(addr(r + dr, c + dc))
  }
  for (const a of pickN(near.filter((a) => !cells.has(a) && a !== target), 3)) cells.add(a)

  const values = [...new Set(toks.filter((t) => /^\d/.test(t) || t.startsWith('"') || t === 'TRUE' || t === 'FALSE'))]
  const hasCmp = toks.some((t) => COMPARE.includes(t) || t === '=')

  return [
    ...(funcs.size ? [{ label: '関数', chips: [...funcs].sort() }] : []),
    { label: 'セル', chips: [...cells].sort(byAddr) },
    { label: '記号', chips: [...PUNCT, ...ARITH, ...(toks.includes('&') ? ['&'] : []), ...(hasCmp ? [...COMPARE, '='] : [])] },
    ...(values.length ? [{ label: '値', chips: values }] : []),
  ]
}
