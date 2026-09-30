import { HyperFormula, DetailedCellError } from 'hyperformula'

export interface Cell {
  raw: string
  bold?: boolean
}
export type Grid = Cell[][]
export type Value = number | string | boolean | null | { error: string }

export const colName = (c: number) => {
  let s = ''
  let n = c + 1
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export const colIndex = (s: string) => {
  let n = 0
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

export const addr = (r: number, c: number) => colName(c) + (r + 1)

export function parseAddr(a: string) {
  const m = /^([A-Z]+)(\d+)$/.exec(a.toUpperCase())
  if (!m) throw new Error(`bad address: ${a}`)
  return { r: Number(m[2]) - 1, c: colIndex(m[1]) }
}

export function rangeAddr(r1: number, c1: number, r2: number, c2: number) {
  const a = addr(Math.min(r1, r2), Math.min(c1, c2))
  const b = addr(Math.max(r1, r2), Math.max(c1, c2))
  return a === b ? a : `${a}:${b}`
}

export function makeGrid(rows: number, cols: number, data: (string | number)[][], bold: string[] = []): Grid {
  const g: Grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ raw: data[r]?.[c] !== undefined ? String(data[r][c]) : '' })),
  )
  for (const a of bold) {
    const { r, c } = parseAddr(a)
    g[r][c].bold = true
  }
  return g
}

export const cloneGrid = (g: Grid): Grid => g.map((row) => row.map((c) => ({ ...c })))

/** Excel では TRUE / FALSE を そのまま 書ける（=VLOOKUP(…,FALSE)）。数式エンジン用に TRUE() / FALSE() へ */
const withBool = (raw: string) =>
  raw.startsWith('=') ? mapOutsideQuotes(raw, (p) => p.replace(/(?<![A-Za-z0-9_.$])(TRUE|FALSE)(?![A-Za-z0-9_(])/gi, (m) => `${m.toUpperCase()}()`)) : raw

export function evaluate(grid: Grid): Value[][] {
  const data = grid.map((row) => row.map((c) => (c.raw === '' ? null : withBool(c.raw))))
  const hf = HyperFormula.buildFromArray(data, { licenseKey: 'gpl-v3' })
  const out = hf.getSheetValues(0)
  hf.destroy()
  return grid.map((row, r) =>
    row.map((_, c) => {
      const v = out[r]?.[c]
      if (v instanceof DetailedCellError) return { error: v.value }
      return (v ?? null) as Value
    }),
  )
}

const mapOutsideQuotes = (s: string, f: (part: string) => string) =>
  s
    .split('"')
    .map((p, i) => (i % 2 === 0 ? f(p) : p))
    .join('"')

/** 全角→半角・大文字化・閉じカッコの補完など、Excelが入力時に行う正規化 */
export function normalizeInput(input: string): string {
  // 日本語入力で入りがちな「“ ”」なども ふつうの " として扱う
  const nfkc = input.trim().replace(/[“”„‟″〃]/g, '"').normalize('NFKC')
  if (nfkc.startsWith('=')) {
    let f = mapOutsideQuotes(nfkc, (p) => p.toUpperCase().replace(/\s+/g, ''))
    const outside = f.split('"').filter((_, i) => i % 2 === 0).join('')
    const open = outside.split('(').length - 1
    const close = outside.split(')').length - 1
    if (open > close) f += ')'.repeat(open - close)
    return f
  }
  if (/^[+-]?\d+(\.\d+)?$/.test(nfkc)) return String(Number(nfkc))
  // 「1,000」のような桁区切りも数値として受け付ける
  if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(nfkc)) return String(Number(nfkc.replace(/,/g, '')))
  return input
}

/** 数式に含まれるセル参照（範囲）と、その文字位置 */
export function formulaRefs(raw: string) {
  const out: { start: number; end: number; r1: number; c1: number; r2: number; c2: number }[] = []
  const upper = raw.toUpperCase()
  const quoted: [number, number][] = []
  for (let i = 0, q = -1; i < upper.length; i++)
    if (upper[i] === '"') {
      if (q < 0) q = i
      else {
        quoted.push([q, i])
        q = -1
      }
    }
  const re = /(?<![A-Z0-9_$.])\$?([A-Z]{1,3})\$?(\d{1,7})(?::\$?([A-Z]{1,3})\$?(\d{1,7}))?(?![0-9A-Z_(])/g
  for (const m of upper.matchAll(re)) {
    const start = m.index!
    if (quoted.some(([a, b]) => start > a && start < b)) continue
    const a = { r: Number(m[2]) - 1, c: colIndex(m[1]) }
    const b = m[3] ? { r: Number(m[4]) - 1, c: colIndex(m[3]) } : a
    out.push({ start, end: start + m[0].length, r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) })
  }
  return out
}

const REF = /(?<![A-Z0-9_$.])(\$?)([A-Z]{1,3})(\$?)([0-9]{1,7})(?![0-9A-Z_(])/g

/** 数式の相対参照を dr 行・dc 列ずらす（$付きは固定） */
export function shiftFormula(raw: string, dr: number, dc: number): string {
  if (!raw.startsWith('=')) return raw
  return mapOutsideQuotes(raw, (part) =>
    part.replace(REF, (_m, ca: string, col: string, ra: string, row: string) => {
      let c = colIndex(col)
      let r = Number(row) - 1
      if (!ca) c += dc
      if (!ra) r += dr
      if (c < 0 || r < 0) return '#REF!'
      return `${ca}${colName(c)}${ra}${r + 1}`
    }),
  )
}

/**
 * F4キー：カーソル位置（または直前）のセル参照の「$」を
 * A1 → $A$1 → A$1 → $A1 → A1 の順に切り替える。
 */
export function toggleAbsAt(text: string, caret: number): { text: string; caret: number } | null {
  if (!text.startsWith('=')) return null
  const re = /(?<![A-Za-z0-9_$.])(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})(?![0-9A-Za-z_(])/g
  let hit: RegExpMatchArray | null = null
  for (const m of text.matchAll(re)) {
    const s = m.index!
    const e = s + m[0].length
    if (caret >= s && caret <= e) hit = m
  }
  if (!hit) return null
  const [whole, ca, col, ra, row] = hit
  const state = (ca ? 2 : 0) + (ra ? 1 : 0) // 0:A1 3:$A$1 1:A$1 2:$A1
  const next = { 0: 3, 3: 1, 1: 2, 2: 0 }[state as 0 | 1 | 2 | 3]
  const rep = `${next & 2 ? '$' : ''}${col}${next & 1 ? '$' : ''}${row}`
  const s = hit.index!
  return { text: text.slice(0, s) + rep + text.slice(s + whole.length), caret: s + rep.length }
}

const fmtNum = (x: number) => String(Number(x.toPrecision(12)))
const isNum = (s: string) => /^[+-]?\d+(\.\d+)?$/.test(s)
const DAYS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * オートフィル：src の並びから、続く n 個のセルを生成する。
 * shift(raw, steps) は数式を「進行方向に steps 個」ずらす関数。
 */
export function fillLine(src: Cell[], n: number, shift: (raw: string, steps: number) => string): Cell[] {
  const L = src.length
  const raws = src.map((c) => c.raw)
  const boldAt = (k: number) => src[(L + k) % L].bold
  const out: Cell[] = []

  // 数値が2つ以上 → 等差の連番（1つだけならコピー）
  if (L >= 2 && raws.every(isNum)) {
    const a = Number(raws[0])
    const b = Number(raws[L - 1])
    const step = (b - a) / (L - 1)
    for (let k = 0; k < n; k++) out.push({ raw: fmtNum(b + step * (k + 1)), bold: boldAt(k) })
    return out
  }

  // 「1月」→「2月」…（12月の次は1月）
  const month = raws.map((s) => /^(\d{1,2})月$/.exec(s))
  if (month.every(Boolean)) {
    const nums = month.map((m) => Number(m![1]))
    const step = L >= 2 ? nums[L - 1] - nums[L - 2] : 1
    for (let k = 0; k < n; k++) {
      const v = ((((nums[L - 1] - 1 + step * (k + 1)) % 12) + 12) % 12) + 1
      out.push({ raw: `${v}月`, bold: boldAt(k) })
    }
    return out
  }

  // 曜日「月」「月曜日」
  const day = raws.map((s) => /^([日月火水木金土])(曜日|曜)?$/.exec(s))
  if (day.every(Boolean)) {
    const last = day[L - 1]!
    const idx = DAYS.indexOf(last[1])
    const step = L >= 2 ? DAYS.indexOf(last[1]) - DAYS.indexOf(day[L - 2]![1]) : 1
    for (let k = 0; k < n; k++) {
      const v = DAYS[(((idx + step * (k + 1)) % 7) + 7) % 7]
      out.push({ raw: v + (last[2] ?? ''), bold: boldAt(k) })
    }
    return out
  }

  // 「第1週」「No.3」など、末尾・途中に数字を含む文字
  const tn = raws.map((s) => (s.startsWith('=') || isNum(s) ? null : /^(.*?)(\d+)(\D*)$/.exec(s)))
  if (tn.every(Boolean) && tn.every((m) => m![1] === tn[0]![1] && m![3] === tn[0]![3])) {
    const nums = tn.map((m) => Number(m![2]))
    const step = L >= 2 ? nums[L - 1] - nums[L - 2] : 1
    for (let k = 0; k < n; k++)
      out.push({ raw: `${tn[0]![1]}${nums[L - 1] + step * (k + 1)}${tn[0]![3]}`, bold: boldAt(k) })
    return out
  }

  // それ以外：くり返しコピー（数式は参照をずらす）
  for (let k = 0; k < n; k++) {
    const j = (L + k) % L
    const steps = L + k - j
    out.push({ raw: shift(src[j].raw, steps), bold: src[j].bold })
  }
  return out
}

export function formatValue(v: Value): string {
  if (v === null) return ''
  if (typeof v === 'number') return fmtNum(Number(v.toPrecision(10)))
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'object') return v.error
  return v
}

/** 関数を使っているか（IF と COUNTIF のように、名前の一部が重なる関数は区別する） */
export const usesFn = (raw: string, fn: string) => new RegExp(`(^|[^A-Z.])${fn.toUpperCase()}\\(`).test(raw.toUpperCase())
