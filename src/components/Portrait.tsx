import { useEffect, useRef } from 'react'
import { drawRows, portraitRows, type CharSpec, type Creature } from '../game/sprites'
import { CREATURES } from '../game/spriteParts'

export type PortraitSrc = { spec: CharSpec } | { creature: Creature }

/** ドット絵の顔グラフィック（頭〜肩） */
export function Portrait({ src, className = 'portrait' }: { src: PortraitSrc; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const h = 'spec' in src ? 14 : 16
  useEffect(() => {
    const g = ref.current!.getContext('2d')!
    g.clearRect(0, 0, 16, 16)
    if ('spec' in src) {
      const { rows, pal } = portraitRows(src.spec)
      drawRows(g, rows, pal)
    } else {
      const c = CREATURES[src.creature]
      drawRows(g, c.rows, c.pal)
    }
  }, [src])
  return (
    <div className={className}>
      <canvas ref={ref} width={16} height={h} />
    </div>
  )
}
