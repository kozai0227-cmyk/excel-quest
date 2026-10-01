import { useEffect, useRef } from 'react'
import { AURA, BOSS_SIZE, bossArt } from '../game/bossArt'

const PAD = BOSS_SIZE / 4
const AW = BOSS_SIZE + PAD * 2

interface Spark {
  x: number
  y: number
  vx: number
  life: number
  max: number
  big: boolean
}

/**
 * ボス戦の 大きな ボス（64×64 の ドット絵）と、まわりに 立ちのぼる オーラ。
 * オーラは ボスの 輪郭から 炎の 粒が 立ちのぼり、外側が 脈打つように 光る。
 */
export function BossVisual({ id, hit }: { id: string; hit: number }) {
  const sprite = useRef<HTMLCanvasElement>(null)
  const aura = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const art = bossArt(id)
    const g = sprite.current!.getContext('2d')!
    g.clearRect(0, 0, BOSS_SIZE, BOSS_SIZE)
    g.drawImage(art, 0, 0)

    // 輪郭（炎の 出どころ）と、その 外側 2ドット（光の ふち）
    const data = art.getContext('2d')!.getImageData(0, 0, BOSS_SIZE, BOSS_SIZE).data
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < BOSS_SIZE && y < BOSS_SIZE && data[(y * BOSS_SIZE + x) * 4 + 3] > 0
    const edge: [number, number][] = []
    const rim: [number, number][] = []
    for (let y = -2; y < BOSS_SIZE + 2; y++)
      for (let x = -2; x < BOSS_SIZE + 2; x++) {
        if (solid(x, y)) {
          if (!solid(x, y - 1) || !solid(x - 1, y) || !solid(x + 1, y)) edge.push([x + PAD, y + PAD])
        } else if ([[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [0, 2]].some(([dx, dy]) => solid(x + dx, y + dy))) rim.push([x + PAD, y + PAD])
      }

    const [core, flame, outer] = AURA[id] ?? AURA.slime
    const a = aura.current!.getContext('2d')!
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const sparks: Spark[] = []
    let raf = 0
    let last = 0
    let t = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (now - last < 33) return
      last = now
      t++
      a.clearRect(0, 0, AW, AW)
      // 脈打つ 光
      const pulse = 0.5 + 0.5 * Math.sin(t / 9)
      const grad = a.createRadialGradient(AW / 2, AW / 2 + 4, 4, AW / 2, AW / 2 + 4, AW / 2)
      grad.addColorStop(0, outer + 'aa')
      grad.addColorStop(0.55, outer + Math.round(40 + pulse * 50).toString(16).padStart(2, '0'))
      grad.addColorStop(1, outer + '00')
      a.fillStyle = grad
      a.fillRect(0, 0, AW, AW)
      // 輪郭の 光の ふち
      a.globalAlpha = 0.25 + pulse * 0.35
      a.fillStyle = flame
      for (const [x, y] of rim) a.fillRect(x, y, 1, 1)
      a.globalAlpha = 1
      if (calm) return
      // 炎の 粒を 生む（上を 向いた ふちから 多めに）
      for (let i = 0; i < 7; i++) {
        const [x, y] = edge[Math.floor(Math.random() * edge.length)]
        const max = 14 + Math.random() * 22
        sparks.push({ x, y, vx: (Math.random() - 0.5) * 0.5, life: max, max, big: Math.random() < 0.3 })
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.life--
        if (s.life <= 0) {
          sparks.splice(i, 1)
          continue
        }
        s.y -= 0.9
        s.x += s.vx + Math.sin((s.y + t) / 4) * 0.25
        const k = s.life / s.max
        a.globalAlpha = Math.min(1, k * 1.6)
        a.fillStyle = k > 0.7 ? core : k > 0.35 ? flame : outer
        const sz = s.big && k > 0.4 ? 2 : 1
        a.fillRect(Math.round(s.x), Math.round(s.y), sz, sz)
      }
      a.globalAlpha = 1
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [id])

  return (
    <div className={`boss-stage ${hit ? 'hit' : 'enter'}`}>
      <canvas ref={aura} width={AW} height={AW} className="boss-aura" />
      <canvas ref={sprite} width={BOSS_SIZE} height={BOSS_SIZE} className="boss-hd" />
    </div>
  )
}
