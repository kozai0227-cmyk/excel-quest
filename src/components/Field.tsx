import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { tr } from '../game/lang'
import { exploreSet, saveExplore } from '../game/explore'
import { toKey } from '../game/keys'
import { charSprite, creatureSprite, emoteBubble, TS } from '../game/sprites'
import { COUNTER, drawTile, WALKABLE } from '../game/tiles'
import type { Dir, Exit, GameState, MapDef, NpcDef, SignDef } from '../game/types'
import { PLAYER_SPEC } from '../data/maps'
import { ENEMIES } from '../data/bosses'

export const VW = 15
export const VH = 11
const STEP_MS = 170
const DASH_MS = 105
/** タイルごとのエンカウント率（1歩あたり） */
const ENCOUNTER_RATE: Record<string, number> = { '.': 1 / 20, '"': 1 / 13, '%': 1 / 10, '=': 1 / 34, ',': 1 / 20, q: 1 / 15, ':': 1 / 15 }
const D: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }

/** 見える 敵（ダンジョンを 歩き回る 魔物）：気づく 距離・あきらめる 距離・追う 速さ（ふつうに 歩けば 逃げきれる） */
const MOB_SEE = 4
const MOB_GIVEUP = 7
const MOB_CHASE_MS = 235
const MOB_WALK_MS = 340
/** 戦闘から もどった あと、敵が 追ってこない 時間 */
const MOB_GRACE_MS = 1600
/** 先制（敵の 背中から ふれた）・不意打ち（背中から ふれられた） */
export type Strike = 'first' | 'ambush'
interface Mob {
  a: Actor
  enemy: string
  chase: boolean
}

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
  /** 道を ふさがれて 待ちはじめた 時刻 */
  waitSince?: number
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
  /** キャラの いまの マス（いなければ null） */
  pos(id: string): { x: number; y: number } | null
  /** そのマスへ 歩く（人が いれば となりまで 行って 話しかける）。タップと 同じ 動き */
  goTo(x: number, y: number): void
}

export interface FieldProps {
  map: MapDef
  spawn: { x: number; y: number; dir: Dir; key: number }
  paused: boolean
  gs: GameState
  barrierOpen: boolean
  onInteract(npc: NpcDef): void
  onSign(lines: string[], sign: SignDef): void
  onWarp(exit: Exit): void
  onMove(x: number, y: number, dir: Dir): void
  onMenu(): void
  /** strike：見える 敵に 背中から ふれた（first）／ふれられた（ambush） */
  onEncounter?(enemyId: string, strike?: Strike): void
  /** ダンジョンの フロアを くまなく 歩いた（探索率 100%） */
  onExplored?(mapId: string): void
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
  /** 描きなおしが 必要か（地図・進み具合・結界・画面の 大きさが 変わった） */
  const dirty = useRef(true)
  const seen = useRef({ map: props.map, gs: props.gs, barrier: props.barrierOpen })
  if (seen.current.map !== props.map || seen.current.gs !== props.gs || seen.current.barrier !== props.barrierOpen) {
    seen.current = { map: props.map, gs: props.gs, barrier: props.barrierOpen }
    dirty.current = true
  }
  const player = useRef<Actor>(actor(props.spawn.x, props.spawn.y, props.spawn.dir))
  const npcs = useRef<Actor[]>([])
  /** イベントで一時的に出しているキャラ */
  const extras = useRef<Actor[]>([])
  const input = useRef({ held: [] as Dir[], tap: null as Dir | null, ok: false, menu: false, dash: false })
  /** タップで 決めた 行き先（残りの 道のり、着いたら 話しかける 向き） */
  const goal = useRef<{ path: [number, number][]; x: number; y: number; face?: Dir; at: number } | null>(null)
  /** いまの カメラの 位置（タップした マスを 求める ため） */
  const cam = useRef({ x: 0, y: 0 })
  /** 表示する範囲（ドット単位）。短い辺が 11マスで、長い辺は 画面の形に 合わせて のびる */
  const view = useRef({ w: VW * TS, h: VH * TS })
  const safeSteps = useRef(4)
  /** ダンジョンを 歩き回る 見える 敵（倒した 敵は その フロアに いる あいだ 戻らない） */
  const mobs = useRef<Mob[]>([])
  /** ミニマップ（ダンジョンだけ）：小さな キャンバスと 探索率 */
  const miniRef = useRef<HTMLCanvasElement>(null)
  const [explorePct, setExplorePct] = useState<number | null>(null)
  const [miniOpen, setMiniOpen] = useState(true)
  /** 歩ける マス（主人公から 行ける ところ。謎の 扉の 先は 開くまで 数えない） */
  const reach = useRef<{ key: string; tiles: Set<number> }>({ key: '', tiles: new Set() })
  const miniDirty = useRef(true)
  const graceUntil = useRef(0)
  /** 敵が 見える フロアか（ダンジョンで 敵が 出る ところ）。ランダムエンカウントの かわり */
  const symbolMode = () => P.current.map.kind === 'dungeon' && !!P.current.map.encounter
  const mobAt = (x: number, y: number, self?: Mob) => mobs.current.find((m) => m !== self && ((m.a.x === x && m.a.y === y) || (m.a.tx === x && m.a.ty === y)))
  /** 敵を 置く：主人公から 離れた、敵の 出る 床に、間を あけて */
  const spawnMobs = (sx: number, sy: number) => {
    mobs.current = []
    if (!symbolMode()) return
    const map = P.current.map
    const spots: [number, number][] = []
    for (let y = 0; y < map.tiles.length; y++)
      for (let x = 0; x < map.tiles[y].length; x++) {
        if (!WALKABLE.has(tileAt(x, y)) || !map.encounter!(x, y)) continue
        if (Math.abs(x - sx) + Math.abs(y - sy) < 7) continue
        if (map.exits.some((e) => e.x === x && e.y === y) || map.npcs.some((n) => n.x === x && n.y === y)) continue
        spots.push([x, y])
      }
    const want = Math.max(2, Math.min(7, Math.round(spots.length / 45)))
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[spots[i], spots[j]] = [spots[j], spots[i]]
    }
    for (const [x, y] of spots) {
      if (mobs.current.length >= want) break
      if (mobs.current.some((m) => Math.abs(m.a.x - x) + Math.abs(m.a.y - y) < 5)) continue
      const table = map.encounter!(x, y)!
      const enemy = table[Math.floor(Math.random() * table.length)]
      const sprite = ENEMIES[enemy]?.sprite
      if (!sprite) continue
      const def: NpcDef = { id: `mob${mobs.current.length}`, x, y, name: '', kind: 'talk', creature: sprite as NpcDef['creature'] }
      const dirs: Dir[] = ['up', 'down', 'left', 'right']
      mobs.current.push({ a: { ...actor(x, y, dirs[Math.floor(Math.random() * 4)], def), stepMs: MOB_WALK_MS }, enemy, chase: false })
    }
  }

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

  /** ほかの キャラ（主人公も 含む）が 立っている、または 向かっている マス */
  const takenBy = (x: number, y: number, self: Actor) =>
    [player.current, ...all()].find((a) => a !== self && ((a.x === x && a.y === y) || (a.tx === x && a.ty === y)))

  /** 歩けるマスだけを通る最短経路（幅優先探索）。self を 渡すと、ほかの キャラが いる マスも よける */
  const route = (sx: number, sy: number, tx: number, ty: number, self?: Actor): [number, number][] => {
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
        if (self && !(nx === tx && ny === ty) && takenBy(nx, ny, self)) continue
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

  /** 行ける マスを 数えなおす（地図・解いた 謎が 変わったとき） */
  const reachable = () => {
    const map = P.current.map
    const key = `${map.id}|${P.current.gs.solved.length}|${P.current.barrierOpen}`
    if (reach.current.key === key) return reach.current.tiles
    const W = map.tiles[0].length
    const seen = new Set<number>()
    const q: [number, number][] = [[map.spawn.x, map.spawn.y], ...map.exits.map((e) => [e.x, e.y] as [number, number])]
    for (const [x, y] of q) seen.add(y * W + x)
    while (q.length) {
      const [x, y] = q.shift()!
      for (const [dx, dy] of Object.values(D)) {
        const nx = x + dx
        const ny = y + dy
        const k = ny * W + nx
        if (seen.has(k) || !WALKABLE.has(tileAt(nx, ny))) continue
        seen.add(k)
        q.push([nx, ny])
      }
    }
    reach.current = { key, tiles: seen }
    return seen
  }
  const lastExplore = useRef('')
  /** 主人公の まわり（3マス）を 歩いた ことに する。100% に なったら 知らせる */
  const explore = (px: number, py: number) => {
    const map = P.current.map
    const k = `${map.id}|${px},${py}|${P.current.gs.solved.length}`
    if (lastExplore.current === k) return
    lastExplore.current = k
    const W = map.tiles[0].length
    const set = exploreSet(map.id)
    const before = set.size
    for (let y = py - 3; y <= py + 3; y++)
      for (let x = px - 3; x <= px + 3; x++) if (x >= 0 && y >= 0 && x < W && y < map.tiles.length) set.add(y * W + x)
    if (set.size !== before) saveExplore()
    const all = reachable()
    let got = 0
    for (const t of all) if (set.has(t)) got++
    const pct = Math.min(100, Math.floor((got / Math.max(1, all.size)) * 100))
    setExplorePct(pct)
    miniDirty.current = true
    if (pct >= 100 && !P.current.gs.flags[`explored_${map.id}`]) P.current.onExplored?.(map.id)
  }
  /** ミニマップを 描く：歩いた ところだけ 明るく。宝箱（金）・ボス（赤）・出口（青）・主人公（白） */
  const drawMini = () => {
    const cv = miniRef.current
    if (!cv) return
    const map = P.current.map
    const W = map.tiles[0].length
    const H = map.tiles.length
    const s = Math.max(1, Math.min(3, Math.floor(48 / Math.max(W, H))))
    if (cv.width !== W * s || cv.height !== H * s) {
      cv.width = W * s
      cv.height = H * s
      // 長い 辺を 110px に（形どおりの 縦横比で）
      cv.style.width = `${Math.round((W / Math.max(W, H)) * 110)}px`
      cv.style.height = `${Math.round((H / Math.max(W, H)) * 110)}px`
    }
    const g = cv.getContext('2d')!
    g.clearRect(0, 0, cv.width, cv.height)
    const set = exploreSet(map.id)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!set.has(y * W + x)) continue
        const t = tileAt(x, y)
        g.fillStyle = WALKABLE.has(t) ? 'rgba(210,225,255,0.85)' : t === '(' ? 'rgba(255,170,60,0.9)' : 'rgba(60,70,100,0.75)'
        g.fillRect(x * s, y * s, s, s)
      }
    const dot = (x: number, y: number, c: string) => {
      g.fillStyle = c
      g.fillRect(x * s - (s === 1 ? 0 : 0), y * s, s, s)
      if (s === 1) g.fillRect(x - 1, y, 3, 1), g.fillRect(x, y - 1, 1, 3)
    }
    for (const e of map.exits) if (set.has(e.y * W + e.x)) dot(e.x, e.y, '#4aa8ff')
    for (const a of npcs.current) {
      const d = a.def
      if (!d || !set.has(a.y * W + a.x)) continue
      if (d.kind === 'chest') dot(a.x, a.y, '#ffd23a')
      else if (d.kind === 'boss') dot(a.x, a.y, '#ff4a3a')
    }
    const p = player.current
    dot(p.moving ? p.tx : p.x, p.moving ? p.ty : p.y, '#ffffff')
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
      // 村人を よけて 通る。囲まれて 道が ないときだけ マスの 形だけで 決める
      const around = route(a.x, a.y, x, y, a)
      const path = around.length ? around : route(a.x, a.y, x, y)
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
    pos(id) {
      const a = find(id)
      return a ? { x: a.moving ? a.tx : a.x, y: a.moving ? a.ty : a.y } : null
    },
    goTo(x, y) {
      goTile(x, y)
    },
  }))

  // マップ切替・ワープ時に位置をリセット
  useEffect(() => {
    player.current = actor(props.spawn.x, props.spawn.y, props.spawn.dir)
    npcs.current = []
    extras.current = []
    spawnMobs(props.spawn.x, props.spawn.y)
    lastExplore.current = ''
    setExplorePct(null)
    miniDirty.current = true
    // 確かめ用（localhost だけ）：見える 敵と 主人公の 位置を 読む
    if (location.hostname === 'localhost')
      (window as unknown as { __mobs?: () => unknown }).__mobs = () => ({
        p: { x: player.current.x, y: player.current.y, dir: player.current.dir },
        mobs: mobs.current.map((m) => ({ x: m.a.x, y: m.a.y, dir: m.a.dir, chase: m.chase, enemy: m.enemy })),
      })
    graceUntil.current = performance.now() + MOB_GRACE_MS
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
      goal.current = null
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

  /**
   * 画面を タップ（クリック）した マスへ 歩く。人・看板・扉を タップしたら、となりまで 歩いて 話しかける。
   * 押したまま 指を 動かすと、行き先が 指に ついてくる
   */
  const tapTile = (clientX: number, clientY: number) => {
    const cv = canvasRef.current
    if (!cv || P.current.paused) return
    const r = cv.getBoundingClientRect()
    const tx = Math.floor((((clientX - r.left) / r.width) * view.current.w + cam.current.x) / TS)
    const ty = Math.floor((((clientY - r.top) / r.height) * view.current.h + cam.current.y) / TS)
    goTile(tx, ty)
  }
  /** マス（tx, ty）へ 歩く。人・看板・扉なら となりまで 歩いて 話しかける */
  const goTile = (tx: number, ty: number) => {
    if (P.current.paused) return
    const p = player.current
    const npcAt = (ax: number, ay: number) => all().find((a) => !a.scripted && a.def && ((a.x === ax && a.y === ay) || (a.tx === ax && a.ty === ay)))
    const target = npcAt(tx, ty)
    const sign = P.current.map.signs.some((sg) => sg.x === tx && sg.y === ty)
    const gate = tileAt(tx, ty) === '('
    const from = p.moving ? [p.tx, p.ty] : [p.x, p.y]
    if (target || sign || gate) {
      // となり（カウンター越しなら 2マス先）の 立てる マスの うち、いちばん 近い ところへ
      let best: { path: [number, number][]; face: Dir; x: number; y: number } | null = null
      for (const d of Object.keys(D) as Dir[]) {
        const [dx, dy] = D[d]
        const spots: [number, number][] = [[tx - dx, ty - dy]]
        if (target && COUNTER.has(tileAt(tx - dx, ty - dy))) spots.push([tx - dx * 2, ty - dy * 2])
        for (const [sx, sy] of spots) {
          if (sx === from[0] && sy === from[1]) {
            best = { path: [], face: d, x: sx, y: sy }
            break
          }
          if (!WALKABLE.has(tileAt(sx, sy))) continue
          const path = route(from[0], from[1], sx, sy, p)
          if (path.length && (!best || path.length < best.path.length)) best = { path, face: d, x: sx, y: sy }
        }
        if (best && !best.path.length) break
      }
      if (best) goal.current = { path: best.path, x: best.x, y: best.y, face: best.face, at: performance.now() }
      return
    }
    if (!WALKABLE.has(tileAt(tx, ty))) return
    if (tx === from[0] && ty === from[1]) return
    const path = route(from[0], from[1], tx, ty, p)
    if (path.length) goal.current = { path, x: tx, y: ty, at: performance.now() }
  }
  const drag = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (P.current.paused) return
    e.preventDefault()
    drag.current = { x: e.clientX, y: e.clientY }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    tapTile(e.clientX, e.clientY)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) < 24) return
    drag.current = { x: e.clientX, y: e.clientY }
    tapTile(e.clientX, e.clientY)
  }
  const onPointerUp = () => (drag.current = null)

  // 画面の形に 合わせて キャンバスの 大きさを 変える（スマホの 縦画面なら 縦長に なる）
  useEffect(() => {
    const cv = canvasRef.current!
    const fit = () => {
      const cw = cv.clientWidth
      const ch = cv.clientHeight
      if (!cw || !ch) return
      const short = VH * TS
      const w = cw >= ch ? Math.round((short * cw) / ch) : short
      const h = cw >= ch ? short : Math.round((short * ch) / cw)
      if (w === view.current.w && h === view.current.h) return
      view.current = { w, h }
      cv.width = w
      cv.height = h
      // 大きさを 変えると 設定が 戻るので、ドット絵が ぼやけないよう もう一度
      cv.getContext('2d')!.imageSmoothingEnabled = false
      dirty.current = true
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(cv)
    return () => ro.disconnect()
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
            const found = P.current.map.exits.find((e) => e.x === p.x && e.y === p.y)
            if (found) {
              // 歩いてきた 向きで 着く 場所が 変わる 出口
              const alt = found.from?.[p.dir]
              const ex = alt ? { ...found, ...alt } : found
              inp.held = []
              goal.current = null
              safeSteps.current = 4
              P.current.onWarp(ex)
              return
            }
            // ランダムエンカウント
            const table = symbolMode() ? null : P.current.map.encounter?.(p.x, p.y)
            if (table && P.current.onEncounter) {
              if (safeSteps.current > 0) safeSteps.current--
              else if (Math.random() < (P.current.map.encounterRate ?? ENCOUNTER_RATE[tileAt(p.x, p.y)] ?? 0)) {
                inp.held = []
                inp.tap = null
                goal.current = null
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
        if (!a.path.length) {
          a.path = undefined
          a.waitSince = undefined
          const done = a.onArrive
          a.onArrive = undefined
          if (a === p) a.scripted = false
          done?.()
          continue
        }
        if (takenBy(a.path[0][0], a.path[0][1], a)) {
          // 次の マスに だれか いる：よけ道を さがす。なければ 少し 待ち、長く ふさがれたら そのまま 進む（動けなく ならないように）
          const [gx, gy] = a.path[a.path.length - 1]
          const detour = route(a.x, a.y, gx, gy, a)
          if (detour.length && !takenBy(detour[0][0], detour[0][1], a)) a.path = detour
          else {
            a.waitSince ??= now
            if (now - a.waitSince < 1500) continue
          }
        }
        a.waitSince = undefined
        const next = a.path.shift()!
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
        // 戦闘・会話の あいだは 敵も 止まる。もどった 直後は 少し 追ってこない
        graceUntil.current = now + MOB_GRACE_MS
        return
      }

      // 見える 敵に ふれたら 戦闘。背中から ふれたら 先制、背中から ふれられたら 不意打ち
      const touch = (m: Mob, byPlayer: boolean) => {
        const back = byPlayer ? p.dir === m.a.dir : m.a.dir === p.dir
        mobs.current = mobs.current.filter((x) => x !== m)
        inp.held = []
        inp.tap = null
        goal.current = null
        P.current.onEncounter?.(m.enemy, back ? (byPlayer ? 'first' : 'ambush') : undefined)
      }
      // 歩いた まわりを ミニマップに 記す
      if (P.current.map.kind === 'dungeon') explore(p.moving ? p.tx : p.x, p.moving ? p.ty : p.y)
      if (P.current.map.encounter && P.current.onEncounter) {
        const calm = now < graceUntil.current
        for (const m of [...mobs.current]) {
          const a = m.a
          if (a.moving) {
            a.t += dt / a.stepMs
            if (a.t < 1) continue
            a.moving = false
            a.x = a.tx
            a.y = a.ty
            a.t = 0
          }
          const dist = Math.abs(a.x - p.x) + Math.abs(a.y - p.y)
          if (!m.chase && !calm && dist <= MOB_SEE) {
            m.chase = true
            a.emote = { name: 'bang', until: now + 700 }
            a.nextWander = now + 350
          } else if (m.chase && (dist > MOB_GIVEUP || calm)) m.chase = false
          if (now < a.nextWander) continue
          const ok = (x: number, y: number) =>
            WALKABLE.has(tileAt(x, y)) &&
            !!P.current.map.encounter!(x, y) &&
            !occupiedByNpc(x, y) &&
            !mobAt(x, y, m) &&
            !P.current.map.exits.some((e) => e.x === x && e.y === y)
          let next: [number, number] | undefined
          if (m.chase) {
            a.stepMs = MOB_CHASE_MS
            a.nextWander = now
            const path = route(a.x, a.y, p.moving ? p.tx : p.x, p.moving ? p.ty : p.y)
            if (path.length) next = path[0]
          } else {
            a.stepMs = MOB_WALK_MS
            a.nextWander = now + 700 + Math.random() * 1100
            const dirs: Dir[] = ['up', 'down', 'left', 'right']
            const d = dirs[Math.floor(Math.random() * 4)]
            a.dir = d
            const [dx, dy] = D[d]
            if (Math.abs(a.x + dx - a.hx) <= 3 && Math.abs(a.y + dy - a.hy) <= 3) next = [a.x + dx, a.y + dy]
          }
          if (!next) continue
          a.dir = dirTo(a.x, a.y, next[0], next[1])
          // 主人公の マスに 入ろうと したら ぶつかる
          if ((next[0] === p.x && next[1] === p.y) || (next[0] === p.tx && next[1] === p.ty)) {
            if (!calm && m.chase) return touch(m, false)
            continue
          }
          if (!ok(next[0], next[1])) continue
          a.tx = next[0]
          a.ty = next[1]
          a.moving = true
          a.t = 0
        }
      }
      /** 主人公が 敵の いる マスへ 進もうと したら ぶつかる（こちらから しかけた） */
      const bump = (nx: number, ny: number) => {
        const m = mobAt(nx, ny)
        if (!m || now < graceUntil.current - MOB_GRACE_MS / 2) return false
        p.dir = dirTo(p.x, p.y, nx, ny)
        touch(m, true)
        return true
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
            if (sign) P.current.onSign(sign.lines, sign)
          }
        } else if (goal.current && !inp.held.length && !inp.tap) {
          const gl = goal.current
          if (!gl.path.length) {
            // 着いた：話しかける 相手が いれば そちらを 向いて 話す
            goal.current = null
            if (gl.face) {
              p.dir = gl.face
              inp.ok = true
            }
            P.current.onMove(p.x, p.y, p.dir)
          } else {
            let [nx, ny] = gl.path[0]
            if (!free(nx, ny)) {
              // 村人が 道に 入ってきた：よけ道を さがす
              const end = gl.path[gl.path.length - 1]
              const again = route(p.x, p.y, end[0], end[1], p)
              if (!again.length || !free(again[0][0], again[0][1])) {
                if (now - gl.at > 1500) goal.current = null
                return
              }
              gl.path = again
              ;[nx, ny] = again[0]
            }
            if (bump(nx, ny)) return
            gl.path.shift()
            gl.at = now
            p.dir = dirTo(p.x, p.y, nx, ny)
            p.tx = nx
            p.ty = ny
            p.moving = true
            p.t = 0
            // 遠くへは 走る
            p.stepMs = gl.path.length >= 3 ? DASH_MS : STEP_MS
          }
        } else if (inp.held.length || inp.tap) {
          const dir = inp.held[inp.held.length - 1] ?? inp.tap!
          inp.tap = null
          p.dir = dir
          const [dx, dy] = D[dir]
          if (bump(p.x + dx, p.y + dy)) return
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
      const { w: vw, h: vh } = view.current
      // 画面より小さいマップ（室内）は中央に表示
      const camX = W * TS <= vw ? -Math.floor((vw - W * TS) / 2) : Math.round(Math.max(0, Math.min(W * TS - vw, ppx + TS / 2 - vw / 2)))
      const camY = H * TS <= vh ? -Math.floor((vh - H * TS) / 2) : Math.round(Math.max(0, Math.min(H * TS - vh, ppy + TS / 2 - vh / 2)))
      cam.current = { x: camX, y: camY }
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, vw, vh)
      const frame = Math.floor(now / 450)
      const sx = Math.max(0, Math.floor(camX / TS))
      const sy = Math.max(0, Math.floor(camY / TS))
      for (let y = sy; y <= sy + Math.ceil(vh / TS); y++)
        for (let x = sx; x <= sx + Math.ceil(vw / TS); x++) {
          if (y >= H || x >= W) continue
          drawTile(ctx, tileAt, x, y, frame, x * TS - camX, y * TS - camY, map.theme)
        }

      // タップした 行き先の 印（足もとに 広がる 輪）
      if (goal.current) {
        const gx = goal.current.x * TS - camX + TS / 2
        const gy = goal.current.y * TS - camY + TS / 2
        const k = (now % 900) / 900
        ctx.strokeStyle = `rgba(255,255,255,${0.85 - k * 0.6})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.ellipse(gx, gy + 4, 3 + k * 4, 1.5 + k * 2, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      const step = (Math.floor(now / 260) % 2) + 1
      const actors = [player.current, ...all(), ...mobs.current.map((m) => m.a)].sort((a, b) => pos(a)[1] - pos(b)[1])
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
        ctx.fillRect(0, 0, vw, vh)
      }
      // 札（棚の 記号・積荷の 重さ）。仕掛けを 解いたら 札は 消す
      for (const sg of map.signs) {
        if (!sg.label || (sg.trick && gs.flags[`trick_${sg.trick.group}`])) continue
        const dx = sg.x * TS - camX
        const dy = sg.y * TS - camY
        if (dx < -TS || dy < -TS || dx > vw || dy > vh) continue
        overlays.push(() => {
          ctx.font = '7px monospace'
          const w = Math.max(9, Math.ceil(ctx.measureText(sg.label!).width) + 4)
          const lx = dx + (TS - w) / 2
          const ly = dy + 2
          ctx.fillStyle = 'rgba(255,240,200,0.92)'
          ctx.fillRect(lx, ly, w, 9)
          ctx.fillStyle = '#4a2a10'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(sg.label!, dx + TS / 2, ly + 5)
          ctx.textAlign = 'start'
          ctx.textBaseline = 'alphabetic'
        })
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

    /**
     * 見た目が 変わる ときだけ 描く（電池の ため）。止まっている 間は 足ぶみ・水・吹き出しの
     * 切りかわり（1秒に 数回）だけ 描き、歩いている 間は 毎コマ 描く
     */
    let shown = ''
    const look = (now: number) => {
      let k = `${Math.floor(now / 450)}|${Math.floor(now / 260) % 2}|${Math.floor(now / 300) % 2}`
      for (const a of [player.current, ...all(), ...mobs.current.map((m) => m.a)]) {
        k += `|${a.x},${a.y},${a.tx},${a.ty},${a.moving ? a.t : 0},${a.dir}`
        if (a.emote && now < a.emote.until) k += 'e'
        if (a.def && (now + a.phase) % 6000 < 1400) k += 'b'
      }
      if (goal.current) k += `|g${goal.current.x},${goal.current.y},${Math.floor(now / 60)}`
      return k
    }
    let drawnAt = 0
    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      update(dt, now)
      if (miniDirty.current) {
        miniDirty.current = false
        drawMini()
      }
      const k = look(now)
      // 主人公が 止まっている ときは 30コマ／秒まで（村人の ゆっくりした 動きは これで 十分 なめらか）
      const calm = !player.current.moving && now - drawnAt < 30
      if ((k !== shown || dirty.current) && !calm) {
        draw(now)
        shown = k
        drawnAt = now
        dirty.current = false
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dungeon = props.map.kind === 'dungeon'
  return (
    <>
      <canvas
        ref={canvasRef}
        className="field"
        width={VW * TS}
        height={VH * TS}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {dungeon && explorePct !== null && !props.paused && (
        <button
          type="button"
          className={`minimap ${miniOpen ? '' : 'closed'} ${explorePct >= 100 ? 'done' : ''}`}
          aria-label={tr(`ミニマップ 探索 ${explorePct}%`, `Minimap: ${explorePct}% explored`)}
          onClick={() => {
            setMiniOpen((o) => !o)
            miniDirty.current = true
          }}
        >
          <canvas
            ref={(el) => {
              miniRef.current = el
              if (el) miniDirty.current = true
            }}
            className="minimap-cv"
            style={{ display: miniOpen ? undefined : 'none' }} />
          <span className="minimap-pct">
            {explorePct >= 100 ? tr('🗺 踏破！', '🗺 Fully explored!') : tr(`🗺 探索 ${explorePct}%`, `🗺 ${explorePct}% explored`)}
          </span>
        </button>
      )}
    </>
  )
}
