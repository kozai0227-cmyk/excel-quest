import type { Dir } from './types'
import {
  BASE,
  BEARDS,
  CREATURES,
  EMOTES,
  FACES,
  GLASSES,
  HAIR,
  HATS,
  LEGS,
  OUTFITS,
  SKIRT_LEGS,
  TIE_FLUTTER,
  type Frame,
  type Kind,
  type Part,
} from './spriteParts'

export const TS = 16
export const CH = 20 // キャラの高さ

export type Creature = keyof typeof CREATURES

export interface CharSpec {
  skin?: string
  hair: keyof typeof HAIR
  hairColor: string
  eyes?: 'normal' | 'big' | 'closed' | 'tired' | 'narrow'
  blush?: boolean
  mouth?: boolean
  outfit: keyof typeof OUTFITS
  color: string
  inner?: string
  accent?: string
  pants?: string
  shoes?: string
  hat?: keyof typeof HATS
  hatColor?: string
  hatAccent?: string
  beard?: keyof typeof BEARDS
  beardColor?: string
  glasses?: boolean
}

// ---------------------------------------------------------------- 色
function hex(c: string) {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
/** amt>0 で明るく、<0 で暗く */
export function shade(c: string, amt: number) {
  const [r, g, b] = hex(c)
  const f = (v: number) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function palette(s: CharSpec): Record<string, string> {
  const skin = s.skin ?? '#f7cfa6'
  const inner = s.inner ?? '#f4f4f0'
  const accent = s.accent ?? '#c8a040'
  const pants = s.pants ?? shade(s.color, -0.35)
  const hat = s.hatColor ?? '#e8e8e8'
  const beard = s.beardColor ?? s.hairColor
  return {
    o: '#231a16',
    s: skin,
    S: shade(skin, -0.16),
    e: '#231a16',
    w: '#ffffff',
    p: '#f2939b',
    n: '#a0443a',
    h: s.hairColor,
    H: shade(s.hairColor, 0.32),
    j: shade(s.hairColor, -0.3),
    c: s.color,
    C: shade(s.color, -0.28),
    k: shade(s.color, 0.2),
    i: inner,
    I: shade(inner, -0.16),
    a: accent,
    A: shade(accent, -0.28),
    l: pants,
    L: shade(pants, -0.25),
    f: s.shoes ?? '#3a2618',
    t: hat,
    T: shade(hat, -0.22),
    y: shade(hat, 0.35),
    q: s.hatAccent ?? '#d03030',
    b: beard,
    B: shade(beard, -0.22),
    g: '#f2c440',
    G: '#a67c1a',
    m: '#cdd2dc',
    M: '#7f8697',
    x: '#bfe4ff',
  }
}

// ---------------------------------------------------------------- 合成
function kindOf(dir: Dir): Kind {
  return dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'side'
}

function outfitRows(name: string, kind: Kind): string[] {
  const o = OUTFITS[name]
  if (kind === 'side') return o.side
  if (kind === 'down') return o.down
  if (o.up) return o.up
  const map = o.upMap ?? {}
  return o.down.map((r) => [...r].map((ch) => map[ch] ?? ch).join(''))
}

export function compose(spec: CharSpec, dir: Dir, frame: Frame, run = false): string[] {
  const kind = kindOf(dir)
  const buf = Array.from({ length: CH }, () => Array<string>(16).fill('.'))
  const stamp = (p?: Part) => {
    if (!p) return
    p.rows.forEach((row, i) => {
      for (let x = 0; x < 16; x++) if (row[x] !== '.') buf[p.y + i][x] = row[x]
    })
  }
  stamp(BASE[kind])
  const outfit = OUTFITS[spec.outfit]
  stamp({ y: 12, rows: outfitRows(spec.outfit, kind) })
  stamp((outfit.skirt ? SKIRT_LEGS : LEGS)[kind === 'side' ? 'side' : 'front'][frame])
  // 走っているとネクタイがなびく
  if (run && frame && spec.outfit === 'suit') stamp(TIE_FLUTTER[kind][frame])
  if (kind !== 'up') {
    const faces = FACES[kind]
    stamp(faces[spec.eyes ?? 'normal'])
    if (spec.blush) stamp(faces.blush)
    if (spec.mouth) stamp(faces.mouth)
    if (spec.beard) stamp(BEARDS[spec.beard][kind])
  }
  stamp(HAIR[spec.hair][kind])
  if (spec.glasses && kind !== 'up') stamp(GLASSES[kind])
  if (spec.hat) stamp(HATS[spec.hat][kind])
  return buf.map((r) => r.join(''))
}

function toCanvas(rows: string[], pal: Record<string, string>, mirror = false) {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = rows.length
  const g = c.getContext('2d')!
  rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const col = pal[row[x]]
      if (!col) continue
      g.fillStyle = col
      g.fillRect(mirror ? 15 - x : x, y, 1, 1)
    }
  })
  return c
}

const charCache = new WeakMap<CharSpec, Map<string, HTMLCanvasElement>>()

export function charSprite(spec: CharSpec, dir: Dir, frame: Frame, run = false): HTMLCanvasElement {
  let m = charCache.get(spec)
  if (!m) charCache.set(spec, (m = new Map()))
  const key = `${dir}${frame}${run ? 'r' : ''}`
  let c = m.get(key)
  if (!c) {
    c = toCanvas(compose(spec, dir, frame, run), palette(spec), dir === 'right')
    m.set(key, c)
  }
  return c
}

/** 会話ウィンドウ用：正面の頭〜肩（16x14） */
export function portraitRows(spec: CharSpec) {
  return { rows: compose(spec, 'down', 0).slice(0, 14), pal: palette(spec) }
}

export function drawRows(g: CanvasRenderingContext2D, rows: string[], pal: Record<string, string>, ox = 0, oy = 0, mirror = false) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]]
      if (!col) continue
      g.fillStyle = col
      g.fillRect(ox + (mirror ? row.length - 1 - x : x), oy + y, 1, 1)
    }
  })
}

// ---------------------------------------------------------------- 動物・モンスター
const creatureCache = new Map<string, HTMLCanvasElement>()

export function creatureSprite(name: Creature, dir: Dir = 'down', frame = 0): HTMLCanvasElement {
  const def = CREATURES[name]
  // 横向きの動物は右へ動くときに反転
  const mirror = def.faces === 'side' && dir === 'right'
  const key = `${name}|${mirror}|${frame}`
  let c = creatureCache.get(key)
  if (!c) {
    const rows = frame ? ['................', ...def.rows.slice(0, 15)] : def.rows
    c = toCanvas(rows, def.pal, mirror)
    creatureCache.set(key, c)
  }
  return c
}

// ---------------------------------------------------------------- 吹き出し
const emoteCache = new Map<string, HTMLCanvasElement>()

export function emoteBubble(name: keyof typeof EMOTES): HTMLCanvasElement {
  let c = emoteCache.get(name)
  if (!c) {
    c = document.createElement('canvas')
    c.width = 9
    c.height = 10
    const g = c.getContext('2d')!
    g.fillStyle = '#231a16'
    g.fillRect(1, 0, 7, 1)
    g.fillRect(0, 1, 9, 7)
    g.fillRect(1, 8, 7, 1)
    g.fillRect(3, 9, 2, 1)
    g.fillStyle = '#ffffff'
    g.fillRect(1, 1, 7, 7)
    g.fillRect(3, 8, 2, 1)
    const e = EMOTES[name]
    g.fillStyle = e.color
    e.rows.forEach((row, y) => [...row].forEach((ch, x) => ch === 'o' && g.fillRect(2 + x, 2 + y, 1, 1)))
    emoteCache.set(name, c)
  }
  return c
}
