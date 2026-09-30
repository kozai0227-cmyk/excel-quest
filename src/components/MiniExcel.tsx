import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  addr,
  cloneGrid,
  colName,
  evaluate,
  fillLine,
  formatValue,
  formulaRefs,
  normalizeInput,
  rangeAddr,
  shiftFormula,
  toggleAbsAt,
  type Cell,
  type Grid,
  type Value,
} from '../game/formula'
import { useInputMode } from '../game/inputMode'
import { dropLast, type ChipGroup } from '../game/formulaTokens'
import { FormulaPad, type PadAction } from './FormulaPad'

const ROW_H = 26
const HEAD_W = 40
const HEAD_H = 24
const DEFAULT_W = 90
const REF_COLORS = ['#2f6ad8', '#d83a3a', '#8a44c8', '#1e9a4a', '#c87a10', '#0a9aa8']

interface Sel {
  ar: number
  ac: number
  fr: number
  fc: number
}
const norm = (s: Sel) => ({
  r1: Math.min(s.ar, s.fr),
  c1: Math.min(s.ac, s.fc),
  r2: Math.max(s.ar, s.fr),
  c2: Math.max(s.ac, s.fc),
})
type Range = ReturnType<typeof norm>

/** 数式入力中にキーボード／マウスで差し込んでいる参照 */
interface PointRef {
  start: number
  ar: number
  ac: number
  fr: number
  fc: number
}

interface Props {
  initial: Grid
  initialHistory?: Grid[]
  colWidths?: number[]
  /** スマホ用の 数式ボタン（入力方式が touch のときだけ 表示） */
  pad?: ChipGroup[]
  onChange?(grid: Grid, values: Value[][], actions: Set<string>): void
}

const ARROWS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }

export function MiniExcel({ initial, initialHistory, colWidths, pad, onChange }: Props) {
  const rows = initial.length
  const cols = initial[0].length
  const widths = Array.from({ length: cols }, (_, c) => colWidths?.[c] ?? DEFAULT_W)
  const lefts = widths.reduce<number[]>((acc, _w, i) => [...acc, i === 0 ? HEAD_W : acc[i - 1] + widths[i - 1]], [])

  const [grid, setGrid] = useState<Grid>(initial)
  const [past, setPast] = useState<Grid[]>(initialHistory ?? [])
  const [future, setFuture] = useState<Grid[]>([])
  const [sel, setSel] = useState<Sel>({ ar: 0, ac: 0, fr: 0, fc: 0 })
  const [edit, setEdit] = useState<{ value: string; mode: 'enter' | 'edit' } | null>(null)
  const [point, setPoint] = useState<PointRef | null>(null)
  const [clip, setClip] = useState<{ cells: Cell[][]; r: number; c: number; cut: boolean } | null>(null)
  const [fillTo, setFillTo] = useState<Range | null>(null)
  const tabStart = useRef<number | null>(null)
  const actions = useRef(new Set<string>())
  const inputRef = useRef<HTMLInputElement>(null)
  const touch = useInputMode() === 'touch' && !!pad
  /** スマホで 文字を打つときだけ、ふつうの キーボードを出す */
  const [kbd, setKbd] = useState(false)
  const drag = useRef<null | { kind: 'select' } | { kind: 'fill' } | { kind: 'ref' }>(null)

  const values = useMemo(() => evaluate(grid), [grid])
  const R = norm(sel)
  const multi = R.r1 !== R.r2 || R.c1 !== R.c2

  useEffect(() => {
    onChange?.(grid, values, actions.current)
  }, [values]) // eslint-disable-line react-hooks/exhaustive-deps

  const focus = () => inputRef.current?.focus({ preventScroll: true })
  useEffect(focus, [])

  const apply = (next: Grid, action: string) => {
    setPast((p) => [...p, grid])
    setFuture([])
    actions.current.add(action)
    setGrid(next)
  }

  const clampR = (r: number) => Math.max(0, Math.min(rows - 1, r))
  const clampC = (c: number) => Math.max(0, Math.min(cols - 1, c))
  const moveTo = (r: number, c: number) => setSel({ ar: clampR(r), ac: clampC(c), fr: clampR(r), fc: clampC(c) })
  const isEmpty = (r: number, c: number) => grid[r]?.[c]?.raw === ''

  /** Enter / Tab での移動。範囲選択中は範囲内を順番に移動する */
  const advance = (dr: number, dc: number) => {
    if (multi) {
      let r = sel.ar + dr
      let c = sel.ac + dc
      if (r > R.r2) [r, c] = [R.r1, c + 1 > R.c2 ? R.c1 : c + 1]
      if (r < R.r1) [r, c] = [R.r2, c - 1 < R.c1 ? R.c2 : c - 1]
      if (c > R.c2) [r, c] = [r + 1 > R.r2 ? R.r1 : r + 1, R.c1]
      if (c < R.c1) [r, c] = [r - 1 < R.r1 ? R.r2 : r - 1, R.c2]
      setSel({ ...sel, ar: r, ac: c })
      return
    }
    if (dc !== 0) {
      tabStart.current ??= sel.ac
      moveTo(sel.ar, sel.ac + dc)
    } else if (dr > 0 && tabStart.current !== null) {
      // Tab で右へ進んでから Enter → 最初の列の次の行へ（Excel と同じ）
      moveTo(sel.ar + 1, tabStart.current)
      tabStart.current = null
    } else {
      tabStart.current = null
      moveTo(sel.ar + dr, sel.ac)
    }
  }

  /** 入力の確定。all=true（Ctrl+Enter）なら選択範囲すべてに入力 */
  const commit = (move: [number, number] | null, all = false) => {
    if (!edit) return
    const raw = normalizeInput(edit.value)
    const next = cloneGrid(grid)
    let changed = false
    const targets: [number, number][] = all ? [] : [[sel.ar, sel.ac]]
    if (all) for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) targets.push([r, c])
    for (const [r, c] of targets) {
      const v = shiftFormula(raw, r - sel.ar, c - sel.ac)
      if (next[r][c].raw !== v) {
        next[r][c] = { ...next[r][c], raw: v }
        changed = true
      }
    }
    if (changed) {
      const cur = grid[sel.ar][sel.ac]
      apply(next, all ? 'fill' : cur.raw === '' && edit.mode === 'enter' ? 'input' : 'edit')
      setClip(null)
    }
    setEdit(null)
    setPoint(null)
    if (move) advance(move[0], move[1])
  }

  const startEdit = (value = grid[sel.ar][sel.ac].raw, mode: 'enter' | 'edit' = 'edit') => {
    setEdit({ value, mode })
    setPoint(null)
  }

  const clearRange = () => {
    const next = cloneGrid(grid)
    for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) next[r][c].raw = ''
    apply(next, 'clear')
  }

  const copy = (cut = false) => {
    const cells = grid.slice(R.r1, R.r2 + 1).map((row) => row.slice(R.c1, R.c2 + 1).map((c) => ({ ...c })))
    setClip({ cells, r: R.r1, c: R.c1, cut })
    actions.current.add(cut ? 'cut' : 'copy')
  }

  const paste = () => {
    if (!clip) return
    const next = cloneGrid(grid)
    const h = clip.cells.length
    const w = clip.cells[0].length
    // 1セルをコピーして範囲に貼ると、範囲全体に貼られる
    const fillAll = h === 1 && w === 1 && multi && !clip.cut
    const targetH = fillAll ? R.r2 - R.r1 + 1 : h
    const targetW = fillAll ? R.c2 - R.c1 + 1 : w
    if (clip.cut)
      for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) next[clip.r + i][clip.c + j] = { raw: '' }
    for (let i = 0; i < targetH; i++)
      for (let j = 0; j < targetW; j++) {
        const r = R.r1 + i
        const c = R.c1 + j
        if (r >= rows || c >= cols) continue
        const cell = clip.cells[fillAll ? 0 : i][fillAll ? 0 : j]
        // 切り取り → 貼り付け（移動）は参照をずらさない
        const raw = clip.cut ? cell.raw : shiftFormula(cell.raw, r - (clip.r + (fillAll ? 0 : i)), c - (clip.c + (fillAll ? 0 : j)))
        next[r][c] = { ...cell, raw }
      }
    apply(next, 'paste')
    setSel({ ar: R.r1, ac: R.c1, fr: clampR(R.r1 + targetH - 1), fc: clampC(R.c1 + targetW - 1) })
    if (clip.cut) setClip(null)
  }

  const undo = () => {
    if (!past.length) return
    setFuture((f) => [grid, ...f])
    setGrid(past[past.length - 1])
    setPast(past.slice(0, -1))
    actions.current.add('undo')
  }
  const redo = () => {
    if (!future.length) return
    setPast((p) => [...p, grid])
    setGrid(future[0])
    setFuture(future.slice(1))
    actions.current.add('redo')
  }

  const toggleBold = () => {
    let all = true
    for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) all &&= !!grid[r][c].bold
    const next = cloneGrid(grid)
    for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) next[r][c].bold = !all
    apply(next, 'bold')
  }

  /** Ctrl+D（下へコピー）／ Ctrl+R（右へコピー） */
  const fillCopy = (vertical: boolean) => {
    const next = cloneGrid(grid)
    if (vertical) {
      const top = R.r1 === R.r2 ? R.r1 - 1 : R.r1
      if (top < 0) return
      for (let r = top + 1; r <= R.r2; r++)
        for (let c = R.c1; c <= R.c2; c++) next[r][c] = { ...grid[top][c], raw: shiftFormula(grid[top][c].raw, r - top, 0) }
    } else {
      const left = R.c1 === R.c2 ? R.c1 - 1 : R.c1
      if (left < 0) return
      for (let r = R.r1; r <= R.r2; r++)
        for (let c = left + 1; c <= R.c2; c++) next[r][c] = { ...grid[r][left], raw: shiftFormula(grid[r][left].raw, 0, c - left) }
    }
    apply(next, 'fill')
  }

  /** フィルハンドルでのオートフィル（上下左右） */
  const doFill = (to: Range) => {
    const next = cloneGrid(grid)
    if (to.r2 > R.r2 || to.r1 < R.r1) {
      const down = to.r2 > R.r2
      for (let c = R.c1; c <= R.c2; c++) {
        let src = grid.slice(R.r1, R.r2 + 1).map((row) => row[c])
        if (!down) src = [...src].reverse()
        const n = down ? to.r2 - R.r2 : R.r1 - to.r1
        const out = fillLine(src, n, (raw, steps) => shiftFormula(raw, down ? steps : -steps, 0))
        out.forEach((cell, k) => (next[down ? R.r2 + 1 + k : R.r1 - 1 - k][c] = cell))
      }
    } else if (to.c2 > R.c2 || to.c1 < R.c1) {
      const right = to.c2 > R.c2
      for (let r = R.r1; r <= R.r2; r++) {
        let src = grid[r].slice(R.c1, R.c2 + 1)
        if (!right) src = [...src].reverse()
        const n = right ? to.c2 - R.c2 : R.c1 - to.c1
        const out = fillLine(src, n, (raw, steps) => shiftFormula(raw, 0, right ? steps : -steps))
        out.forEach((cell, k) => (next[r][right ? R.c2 + 1 + k : R.c1 - 1 - k] = cell))
      }
    } else return
    apply(next, 'fill')
    setSel({ ar: to.r1, ac: to.c1, fr: to.r2, fc: to.c2 })
  }

  /** フィルハンドルのダブルクリック：隣の列のデータがある所まで下へ */
  const autoFillDown = () => {
    for (const c of [R.c1 - 1, R.c2 + 1]) {
      if (c < 0 || c >= cols) continue
      let r = R.r2
      while (r + 1 < rows && !isEmpty(r + 1, c)) r++
      if (r > R.r2) return doFill({ ...R, r2: r })
    }
  }

  /** Ctrl+矢印：データの端までジャンプ */
  const jump = (r: number, c: number, dr: number, dc: number) => {
    const inside = (rr: number, cc: number) => rr >= 0 && rr < rows && cc >= 0 && cc < cols
    if (!inside(r + dr, c + dc)) return [r, c]
    if (!isEmpty(r, c) && !isEmpty(r + dr, c + dc)) {
      while (inside(r + dr, c + dc) && !isEmpty(r + dr, c + dc)) [r, c] = [r + dr, c + dc]
      return [r, c]
    }
    ;[r, c] = [r + dr, c + dc]
    while (inside(r + dr, c + dc) && isEmpty(r, c)) [r, c] = [r + dr, c + dc]
    return [r, c]
  }

  // ---------------------------------------------------------------- 参照の差し込み（ポイントモード）
  const canInsertRef = (v: string) => v.startsWith('=') && /[=(,+\-*/:&<>^]$/.test(v)
  const setPointRef = (p: PointRef) => {
    setPoint(p)
    setEdit((ed) => (ed ? { ...ed, value: ed.value.slice(0, p.start) + rangeAddr(p.ar, p.ac, p.fr, p.fc) } : ed))
  }

  // ---------------------------------------------------------------- キーボード
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    const mod = e.ctrlKey || e.metaKey
    const k = e.key

    if (edit) {
      if (k === 'Enter') {
        e.preventDefault()
        if (mod) commit(null, true)
        else commit([e.shiftKey ? -1 : 1, 0])
      } else if (k === 'Tab') {
        e.preventDefault()
        commit([0, e.shiftKey ? -1 : 1])
      } else if (k === 'Escape') {
        e.preventDefault()
        setEdit(null)
        setPoint(null)
      } else if (k === 'F2') {
        e.preventDefault()
        setEdit({ ...edit, mode: edit.mode === 'edit' ? 'enter' : 'edit' })
      } else if (k === 'F4') {
        // 数式の入力中に F4 → カーソル位置の参照の「$」を切り替える
        e.preventDefault()
        // 連打にも追いつけるよう、state ではなく 入力欄の 現在の値を 使う
        const el = e.currentTarget
        const t = toggleAbsAt(el.value, el.selectionStart ?? el.value.length)
        if (t) {
          el.value = t.text
          el.setSelectionRange(t.caret, t.caret)
          setPoint(null)
          setEdit((ed) => (ed ? { ...ed, value: t.text } : ed))
          actions.current.add('f4')
          requestAnimationFrame(() => el.setSelectionRange(t.caret, t.caret))
        }
      } else if (ARROWS[k] && edit.mode === 'enter') {
        const [dr, dc] = ARROWS[k]
        if (edit.value.startsWith('=') && (point || canInsertRef(edit.value))) {
          // 数式の途中で矢印キー → セル参照を差し込む（Excel のポイントモード）
          e.preventDefault()
          const base = point ?? { start: edit.value.length, ar: sel.ar, ac: sel.ac, fr: sel.ar, fc: sel.ac }
          if (e.shiftKey) setPointRef({ ...base, fr: clampR(base.fr + dr), fc: clampC(base.fc + dc) })
          else {
            const r = clampR((point ? base.ar : sel.ar) + dr)
            const c = clampC((point ? base.ac : sel.ac) + dc)
            setPointRef({ start: base.start, ar: r, ac: c, fr: r, fc: c })
          }
        } else {
          // 入力モードの矢印は「確定して移動」
          e.preventDefault()
          commit([dr, dc])
        }
      }
      return
    }

    if (mod) {
      const key = k.toLowerCase()
      if (ARROWS[k]) {
        e.preventDefault()
        const [dr, dc] = ARROWS[k]
        const from = e.shiftKey ? [sel.fr, sel.fc] : [sel.ar, sel.ac]
        const [r, c] = jump(from[0], from[1], dr, dc)
        if (e.shiftKey) setSel({ ...sel, fr: r, fc: c })
        else moveTo(r, c)
        return
      }
      const handlers: Record<string, () => void> = {
        c: () => copy(false),
        x: () => copy(true),
        v: paste,
        z: () => (e.shiftKey ? redo() : undo()),
        y: redo,
        b: toggleBold,
        d: () => fillCopy(true),
        r: () => fillCopy(false),
        a: () => setSel({ ar: 0, ac: 0, fr: rows - 1, fc: cols - 1 }),
        home: () => moveTo(0, 0),
      }
      if (handlers[key]) {
        e.preventDefault()
        handlers[key]()
      }
      return
    }

    if (ARROWS[k]) {
      e.preventDefault()
      tabStart.current = null
      const [dr, dc] = ARROWS[k]
      if (e.shiftKey) setSel({ ...sel, fr: clampR(sel.fr + dr), fc: clampC(sel.fc + dc) })
      else moveTo(sel.ar + dr, sel.ac + dc)
    } else if (k === 'Enter') {
      e.preventDefault()
      advance(e.shiftKey ? -1 : 1, 0)
    } else if (k === 'Tab') {
      e.preventDefault()
      advance(0, e.shiftKey ? -1 : 1)
    } else if (k === 'Delete') {
      e.preventDefault()
      clearRange()
    } else if (k === 'Backspace') {
      // Excel と同じく、内容を消して入力状態になる
      e.preventDefault()
      startEdit('', 'enter')
    } else if (k === 'F2') {
      e.preventDefault()
      startEdit()
    } else if (k === 'Home') {
      e.preventDefault()
      moveTo(sel.ar, 0)
    } else if (k === 'Escape') {
      setClip(null)
    }
  }

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPoint(null)
    setEdit(edit ? { ...edit, value } : { value, mode: 'enter' })
  }

  // ---------------------------------------------------------------- マウス／タッチ
  const cellFrom = (x: number, y: number) => {
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-r]') as HTMLElement | null
    return el ? { r: Number(el.dataset.r), c: Number(el.dataset.c) } : null
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.xl-input')) return
    e.preventDefault()
    focus()
    if (target.classList.contains('xl-handle')) {
      drag.current = { kind: 'fill' }
      return
    }
    const colHead = target.closest('[data-colhead]') as HTMLElement | null
    if (colHead) {
      if (edit) commit(null)
      const c = Number(colHead.dataset.colhead)
      if (e.shiftKey) setSel({ ...sel, fr: rows - 1, fc: c })
      else setSel({ ar: 0, ac: c, fr: rows - 1, fc: c })
      return
    }
    const rowHead = target.closest('[data-rowhead]') as HTMLElement | null
    if (rowHead) {
      if (edit) commit(null)
      const r = Number(rowHead.dataset.rowhead)
      if (e.shiftKey) setSel({ ...sel, fr: r, fc: cols - 1 })
      else setSel({ ar: r, ac: 0, fr: r, fc: cols - 1 })
      return
    }
    const cell = cellFrom(e.clientX, e.clientY)
    if (!cell) return
    if (edit && edit.value.startsWith('=') && (point || canInsertRef(edit.value))) {
      // 数式入力中のクリック → 参照を差し込む（続けてクリックすると置き換え）
      const start = point?.start ?? edit.value.length
      setPointRef({ start, ar: cell.r, ac: cell.c, fr: cell.r, fc: cell.c })
      drag.current = { kind: 'ref' }
      return
    }
    if (edit) commit(null)
    tabStart.current = null
    if (e.shiftKey) setSel({ ...sel, fr: cell.r, fc: cell.c })
    else setSel({ ar: cell.r, ac: cell.c, fr: cell.r, fc: cell.c })
    drag.current = { kind: 'select' }
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const cell = cellFrom(e.clientX, e.clientY)
      if (!cell) return
      if (d.kind === 'select') setSel((s) => ({ ...s, fr: cell.r, fc: cell.c }))
      else if (d.kind === 'ref' && point) setPointRef({ ...point, fr: cell.r, fc: cell.c })
      else if (d.kind === 'fill') {
        const down = cell.r - R.r2
        const up = R.r1 - cell.r
        const right = cell.c - R.c2
        const left = R.c1 - cell.c
        const best = Math.max(down, up, right, left)
        if (best <= 0) setFillTo(null)
        else if (best === down) setFillTo({ ...R, r2: cell.r })
        else if (best === up) setFillTo({ ...R, r1: cell.r })
        else if (best === right) setFillTo({ ...R, c2: cell.c })
        else setFillTo({ ...R, c1: cell.c })
      }
    }
    const up = () => {
      if (drag.current?.kind === 'fill' && fillTo) doFill(fillTo)
      drag.current = null
      setFillTo(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  })

  // ---------------------------------------------------------------- スマホの 数式ボタン
  const insertChip = (t: string) => {
    setPoint(null)
    if (edit) setEdit({ ...edit, value: edit.value + t })
    else startEdit(t, 'enter')
  }
  const padActions: PadAction[] = edit
    ? [
        {
          label: 'F4 ($)',
          onClick: () => {
            const t = toggleAbsAt(edit.value, edit.value.length)
            if (!t) return
            setPoint(null)
            setEdit({ ...edit, value: t.text })
            actions.current.add('f4')
          },
        },
        { label: '⌫', onClick: () => (setPoint(null), setEdit({ ...edit, value: dropLast(edit.value) })) },
        { label: 'やめる', onClick: () => (setEdit(null), setPoint(null)) },
        ...(multi ? [{ label: '範囲に確定', onClick: () => commit(null, true) }] : []),
        { label: '確定 →', onClick: () => commit([0, 1]), kind: 'main' as const },
        { label: '確定 ↓', onClick: () => commit([1, 0]), kind: 'main' as const },
      ]
    : [
        { label: '編集', onClick: () => startEdit() },
        { label: '消す', onClick: clearRange },
        { label: '下へコピー', onClick: () => fillCopy(true) },
        { label: '右へコピー', onClick: () => fillCopy(false) },
      ]
  padActions.push({
    label: kbd ? '⌨ ボタンに戻す' : '⌨ 文字を打つ',
    kind: 'sub',
    onClick: () => {
      setKbd(!kbd)
      if (!kbd) requestAnimationFrame(focus)
      else inputRef.current?.blur()
    },
  })

  // ---------------------------------------------------------------- 描画
  const box = (r: Range) => ({
    left: lefts[r.c1],
    top: HEAD_H + r.r1 * ROW_H,
    width: lefts[r.c2] + widths[r.c2] - lefts[r.c1],
    height: (r.r2 - r.r1 + 1) * ROW_H,
  })
  const totalW = lefts[cols - 1] + widths[cols - 1]
  const totalH = HEAD_H + rows * ROW_H
  const active = grid[sel.ar][sel.ac]
  const selBox = box(R)
  const clipRange = clip && {
    r1: clip.r,
    c1: clip.c,
    r2: clip.r + clip.cells.length - 1,
    c2: clip.c + clip.cells[0].length - 1,
  }
  const nameBox = !multi ? addr(sel.ar, sel.ac) : `${R.r2 - R.r1 + 1}R × ${R.c2 - R.c1 + 1}C`

  // 数式の参照を色分けして表示（Excel と同じ）
  const shown = edit ? edit.value : active.raw
  const refs = shown.startsWith('=') ? formulaRefs(shown) : []
  const refBoxes = edit ? refs.filter((f) => f.r1 < rows && f.c1 < cols) : []
  const formulaView: ReactNode = refs.length
    ? (() => {
        const out: ReactNode[] = []
        let i = 0
        refs.forEach((f, k) => {
          out.push(shown.slice(i, f.start))
          out.push(
            <span key={k} style={{ color: REF_COLORS[k % REF_COLORS.length] }}>
              {shown.slice(f.start, f.end)}
            </span>,
          )
          i = f.end
        })
        out.push(shown.slice(i))
        return out
      })()
    : shown

  const btn = (title: string, onClick: () => void, label: ReactNode, disabled = false, on = false) => (
    <button title={title} className={on ? 'on' : ''} disabled={disabled} onPointerDown={(e) => e.preventDefault()} onClick={onClick}>
      {label}
    </button>
  )

  return (
    <div className={`xl ${touch ? 'touch' : ''}`}>
      <div className="xl-toolbar">
        {btn('太字 (Ctrl+B)', toggleBold, <b>B</b>, false, !!active.bold)}
        {btn('元に戻す (Ctrl+Z)', undo, '↶', !past.length)}
        {btn('やり直し (Ctrl+Y)', redo, '↷', !future.length)}
        <span className="xl-sep" />
        {btn('切り取り (Ctrl+X)', () => copy(true), '切り取り')}
        {btn('コピー (Ctrl+C)', () => copy(false), 'コピー')}
        {btn('貼り付け (Ctrl+V)', paste, '貼り付け', !clip)}
      </div>
      <div className="xl-fbar">
        <div className="xl-namebox">{nameBox}</div>
        <div className="xl-fx">fx</div>
        <div
          className="xl-formula"
          onPointerDown={(e) => {
            e.preventDefault()
            if (!edit) startEdit()
            focus()
          }}
        >
          {formulaView}
        </div>
      </div>
      <div className="xl-scroll">
        <div
          className="xl-sheet"
          style={{ width: totalW, height: totalH }}
          onPointerDown={onPointerDown}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('xl-handle')) autoFillDown()
            else if (cellFrom(e.clientX, e.clientY)) startEdit()
          }}
        >
          <div className="xl-corner" style={{ width: HEAD_W, height: HEAD_H }} />
          {widths.map((w, c) => (
            <div key={c} data-colhead={c} className={`xl-colhead ${c >= R.c1 && c <= R.c2 ? 'hl' : ''}`} style={{ left: lefts[c], width: w, height: HEAD_H }}>
              {colName(c)}
            </div>
          ))}
          {grid.map((row, r) => (
            <div key={r}>
              <div data-rowhead={r} className={`xl-rowhead ${r >= R.r1 && r <= R.r2 ? 'hl' : ''}`} style={{ top: HEAD_H + r * ROW_H, width: HEAD_W, height: ROW_H }}>
                {r + 1}
              </div>
              {row.map((cell, c) => {
                const v = values[r][c]
                const inRange = r >= R.r1 && r <= R.r2 && c >= R.c1 && c <= R.c2 && !(r === sel.ar && c === sel.ac)
                const isNum = typeof v === 'number'
                const isErr = v !== null && typeof v === 'object'
                // 文字は右の空セルにはみ出して表示（Excel と同じ）
                let w = widths[c]
                if (typeof v === 'string' && v !== '') {
                  let cc = c + 1
                  while (cc < cols && row[cc].raw === '') w += widths[cc++]
                }
                const overflow = w > widths[c]
                return (
                  <div
                    key={c}
                    data-r={r}
                    data-c={c}
                    className={`xl-cell ${isNum ? 'num' : isErr ? 'err' : ''} ${inRange ? 'inrange' : ''} ${cell.bold ? 'bold' : ''} ${overflow ? 'overflow' : ''}`}
                    style={{ left: lefts[c], top: HEAD_H + r * ROW_H, width: widths[c], height: ROW_H }}
                  >
                    {overflow ? (
                      // はみ出し部分はクリックを通す（右のセルを選べるように）
                      <span className="xl-spill" style={{ width: w }}>
                        {formatValue(v)}
                      </span>
                    ) : (
                      formatValue(v)
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          {refBoxes.map((f, k) => (
            <div key={k} className="xl-refbox" style={{ ...box({ r1: f.r1, c1: f.c1, r2: Math.min(f.r2, rows - 1), c2: Math.min(f.c2, cols - 1) }), borderColor: REF_COLORS[k % REF_COLORS.length], background: `${REF_COLORS[k % REF_COLORS.length]}14` }} />
          ))}
          {clipRange && <div className={`xl-ants ${clip?.cut ? 'cut' : ''}`} style={box(clipRange)} />}
          {fillTo && <div className="xl-fillprev" style={box(fillTo)} />}
          <div className="xl-selbox" style={selBox} />
          {!edit && <div className="xl-handle" style={{ left: selBox.left + selBox.width - 4, top: selBox.top + selBox.height - 4 }} />}
          <input
            ref={inputRef}
            className={`xl-input ${edit ? 'editing' : ''} ${active.bold ? 'bold' : ''}`}
            style={{
              left: lefts[sel.ac],
              top: HEAD_H + sel.ar * ROW_H,
              minWidth: widths[sel.ac],
              width: edit ? Math.max(widths[sel.ac], edit.value.length * 14 + 16) : widths[sel.ac],
              height: ROW_H,
            }}
            value={edit ? edit.value : ''}
            onChange={onInput}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            readOnly={touch && !kbd}
            inputMode={touch && !kbd ? 'none' : undefined}
          />
        </div>
      </div>
      {touch && <FormulaPad groups={pad!} onChip={insertChip} actions={padActions} />}
    </div>
  )
}
