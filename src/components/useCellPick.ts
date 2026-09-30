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

const EDGE = 24

/**
 * 表を タップすると セル番地、ドラッグすると 範囲（A1:A6）を onPick に 渡す。
 * Excel で 数式の 入力中に セルを クリック・ドラッグするのと 同じ 感覚。
 * scroller を 渡すと、ドラッグ中に 端へ 近づいたとき 表が 自動で スクロールする。
 */
export function useCellPick(onPick: ((ref: string) => void) | null, scroller?: RefObject<HTMLElement | null>) {
  const start = useRef<string | null>(null)
  const to = useRef<string | null>(null)
  const pos = useRef({ x: 0, y: 0 })
  /** 指を 置いた 位置（少し 動かすまでは 自動スクロールしない） */
  const origin = useRef({ x: 0, y: 0 })
  const raf = useRef(0)
  const [drag, setDrag] = useState<{ from: string; to: string } | null>(null)

  const stop = () => {
    start.current = null
    cancelAnimationFrame(raf.current)
    setDrag(null)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

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
    const dy = y > r.bottom - EDGE ? 5 : y < r.top + EDGE ? -5 : 0
    const dx = x > r.right - EDGE ? 5 : x < r.left + EDGE ? -5 : 0
    if (dx || dy) {
      box.scrollBy(dx, dy)
      extend()
    }
    raf.current = requestAnimationFrame(tick)
  }

  const handlers = onPick
    ? {
        onPointerDown(e: React.PointerEvent) {
          const a = cellAt(e.clientX, e.clientY)
          if (!a) return
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
          start.current = a
          to.current = a
          pos.current = origin.current = { x: e.clientX, y: e.clientY }
          setDrag({ from: a, to: a })
          cancelAnimationFrame(raf.current)
          raf.current = requestAnimationFrame(tick)
        },
        onPointerMove(e: React.PointerEvent) {
          if (!start.current) return
          pos.current = { x: e.clientX, y: e.clientY }
          extend()
        },
        onPointerUp() {
          const from = start.current
          const end = to.current
          stop()
          if (from && end) onPick(span(from, end))
        },
        onPointerCancel: stop,
      }
    : {}

  /** ドラッグ中の 範囲の セル */
  const selecting = new Set(drag ? rangeCells(span(drag.from, drag.to)) : [])
  return { selecting, handlers }
}
