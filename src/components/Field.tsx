import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { toKey } from '../game/keys'
import { charSprite, creatureSprite, emoteBubble, TS } from '../game/sprites'
import { COUNTER, drawTile, WALKABLE } from '../game/tiles'
import type { Dir, Exit, GameState, MapDef, NpcDef } from '../game/types'
import { PLAYER_SPEC } from '../data/maps'

export const VW = 15
export const VH = 11
const STEP_MS = 170
const DASH_MS = 105
/** タイルごとのエンカウント率（1歩あたり） */
const ENCOUNTER_RATE: Record<string, number> = { '.': 1 / 20, '"': 1 / 13, '%': 1 / 10, '=': 1 / 34, ',': 1 / 20, q: 1 / 15, ':': 1 / 15 }
const D: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }

interface Actor {
  x: number
  y: number
  tx: number
  ty: number
  t: number
  moving: boolean
  dir: Dir
  def?: NpcDef
  hx: number
  hy: number
  nextWander: number
  /** 吹き出しを出すタイミングをずらすための値 */
  phase: number
  stepMs: number
  /** イベントで歩かせるときの残りの道のり */
  path?: [number, number][]
  onArrive?: () => void
  scripted?: boolean
  emote?: { name: string; until: number }
}

/** イベント演出用の操作（App から呼ぶ） */
export interface FieldHandle {
  /** その場にキャラを出す（イベント用） */
  spawn(def: NpcDef): void
  remove(id: string): void
  /** 指定マスまで歩かせる（壁を避けて最短経路）。到着で resolve */
  walkTo(id: string, x: number, y: number, stepMs?: number): Promise<void>
  face(id: string, dir: Dir): void
  emote(id: string, name: string, ms?: number): void
  player(): { x: number; y: number; dir: Dir }
}

export interface FieldProps {
  map: MapDef
  spawn: { x: number; y: number; dir: Dir; key: number }
  paused: boolean
  gs: GameState
  barrierOpen: boolean
  onInteract(npc: NpcDef): void
  onSign(lines: string[]): void
  onWarp(exit: Exit): void
  onMove(x: number, y: number, dir: Dir): void
  onMenu(): void
  onEncounter?(enemyId: string): void
  /** 閉じた謎解きの扉を調べた */
  onGate?(puzzle: string): void
  /** ドアの上に「！」を出すか（中に困っている人がいる） */
  doorHint?(exit: Exit): boolean
  ref?: Ref<FieldHandle>
}

const actor = (x: number, y: number, dir: Dir, def?: NpcDef): Actor => ({
  x, y, tx: x, ty: y, t: 0, moving: false, dir, def, hx: x, hy: y, nextWander: 0, phase: Math.random() * 6000, stepMs: STEP_MS,
})

const dirTo = (fx: number, fy: number, tx: number, ty: number): Dir =>
  tx > fx ? 'right' : tx < fx ? 'left' : ty > fy ? 'down' : 'up'

function drawBang(ctx: CanvasRenderingContext2D, dx: number, by: number) {
  ctx.fillStyle = '#231a16'
  ctx.fillRect(dx + 5, by - 1, 6, 9)
  ctx.fillStyle = '#ffe040'
  ctx.fillRect(dx + 6, by, 4, 5)
  ctx.fillRect(dx + 6, by + 6, 4, 1)
  ctx.fillStyle = '#231a16'
  ctx.fillRect(dx + 6, by + 5, 4, 1)
}

export function Field(props: FieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const P = useRef(props)
  P.current = props
  const player = useRef<Actor>(actor(props.spawn.x, props.spawn.y, props.spawn.dir))
  const npcs = useRef<Actor[]>([])
  /** イベントで一時的に出しているキャラ */
  const extras = useRef<Actor[]>([])
  const input = useRef({ held: [] as Dir[], tap: null as Dir | null, ok: false, menu: false, dash: false })
  const safeSteps = useRef(4)

  const visible = props.map.npcs.filter((n) => !n.hideIf?.(props.gs))
  const visibleKey = props.map.id + visible.map((n) => n.id).join(',')

  const all = () => [...npcs.current, ...extras.current]
  const tileAt = (x: number, y: number) => {
    const row = P.current.map.tiles[y]
    if (!row || x < 0 || x >= row.length) return '#'
    const ch = row[x]
    if (ch === '(') {
      // 謎を解いた扉は 開いて 通れる
      const g = P.current.map.gates?.find((gt) => gt.x === x && gt.y === y)
      if (!g || !P.current.gs.solved.includes(g.puzzle)) return '('
      // 開いた扉は、まわりの床と同じ見た目の通路になる
      const near = [P.current.map.tiles[y + 1]?.[x], P.current.map.tiles[y - 1]?.[x]]
      return near.find((t) => t === ':' || t === 'i' || t === ';') ?? 'q'
    }
    if (ch === 'Z' && P.current.barrierOpen) {
      // 結界が とけたら、下の 地面（桟橋なら 板）に もどる
      const t = P.current.map.tiles
      const near = [t[y]?.[x - 1], t[y]?.[x + 1], t[y - 1]?.[x], t[y + 1]?.[x]]
      return near.includes('B') ? 'B' : '.'
    }
    return ch
  }
  const find = (id: string) => (id === 'player' ? player.current : all().find((a) => a.def?.id === id))

  /** 歩けるマスだけを通る最短経路（幅優先探索） */
  const route = (sx: number, sy: number, tx: number, ty: number): [number, number][] => {
    const key = (x: number, y: number) => `${x},${y}`
    const prev = new Map<string, string | null>([[key(sx, sy), null]])
    const q: [number, number][] = [[sx, sy]]
    while (q.length) {
      const [x, y] = q.shift()!
      if (x === tx && y === ty) break
      for (const [dx, dy] of Object.values(D)) {
        const nx = x + dx
        const ny = y + dy
        const k = key(nx, ny)
        if (prev.has(k) || !WALKABLE.has(tileAt(nx, ny))) continue
        prev.set(k, key(x, y))
        q.push([nx, ny])
      }
    }
    const out: [number, number][] = []
    let cur: string | null | undefined = key(tx, ty)
    if (!prev.has(cur)) return []
    while (cur && cur !== key(sx, sy)) {
      const [x, y] = cur.split(',').map(Number)
      out.unshift([x, y])
      cur = prev.get(cur)
    }
    return out
  }

  useImperativeHandle(props.ref, () => ({
    spawn(def) {
      extras.current = [...extras.current.filter((a) => a.def?.id !== def.id), { ...actor(def.x, def.y, def.dir ?? 'down', def), scripted: true }]
    },
    remove(id) {
      extras.current = extras.current.filter((a) => a.def?.id !== id)
    },
    walkTo(id, x, y, stepMs = STEP_MS) {
      const a = find(id)
      if (!a) return Promise.resolve()
      const path = route(a.x, a.y, x, y)
      if (!path.length) return Promise.resolve()
      a.scripted = true
      a.stepMs = stepMs
      return new Promise<void>((resolve) => {
        a.path = path
        a.onArrive = resolve
      })
    },
    face(id, dir) {
      const a = find(id)
      if (a) a.dir = dir
    },
    emote(id, name, ms = 1500) {
      const a = find(id)
      if (a) a.emote = { name, until: performance.now() + ms }
    },
    player() {
      const p = player.current
      return { x: p.x, y: p.y, dir: p.dir }
    },
  }))

  // マップ切替・ワープ時に位置をリセット
  useEffect(() => {
    player.current = actor(props.spawn.x, props.spawn.y, props.spawn.dir)
    npcs.current = []
    extras.current = []
  }, [props.spawn.key, props.map.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // NPC の表示/非表示（位置は維持）
  useEffect(() => {
    const prev = new Map(npcs.current.map((a) => [a.def!.id, a]))
    npcs.current = visible.map((def) => prev.get(def.id) ?? actor(def.x, def.y, def.dir ?? 'down', def))
  }, [visibleKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // 入力
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      input.current.dash = e.shiftKey
      // 入力欄（ミニExcel・戦闘の数式入力など）への文字入力を邪魔しない
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const k = toKey(e)
      if (!k) return
      const inp = input.current
      if (k === 'ok' || k === 'cancel') {
        if (e.repeat || P.current.paused) return
        if (k === 'ok') inp.ok = true
        else inp.menu = true
        return
      }
      if (P.current.paused) return
      e.preventDefault()
      if (!inp.held.includes(k)) inp.held.push(k)
      if (!e.repeat) inp.tap = k
    }
    const up = (e: KeyboardEvent) => {
      input.current.dash = e.shiftKey
      const k = toKey(e)
      if (!k) return
      input.current.held = input.current.held.filter((d) => d !== k)
    }
    const blur = () => (input.current.held = [])
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // ゲームループ
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    let raf = 0
    let last = performance.now()

    const occupiedByNpc = (x: number, y: number, self?: Actor) =>
      all().find((a) => a !== self && ((a.x === x && a.y === y) || (a.tx === x && a.ty === y)))
    const free = (x: number, y: number, self?: Actor) => WALKABLE.has(tileAt(x, y)) && !occupiedByNpc(x, y, self)

    const update = (dt: number, now: number) => {
      const p = player.current
      const inp = input.current
      const paused = P.current.paused

      for (const a of [p, ...all()]) {
        if (!a.moving) continue
        a.t += dt / (a === p || a.scripted ? a.stepMs : STEP_MS * 1.8)
        if (a.t >= 1) {
          a.moving = false
          a.x = a.tx
          a.y = a.ty
          a.t = 0
          if (a === p && !a.scripted) {
            P.current.onMove(p.x, p.y, p.dir)
            const ex = P.current.map.exits.find((e) => e.x === p.x && e.y === p.y)
            if (ex) {
              inp.held = []
              safeSteps.current = 4
              P.current.onWarp(ex)
              return
            }
            // ランダムエンカウント
            const table = P.current.map.encounter?.(p.x, p.y)
            if (table && P.current.onEncounter) {
              if (safeSteps.current > 0) safeSteps.current--
              else if (Math.random() < (P.current.map.encounterRate ?? ENCOUNTER_RATE[tileAt(p.x, p.y)] ?? 0)) {
                inp.held = []
                inp.tap = null
                safeSteps.current = 5
                P.current.onEncounter(table[Math.floor(Math.random() * table.length)])
                return
              }
            }
          }
        }
      }

      // イベントで歩かせているキャラ（一時停止中も動く）
      for (const a of [p, ...all()]) {
        if (!a.path || a.moving) continue
        const next = a.path.shift()
        if (!next) {
          a.path = undefined
          const done = a.onArrive
          a.onArrive = undefined
          if (a === p) a.scripted = false
          done?.()
          continue
        }
        a.dir = dirTo(a.x, a.y, next[0], next[1])
        a.tx = next[0]
        a.ty = next[1]
        a.moving = true
        a.t = 0
      }

      if (paused) {
        inp.ok = false
        inp.menu = false
        inp.tap = null
        return
      }

      if (!p.moving) {
        if (inp.menu) {
          inp.menu = false
          P.current.onMenu()
        } else if (inp.ok) {
          inp.ok = false
          const [dx, dy] = D[p.dir]
          const fx = p.x + dx
          const fy = p.y + dy
          // カウンター越しにも話しかけられる
          const n = occupiedByNpc(fx, fy) ?? (COUNTER.has(tileAt(fx, fy)) ? occupiedByNpc(fx + dx, fy + dy) : undefined)
          if (n?.def && !n.scripted) {
            if (n.def.look) n.dir = OPP[p.dir]
            P.current.onInteract(n.def)
          } else if (tileAt(fx, fy) === '(') {
            const g = P.current.map.gates?.find((gt) => gt.x === fx && gt.y === fy)
            if (g) P.current.onGate?.(g.puzzle)
          } else {
            const sign = P.current.map.signs.find((s) => s.x === fx && s.y === fy)
            if (sign) P.current.onSign(sign.lines)
          }
        } else if (inp.held.length || inp.tap) {
          const dir = inp.held[inp.held.length - 1] ?? inp.tap!
          inp.tap = null
          p.dir = dir
          const [dx, dy] = D[dir]
          if (free(p.x + dx, p.y + dy)) {
            p.tx = p.x + dx
            p.ty = p.y + dy
            p.moving = true
            p.t = 0
            p.stepMs = inp.dash ? DASH_MS : STEP_MS
          } else {
            P.current.onMove(p.x, p.y, p.dir)
          }
        }
      }

      for (const a of npcs.current) {
        if (!a.def?.wander || a.moving || a.path) continue
        if (!a.nextWander) a.nextWander = now + 1000 + Math.random() * 2000
        if (now < a.nextWander) continue
        a.nextWander = now + 1500 + Math.random() * 2500
        const dirs: Dir[] = ['up', 'down', 'left', 'right']
        const dir = dirs[Math.floor(Math.random() * 4)]
        const [dx, dy] = D[dir]
        const nx = a.x + dx
        const ny = a.y + dy
        a.dir = dir
        const blockedByPlayer = (nx === p.x && ny === p.y) || (nx === p.tx && ny === p.ty)
        const isExit = P.current.map.exits.some((e) => e.x === nx && e.y === ny)
        if (Math.abs(nx - a.hx) <= 2 && Math.abs(ny - a.hy) <= 2 && free(nx, ny, a) && !blockedByPlayer && !isExit) {
          a.tx = nx
          a.ty = ny
          a.moving = true
          a.t = 0
        }
      }
    }

    const pos = (a: Actor) => [(a.x + (a.tx - a.x) * a.t) * TS, (a.y + (a.ty - a.y) * a.t) * TS]

    const draw = (now: number) => {
      const { map, gs } = P.current
      const W = map.tiles[0].length
      const H = map.tiles.length
      const [ppx, ppy] = pos(player.current)
      // 画面より小さいマップ（室内）は中央に表示
      const camX = W * TS <= VW * TS ? -Math.floor((VW * TS - W * TS) / 2) : Math.round(Math.max(0, Math.min(W * TS - VW * TS, ppx + TS / 2 - (VW * TS) / 2)))
      const camY = H * TS <= VH * TS ? -Math.floor((VH * TS - H * TS) / 2) : Math.round(Math.max(0, Math.min(H * TS - VH * TS, ppy + TS / 2 - (VH * TS) / 2)))
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, VW * TS, VH * TS)
      const frame = Math.floor(now / 450)
      const sx = Math.max(0, Math.floor(camX / TS))
      const sy = Math.max(0, Math.floor(camY / TS))
      for (let y = sy; y <= sy + VH; y++)
        for (let x = sx; x <= sx + VW; x++) {
          if (y >= H || x >= W) continue
          drawTile(ctx, tileAt, x, y, frame, x * TS - camX, y * TS - camY)
        }

      const step = (Math.floor(now / 260) % 2) + 1
      const actors = [player.current, ...all()].sort((a, b) => pos(a)[1] - pos(b)[1])
      // 吹き出しはキャラの上に重ならないよう最後にまとめて描く
      const overlays: (() => void)[] = []
      for (const a of actors) {
        const [ax, ay] = pos(a)
        const dx = Math.round(ax - camX)
        const dy = Math.round(ay - camY)
        const def = a.def
        // 影
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.fillRect(dx + 4, dy + 14, 8, 1)
        ctx.fillRect(dx + 3, dy + 15, 10, 1)
        if (def?.creature) ctx.drawImage(creatureSprite(def.creature, a.dir, step - 1), dx, dy)
        else ctx.drawImage(charSprite(def?.look ?? PLAYER_SPEC, a.dir, step as 1 | 2, !def && a.moving), dx, dy - 4)

        const top = def?.creature ? dy - 2 : dy - 6
        if (a.emote && now < a.emote.until) {
          const name = a.emote.name
          overlays.push(() => (name === 'bang' ? drawBang(ctx, dx, top - 9) : ctx.drawImage(emoteBubble(name), dx + 8, top - 10)))
        } else if (def?.kind === 'quest' && def.questId && !gs.solved.includes(def.questId)) {
          const by = top - 9 + (Math.floor(now / 300) % 2)
          overlays.push(() => drawBang(ctx, dx, by))
        } else if (def && !a.scripted) {
          // 解決済みの依頼人は時々ハート、それ以外は設定された吹き出し
          const emote = def.kind === 'quest' ? 'heart' : def.emote
          if (emote && (now + a.phase) % 6000 < 1400) overlays.push(() => ctx.drawImage(emoteBubble(emote), dx + 8, top - 10))
        }
      }
      // 洞窟は暗く、主人公のまわりだけ明るい
      if (map.kind === 'dungeon' && !map.light) {
        const cx = ppx + TS / 2 - camX
        const cy = ppy + TS / 2 - camY
        const grad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 120)
        grad.addColorStop(0, 'rgba(8,6,12,0)')
        grad.addColorStop(0.55, 'rgba(8,6,12,0.35)')
        grad.addColorStop(1, 'rgba(8,6,12,0.82)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, VW * TS, VH * TS)
      }
      // 中に困っている人がいる家は、ドアの上に「！」
      for (const ex of map.exits) {
        if (!P.current.doorHint?.(ex)) continue
        const dx = ex.x * TS - camX
        const by = ex.y * TS - camY - 10 + (Math.floor(now / 300) % 2)
        overlays.push(() => drawBang(ctx, dx, by))
      }
      overlays.forEach((f) => f())
    }

    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      update(dt, now)
      draw(now)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={canvasRef} className="field" width={VW * TS} height={VH * TS} />
}
