/**
 * 自前の 数式エンジン（表計算ソフトの 数式を 計算する）。
 * ゲームで 学ぶ 関数と、PC で 打たれそうな 一般的な 関数を 実装している。
 *
 * 値の 形：
 *   number / string / boolean / null（空のセル）/ Err（#DIV/0! など）/ TNum（日付・時刻・％の 数）
 * 日付は「1899/12/30 を 0 と する 通し番号」の 数。表示の ときだけ「2026/10/1」に する。
 */

// ================================================================ 値
export class Err {
  constructor(readonly code: string) {}
}
/** 種類つきの 数（日付・時刻・％）。足し算などの 結果の 表示形式を 決めるのに 使う */
export class TNum {
  constructor(
    readonly n: number,
    readonly t: 'date' | 'time' | 'datetime' | 'percent',
  ) {}
}
export type Scalar = number | string | boolean | null | Err | TNum
interface Range {
  kind: 'range'
  r1: number
  c1: number
  r2: number
  c2: number
}
type Val = Scalar | Range

const E = {
  div0: new Err('#DIV/0!'),
  value: new Err('#VALUE!'),
  name: new Err('#NAME?'),
  ref: new Err('#REF!'),
  na: new Err('#N/A'),
  num: new Err('#NUM!'),
  parse: new Err('#ERROR!'),
  cycle: new Err('#CYCLE!'),
}
const ERR_LITERALS: Record<string, Err> = {
  '#DIV/0!': E.div0,
  '#VALUE!': E.value,
  '#NAME?': E.name,
  '#REF!': E.ref,
  '#N/A': E.na,
  '#NUM!': E.num,
  '#NULL!': new Err('#NULL!'),
}

const isErr = (v: unknown): v is Err => v instanceof Err
const isRange = (v: unknown): v is Range => typeof v === 'object' && v !== null && (v as Range).kind === 'range'
const rawNum = (v: Scalar) => (v instanceof TNum ? v.n : v)

/** 計算誤差を 表計算ソフトと 同じ 15けたで 丸める（0.1+0.2 → 0.3） */
const tidy = (x: number) => (Number.isFinite(x) ? Number(x.toPrecision(15)) : x)

// ================================================================ 日付
const DAY_MS = 86400000
const EPOCH = Date.UTC(1899, 11, 30)
export const dateToSerial = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY_MS)
export function serialParts(n: number) {
  const d = new Date(EPOCH + Math.floor(n + 1e-9) * DAY_MS)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay() }
}
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** 「2026/10/1」「2026-10-01」「9:30」「2026/10/1 9:30」を 数に */
function parseDateTime(s: string): TNum | null {
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s)
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
    if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null
    const serial = dateToSerial(y, mo, d)
    if (m[4] === undefined) return new TNum(serial, 'date')
    return new TNum(serial + timeFrac(Number(m[4]), Number(m[5]), Number(m[6] ?? 0)), 'datetime')
  }
  const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s)
  if (t && Number(t[2]) < 60 && Number(t[3] ?? 0) < 60) return new TNum(timeFrac(Number(t[1]), Number(t[2]), Number(t[3] ?? 0)), 'time')
  return null
}
const timeFrac = (h: number, mi: number, s: number) => (h * 3600 + mi * 60 + s) / 86400

/** セルに 打った 値（数式 以外）を 読む */
export function parseLiteral(raw: string): Scalar {
  if (raw === '') return null
  // 先頭の ' は「文字として 入れる」しるし
  if (raw.startsWith("'")) return raw.slice(1)
  const s = raw.trim()
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return Number(s)
  if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''))
  const pct = /^([+-]?(\d+\.?\d*|\.\d+))%$/.exec(s)
  if (pct) return new TNum(tidy(Number(pct[1]) / 100), 'percent')
  const dt = parseDateTime(s)
  if (dt) return dt
  if (/^true$/i.test(s)) return true
  if (/^false$/i.test(s)) return false
  if (ERR_LITERALS[s.toUpperCase()]) return ERR_LITERALS[s.toUpperCase()]
  return raw
}

// ================================================================ 字句解析
type Tok =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'ref'; v: string }
  | { t: 'name'; v: string }
  | { t: 'err'; v: string }
  | { t: 'op'; v: string }

class ParseError extends Error {}

function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (ch === '"') {
      let s = ''
      i++
      for (;;) {
        if (i >= src.length) throw new ParseError('閉じていない "')
        if (src[i] === '"') {
          if (src[i + 1] === '"') {
            s += '"'
            i += 2
            continue
          }
          i++
          break
        }
        s += src[i++]
      }
      out.push({ t: 'str', v: s })
      continue
    }
    if (ch === '#') {
      const m = /^#(DIV\/0!|VALUE!|NAME\?|REF!|N\/A|NUM!|NULL!)/i.exec(src.slice(i))
      if (!m) throw new ParseError('不明な #')
      out.push({ t: 'err', v: m[0].toUpperCase() })
      i += m[0].length
      continue
    }
    const num = /^(\d+\.?\d*|\.\d+)(E[+-]?\d+)?/i.exec(src.slice(i))
    if (num) {
      out.push({ t: 'num', v: Number(num[0]) })
      i += num[0].length
      continue
    }
    const ref = /^\$?[A-Z]{1,3}\$?\d{1,7}(?![A-Z0-9_.(])/i.exec(src.slice(i))
    if (ref) {
      out.push({ t: 'ref', v: ref[0].toUpperCase().replace(/\$/g, '') })
      i += ref[0].length
      continue
    }
    // 名前（関数名・TRUE・列の 範囲の 一部など）。日本語なども 名前として 読み、あとで #NAME? に する
    const name = /^\$?[^\s"#+\-*/^&=<>%(),:;{}[\]!'0-9.][^\s"#+\-*/^&=<>%(),:;{}[\]!']*/.exec(src.slice(i))
    if (name) {
      out.push({ t: 'name', v: name[0].toUpperCase() })
      i += name[0].length
      continue
    }
    const op = /^(<=|>=|<>|[+\-*/^&=<>%(),:])/.exec(src.slice(i))
    if (op) {
      out.push({ t: 'op', v: op[0] })
      i += op[0].length
      continue
    }
    throw new ParseError(`読めない 文字：${ch}`)
  }
  return out
}

// ================================================================ 構文解析
type Node =
  | { k: 'lit'; v: Scalar }
  | { k: 'ref'; r: number; c: number }
  | { k: 'range'; r1: number; c1: number; r2: number; c2: number }
  | { k: 'name'; v: string }
  | { k: 'fn'; name: string; args: Node[] }
  | { k: 'un'; op: string; a: Node }
  | { k: 'post'; op: string; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }

const colIdx = (s: string) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1
const cellOf = (a: string) => {
  const m = /^([A-Z]+)(\d+)$/.exec(a)!
  return { r: Number(m[2]) - 1, c: colIdx(m[1]) }
}

/** 二項演算子の 強さ（大きいほど 先に 計算） */
const BIN: Record<string, number> = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 }

function parse(src: string, maxRow: number): Node {
  const toks = tokenize(src)
  let p = 0
  const peek = () => toks[p]
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v
  const expectOp = (v: string) => {
    if (!isOp(v)) throw new ParseError(`${v} が ない`)
    p++
  }

  const expr = (minPrec: number): Node => {
    let left = unary()
    for (;;) {
      const t = peek()
      if (!t || t.t !== 'op' || !(t.v in BIN)) break
      const prec = BIN[t.v]
      if (prec < minPrec) break
      p++
      // ^ も 左から（表計算ソフトと 同じ）
      const right = expr(prec + 1)
      left = { k: 'bin', op: t.v, a: left, b: right }
    }
    return left
  }

  // 単項の ＋－ は ^ より 先（-2^2 = 4）
  const unary = (): Node => {
    if (isOp('-') || isOp('+')) {
      const op = (peek() as { v: string }).v
      p++
      return { k: 'un', op, a: unary() }
    }
    return postfix()
  }

  const postfix = (): Node => {
    let n = primary()
    while (isOp('%')) {
      p++
      n = { k: 'post', op: '%', a: n }
    }
    return n
  }

  const primary = (): Node => {
    const t = peek()
    if (!t) throw new ParseError('式が 途中で 終わっている')
    p++
    if (t.t === 'num') return { k: 'lit', v: t.v }
    if (t.t === 'str') return { k: 'lit', v: t.v }
    if (t.t === 'err') return { k: 'lit', v: ERR_LITERALS[t.v] }
    if (t.t === 'ref') {
      const a = cellOf(t.v)
      if (isOp(':') && toks[p + 1]?.t === 'ref') {
        p++
        const b = cellOf((toks[p++] as { v: string }).v)
        return { k: 'range', r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) }
      }
      return { k: 'ref', r: a.r, c: a.c }
    }
    if (t.t === 'name') {
      const name = t.v.replace(/^\$/, '')
      // 列ごとの 範囲（B:B、A:C）
      if (/^[A-Z]{1,3}$/.test(name) && isOp(':') && toks[p + 1]?.t === 'name' && /^\$?[A-Z]{1,3}$/.test((toks[p + 1] as { v: string }).v)) {
        p++
        const b = (toks[p++] as { v: string }).v.replace(/^\$/, '')
        const [c1, c2] = [colIdx(name), colIdx(b)]
        return { k: 'range', r1: 0, c1: Math.min(c1, c2), r2: maxRow, c2: Math.max(c1, c2) }
      }
      if (isOp('(')) {
        p++
        const args: Node[] = []
        if (!isOp(')')) {
          for (;;) {
            // 省略された 引数（=IF(A1,,1)）は 空
            if (isOp(',') || isOp(')')) args.push({ k: 'lit', v: null })
            else args.push(expr(1))
            if (isOp(',')) {
              p++
              continue
            }
            break
          }
        }
        expectOp(')')
        return { k: 'fn', name, args }
      }
      return { k: 'name', v: name }
    }
    if (t.v === '(') {
      const n = expr(1)
      expectOp(')')
      return n
    }
    throw new ParseError(`ここに ${t.v} は 置けない`)
  }

  const n = expr(1)
  if (p < toks.length) throw new ParseError('余分な 文字が ある')
  return n
}

// ================================================================ 型の 変換
/** 数に する（文字の 数字も 読む）。できなければ #VALUE! */
function toNum(v: Scalar): number | Err {
  if (isErr(v)) return v
  if (v instanceof TNum) return v.n
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v === null) return 0
  const s = v.trim()
  if (s === '') return E.value
  const lit = parseLiteral(s)
  if (typeof lit === 'number') return lit
  if (lit instanceof TNum) return lit.n
  return E.value
}

/** 数を 文字に（& で つなぐときなど） */
export function numText(n: number) {
  if (Number.isInteger(n)) return String(n)
  return String(Number(n.toPrecision(15)))
}
function toStr(v: Scalar): string | Err {
  if (isErr(v)) return v
  if (v === null) return ''
  if (v instanceof TNum) return numText(v.n)
  if (typeof v === 'number') return numText(v)
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return v
}
function toBool(v: Scalar): boolean | Err {
  if (isErr(v)) return v
  if (typeof v === 'boolean') return v
  if (v === null) return false
  if (typeof v === 'string') {
    if (/^true$/i.test(v)) return true
    if (/^false$/i.test(v)) return false
    return E.value
  }
  return rawNum(v) !== 0
}

// ================================================================ 本体
export function evaluateSheet(raws: string[][]): Scalar[][] {
  const rows = raws.length
  const cols = Math.max(0, ...raws.map((r) => r.length))
  const cache = new Map<number, Scalar>()
  const busy = new Set<number>()
  const parsed = new Map<number, Node | Err>()

  const cell = (r: number, c: number): Scalar => {
    if (r < 0 || c < 0) return E.ref
    const raw = raws[r]?.[c] ?? ''
    if (!raw.startsWith('=') || raw.length < 2) return parseLiteral(raw)
    const key = r * 100000 + c
    if (cache.has(key)) return cache.get(key)!
    if (busy.has(key)) return E.cycle
    busy.add(key)
    let node = parsed.get(key)
    if (!node) {
      try {
        node = parse(raw.slice(1), rows - 1)
      } catch {
        node = E.parse
      }
      parsed.set(key, node)
    }
    let v: Scalar
    if (isErr(node)) v = node
    else {
      const res = ev(node)
      v = isRange(res) ? single(res) : res
      if (v === null) v = 0
    }
    busy.delete(key)
    cache.set(key, v)
    return v
  }

  /** 1マスの 範囲なら その値、それ以外は #VALUE! */
  const single = (rg: Range): Scalar => (rg.r1 === rg.r2 && rg.c1 === rg.c2 ? cell(rg.r1, rg.c1) : E.value)

  /** 範囲の 値を 1列に */
  const cellsOf = (rg: Range): Scalar[] => {
    const out: Scalar[] = []
    const r2 = Math.min(rg.r2, Math.max(rows - 1, rg.r1))
    for (let r = rg.r1; r <= r2; r++) for (let c = rg.c1; c <= rg.c2; c++) out.push(cell(r, c))
    return out
  }
  /** 範囲を 2次元で */
  const grid2 = (rg: Range): Scalar[][] =>
    Array.from({ length: rg.r2 - rg.r1 + 1 }, (_, i) => Array.from({ length: rg.c2 - rg.c1 + 1 }, (_, j) => cell(rg.r1 + i, rg.c1 + j)))

  const scalar = (n: Node): Scalar => {
    const v = ev(n)
    return isRange(v) ? single(v) : v
  }

  const ev = (n: Node): Val => {
    switch (n.k) {
      case 'lit':
        return n.v
      case 'ref':
        return cell(n.r, n.c)
      case 'range':
        return { kind: 'range', r1: n.r1, c1: n.c1, r2: n.r2, c2: n.c2 }
      case 'name':
        if (n.v === 'TRUE') return true
        if (n.v === 'FALSE') return false
        return E.name
      case 'un': {
        const a = scalar(n.a)
        const x = toNum(a)
        if (isErr(x)) return x
        if (n.op === '+') return a instanceof TNum ? a : x
        return a instanceof TNum && a.t !== 'percent' ? new TNum(-x, a.t) : -x
      }
      case 'post': {
        const x = toNum(scalar(n.a))
        return isErr(x) ? x : new TNum(tidy(x / 100), 'percent')
      }
      case 'bin':
        return binary(n.op, scalar(n.a), scalar(n.b))
      case 'fn':
        return call(n.name, n.args)
    }
  }

  // ---------------------------------------------------------------- 演算子
  const binary = (op: string, a: Scalar, b: Scalar): Scalar => {
    if (op === '&') {
      const x = toStr(a)
      if (isErr(x)) return x
      const y = toStr(b)
      return isErr(y) ? y : x + y
    }
    if (op in CMP) {
      if (isErr(a)) return a
      if (isErr(b)) return b
      return CMP[op](compare(a, b))
    }
    const x = toNum(a)
    if (isErr(x)) return x
    const y = toNum(b)
    if (isErr(y)) return y
    let v: number
    if (op === '+') v = x + y
    else if (op === '-') v = x - y
    else if (op === '*') v = x * y
    else if (op === '/') {
      if (y === 0) return E.div0
      v = x / y
    } else {
      v = Math.pow(x, y)
      if (!Number.isFinite(v) || Number.isNaN(v)) return E.num
    }
    v = tidy(v)
    const t = op === '+' || op === '-' ? additiveType(typeOf(a), typeOf(b)) : op === '^' ? null : multiplicativeType(typeOf(a), typeOf(b))
    return t ? new TNum(v, t) : v
  }

  // ---------------------------------------------------------------- 関数
  const call = (name: string, args: Node[]): Val => {
    const f = FUNCS[name]
    if (!f) return E.name
    if (args.length < f.min || args.length > f.max) return E.value
    return f.fn(args, ctx)
  }

  const ctx: Ctx = { ev, scalar, cellsOf, grid2, cell }
  const out: Scalar[][] = []
  for (let r = 0; r < rows; r++) {
    const row: Scalar[] = []
    for (let c = 0; c < cols; c++) row.push(cell(r, c))
    out.push(row)
  }
  return out
}

// ================================================================ 比較
const CMP: Record<string, (d: number) => boolean> = {
  '=': (d) => d === 0,
  '<>': (d) => d !== 0,
  '<': (d) => d < 0,
  '>': (d) => d > 0,
  '<=': (d) => d <= 0,
  '>=': (d) => d >= 0,
}
/** 数 < 文字 < TRUE/FALSE の 順。文字は 大文字・小文字を 区別しない。空は 相手に あわせる */
function compare(a: Scalar, b: Scalar): number {
  const kind = (v: Scalar) => (typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : 0)
  if (a === null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0
  if (b === null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0
  const ka = kind(a)
  const kb = kind(b)
  if (ka !== kb) return ka - kb
  if (ka === 1) {
    const x = (a as string).toLowerCase()
    const y = (b as string).toLowerCase()
    return x < y ? -1 : x > y ? 1 : 0
  }
  if (ka === 2) return Number(a) - Number(b)
  const d = tidy((rawNum(a) as number) - (rawNum(b) as number))
  return d === 0 ? 0 : d < 0 ? -1 : 1
}

// ---------------------------------------------------------------- 日付の 種類（表示形式）
type NT = TNum['t'] | null
const typeOf = (v: Scalar): NT => (v instanceof TNum ? v.t : null)
/** 足し算・引き算：日付＋数 → 日付、日付－日付 → 数（日数） */
function additiveType(a: NT, b: NT): NT {
  if (a === 'percent') a = null
  if (b === 'percent') b = null
  if (!a) return b
  if (!b) return a
  if ((a === 'date' || a === 'datetime') && (b === 'date' || b === 'datetime')) return null
  if (a === 'time' && b === 'date') return 'datetime'
  if (a === 'date' && b === 'time') return 'datetime'
  if (a === 'time' && b === 'time') return 'time'
  return null
}
function multiplicativeType(a: NT, b: NT): NT {
  if (a === 'percent') a = null
  if (b === 'percent') b = null
  if (!a) return b
  if (!b) return a
  return null
}

// ================================================================ 関数の 一覧
interface Ctx {
  ev(n: Node): Val
  scalar(n: Node): Scalar
  cellsOf(rg: Range): Scalar[]
  grid2(rg: Range): Scalar[][]
  cell(r: number, c: number): Scalar
}
type Fn = (args: Node[], c: Ctx) => Val
const FUNCS: Record<string, { min: number; max: number; fn: Fn }> = {}
const def = (names: string | string[], min: number, max: number, fn: Fn) => {
  for (const n of [names].flat()) FUNCS[n] = { min, max, fn }
}

/** 引数から 数を 集める（範囲では 数だけ、直接 書いた 値は 数に 変換） */
function collectNums(args: Node[], c: Ctx, opts: { countBool?: boolean } = {}): number[] | Err {
  const out: number[] = []
  for (const a of args) {
    const v = c.ev(a)
    if (isRange(v)) {
      for (const x of c.cellsOf(v)) {
        if (isErr(x)) return x
        if (typeof x === 'number') out.push(x)
        else if (x instanceof TNum) out.push(x.n)
      }
    } else {
      if (v === null) continue
      if (typeof v === 'boolean' && !opts.countBool) {
        out.push(v ? 1 : 0)
        continue
      }
      const n = toNum(v)
      if (isErr(n)) return n
      out.push(n)
    }
  }
  return out
}
/** 引数の 値を すべて（範囲は 展開） */
function flatVals(args: Node[], c: Ctx): Scalar[] {
  const out: Scalar[] = []
  for (const a of args) {
    const v = c.ev(a)
    if (isRange(v)) out.push(...c.cellsOf(v))
    else out.push(v)
  }
  return out
}
const numArg = (n: Node, c: Ctx): number | Err => toNum(c.scalar(n))
const strArg = (n: Node, c: Ctx): string | Err => toStr(c.scalar(n))
const rangeArg = (n: Node, c: Ctx): Range | Err => {
  const v = c.ev(n)
  if (isRange(v)) return v
  if (n.k === 'ref') return { kind: 'range', r1: n.r, c1: n.c, r2: n.r, c2: n.c }
  return isErr(v) ? v : E.value
}
const optNum = (args: Node[], i: number, c: Ctx, d: number): number | Err => (args[i] === undefined || (args[i].k === 'lit' && args[i].v === null) ? d : numArg(args[i], c))

// ---------------------------------------------------------------- 計算
def('SUM', 1, 255, (a, c) => {
  const xs = collectNums(a, c)
  return isErr(xs) ? xs : tidy(xs.reduce((s, x) => s + x, 0))
})
def('PRODUCT', 1, 255, (a, c) => {
  const xs = collectNums(a, c)
  return isErr(xs) ? xs : tidy(xs.reduce((s, x) => s * x, 1))
})
def('AVERAGE', 1, 255, (a, c) => {
  const xs = collectNums(a, c)
  if (isErr(xs)) return xs
  return xs.length ? tidy(xs.reduce((s, x) => s + x, 0) / xs.length) : E.div0
})
def('MAX', 1, 255, (a, c) => {
  const xs = collectNums(a, c)
  return isErr(xs) ? xs : xs.length ? Math.max(...xs) : 0
})
def('MIN', 1, 255, (a, c) => {
  const xs = collectNums(a, c)
  return isErr(xs) ? xs : xs.length ? Math.min(...xs) : 0
})
def('MEDIAN', 1, 255, (a, c) => {
  const xs = collectNums(a, c)
  if (isErr(xs)) return xs
  if (!xs.length) return E.num
  const s = [...xs].sort((x, y) => x - y)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : tidy((s[m - 1] + s[m]) / 2)
})
FUNCS.LARGE = {
  min: 2,
  max: 2,
  fn: (a, c) => {
    const v = c.ev(a[0])
    const xs = isRange(v) ? c.cellsOf(v).filter((x): x is number | TNum => typeof x === 'number' || x instanceof TNum).map((x) => rawNum(x) as number) : []
    const k = numArg(a[1], c)
    if (isErr(k)) return k
    const s = xs.sort((x, y) => y - x)
    return k < 1 || k > s.length ? E.num : s[Math.floor(k) - 1]
  },
}
FUNCS.SMALL = {
  min: 2,
  max: 2,
  fn: (a, c) => {
    const v = c.ev(a[0])
    const xs = isRange(v) ? c.cellsOf(v).filter((x): x is number | TNum => typeof x === 'number' || x instanceof TNum).map((x) => rawNum(x) as number) : []
    const k = numArg(a[1], c)
    if (isErr(k)) return k
    const s = xs.sort((x, y) => x - y)
    return k < 1 || k > s.length ? E.num : s[Math.floor(k) - 1]
  },
}
def(['RANK', 'RANK.EQ'], 2, 3, (a, c) => {
  const x = numArg(a[0], c)
  if (isErr(x)) return x
  const rg = rangeArg(a[1], c)
  if (isErr(rg)) return rg
  const asc = optNum(a, 2, c, 0)
  if (isErr(asc)) return asc
  const xs = c.cellsOf(rg).filter((v): v is number | TNum => typeof v === 'number' || v instanceof TNum).map((v) => rawNum(v) as number)
  if (!xs.includes(x)) return E.na
  return 1 + xs.filter((v) => (asc ? v < x : v > x)).length
})
def('COUNT', 1, 255, (a, c) => {
  let n = 0
  for (const arg of a) {
    const v = c.ev(arg)
    if (isRange(v)) n += c.cellsOf(v).filter((x) => typeof x === 'number' || x instanceof TNum).length
    else if (typeof v === 'number' || v instanceof TNum || typeof v === 'boolean') n++
    else if (typeof v === 'string' && typeof toNum(v) === 'number') n++
  }
  return n
})
def('COUNTA', 1, 255, (a, c) => flatVals(a, c).filter((x) => x !== null).length)
def('COUNTBLANK', 1, 1, (a, c) => {
  const rg = rangeArg(a[0], c)
  return isErr(rg) ? rg : c.cellsOf(rg).filter((x) => x === null || x === '').length
})
def('SUMPRODUCT', 1, 30, (a, c) => {
  const rs = a.map((x) => rangeArg(x, c))
  const bad = rs.find(isErr)
  if (bad) return bad as Err
  const lists = (rs as Range[]).map((r) => c.cellsOf(r))
  if (lists.some((l) => l.length !== lists[0].length)) return E.value
  let s = 0
  for (let i = 0; i < lists[0].length; i++) s += lists.reduce((p, l) => p * (typeof rawNum(l[i]) === 'number' ? (rawNum(l[i]) as number) : 0), 1)
  return tidy(s)
})

/** 四捨五入（0.5 は 0 から 遠い ほうへ） */
function roundTo(x: number, d: number, mode: 'round' | 'up' | 'down') {
  const f = Math.pow(10, Math.trunc(d))
  const v = Number((Math.abs(x) * f).toPrecision(15))
  const r = mode === 'round' ? Math.floor(v + 0.5) : mode === 'up' ? Math.ceil(v) : Math.floor(v)
  return tidy((Math.sign(x) * r) / f)
}
def('ROUND', 1, 2, (a, c) => {
  const x = numArg(a[0], c)
  const d = optNum(a, 1, c, 0)
  return isErr(x) ? x : isErr(d) ? d : roundTo(x, d, 'round')
})
def('ROUNDUP', 1, 2, (a, c) => {
  const x = numArg(a[0], c)
  const d = optNum(a, 1, c, 0)
  return isErr(x) ? x : isErr(d) ? d : roundTo(x, d, 'up')
})
def(['ROUNDDOWN', 'TRUNC'], 1, 2, (a, c) => {
  const x = numArg(a[0], c)
  const d = optNum(a, 1, c, 0)
  return isErr(x) ? x : isErr(d) ? d : roundTo(x, d, 'down')
})
def('INT', 1, 1, (a, c) => {
  const x = numArg(a[0], c)
  return isErr(x) ? x : Math.floor(x)
})
def('ABS', 1, 1, (a, c) => {
  const x = numArg(a[0], c)
  return isErr(x) ? x : Math.abs(x)
})
def('SQRT', 1, 1, (a, c) => {
  const x = numArg(a[0], c)
  return isErr(x) ? x : x < 0 ? E.num : tidy(Math.sqrt(x))
})
def('POWER', 2, 2, (a, c) => {
  const x = numArg(a[0], c)
  const y = numArg(a[1], c)
  return isErr(x) ? x : isErr(y) ? y : tidy(Math.pow(x, y))
})
def('MOD', 2, 2, (a, c) => {
  const x = numArg(a[0], c)
  const y = numArg(a[1], c)
  if (isErr(x)) return x
  if (isErr(y)) return y
  if (y === 0) return E.div0
  return tidy(x - y * Math.floor(x / y))
})

// ---------------------------------------------------------------- 論理
def('IF', 1, 3, (a, c) => {
  const t = toBool(c.scalar(a[0]))
  if (isErr(t)) return t
  if (t) return a[1] === undefined ? true : c.ev(a[1]) ?? 0
  return a[2] === undefined ? false : c.ev(a[2]) ?? 0
})
def('IFS', 2, 254, (a, c) => {
  for (let i = 0; i + 1 < a.length; i += 2) {
    const t = toBool(c.scalar(a[i]))
    if (isErr(t)) return t
    if (t) return c.ev(a[i + 1])
  }
  return E.na
})
def('SWITCH', 3, 254, (a, c) => {
  const x = c.scalar(a[0])
  if (isErr(x)) return x
  for (let i = 1; i + 1 < a.length; i += 2) if (compare(x, c.scalar(a[i])) === 0) return c.ev(a[i + 1])
  return a.length % 2 === 0 ? c.ev(a[a.length - 1]) : E.na
})
const logicVals = (a: Node[], c: Ctx): boolean[] | Err => {
  const out: boolean[] = []
  for (const arg of a) {
    const v = c.ev(arg)
    const xs = isRange(v) ? c.cellsOf(v).filter((x) => x !== null && typeof x !== 'string') : [v]
    for (const x of xs) {
      const b = toBool(x)
      if (isErr(b)) return b
      out.push(b)
    }
  }
  return out.length ? out : E.value
}
def('AND', 1, 255, (a, c) => {
  const bs = logicVals(a, c)
  return isErr(bs) ? bs : bs.every(Boolean)
})
def('OR', 1, 255, (a, c) => {
  const bs = logicVals(a, c)
  return isErr(bs) ? bs : bs.some(Boolean)
})
def('XOR', 1, 255, (a, c) => {
  const bs = logicVals(a, c)
  return isErr(bs) ? bs : bs.filter(Boolean).length % 2 === 1
})
def('NOT', 1, 1, (a, c) => {
  const b = toBool(c.scalar(a[0]))
  return isErr(b) ? b : !b
})
def('TRUE', 0, 0, () => true)
def('FALSE', 0, 0, () => false)
def('IFERROR', 2, 2, (a, c) => {
  const v = c.scalar(a[0])
  return isErr(v) ? c.ev(a[1]) : v
})
def('IFNA', 2, 2, (a, c) => {
  const v = c.scalar(a[0])
  return isErr(v) && v.code === '#N/A' ? c.ev(a[1]) : v
})
def('ISBLANK', 1, 1, (a, c) => c.scalar(a[0]) === null)
def('ISNUMBER', 1, 1, (a, c) => {
  const v = c.scalar(a[0])
  return typeof v === 'number' || v instanceof TNum
})
def('ISTEXT', 1, 1, (a, c) => typeof c.scalar(a[0]) === 'string')
def('ISERROR', 1, 1, (a, c) => isErr(c.scalar(a[0])))
def('ISNA', 1, 1, (a, c) => {
  const v = c.scalar(a[0])
  return isErr(v) && v.code === '#N/A'
})

// ---------------------------------------------------------------- 条件つき（COUNTIF など）
/** 条件（">=60"、"北"、"<>"、"*店" など）を 判定関数に */
function criteria(cr: Scalar): (v: Scalar) => boolean {
  if (typeof cr === 'boolean') return (v) => v === cr
  if (typeof cr === 'number' || cr instanceof TNum) {
    const want = rawNum(cr) as number
    return (v) => (typeof v === 'number' || v instanceof TNum || typeof v === 'string') && toNum(v) === want
  }
  const s = cr === null || isErr(cr) ? '' : String(cr)
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(s)!
  const op = m[1] ?? '='
  const rest = m[2]
  const lit = rest === '' ? null : parseLiteral(rest)
  const isN = typeof lit === 'number' || lit instanceof TNum
  if (isN) {
    const n = rawNum(lit) as number
    return (v) => {
      if (isErr(v)) return false
      const x = typeof v === 'number' || v instanceof TNum ? (rawNum(v) as number) : null
      if (x === null) return op === '<>'
      return CMP[op](compare(x, n))
    }
  }
  if (rest === '') {
    if (op === '=') return (v) => v === null || v === ''
    if (op === '<>') return (v) => v !== null && v !== ''
  }
  if (op === '=' || op === '<>') {
    const re = wildcard(rest)
    const eq = (v: Scalar) => typeof v === 'string' && re.test(v)
    return op === '=' ? eq : (v) => !eq(v)
  }
  return (v) => typeof v === 'string' && CMP[op](compare(v, rest))
}
function wildcard(p: string) {
  let re = ''
  for (let i = 0; i < p.length; i++) {
    const ch = p[i]
    if (ch === '~' && i + 1 < p.length) re += escapeRe(p[++i])
    else if (ch === '*') re += '[\\s\\S]*'
    else if (ch === '?') re += '[\\s\\S]'
    else re += escapeRe(ch)
  }
  return new RegExp(`^${re}$`, 'i')
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 条件の ペア（範囲, 条件）を すべて 満たす 行の 番号 */
function matchRows(pairs: [Node, Node][], c: Ctx): { idx: number[]; size: [number, number] } | Err {
  let size: [number, number] | null = null
  let idx: number[] | null = null
  for (const [rn, cn] of pairs) {
    const rg = rangeArg(rn, c)
    if (isErr(rg)) return rg
    const sz: [number, number] = [rg.r2 - rg.r1 + 1, rg.c2 - rg.c1 + 1]
    if (size && (size[0] !== sz[0] || size[1] !== sz[1])) return E.value
    size = sz
    const crit = c.scalar(cn)
    if (isErr(crit)) return crit
    const test = criteria(crit)
    const vals = c.cellsOf(rg)
    const ok = vals.map((v, i) => (test(v) ? i : -1)).filter((i) => i >= 0)
    idx = idx ? idx.filter((i) => ok.includes(i)) : ok
  }
  return { idx: idx ?? [], size: size! }
}
/** 合計・平均する 範囲の i 番目（左上を そろえる） */
function valuesAt(n: Node, size: [number, number], idx: number[], c: Ctx): Scalar[] | Err {
  const rg = rangeArg(n, c)
  if (isErr(rg)) return rg
  const cols = size[1]
  return idx.map((i) => c.cell(rg.r1 + Math.floor(i / cols), rg.c1 + (i % cols)))
}
const sumNums = (xs: Scalar[]) => {
  const e = xs.find(isErr)
  if (e) return e as Err
  return tidy(xs.reduce<number>((s, x) => s + (typeof rawNum(x) === 'number' ? (rawNum(x) as number) : 0), 0))
}
const numsOnly = (xs: Scalar[]) => xs.filter((x) => typeof x === 'number' || x instanceof TNum).map((x) => rawNum(x) as number)

def('COUNTIF', 2, 2, (a, c) => {
  const m = matchRows([[a[0], a[1]]], c)
  return isErr(m) ? m : m.idx.length
})
def('COUNTIFS', 2, 254, (a, c) => {
  if (a.length % 2) return E.value
  const m = matchRows(pairsOf(a, 0), c)
  return isErr(m) ? m : m.idx.length
})
def('SUMIF', 2, 3, (a, c) => {
  const m = matchRows([[a[0], a[1]]], c)
  if (isErr(m)) return m
  const xs = valuesAt(a[2] ?? a[0], m.size, m.idx, c)
  return isErr(xs) ? xs : sumNums(xs)
})
def('SUMIFS', 3, 255, (a, c) => {
  if (a.length % 2 === 0) return E.value
  const m = matchRows(pairsOf(a, 1), c)
  if (isErr(m)) return m
  const xs = valuesAt(a[0], m.size, m.idx, c)
  return isErr(xs) ? xs : sumNums(xs)
})
def('AVERAGEIF', 2, 3, (a, c) => {
  const m = matchRows([[a[0], a[1]]], c)
  if (isErr(m)) return m
  const xs = valuesAt(a[2] ?? a[0], m.size, m.idx, c)
  if (isErr(xs)) return xs
  const ns = numsOnly(xs)
  return ns.length ? tidy(ns.reduce((s, x) => s + x, 0) / ns.length) : E.div0
})
def('AVERAGEIFS', 3, 255, (a, c) => {
  const m = matchRows(pairsOf(a, 1), c)
  if (isErr(m)) return m
  const xs = valuesAt(a[0], m.size, m.idx, c)
  if (isErr(xs)) return xs
  const ns = numsOnly(xs)
  return ns.length ? tidy(ns.reduce((s, x) => s + x, 0) / ns.length) : E.div0
})
for (const [name, pick] of [
  ['MAXIFS', (xs: number[]) => Math.max(...xs)],
  ['MINIFS', (xs: number[]) => Math.min(...xs)],
] as const)
  FUNCS[name] = {
    min: 3,
    max: 255,
    fn: (a, c) => {
      const m = matchRows(pairsOf(a, 1), c)
      if (isErr(m)) return m
      const xs = valuesAt(a[0], m.size, m.idx, c)
      if (isErr(xs)) return xs
      const ns = numsOnly(xs)
      return ns.length ? pick(ns) : 0
    },
  }
function pairsOf(a: Node[], from: number): [Node, Node][] {
  const out: [Node, Node][] = []
  for (let i = from; i + 1 < a.length; i += 2) out.push([a[i], a[i + 1]])
  return out
}

// ---------------------------------------------------------------- 検索
/** 完全一致（文字は 大文字・小文字を 区別しない。wild なら * ? も 使える） */
function exactMatch(list: Scalar[], x: Scalar, wild: boolean): number {
  if (wild && typeof x === 'string' && /[*?~]/.test(x)) {
    const re = wildcard(x)
    return list.findIndex((v) => typeof v === 'string' && re.test(v))
  }
  return list.findIndex((v) => v !== null && !isErr(v) && kindOf(v) === kindOf(x) && compare(v, x) === 0)
}
const kindOf = (v: Scalar) => (typeof v === 'string' ? 's' : typeof v === 'boolean' ? 'b' : 'n')
/** 近似一致：x 以下で いちばん 大きい 値（小さい順に 並んでいる 前提） */
function approxMatch(list: Scalar[], x: Scalar): number {
  let best = -1
  for (let i = 0; i < list.length; i++) {
    const v = list[i]
    if (v === null || isErr(v) || kindOf(v) !== kindOf(x)) continue
    if (compare(v, x) <= 0) best = i
    else break
  }
  return best
}

for (const vertical of [true, false])
  FUNCS[vertical ? 'VLOOKUP' : 'HLOOKUP'] = {
    min: 3,
    max: 4,
    fn: (a, c) => {
      const x = c.scalar(a[0])
      if (isErr(x)) return x
      const rg = rangeArg(a[1], c)
      if (isErr(rg)) return rg
      const k = numArg(a[2], c)
      if (isErr(k)) return k
      // 4つ目：TRUE（省略）なら 近似一致、FALSE なら 完全一致
      const approx = a[3] === undefined ? true : toBool(c.scalar(a[3]))
      if (isErr(approx)) return approx
      const g = c.grid2(rg)
      const n = Math.trunc(k)
      if (n < 1) return E.value
      if (vertical ? n > g[0].length : n > g.length) return E.ref
      const keys = vertical ? g.map((row) => row[0]) : g[0]
      const i = approx ? approxMatch(keys, x) : exactMatch(keys, x, true)
      if (i < 0) return E.na
      return (vertical ? g[i][n - 1] : g[n - 1][i]) ?? 0
    },
  }
def('XLOOKUP', 3, 6, (a, c) => {
  const x = c.scalar(a[0])
  if (isErr(x)) return x
  const look = rangeArg(a[1], c)
  if (isErr(look)) return look
  const ret = rangeArg(a[2], c)
  if (isErr(ret)) return ret
  const mode = optNum(a, 4, c, 0)
  if (isErr(mode)) return mode
  const keys = c.cellsOf(look)
  const vertical = look.c1 === look.c2
  let i = -1
  if (mode === 0 || mode === 2) i = exactMatch(keys, x, mode === 2)
  else if (mode === -1) i = approxMatch(keys, x)
  else {
    // 1：x 以上で いちばん 小さい 値
    let best = -1
    keys.forEach((v, j) => {
      if (v !== null && !isErr(v) && kindOf(v) === kindOf(x) && compare(v, x) >= 0 && (best < 0 || compare(v, keys[best]) < 0)) best = j
    })
    i = best
  }
  if (i < 0) return a[3] !== undefined && !(a[3].k === 'lit' && a[3].v === null) ? c.ev(a[3]) : E.na
  const g = c.grid2(ret)
  if (vertical) return g[i]?.[0] ?? E.value
  return g[0]?.[i] ?? E.value
})
def('MATCH', 2, 3, (a, c) => {
  const x = c.scalar(a[0])
  if (isErr(x)) return x
  const rg = rangeArg(a[1], c)
  if (isErr(rg)) return rg
  const type = optNum(a, 2, c, 1)
  if (isErr(type)) return type
  const list = c.cellsOf(rg)
  let i: number
  if (type === 0) i = exactMatch(list, x, true)
  else if (type > 0) i = approxMatch(list, x)
  else {
    i = -1
    for (let j = 0; j < list.length; j++) {
      const v = list[j]
      if (v === null || isErr(v) || kindOf(v) !== kindOf(x)) continue
      if (compare(v, x) >= 0) i = j
      else break
    }
  }
  return i < 0 ? E.na : i + 1
})
def('INDEX', 2, 3, (a, c) => {
  const rg = rangeArg(a[0], c)
  if (isErr(rg)) return rg
  const g = c.grid2(rg)
  let r = numArg(a[1], c)
  if (isErr(r)) return r
  let col = optNum(a, 2, c, 0)
  if (isErr(col)) return col
  // 1行 だけの 範囲なら 2つ目は 列番号。1列 だけなら 列は 1
  if (a[2] === undefined && g.length === 1) [r, col] = [1, r]
  else if (a[2] === undefined && g[0].length === 1) col = 1
  if (r < 0 || col < 0 || r > g.length || col > g[0].length) return E.ref
  if (r === 0 || col === 0) return E.value
  return g[r - 1][col - 1] ?? 0
})
def('CHOOSE', 2, 255, (a, c) => {
  const i = numArg(a[0], c)
  if (isErr(i)) return i
  const k = Math.trunc(i)
  return k < 1 || k >= a.length ? E.value : c.ev(a[k])
})

// ---------------------------------------------------------------- 文字
/** 1つ目が 文字、2つ目からが 数の 関数 */
const textFn = (f: (s: string, rest: number[]) => Scalar) => (a: Node[], c: Ctx) => {
  const s = strArg(a[0], c)
  if (isErr(s)) return s
  const rest = a.slice(1).map((n) => numArg(n, c))
  const bad = rest.find(isErr)
  if (bad) return bad as Err
  return f(s, rest as number[])
}
def('LEFT', 1, 2, textFn((s, [n = 1]) => (n < 0 ? E.value : [...s].slice(0, n as number).join(''))))
def('RIGHT', 1, 2, textFn((s, [n = 1]) => (n < 0 ? E.value : n === 0 ? '' : [...s].slice(-n).join(''))))
def('MID', 3, 3, textFn((s, [st, n]) => (st < 1 || n < 0 ? E.value : [...s].slice(st - 1, st - 1 + n).join(''))))
def('LEN', 1, 1, textFn((s) => [...s].length))
def('UPPER', 1, 1, textFn((s) => s.toUpperCase()))
def('LOWER', 1, 1, textFn((s) => s.toLowerCase()))
def('PROPER', 1, 1, textFn((s) => s.toLowerCase().replace(/(^|[^a-z])([a-z])/g, (_m, p, ch) => p + ch.toUpperCase())))
/** TRIM：前後の 空白を 消し、間の 空白を 1つに（半角スペースだけ） */
def('TRIM', 1, 1, textFn((s) => s.replace(/ +/g, ' ').replace(/^ | $/g, '')))
def('REPT', 2, 2, textFn((s, [n]) => (n < 0 ? E.value : s.repeat(Math.trunc(n)))))
for (const [name, ci] of [
  ['FIND', false],
  ['SEARCH', true],
] as const)
  def(name, 2, 3, (a, c) => {
    const what = strArg(a[0], c)
    if (isErr(what)) return what
    const s = strArg(a[1], c)
    if (isErr(s)) return s
    const st = optNum(a, 2, c, 1)
    if (isErr(st)) return st
    const chars = [...s]
    if (st < 1 || st > chars.length + 1) return E.value
    const hay = chars.slice(st - 1).join('')
    let i: number
    if (ci) {
      const m = wildcard(what).source.slice(1, -1)
      const r = new RegExp(m, 'i').exec(hay)
      i = r ? r.index : -1
    } else i = hay.indexOf(what)
    return i < 0 ? E.value : [...hay.slice(0, i)].length + st
  })
def('SUBSTITUTE', 3, 4, (a, c) => {
  const s = strArg(a[0], c)
  const from = strArg(a[1], c)
  const to = strArg(a[2], c)
  if (isErr(s)) return s
  if (isErr(from)) return from
  if (isErr(to)) return to
  if (from === '') return s
  if (a[3] === undefined) return s.split(from).join(to)
  const k = numArg(a[3], c)
  if (isErr(k)) return k
  if (k < 1) return E.value
  let pos = -1
  for (let i = 0; i < k; i++) {
    pos = s.indexOf(from, pos + 1)
    if (pos < 0) return s
  }
  return s.slice(0, pos) + to + s.slice(pos + from.length)
})
def('REPLACE', 4, 4, (a, c) => {
  const s = strArg(a[0], c)
  const st = numArg(a[1], c)
  const n = numArg(a[2], c)
  const to = strArg(a[3], c)
  if (isErr(s)) return s
  if (isErr(st)) return st
  if (isErr(n)) return n
  if (isErr(to)) return to
  const chars = [...s]
  return chars.slice(0, st - 1).join('') + to + chars.slice(st - 1 + n).join('')
})
def(['CONCAT', 'CONCATENATE'], 1, 255, (a, c) => {
  let s = ''
  for (const v of flatVals(a, c)) {
    const t = toStr(v)
    if (isErr(t)) return t
    s += t
  }
  return s
})
def('TEXTJOIN', 3, 255, (a, c) => {
  const sep = strArg(a[0], c)
  if (isErr(sep)) return sep
  const skip = toBool(c.scalar(a[1]))
  if (isErr(skip)) return skip
  const parts: string[] = []
  for (const v of flatVals(a.slice(2), c)) {
    const t = toStr(v)
    if (isErr(t)) return t
    if (!(skip && t === '')) parts.push(t)
  }
  return parts.join(sep)
})
def('VALUE', 1, 1, (a, c) => {
  const v = c.scalar(a[0])
  if (typeof v === 'number' || v instanceof TNum) return rawNum(v)
  return toNum(v)
})
const WD = ['日', '月', '火', '水', '木', '金', '土']
/** TEXT：よく 使う 書式だけ（0、0.0、#,##0、yyyy/m/d、aaa など） */
def('TEXT', 2, 2, (a, c) => {
  const v = c.scalar(a[0])
  if (isErr(v)) return v
  const fmt = strArg(a[1], c)
  if (isErr(fmt)) return fmt
  const n = toNum(v)
  if (isErr(n)) return typeof v === 'string' ? v : n
  if (/[ymdaghs]/i.test(fmt)) {
    const p = serialParts(n)
    const frac = n - Math.floor(n + 1e-9)
    const mins = Math.round(frac * 1440)
    return fmt
      .replace(/yyyy/gi, String(p.y))
      .replace(/yy/gi, String(p.y).slice(-2))
      .replace(/aaaa/g, WD[p.wd] + '曜日')
      .replace(/aaa/g, WD[p.wd])
      .replace(/hh?/gi, (h) => String(Math.floor(mins / 60)).padStart(h.length, '0'))
      .replace(/mm(?=\D*$)|mm/gi, (m, off: number, full: string) => (/h/i.test(full.slice(0, off)) ? String(mins % 60).padStart(2, '0') : String(p.m).padStart(m.length, '0')))
      .replace(/(?<![a-z])m(?![a-z])/gi, String(p.m))
      .replace(/dd/gi, String(p.d).padStart(2, '0'))
      .replace(/(?<![a-z])d(?![a-z])/gi, String(p.d))
  }
  const dec = /\.(0+)/.exec(fmt)?.[1].length ?? 0
  const x = roundTo(n, dec, 'round')
  let s = Math.abs(x).toFixed(dec)
  if (fmt.includes(',')) s = s.replace(/^(\d+)/, (d) => d.replace(/\B(?=(\d{3})+$)/g, ','))
  if (fmt.includes('%')) s = roundTo(n * 100, dec, 'round').toFixed(dec) + '%'
  return (x < 0 && !fmt.includes('%') ? '-' : '') + s
})

// ---------------------------------------------------------------- 日付
const dateArg = (n: Node, c: Ctx): number | Err => {
  const v = c.scalar(n)
  if (typeof v === 'string') {
    const d = parseDateTime(v.trim())
    return d ? d.n : E.value
  }
  return toNum(v)
}
const D = (n: number) => new TNum(n, 'date')
def('DATE', 3, 3, (a, c) => {
  const [y, m, d] = a.map((n) => numArg(n, c))
  for (const x of [y, m, d]) if (isErr(x)) return x
  const yy = Math.trunc(y as number) + (Math.trunc(y as number) < 1900 ? 1900 : 0)
  return D(Math.round((Date.UTC(yy, Math.trunc(m as number) - 1, Math.trunc(d as number)) - EPOCH) / DAY_MS))
})
def('DATEVALUE', 1, 1, (a, c) => dateArg(a[0], c))
for (const [name, part] of [
  ['YEAR', 'y'],
  ['MONTH', 'm'],
  ['DAY', 'd'],
] as const)
  def(name, 1, 1, (a, c) => {
    const n = dateArg(a[0], c)
    return isErr(n) ? n : serialParts(n)[part]
  })
def('WEEKDAY', 1, 2, (a, c) => {
  const n = dateArg(a[0], c)
  if (isErr(n)) return n
  const t = optNum(a, 1, c, 1)
  if (isErr(t)) return t
  const wd = serialParts(n).wd // 0:日
  if (t === 1) return wd + 1
  if (t === 2) return wd === 0 ? 7 : wd
  if (t === 3) return wd === 0 ? 6 : wd - 1
  return E.num
})
function addMonths(n: number, k: number, end: boolean) {
  const p = serialParts(n)
  const total = p.y * 12 + (p.m - 1) + Math.trunc(k)
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  const d = end ? daysInMonth(y, m) : Math.min(p.d, daysInMonth(y, m))
  return dateToSerial(y, m, d)
}
def('EDATE', 2, 2, (a, c) => {
  const n = dateArg(a[0], c)
  const k = numArg(a[1], c)
  return isErr(n) ? n : isErr(k) ? k : D(addMonths(n, k, false))
})
def('EOMONTH', 2, 2, (a, c) => {
  const n = dateArg(a[0], c)
  const k = numArg(a[1], c)
  return isErr(n) ? n : isErr(k) ? k : D(addMonths(n, k, true))
})
def('DATEDIF', 3, 3, (a, c) => {
  const s = dateArg(a[0], c)
  const e = dateArg(a[1], c)
  const u = strArg(a[2], c)
  if (isErr(s)) return s
  if (isErr(e)) return e
  if (isErr(u)) return u
  if (e < s) return E.num
  const p = serialParts(s)
  const q = serialParts(e)
  let months = (q.y - p.y) * 12 + (q.m - p.m)
  if (q.d < p.d) months--
  switch (u.toUpperCase()) {
    case 'D':
      return Math.floor(e) - Math.floor(s)
    case 'M':
      return months
    case 'Y':
      return Math.floor(months / 12)
    case 'YM':
      return months % 12
    case 'MD': {
      if (q.d >= p.d) return q.d - p.d
      const pm = q.m === 1 ? 12 : q.m - 1
      const py = q.m === 1 ? q.y - 1 : q.y
      return daysInMonth(py, pm) - p.d + q.d
    }
    case 'YD': {
      const yearsAdded = addMonths(s, Math.floor(months / 12) * 12, false)
      return Math.floor(e) - yearsAdded
    }
  }
  return E.num
})
def('DAYS', 2, 2, (a, c) => {
  const e = dateArg(a[0], c)
  const s = dateArg(a[1], c)
  return isErr(e) ? e : isErr(s) ? s : Math.floor(e) - Math.floor(s)
})
const today = () => {
  const d = new Date()
  return dateToSerial(d.getFullYear(), d.getMonth() + 1, d.getDate())
}
def('TODAY', 0, 0, () => D(today()))
def('NOW', 0, 0, () => {
  const d = new Date()
  return new TNum(today() + timeFrac(d.getHours(), d.getMinutes(), d.getSeconds()), 'datetime')
})
const isWorkday = (n: number, holidays: Set<number>) => {
  const wd = serialParts(n).wd
  return wd !== 0 && wd !== 6 && !holidays.has(n)
}
const holidaySet = (a: Node | undefined, c: Ctx): Set<number> | Err => {
  if (!a) return new Set()
  const v = c.ev(a)
  const xs = isRange(v) ? c.cellsOf(v) : [v]
  const out = new Set<number>()
  for (const x of xs) {
    if (x === null) continue
    if (isErr(x)) return x
    const n = toNum(x)
    if (!isErr(n)) out.add(Math.floor(n))
  }
  return out
}
def('NETWORKDAYS', 2, 3, (a, c) => {
  const s = dateArg(a[0], c)
  const e = dateArg(a[1], c)
  const h = holidaySet(a[2], c)
  if (isErr(s)) return s
  if (isErr(e)) return e
  if (isErr(h)) return h
  const [lo, hi] = s <= e ? [s, e] : [e, s]
  let n = 0
  for (let d = Math.floor(lo); d <= Math.floor(hi); d++) if (isWorkday(d, h)) n++
  return s <= e ? n : -n
})
def('WORKDAY', 2, 3, (a, c) => {
  const s = dateArg(a[0], c)
  const k = numArg(a[1], c)
  const h = holidaySet(a[2], c)
  if (isErr(s)) return s
  if (isErr(k)) return k
  if (isErr(h)) return h
  let d = Math.floor(s)
  let left = Math.trunc(k)
  const step = left >= 0 ? 1 : -1
  while (left !== 0) {
    d += step
    if (isWorkday(d, h)) left -= step
  }
  return D(d)
})
def('TIME', 3, 3, (a, c) => {
  const [h, m, s] = a.map((n) => numArg(n, c))
  for (const x of [h, m, s]) if (isErr(x)) return x
  const t = timeFrac(h as number, m as number, s as number)
  return new TNum(t - Math.floor(t), 'time')
})
for (const [name, part] of [
  ['HOUR', 0],
  ['MINUTE', 1],
  ['SECOND', 2],
] as const)
  def(name, 1, 1, (a, c) => {
    const n = dateArg(a[0], c)
    if (isErr(n)) return n
    const secs = Math.round((n - Math.floor(n)) * 86400)
    return [Math.floor(secs / 3600), Math.floor(secs / 60) % 60, secs % 60][part]
  })

/** このエンジンが 知っている 関数 */
export const ENGINE_FUNCS = Object.keys(FUNCS)
