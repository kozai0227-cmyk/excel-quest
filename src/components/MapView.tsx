import { useEffect, useRef } from 'react'
import { MAPS } from '../data/maps'
import { newGame } from '../game/progress'
import { charSprite, creatureSprite, TS } from '../game/sprites'
import { drawTile } from '../game/tiles'

/**
 * 開発用：マップ全体を 1枚に 描く（?mapview=ID）。
 * 出口（赤）・乗り物（青）・はじめの 位置（黄）を 書きこむ。&plain で 書きこみなし
 */
export function MapView({ id, plain }: { id: string; plain?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const map = MAPS[id]
  useEffect(() => {
    const cv = ref.current
    if (!cv || !map) return
    const W = map.tiles[0].length
    const H = map.tiles.length
    const S = 2
    cv.width = W * TS * S
    cv.height = H * TS * S
    const g = cv.getContext('2d')!
    g.imageSmoothingEnabled = false
    g.scale(S, S)
    const at = (x: number, y: number) => map.tiles[y]?.[x] ?? '#'
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) drawTile(g, at, x, y, 0, x * TS, y * TS, map.theme)
    const gs = newGame('サトウ')
    for (const n of map.npcs) {
      if (n.hideIf?.(gs)) continue
      if (n.creature) g.drawImage(creatureSprite(n.creature, n.dir ?? 'down', 0), n.x * TS, n.y * TS)
      else if (n.look) g.drawImage(charSprite(n.look, n.dir ?? 'down', 1), n.x * TS, n.y * TS - 4)
    }
    if (plain) return
    g.font = '6px sans-serif'
    const label = (text: string, x: number, y: number, col: string) => {
      const w = g.measureText(text).width + 2
      g.fillStyle = 'rgba(0,0,0,0.75)'
      g.fillRect(x, y - 6, w, 7)
      g.fillStyle = col
      g.fillText(text, x + 1, y)
    }
    for (const e of map.exits) {
      g.strokeStyle = '#ff3b3b'
      g.lineWidth = 1
      g.strokeRect(e.x * TS + 0.5, e.y * TS + 0.5, TS - 1, TS - 1)
      label(`→${e.to} (${e.tx},${e.ty})`, e.x * TS, e.y * TS + 6, '#ff8a8a')
    }
    for (const n of map.npcs)
      if (n.ferry) {
        g.strokeStyle = '#3bb0ff'
        g.strokeRect(n.x * TS + 0.5, n.y * TS + 0.5, TS - 1, TS - 1)
        label(`🚢${n.ferry.to} (${n.ferry.x},${n.ferry.y})`, n.x * TS, n.y * TS + 22, '#9ad8ff')
      }
    g.strokeStyle = '#ffd23b'
    g.strokeRect(map.spawn.x * TS + 1.5, map.spawn.y * TS + 1.5, TS - 3, TS - 3)
  }, [map, plain])
  if (!map) return <p style={{ color: '#fff' }}>マップ {id} は ありません</p>
  return (
    <div style={{ background: '#000', display: 'inline-block' }}>
      <canvas ref={ref} id="mapview" style={{ display: 'block', imageRendering: 'pixelated' }} />
    </div>
  )
}
