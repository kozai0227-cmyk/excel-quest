import { useLayoutEffect, useState, type RefObject } from 'react'

let canvas: HTMLCanvasElement | null = null

/** 文字の 幅（px）を 測る */
function measure(text: string, font: string) {
  canvas ??= document.createElement('canvas')
  const g = canvas.getContext('2d')
  if (!g) return 0
  g.font = font
  return g.measureText(text).width
}

/** 幅を 測る セル（null は 測らない：右の 空きマスに はみ出して 見える 文字 など） */
export type FitCell = { text: string; bold?: boolean } | null

/**
 * 列の 幅を、中身の 文字が 切れない ところまで 広げる（依頼で 決めた 幅より 狭くは しない）。
 * 依頼ごとの 幅は 日本語に 合わせて あるので、英語の 見出しや 品名（Code・Shellfish など）が 切れて しまう ための 調整。
 * box：表の 入れもの（中の セルから 書体を 読む）。pad：セルの 左右の 余白と 線。max：広げる 上限
 */
export function useFitWidths(base: number[], cells: FitCell[][], box: RefObject<HTMLElement | null>, cellSelector: string, pad: number, max: number) {
  const [font, setFont] = useState('')
  useLayoutEffect(() => {
    const el = box.current?.querySelector(cellSelector) ?? box.current
    if (!el) return
    const cs = getComputedStyle(el)
    setFont(`${cs.fontSize} ${cs.fontFamily}`)
  }, [box, cellSelector])
  if (!font) return base
  return base.map((w, c) => {
    let need = 0
    for (const row of cells) {
      const cell = row[c]
      if (cell?.text) need = Math.max(need, Math.ceil(measure(cell.text, cell.bold ? `700 ${font}` : font)) + pad)
    }
    return Math.max(w, Math.min(need, max))
  })
}
