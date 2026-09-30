import { useEffect, useRef, useState } from 'react'
import { charSprite, creatureSprite, type CharSpec, type Creature } from '../game/sprites'
import type { Dir } from '../game/types'

/** ドット絵キャラをその場で足踏みさせて表示する */
export function SpriteView({ spec, creature, dir = 'down' }: { spec?: CharSpec; creature?: Creature; dir?: Dir }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [frame, setFrame] = useState(1)
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f === 1 ? 2 : 1)), 300)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const g = ref.current!.getContext('2d')!
    g.clearRect(0, 0, 16, 20)
    if (spec) g.drawImage(charSprite(spec, dir, frame as 1 | 2), 0, 0)
    else if (creature) g.drawImage(creatureSprite(creature, dir, frame - 1), 0, 4)
  }, [spec, creature, dir, frame])
  return <canvas ref={ref} width={16} height={20} className="sprite-view" />
}
