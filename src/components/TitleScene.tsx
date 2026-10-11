import { useEffect, useRef, type RefObject } from 'react'
import { PLAYER_SPEC } from '../data/maps'
import { charSprite, creatureSprite } from '../game/sprites'

/**
 * タイトル画面の 背景（ドット絵）。昼の 青空・雲・城・町・川・道と、主人公・セルイム・光る 表を 描く。
 * ロゴと メニューの 位置を 読んで、空いている ところに 絵を 合わせる（スマホの 縦画面でも PC でも）
 */
export function TitleScene({ logo, menu, cast = true }: { logo?: RefObject<HTMLElement | null>; menu?: RefObject<HTMLElement | null>; cast?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!
    const root = cv.parentElement!
    const g = cv.getContext('2d')!
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let scene: Scene | null = null
    let raf = 0
    let last = 0
    const t0 = performance.now()

    const fit = () => {
      const r = root.getBoundingClientRect()
      if (!r.width || !r.height) return
      // 1ドット＝何px か（縦画面スマホで 横 150 ドット前後、PC で 240 ドット前後）
      const S = Math.max(2, Math.round(Math.min(r.width, r.height) / (r.width < r.height ? 150 : 176)))
      const W = Math.ceil(r.width / S)
      const H = Math.ceil(r.height / S)
      const box = (el?: HTMLElement | null) => {
        const b = el?.getBoundingClientRect()
        return b && b.height ? { l: (b.left - r.left) / S, t: (b.top - r.top) / S, r: (b.right - r.left) / S, b: (b.bottom - r.top) / S } : null
      }
      cv.width = W
      cv.height = H
      g.imageSmoothingEnabled = false
      scene = build(W, H, box(logo?.current), cast ? box(menu?.current) : null)
      draw(0)
    }
    const draw = (t: number) => scene && render(g, scene, t)
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 66) return // 15コマ／秒（ドット絵らしく）
      last = now
      draw((now - t0) / 1000)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    if (!still) raf = requestAnimationFrame(loop)
    // フォントの 読みこみで ロゴの 大きさが 変わったら 合わせなおす
    void document.fonts?.ready.then(fit)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [logo, menu, cast])
  return <canvas ref={ref} className="title-scene" aria-hidden />
}

// ---------------------------------------------------------------- しくみ
type Box = { l: number; t: number; r: number; b: number }
interface Scene {
  W: number
  H: number
  sky: HTMLCanvasElement
  land: HTMLCanvasElement
  clouds: { img: HTMLCanvasElement; x: number; y: number; v: number }[]
  flags: { x: number; y: number }[]
  river: { y: number; h: number }
  sign: { x: number; y: number } | null
  emblem: { x: number; y: number } | null
  hero: { x: number; y: number } | null
  slime: { x: number; y: number } | null
  birds: { y: number; off: number; v: number }[]
  sun: { x: number; y: number }
}

const rnd = (a: number, b = 0) => {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return v - Math.floor(v)
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const layer = (W: number, H: number) => {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')!
  x.imageSmoothingEnabled = false
  return [c, x] as const
}
const px = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) => {
  g.fillStyle = col
  g.fillRect(Math.round(x), Math.round(y), w, h)
}
/** ドットの 円（木・雲・丘） */
const blob = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: (dx: number, dy: number) => string | null) => {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r + r * 0.6) continue
      const c = col(x, y)
      if (c) px(g, cx + x, cy + y, 1, 1, c)
    }
}
/** ディザで 色を 混ぜた 横の 帯（空・地面の グラデーション） */
const dither = (g: CanvasRenderingContext2D, W: number, y0: number, y1: number, cols: string[]) => {
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0)) * (cols.length - 1)
    const i = Math.min(cols.length - 2, Math.floor(t))
    const f = (t - i) * 16
    for (let x = 0; x < W; x++) px(g, x, y, 1, 1, f > BAYER[(y % 4) * 4 + (x % 4)] ? cols[i + 1] : cols[i])
  }
}

// 3×5 の 小さな 字（看板の「=SUM(」）
const GLYPH: Record<string, string[]> = {
  '=': ['...', '###', '...', '###', '...'],
  S: ['###', '#..', '###', '..#', '###'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  '(': ['.#', '#.', '#.', '#.', '.#'],
}

function build(W: number, H: number, logo: Box | null, menu: Box | null): Scene {
  const portrait = H > W * 1.15
  const logoTop = logo?.t ?? H * 0.12
  const logoBottom = logo?.b ?? H * 0.3
  // 足もとの 高さ：縦画面は メニューの すぐ上、横画面は メニューの 下の はし
  const ground = Math.round(menu ? (portrait ? menu.t - 3 : menu.b - 3) : H * 0.8)
  const riverY = Math.round(ground - (portrait ? Math.max(26, H * 0.11) : Math.max(30, H * 0.2)))
  const river = { y: riverY, h: portrait ? 6 : 7 }
  const horizon = riverY

  // ---------- 空
  const [sky, sg] = layer(W, H)
  dither(sg, W, 0, horizon, ['#2a74da', '#3a8ae6', '#58a4f0', '#86c2f6', '#bfe2fb'])

  // ---------- 雲
  const clouds = Array.from({ length: portrait ? 5 : 6 }, (_, i) => {
    const cw = 18 + Math.floor(rnd(i, 7) * 22)
    const ch = Math.round(cw * 0.42)
    const [img, cg] = layer(cw + 4, ch + 4)
    const parts = 3 + Math.floor(rnd(i, 8) * 3)
    for (let k = 0; k < parts; k++) {
      const r = Math.round(ch * (0.35 + rnd(i, k + 9) * 0.25))
      const cx = 2 + r + Math.round((k / Math.max(1, parts - 1)) * (cw - 2 * r))
      const cy = ch + 2 - r - Math.round(rnd(i, k + 20) * ch * 0.25)
      blob(cg, cx, cy, r, (_dx, dy) => (dy < -r * 0.45 ? '#ffffff' : dy < r * 0.25 ? '#eef6ff' : '#c4d9f0'))
    }
    // 下を 平らに
    cg.clearRect(0, ch + 1, cw + 4, 3)
    const below = logoBottom + 3
    const y = i === 0 && logoTop > 18 ? 2 + rnd(i, 5) * Math.max(1, logoTop - 14) : below + rnd(i, 5) * Math.max(6, horizon * 0.72 - below)
    return { img, x: rnd(i, 4) * W, y, v: 1.2 + rnd(i, 6) * 2 }
  })

  // ---------- 陸（山・城・町・川・森・道）
  const [land, g] = layer(W, H)
  // 遠くの 山なみ
  const ridge = (base: number, amp: number, col: string, hi: string, seed: number) => {
    for (let x = 0; x < W; x++) {
      const n = Math.sin(x / 9 + seed) * 0.5 + Math.sin(x / 4.3 + seed * 2) * 0.25 + Math.sin(x / 17 + seed * 3) * 0.6
      const top = Math.round(base - amp * (0.6 + n * 0.4))
      px(g, x, top, 1, horizon - top + 1, col)
      px(g, x, top, 1, 1, hi)
    }
  }
  ridge(horizon - (portrait ? 16 : 16), portrait ? 16 : 14, '#8db6e2', '#acd0f0', 1.3)
  ridge(horizon - 4, portrait ? 6 : 8, '#6fa7b8', '#8cc2c8', 4.1)

  // 城の 丘と 城（右）
  const cx = Math.round(portrait ? W * 0.66 : W * 0.72)
  const room = horizon - logoBottom - 6
  const ch = Math.max(0, Math.min(Math.round(H * (portrait ? 0.25 : 0.3)), Math.floor((room - 6) / 1.33)))
  const flags: Scene['flags'] = []
  const hillW = Math.round(portrait ? W * 0.32 : W * 0.2)
  const hillTop = horizon - Math.max(5, Math.round(ch * 0.22))
  for (let x = cx - hillW - 10; x <= cx + hillW + 10; x++) {
    const d = Math.abs(x - cx) / (hillW + 10)
    const top = Math.round(hillTop + (horizon - hillTop) * d * d)
    for (let y = top; y <= horizon; y++) px(g, x, y, 1, 1, y === top ? '#5aa04a' : (x + y) % 5 === 0 ? '#2c6a3c' : '#357a42')
  }
  if (ch >= 16) {
    const base = hillTop + 1
    const wallH = Math.round(ch * 0.38)
    const wallW = Math.round(Math.min(W * (portrait ? 0.36 : 0.2), ch * 1.2))
    const stone = (x: number, y: number, w: number, h: number) => {
      px(g, x, y, w, h, '#c8b48c')
      px(g, x + w - Math.max(1, Math.round(w / 4)), y, Math.max(1, Math.round(w / 4)), h, '#a08a66')
      for (let yy = y + 2; yy < y + h; yy += 3) for (let xx = x + ((yy / 3) % 2 ? 1 : 2); xx < x + w - 1; xx += 4) px(g, xx, yy, 1, 1, '#b09a72')
      px(g, x, y, w, 1, '#e2d2ac')
    }
    const roof = (x: number, y: number, w: number, h: number) => {
      for (let k = 0; k < h; k++) {
        const half = Math.max(0, Math.round((w / 2) * (k / h)))
        px(g, x + w / 2 - half - 1, y + k, half * 2 + 2, 1, k < h * 0.35 ? '#3a5aa8' : '#28407e')
        px(g, x + w / 2 - half - 1, y + k, 1, 1, '#6e8fd8')
      }
    }
    const tower = (x: number, w: number, h: number) => {
      const top = base - h
      stone(x, top, w, h)
      for (let k = 0; k < w; k += 2) px(g, x + k, top - 1, 1, 1, '#c8b48c')
      if (h > 10) px(g, x + Math.floor(w / 2) - 1, top + Math.round(h * 0.25), 2, 3, '#22283c')
      if (h > 22) px(g, x + Math.floor(w / 2) - 1, top + Math.round(h * 0.55), 2, 3, '#3a4058')
      const rh = Math.max(4, Math.round(w * 1.3))
      roof(x - 1, top - rh, w + 2, rh)
      flags.push({ x: x + Math.floor(w / 2), y: top - rh - 4 })
    }
    // 城壁と 門
    stone(cx - wallW / 2, base - wallH, wallW, wallH)
    for (let k = 0; k < wallW; k += 3) px(g, cx - wallW / 2 + k, base - wallH - 1, 2, 1, '#c8b48c')
    px(g, cx - 2, base - Math.round(wallH * 0.6), 4, Math.round(wallH * 0.6), '#4a3a2c')
    const tw = Math.max(4, Math.round(ch * 0.16))
    tower(Math.round(cx - wallW / 2 - tw / 2), tw, Math.round(ch * 0.62))
    tower(Math.round(cx + wallW / 2 - tw / 2), tw, Math.round(ch * 0.58))
    tower(Math.round(cx - wallW * 0.22 - tw / 2), tw, Math.round(ch * 0.78))
    tower(Math.round(cx + wallW * 0.2 - tw / 2), tw + 1, Math.round(ch * 0.9))
    // 窓
    for (let k = 0; k < 4; k++) px(g, cx - wallW / 2 + 3 + k * Math.round(wallW / 4), base - Math.round(wallH * 0.75), 1, 2, '#3a4058')
  }

  // 町と 石の 橋（左）
  const tx = Math.round(portrait ? W * 0.16 : W * 0.2)
  const house = (x: number, w: number, h: number, roofCol: string) => {
    const top = horizon - h
    px(g, x, top, w, h, '#d6c6a0')
    px(g, x + w - 1, top, 1, h, '#b0a07a')
    px(g, x + 1, top + 2, 1, 1, '#4a5a78')
    for (let k = 0; k < 3; k++) px(g, x - 1 + k, top - 1 - k, w + 2 - 2 * k, 1, k === 2 ? '#e08a5a' : roofCol)
  }
  house(tx - 10, 6, 6, '#b0583a')
  house(tx - 3, 5, 8, '#9a4a34')
  house(tx + 3, 7, 5, '#b0583a')
  // 橋：アーチが 3つ
  const bw = Math.round(portrait ? W * 0.3 : W * 0.2)
  const bx = Math.max(0, tx - Math.round(bw * 0.4))
  const by = horizon - 3
  px(g, bx, by - 3, bw, 2, '#9c8c70')
  px(g, bx, by - 3, bw, 1, '#c2b496')
  for (let x = bx; x < bx + bw; x++) {
    const k = (x - bx) % 9
    const open = k >= 2 && k <= 6
    px(g, x, by - 1, 1, 4, open ? '#5e8fc0' : '#8a7a60')
    if (open && (k === 2 || k === 6)) px(g, x, by - 1, 1, 1, '#8a7a60')
  }

  // 川
  dither(g, W, river.y, river.y + river.h, ['#4aa6f0', '#348ee0', '#2a7ccc'])
  px(g, 0, river.y, W, 1, '#b2e2ff')

  // 向こう岸の 木（川の 上）と、手前の 草地
  const tree = (x: number, y: number, r: number, dark: string, mid: string, hi: string) => {
    px(g, x, y + r - 1, 1, 3, '#3a2a1e')
    blob(g, x, y, r, (dx, dy) => (dx + dy < -r * 0.6 ? hi : dx + dy < r * 0.4 ? mid : dark))
  }
  for (let x = -2; x < W + 4; x += 5) {
    if (Math.abs(x - cx) < hillW * 0.55 || Math.abs(x - tx) < 9) continue
    tree(x + Math.round(rnd(x, 31) * 3), horizon - 2 - Math.round(rnd(x, 32) * 2), 2 + Math.round(rnd(x, 33)), '#2a6a3c', '#3a8a4c', '#58aa5e')
  }
  dither(g, W, river.y + river.h, H, ['#5cb24e', '#4a9e44', '#3a8638', '#2c6a2e', '#1f4e22'])
  // 手前の 草むら（すき間に 小さな 茂み）
  for (let x = 0; x < W; x += 3) {
    const y = river.y + river.h + 1 + Math.round(rnd(x, 41) * Math.max(2, ground - river.y - river.h - 10))
    if (y < ground - 8) px(g, x, y, 2, 1, rnd(x, 42) > 0.5 ? '#7ccc5a' : '#9ade6a')
  }
  // 道（主人公と セルイムが 立つ）
  for (let x = 0; x < W; x++) {
    const wob = Math.round(Math.sin(x / 11) * 1.2)
    const top = ground - 6 + wob
    const bot = ground + 4 + wob
    for (let y = top; y <= bot; y++) {
      const edge = y === top || y === bot
      px(g, x, y, 1, 1, edge ? '#6e4e2e' : rnd(x, y) > 0.86 ? '#d2aa70' : rnd(x, y + 1) > 0.8 ? '#94703f' : '#b08850')
    }
    if (rnd(x, 51) > 0.7) px(g, x, top - 1, 1, 1, '#7ccc5a')
  }
  // 道の 両はしの 大きな 木（画面の ふち）
  for (const [x, s] of [
    [2, 1],
    [W - 3, -1],
  ] as const) {
    const r = portrait ? 9 : 12
    tree(x, ground - r - 6, r, '#1f5a30', '#2f7a40', '#4c9e54')
    tree(x + s * 7, ground - r, r - 3, '#245e34', '#358446', '#58ae5e')
  }

  // ---------- 動く もの の 位置
  const sign = W > 100 ? { x: Math.round(Math.min(W - 24, portrait ? W - 24 : cx + hillW + 2)), y: Math.round(horizon - 12) } : null
  const emblem = logoTop > 24 ? { x: Math.round(W / 2), y: Math.round(logoTop - 15) } : null
  const sun = { x: Math.round(W * (portrait ? 0.2 : 0.14)), y: Math.round(Math.min(horizon - 40, logoBottom + (portrait ? 22 : 14))) }
  let hero: Scene['hero'] = null
  let slime: Scene['slime'] = null
  if (menu) {
    if (portrait) {
      hero = { x: Math.round(W * 0.34), y: ground }
      slime = { x: Math.round(W * 0.7), y: ground }
    } else {
      hero = { x: Math.round(Math.max(26, menu.l - 22)), y: ground }
      slime = { x: Math.round(Math.min(W - 18, menu.r + 18)), y: ground }
    }
  }
  const birds = Array.from({ length: portrait ? 3 : 4 }, (_, i) => ({ y: Math.round(logoBottom + 8 + rnd(i, 61) * Math.max(10, horizon * 0.5 - logoBottom)), off: i * 53, v: 7 + i * 2 }))
  return { W, H, sky, land, clouds, flags, river, sign, emblem, hero, slime, birds, sun }
}

// ---------------------------------------------------------------- 毎コマ 描く
const sprites = new Map<string, HTMLCanvasElement>()
const cached = (key: string, make: () => HTMLCanvasElement) => {
  let c = sprites.get(key)
  if (!c) sprites.set(key, (c = make()))
  return c
}
/** 遠くの 鳥（羽を 上げた 形と 下げた 形） */
const BIRD_UP: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 1], [4, 0]]
const BIRD_DOWN: [number, number][] = [[0, 2], [1, 1], [2, 2], [3, 1], [4, 2]]
/** 光る 表（ヘッダーと マス目、まん中に 金の「＝」） */
const sheet = () => {
  const [c, x] = layer(26, 20)
  px(x, 0, 0, 26, 20, '#bff8ff')
  px(x, 1, 1, 24, 18, '#e9fcff')
  px(x, 1, 1, 24, 4, '#4fd0e8')
  for (let k = 7; k < 25; k += 6) px(x, k, 1, 1, 18, '#8edcf0')
  for (let k = 9; k < 19; k += 4) px(x, 1, k, 24, 1, '#8edcf0')
  for (const y of [8, 12]) {
    px(x, 6, y - 1, 14, 4, '#7a4a08')
    px(x, 7, y, 12, 2, '#ffd24a')
    px(x, 7, y, 5, 1, '#fff2b0')
  }
  return c
}
/** 主人公の 剣（右手で ななめに 構える）。主人公の 絵の 中の マス目で 描く */
const SWORD: [number, number, string][] = (() => {
  const out: [number, number, string][] = []
  const bx = 1
  const by = 13
  for (let t = 1; t <= 8; t++) {
    out.push([bx - t, by - t, '#eef6ff'])
    out.push([bx - t + 1, by - t, '#9fbcd8'])
  }
  out.push([bx - 9, by - 9, '#ffffff'])
  for (const [x, y] of [
    [bx - 1, by + 1],
    [bx, by],
    [bx + 1, by - 1],
    [bx + 2, by - 2],
  ])
    out.push([x, y, '#f2c440'])
  out.push([bx + 1, by + 1, '#7a4a22'], [bx + 2, by + 2, '#7a4a22'])
  return out
})()

/** 剣の まわり 1マス（主人公の 体に かかる ところは 除く） */
const SWORD_EDGE: [number, number][] = (() => {
  const on = new Set(SWORD.map(([x, y]) => `${x},${y}`))
  const out: [number, number][] = []
  for (const [x, y] of SWORD)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
    ]) {
      const k = `${x + dx},${y + dy}`
      if (!on.has(k) && x + dx < 3 && !out.some(([a, b]) => a === x + dx && b === y + dy)) out.push([x + dx, y + dy])
    }
  return out
})()

function render(g: CanvasRenderingContext2D, s: Scene, t: number) {
  const { W, H } = s
  g.clearRect(0, 0, W, H)
  g.drawImage(s.sky, 0, 0)
  // お日さま（光が ゆっくり 回る）
  {
    const { x, y } = s.sun
    const glow = g.createRadialGradient(x, y, 3, x, y, 22)
    glow.addColorStop(0, 'rgba(255,248,200,0.7)')
    glow.addColorStop(1, 'rgba(255,248,200,0)')
    g.fillStyle = glow
    g.fillRect(x - 22, y - 22, 44, 44)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.25
      for (let r = 10; r < 13; r++) px(g, x + Math.cos(a) * r, y + Math.sin(a) * r, 1, 1, '#fff2a0')
    }
    blob(g, x, y, 7, (dx, dy) => (dx * dx + dy * dy > 36 ? '#ffd23c' : dx + dy < -4 ? '#fffbe0' : '#fff09a'))
  }
  // 雲（ゆっくり 流れる）
  for (const c of s.clouds) {
    const span = W + c.img.width
    const x = (((c.x + t * c.v) % span) + span) % span - c.img.width
    g.drawImage(c.img, Math.round(x), Math.round(c.y))
  }
  // 鳥（遠くを 飛ぶ）
  for (const b of s.birds) {
    const span = W + 20
    const x = ((b.off + t * b.v) % span) - 10
    const y = b.y + Math.sin(t * 1.5 + b.off) * 3
    const up = Math.floor(t * 4 + b.off) % 2 === 0
    for (const [dx, dy] of up ? BIRD_UP : BIRD_DOWN) px(g, x + dx, y + dy, 1, 1, '#2c3c5c')
  }
  g.drawImage(s.land, 0, 0)
  // 城の 旗（はためく）
  for (const f of s.flags) {
    px(g, f.x, f.y, 1, 5, '#2a2a3a')
    for (let k = 0; k < 4; k++) {
      const wave = Math.round(Math.sin(t * 6 + k * 0.9 + f.x) * 0.6)
      px(g, f.x + 1 + k, f.y + wave, 1, 2, k === 3 ? '#b02828' : '#e84040')
    }
  }
  // 川の きらめき
  for (let i = 0; i < Math.round(W / 14); i++) {
    const x = (((i * 23 + t * (4 + (i % 3))) % (W + 6)) + W + 6) % (W + 6) - 3
    px(g, x, s.river.y + 2 + (i % 3) * Math.floor(s.river.h / 3), 3, 1, i % 2 ? '#8fd0ff' : '#5ea6ee')
  }
  // 「=SUM(」の 光る 看板
  if (s.sign) {
    const { x, y } = s.sign
    const flick = 0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 2.3)
    g.save()
    g.globalAlpha = flick
    g.shadowColor = '#5ff4ff'
    g.shadowBlur = 4
    g.strokeStyle = '#7ff6ff'
    g.lineWidth = 1
    g.strokeRect(x + 0.5, y + 0.5, 20, 9)
    g.fillStyle = 'rgba(8,40,80,0.7)'
    g.fillRect(x + 1, y + 1, 19, 8)
    let cx = x + 2
    for (const ch of '=SUM') {
      const rows = GLYPH[ch]
      rows.forEach((r, ry) => [...r].forEach((c, rx) => c === '#' && px(g, cx + rx, y + 3 + ry - 1, 1, 1, '#c8fcff')))
      cx += rows[0].length + 1
    }
    g.restore()
  }
  // 浮かぶ 表と 光の 輪
  if (s.emblem) {
    const cx = s.emblem.x
    const cy = s.emblem.y + Math.round(Math.sin(t * 2) * 1)
    const glow = g.createRadialGradient(cx, cy, 2, cx, cy, 22)
    glow.addColorStop(0, 'rgba(120,240,255,0.45)')
    glow.addColorStop(1, 'rgba(120,240,255,0)')
    g.fillStyle = glow
    g.fillRect(cx - 24, cy - 24, 48, 48)
    const ring = (front: boolean) => {
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2 + t * 1.6
        const isFront = Math.sin(a) > 0
        if (isFront !== front) continue
        const x = cx + Math.cos(a) * 21
        const y = cy + 4 + Math.sin(a) * 4
        const hot = (i + Math.floor(t * 8)) % 16 < 3
        px(g, x, y, 1, 1, hot ? '#ffffff' : front ? '#7ff6ff' : '#3a9ab8')
      }
    }
    ring(false)
    g.drawImage(cached('sheet', sheet), cx - 13, cy - 10)
    ring(true)
    for (let i = 0; i < 4; i++) {
      const a = t * 1.3 + i * 1.7
      if (Math.sin(a * 2) < 0.3) continue
      const x = cx + Math.round(Math.cos(a) * 26)
      const y = cy - 8 + Math.round(Math.sin(a * 1.4) * 9)
      px(g, x, y - 1, 1, 3, '#dffcff')
      px(g, x - 1, y, 3, 1, '#dffcff')
    }
  }
  // 主人公と セルイム（2倍の 大きさ）
  const K = 2
  if (s.hero) {
    const { x, y } = s.hero
    const img = charSprite(PLAYER_SPEC, 'down', 0)
    const x0 = x - 8 * K
    const y0 = y - 19 * K
    g.fillStyle = 'rgba(0,0,0,0.32)'
    g.fillRect(x - 7 * K, y - 2, 14 * K, 3)
    g.drawImage(img, x0, y0, 16 * K, 20 * K)
    for (const [sx, sy] of SWORD_EDGE) px(g, x0 + sx * K, y0 + sy * K, K, K, '#14101e')
    for (const [sx, sy, col] of SWORD) px(g, x0 + sx * K, y0 + sy * K, K, K, col)
    // 剣の きらめき
    if (Math.sin(t * 1.7) > 0.8) {
      const tx = x0 + (1 - 9) * K
      const ty = y0 + (13 - 9) * K
      px(g, tx, ty - 3, 1, 7, '#ffffff')
      px(g, tx - 3, ty, 7, 1, '#ffffff')
    }
  }
  if (s.slime) {
    const { x, y } = s.slime
    const hop = Math.max(0, Math.sin(t * 4)) * 3
    const img = creatureSprite('celime', 'down', Math.floor(t * 4) % 2)
    g.fillStyle = 'rgba(0,0,0,0.32)'
    g.fillRect(x - 6 * K, y - 2, 12 * K, 3)
    g.drawImage(img, x - 8 * K, Math.round(y - 14 * K - hop), 16 * K, 16 * K)
  }
}
