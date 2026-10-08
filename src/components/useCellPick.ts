import { useEffect, useRef, useState, type RefObject } from 'react'
import { parseAddr, rangeAddr } from '../game/formula'
import { rangeCells } from '../game/guide'

/** 指の下の セル番地（data-a を 持つ セル） */
const cellAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest('[data-a]') as HTMLElement | null)?.dataset.a ?? null

const span = (a: string, b: string) => {
  const p = parseAddr(a)
  const q = parseAddr(b)
  return rangeAddr(p.r, p.c, q.r, q.c)
}

/** 表の 端から この 内側まで 来たら 自動スクロール（ほぼ 端を 越えたとき だけ） */
const EDGE = 4
/** 指：この 時間 動かさずに 押していたら 範囲選択を 始める（それまでに 動かしたら スクロール） */
const HOLD_MS = 280
/** 指：これより 動いたら スクロールと みなす */
const SLOP = 8

/**
 * 表を タップすると セル番地、ドラッグすると 範囲（A1:A6）を onPick に 渡す。
 * Excel で 数式の 入力中に セルを クリック・ドラッグするのと 同じ 感覚。
 *
 * マウス：押して ドラッグで 範囲選択（Excel と 同じ）。
 * 指　　：なぞると 表が スクロール、タップで セル、長押し してから なぞると 範囲選択
 *         （スマホの 表計算アプリと 同じ。横に 広い 表も 動かして 見られる）。
 *
 * scroller を 渡すと、範囲選択中に 端へ 近づいたとき 表が 自動で スクロールする。
 * 戻り値の ref を 表（table）に つける。
 */
export function useCellPick(onPick: ((ref: string) => void) | null, scroller?: RefObject<HTMLElement | null>) {
  const start = useRef<string | null>(null)
  const to = useRef<string | null>(null)
  const pos = useRef({ x: 0, y: 0 })
  /** 押した 位置（少し 動かすまでは 自動スクロールしない） */
  const origin = useRef({ x: 0, y: 0 })
  const raf = useRef(0)
  const [drag, setDrag] = useState<{ from: string; to: string } | null>(null)
  const pickRef = useRef(onPick)
  pickRef.current = onPick
  /** 表の 要素（指の 操作は ここに 直接 つける） */
  const [table, setTable] = useState<HTMLElement | null>(null)
  /** 指を 置いた セル（長押しか スクロールか まだ 分からない） */
  const pending = useRef<string | null>(null)
  const holdTimer = useRef(0)

  const stop = () => {
    start.current = null
    cancelAnimationFrame(raf.current)
    setDrag(null)
  }
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current)
      clearTimeout(holdTimer.current)
    },
    [],
  )

  /** 指の 位置の セルまで 範囲を のばす（表の 外なら 端の セル） */
  const extend = () => {
    let { x, y } = pos.current
    const box = scroller?.current
    if (box) {
      const r = box.getBoundingClientRect()
      x = Math.min(Math.max(x, r.left + 2), r.right - 2)
      y = Math.min(Math.max(y, r.top + 2), r.bottom - 2)
    }
    const a = cellAt(x, y)
    if (!a || a === to.current) return
    to.current = a
    setDrag((d) => d && { ...d, to: a })
  }

  const tick = () => {
    const box = scroller?.current
    if (!start.current || !box) return
    const r = box.getBoundingClientRect()
    const { x, y } = pos.current
    if (Math.hypot(x - origin.current.x, y - origin.current.y) < 12) {
      raf.current = requestAnimationFrame(tick)
      return
    }
    // 表の 外へ はみ出した ぶんだけ 速く スクロール（端の セルで 止めたいときに 勝手に 進まないように）
    const speed = (over: number) => Math.min(14, 2 + over / 5)
    const dy = y > r.bottom - EDGE ? speed(y - r.bottom + EDGE) : y < r.top + EDGE ? -speed(r.top + EDGE - y) : 0
    const dx = x > r.right - EDGE ? speed(x - r.right + EDGE) : x < r.left + EDGE ? -speed(r.left + EDGE - x) : 0
    if (dx || dy) {
      box.scrollBy(dx, dy)
      extend()
    }
    raf.current = requestAnimationFrame(tick)
  }

  /** 範囲選択を 始める */
  const begin = (a: string, x: number, y: number) => {
    start.current = a
    to.current = a
    pos.current = origin.current = { x, y }
    setDrag({ from: a, to: a })
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
  }
  /** 範囲選択を 終えて 渡す */
  const finish = () => {
    const from = start.current
    const end = to.current
    stop()
    if (from && end) pickRef.current?.(span(from, end))
  }

  // 指の 操作。なぞる 動きを 止める（preventDefault）ため、passive でない ふつうの イベントで 受ける
  const active = !!onPick
  useEffect(() => {
    if (!table || !active) return
    const cancelHold = () => {
      clearTimeout(holdTimer.current)
      pending.current = null
    }
    const onStart = (e: TouchEvent) => {
      cancelHold()
      if (e.touches.length !== 1) return stop()
      const t = e.touches[0]
      const a = cellAt(t.clientX, t.clientY)
      if (!a) return
      pending.current = a
      origin.current = pos.current = { x: t.clientX, y: t.clientY }
      holdTimer.current = window.setTimeout(() => {
        const cell = pending.current
        pending.current = null
        if (cell) begin(cell, origin.current.x, origin.current.y)
      }, HOLD_MS)
    }
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      if (start.current) {
        // 範囲選択中は 表を スクロールさせない
        if (e.cancelable) e.preventDefault()
        pos.current = { x: t.clientX, y: t.clientY }
        extend()
      } else if (pending.current && Math.hypot(t.clientX - origin.current.x, t.clientY - origin.current.y) > SLOP) {
        // 長押しの 前に 動かした → スクロール（ブラウザに まかせる）
        cancelHold()
      }
    }
    const onEnd = (e: TouchEvent) => {
      clearTimeout(holdTimer.current)
      if (start.current) {
        if (e.cancelable) e.preventDefault()
        finish()
        return
      }
      // 動かさずに すぐ 離した → タップ
      const a = pending.current
      pending.current = null
      if (a) {
        if (e.cancelable) e.preventDefault()
        pickRef.current?.(a)
      }
    }
    const onCancel = () => {
      cancelHold()
      stop()
    }
    table.addEventListener('touchstart', onStart, { passive: true })
    table.addEventListener('touchmove', onMove, { passive: false })
    table.addEventListener('touchend', onEnd, { passive: false })
    table.addEventListener('touchcancel', onCancel)
    return () => {
      cancelHold()
      table.removeEventListener('touchstart', onStart)
      table.removeEventListener('touchmove', onMove)
      table.removeEventListener('touchend', onEnd)
      table.removeEventListener('touchcancel', onCancel)
    }
  }, [table, active]) // eslint-disable-line react-hooks/exhaustive-deps

  // マウス・ペン（指は 上の touch で 受ける）
  const handlers = onPick
    ? {
        onPointerDown(e: React.PointerEvent) {
          if (e.pointerType === 'touch') return
          const a = cellAt(e.clientX, e.clientY)
          if (!a) return
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
          begin(a, e.clientX, e.clientY)
        },
        onPointerMove(e: React.PointerEvent) {
          if (e.pointerType === 'touch' || !start.current) return
          pos.current = { x: e.clientX, y: e.clientY }
          extend()
        },
        onPointerUp(e: React.PointerEvent) {
          if (e.pointerType === 'touch') return
          finish()
        },
        onPointerCancel(e: React.PointerEvent) {
          if (e.pointerType !== 'touch') stop()
        },
      }
    : {}

  /** ドラッグ中の 範囲の セル */
  const selecting = new Set(drag ? rangeCells(span(drag.from, drag.to)) : [])
  return { selecting, handlers, ref: setTable }
}
