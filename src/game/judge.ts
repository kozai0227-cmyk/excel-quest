import type { Question } from '../data/bosses'
import { evaluate, formatValue, makeGrid, normalizeInput, parseAddr, shiftFormula, usesFn } from './formula'
import { tr } from './lang'

type FormulaQ = Extract<Question, { type: 'formula' }>

/** 問題の 表の 大きさ（答えの セル・コピー先も ふくむ） */
export function tableSize(q: FormulaQ) {
  const t = parseAddr(q.target)
  const copies = (q.copies ?? []).map((cp) => parseAddr(cp.at))
  return {
    rows: Math.max(q.table.length, t.r + 1, ...copies.map((p) => p.r + 1)),
    cols: Math.max(...q.table.map((r) => r.length), t.c + 1, ...copies.map((p) => p.c + 1)),
  }
}

/** 数式の 問題を 判定する（まちがいなら 理由つき） */
export function judgeFormula(q: FormulaQ, input: string): { ok: boolean; note?: string } {
  const raw = normalizeInput(input)
  const t = parseAddr(q.target)
  const { rows, cols } = tableSize(q)
  const copies = (q.copies ?? []).map((cp) => ({ ...cp, p: parseAddr(cp.at) }))
  const grid = makeGrid(rows, cols, q.table)
  grid[t.r][t.c].raw = raw
  for (const cp of copies) grid[cp.p.r][cp.p.c].raw = shiftFormula(raw, cp.p.r - t.r, cp.p.c - t.c)
  const vals = evaluate(grid)
  const v = vals[t.r][t.c]
  const same = (x: typeof v, n: number | string) =>
    typeof n === 'string' ? typeof x === 'string' && x.trim() === n : typeof x === 'number' && Math.abs(x - n) < 1e-9
  const okVal = same(v, q.expect)
  const bad = copies.find((cp) => !same(vals[cp.p.r][cp.p.c], cp.expect))
  const okUse = !q.mustUse || (q.mustUse.length === 1 ? raw.includes(q.mustUse) : usesFn(raw, q.mustUse))
  if (raw.trim() === '=') return { ok: false, note: tr('数式が 空っぽだ……。', 'The formula is empty...') }
  if (!raw.startsWith('=')) return { ok: false, note: tr('数式は「=」で はじめよう！', 'Start your formula with "="!') }
  if (/[≧≦≠]/.test(raw))
    return { ok: false, note: tr('「≧ ≦ ≠」は 使えない！ 以上は >=、以下は <=、等しくないは <> と 書こう。', "You can't use ≧ ≦ ≠! Write >= for at least, <= for at most, and <> for not equal.") }
  if (okVal && bad) {
    const empty = tr('（空）', '(blank)')
    const shown = formatValue(vals[bad.p.r][bad.p.c]) || empty
    const got = tr(`${bad.at}に コピーすると ${grid[bad.p.r][bad.p.c].raw} → ${shown}`, `copied to ${bad.at} it becomes ${grid[bad.p.r][bad.p.c].raw} → ${shown}`)
    // 文字の答え（IF）なら 条件の まちがい、数値なら 参照の ずれ
    const why =
      typeof bad.expect === 'string'
        ? tr(`本当は「${bad.expect}」。条件を 見直そう……！`, `It should be "${bad.expect}". Check your condition...!`)
        : tr('参照が ずれた……！', 'The reference shifted...!')
    return { ok: false, note: tr(`${q.target}は 合ってる！ でも ${got}。${why}`, `${q.target} is right! But ${got}. ${why}`) }
  }
  if (okVal && okUse) return { ok: true }
  if (okVal) return { ok: false, note: tr(`答えは合ってる！ でも ${q.mustUse} を使ってほしかった……。`, `The answer is right! But try using ${q.mustUse}...`) }
  return { ok: false, note: tr(`あなたの数式の結果：${formatValue(v) || '（空）'}`, `Your formula's result: ${formatValue(v) || '(blank)'}`) }
}
