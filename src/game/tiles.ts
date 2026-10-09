import { TS, drawRows, shade } from './sprites'

/** 歩けるタイル（それ以外はすべて通行不可） */
export const WALKABLE = new Set(['.', ',', '"', '=', 'T', 'B', 'D', 'd', '_', ':', 'g', 'z', '%', '@', '&', '*', 'q', '<', 'K', '{', '}', '-', 'i', '>', '?', ';', 'Φ', 'σ', 'ψ'])
/** 幽霊船の床系 */
const SHIP_OPEN = new Set([';', ']', '(', '{', '}', '>', 'x', 'o'])
/** 鏡の神殿の床系 */
const TEMPLE_OPEN = new Set(['i', '>', 's', '(', 'L', '{', '}'])
/** 洞窟の床系（壁の下端に岩肌を描くため） */
const CAVE_OPEN = new Set(['q', '<', '9', 'C', '('])
/** 塔の床系（石壁の下端に面を描くため） */
const TOWER_OPEN = new Set([':', '{', '}', '-', '(', 'L', 'x', 'o'])
/** カウンター越しに話しかけられるタイル */
export const COUNTER = new Set(['c', 'l', 't'])

type G = CanvasRenderingContext2D
type At = (x: number, y: number) => string

const GRASSY = new Set(['.', ',', '"', '#', 'Y', 'b', 'r', 'F', 'Z', 'h', 'k', 'M', 'K', 'η', 'π', 'κ', 'υ'])
// 船体 ')' も 水辺あつかい（船の まわりに 岸の 縁を 描かない）
const WATERY = new Set(['~', 'B', ')', 'β'])
const ROOFS: Record<string, string> = { R: '#c4493a', U: '#3f67b6', E: '#3f8c4c', N: '#d27f38', Q: '#7c4ea4', '+': '#3f67b6' }
const PLASTER = new Set(['W', 'w', 'D', '1', '2', '3', '4', '5', '8'])
const STONE = new Set(['V', 'v', 'd', '6', '7', '9', 'X'])
const isWall = (c: string) => PLASTER.has(c) || STONE.has(c)
const isRoof = (c: string) => c in ROOFS
const DECOR_ON_GROUND = new Set(['L', 'o', 'x', 'p', 'n', 'a', 'm', 'A', 'P', 'S', 'c', 'e', 't', 'l', 'ν', 'α', 'ω', 'τ', 'φ', 'μ', 'θ', 'ζ', 'ξ', 'χ', 'λ'])
const ANIMATED = new Set(['~', 'B', 'Z', 'u', 'f', 'L', 'y', 'C', '(', 's', '?', 'Φ', 'Λ', 'β', 'φ', 'μ', 'ζ'])
const INDOOR_FLOOR = new Set(['_', ':', 'g', 'z'])

const OUT = '#231a16'

// ---------------------------------------------------------------- 町ごとの 見た目（テーマ）
export type ThemeName = 'default' | 'village' | 'canal' | 'mirror' | 'port' | 'castle' | 'royal' | 'edo' | 'satoyama' | 'snow'
type TreeKind = 'tree' | 'pine' | 'palm' | 'sakura' | 'maple' | 'snowpine' | 'willow' | 'topiary'
interface Theme {
  /** 草地：地の 色・葉の 影・明るい 葉 */
  grass: [string, string, string]
  /** 雪景色（草の かわりに 雪、花の かわりに 雪だまり） */
  snow?: boolean
  /** 土の 道：地・暗・明・草との 境 */
  dirt: [string, string, string, string]
  /** 舗装（T）の 種類 */
  pave: 'cobble' | 'brick' | 'mirror' | 'slab' | 'royal' | 'gravel' | 'snow'
  roof: 'tile' | 'thatch' | 'kaya' | 'slate' | 'kawara' | 'snow'
  /** 屋根の 色の 置きかえ（文字 → 色） */
  roofs?: Record<string, string>
  wall: 'plaster' | 'log' | 'timber' | 'white' | 'mirror' | 'edo' | 'earth' | 'royal'
  /** 窓の よろい戸 */
  shutter: string
  /** 木（#・Y） */
  trees: [TreeKind, TreeKind]
  lamp: 'lamp' | 'torch' | 'lantern' | 'brazier' | 'crystal'
  flowers: string[]
  /** 水：水面・波・岸 */
  water: [string, string, string]
  mountain?: Record<string, string>
}
const DEFAULT_THEME: Theme = {
  grass: ['#5eae44', '#4b9534', '#7fca60'],
  dirt: ['#d8b47a', '#bf985c', '#ead0a0', '#b8935a'],
  pave: 'cobble',
  roof: 'tile',
  wall: 'plaster',
  shutter: '#3f7a44',
  trees: ['tree', 'pine'],
  lamp: 'lamp',
  flowers: ['#ffffff', '#f04a5a', '#f8d040', '#f07ab0', '#7aa8f8'],
  water: ['#2f6fd0', '#6fa8ee', '#3d7a2e'],
}
const THEMES: Record<ThemeName, Theme> = {
  default: DEFAULT_THEME,
  // はじまりの村：わらぶき屋根と 丸太の 家、たいまつ
  village: { ...DEFAULT_THEME, grass: ['#63b446', '#4e9a36', '#86d064'], roof: 'thatch', wall: 'log', shutter: '#6a4a2a', lamp: 'torch' },
  // 計算の町：赤レンガの 道、赤茶の 屋根、木組みの 家
  canal: { ...DEFAULT_THEME, pave: 'brick', roofs: { R: '#b8442e', U: '#c8643a', E: '#a85a34', N: '#d27f38', Q: '#9a4a3a' }, shutter: '#7a3a2a' },
  // 鏡の町：銀色に 光る 石畳、白い 壁、水晶の 灯り
  mirror: {
    ...DEFAULT_THEME,
    grass: ['#5aaa7a', '#45916a', '#86d0a8'],
    pave: 'mirror',
    roofs: { R: '#6a7ad0', U: '#4a8ac8', E: '#5aa0b0', N: '#8a7ac8', Q: '#7a5ab8' },
    wall: 'mirror',
    shutter: '#5a7ab0',
    lamp: 'crystal',
    water: ['#4a90e0', '#c8e8ff', '#3d7a6a'],
    flowers: ['#ffffff', '#b8d8ff', '#e0c8ff', '#a8f0e8', '#ffffff'],
  },
  // 港町：白壁と 青い 屋根、ヤシの 木、石の 岸壁
  port: {
    ...DEFAULT_THEME,
    grass: ['#78b84a', '#5f9a38', '#a0d468'],
    roofs: { R: '#2a6ab8', U: '#2a8ab0', E: '#2a9a8a', N: '#d86a3a', Q: '#3a5a9a' },
    wall: 'white',
    shutter: '#2a7ac0',
    trees: ['palm', 'palm'],
    water: ['#1f78c8', '#7ac0f0', '#9a948a'],
  },
  // 城下町：大きな 敷石と スレート屋根、木組みの 家
  castle: {
    ...DEFAULT_THEME,
    grass: ['#4f9e40', '#3d8432', '#70bc58'],
    pave: 'slab',
    roof: 'slate',
    roofs: { R: '#6a4a5a', U: '#3a4a6a', E: '#3a5a5a', N: '#6a5040', Q: '#4a3a6a' },
    wall: 'timber',
    shutter: '#3a4a7a',
  },
  // 王都：白い 大理石と 金、赤と 青の 屋根、刈りこんだ 木
  royal: {
    ...DEFAULT_THEME,
    grass: ['#56b03e', '#449a30', '#7cd060'],
    pave: 'royal',
    roofs: { R: '#c03040', U: '#2a4aa8', E: '#c03040', N: '#2a4aa8', Q: '#7a2a8a' },
    wall: 'royal',
    shutter: '#2a4aa8',
    trees: ['topiary', 'pine'],
    flowers: ['#f04a5a', '#f8d040', '#ffffff', '#f04a5a', '#f8d040'],
  },
  // 宿場町：瓦屋根と 白壁・格子、ちょうちん、柳
  edo: {
    ...DEFAULT_THEME,
    grass: ['#7aa24c', '#62883a', '#9ac066'],
    dirt: ['#c8aa7a', '#a88a5c', '#dcc49a', '#a08458'],
    pave: 'gravel',
    roof: 'kawara',
    wall: 'edo',
    shutter: '#3a2a1a',
    lamp: 'lantern',
  },
  // 暦の里：かやぶき屋根と 土壁、桜と 紅葉
  satoyama: {
    ...DEFAULT_THEME,
    grass: ['#6cb04a', '#58963a', '#90cc6a'],
    pave: 'slab',
    roof: 'kaya',
    wall: 'earth',
    shutter: '#5a3a1a',
    trees: ['sakura', 'maple'],
    lamp: 'lantern',
    flowers: ['#ffffff', '#f8b8d0', '#f8d040', '#f07ab0', '#ffffff'],
  },
  // 最果ての砦：雪、雪を かぶった 屋根と 針葉樹、かがり火
  snow: {
    ...DEFAULT_THEME,
    grass: ['#e8eef5', '#c6d2e0', '#ffffff'],
    snow: true,
    dirt: ['#b8b0a8', '#9a928a', '#d0c8c0', '#c6d2e0'],
    pave: 'snow',
    roof: 'snow',
    wall: 'log',
    shutter: '#3a3a4a',
    trees: ['snowpine', 'snowpine'],
    lamp: 'brazier',
    water: ['#5a88b8', '#c8e0f0', '#e8eef5'],
    mountain: { o: '#3a3a4a', L: '#ffffff', G: '#c8d4e4', D: '#8a96aa' },
  },
}
/** いま 描いている マップの テーマ（drawTile で 切りかえる） */
let TH: Theme = DEFAULT_THEME

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const px = (g: G, x: number, y: number, w: number, h: number, col: string) => {
  g.fillStyle = col
  g.fillRect(x, y, w, h)
}

interface Ctx {
  n: string
  s: string
  w: string
  e: string
  v: number
  f: number
}

// ---------------------------------------------------------------- 地面
function grass(g: G, v: number) {
  const [base, dark, light] = TH.grass
  px(g, 0, 0, TS, TS, base)
  const r = rng(v * 97 + 13)
  // 雪は 横長の 影、草は 縦の 葉
  for (let i = 0; i < 7; i++) px(g, Math.floor(r() * 15), Math.floor(r() * 14), TH.snow ? 2 : 1, TH.snow ? 1 : 2, dark)
  for (let i = 0; i < 3; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, light)
}

function dirt(g: G, c: Ctx) {
  const [base, dark, light, edge] = TH.dirt
  px(g, 0, 0, TS, TS, base)
  const r = rng(c.v * 31 + 5)
  for (let i = 0; i < 6; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, dark)
  for (let i = 0; i < 3; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, light)
  fringe(g, c, TH.grass[0], edge)
}

/** 砂浜（港町） */
function sand(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#e8d49a')
  const r = rng(c.v * 37 + 2)
  for (let i = 0; i < 8; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, i % 2 ? '#d4bc80' : '#f6e8bc')
  fringe(g, c, TH.grass[0], '#c8b070')
}

/** 板張りの 岸壁（港町） */
function boardwalk(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#a8743c')
  for (let y = 0; y < 16; y += 4) {
    px(g, 0, y, 16, 1, '#c08a50')
    px(g, 0, y + 3, 16, 1, '#7a4e22')
    px(g, ((c.v + y) * 5) % 14 + 1, y + 1, 1, 1, '#5a3a1a')
  }
  const plank = (x: string) => x === 'ψ' || x === 'B'
  if (!plank(c.n)) px(g, 0, 0, 16, 1, '#5a3a1a')
  if (!plank(c.s)) px(g, 0, 15, 16, 1, '#5a3a1a')
  if (!plank(c.w)) px(g, 0, 0, 1, 16, '#5a3a1a')
  if (!plank(c.e)) px(g, 15, 0, 1, 16, '#5a3a1a')
}

/** 草地と接する辺に、ギザギザの草の縁を描く */
function fringe(g: G, c: Ctx, grassCol: string, edgeCol: string) {
  const r = rng(c.v * 7 + 3)
  const depth = () => 1 + (r() < 0.45 ? 1 : 0)
  for (let i = 0; i < 16; i++) {
    if (GRASSY.has(c.n)) {
      const d = depth()
      px(g, i, 0, 1, d, grassCol)
      px(g, i, d, 1, 1, edgeCol)
    }
    if (GRASSY.has(c.s)) {
      const d = depth()
      px(g, i, 16 - d, 1, d, grassCol)
      px(g, i, 15 - d, 1, 1, edgeCol)
    }
    if (GRASSY.has(c.w)) {
      const d = depth()
      px(g, 0, i, d, 1, grassCol)
      px(g, d, i, 1, 1, edgeCol)
    }
    if (GRASSY.has(c.e)) {
      const d = depth()
      px(g, 16 - d, i, d, 1, grassCol)
      px(g, 15 - d, i, 1, 1, edgeCol)
    }
  }
}

function cobbles(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#8d8578')
  const r = rng(c.v * 53 + 11)
  const cols = ['#c7bfae', '#bdb4a2', '#cfc8b8', '#b6ad9b']
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 4 : 0
    for (let sx = -off; sx < 16; sx += 8) {
      const x = Math.max(0, sx)
      const w = Math.min(sx + 7, 16) - x
      if (w <= 0) continue
      const col = cols[Math.floor(r() * cols.length)]
      px(g, x, row * 4, w, 3, col)
      px(g, x, row * 4, w, 1, shade(col, 0.25))
      px(g, x, row * 4 + 2, w, 1, shade(col, -0.1))
    }
  }
}

/** 赤レンガ（計算の町） */
function bricks(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#7a4636')
  const r = rng(c.v * 29 + 3)
  const cols = ['#b4583e', '#a64c36', '#c0664a', '#9c4632']
  for (let row = 0; row < 4; row++) {
    const off = (row % 2) * 3
    for (let sx = -off; sx < 16; sx += 6) {
      const x = Math.max(0, sx)
      const w = Math.min(sx + 5, 16) - x
      if (w <= 0) continue
      const col = cols[Math.floor(r() * cols.length)]
      px(g, x, row * 4, w, 3, col)
      px(g, x, row * 4, w, 1, shade(col, 0.18))
    }
  }
}

/** 大きな 敷石（城下町） */
function slabs(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#5e5e66')
  const r = rng(c.v * 61 + 7)
  const cols = ['#a8a8b0', '#9c9ca6', '#b4b4bc']
  for (let row = 0; row < 2; row++) {
    const off = (row + c.v) % 2 ? 4 : 0
    for (let sx = -off; sx < 16; sx += 8) {
      const x = Math.max(0, sx)
      const w = Math.min(sx + 7, 16) - x
      if (w <= 0) continue
      const col = cols[Math.floor(r() * 3)]
      px(g, x, row * 8, w, 7, col)
      px(g, x, row * 8, w, 1, shade(col, 0.22))
      px(g, x, row * 8 + 6, w, 1, shade(col, -0.15))
      if (r() < 0.3) px(g, x + 2, row * 8 + 3, 2, 1, shade(col, -0.2))
    }
  }
}

/** 鏡の タイル（鏡の町） */
function mirrorTiles(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#8aa4c0')
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 2; x++) {
      px(g, x * 8, y * 8, 7, 7, (x + y) % 2 ? '#dce8f4' : '#c4d8ec')
      for (let i = 0; i < 3; i++) px(g, x * 8 + 1 + i, y * 8 + 3 - i, 1, 1, '#ffffff')
    }
  if (c.v % 3 === 0) px(g, 11, 4, 1, 1, '#ffffff')
}

/** 白い 大理石と 金の 象眼（王都） */
function marble(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#c8bfa8')
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) px(g, x * 8, y * 8, 7, 7, (x + y + c.v) % 2 ? '#f2eee4' : '#e6e0d2')
  const r = rng(c.v * 17 + 5)
  for (let i = 0; i < 3; i++) px(g, Math.floor(r() * 14), Math.floor(r() * 14), 2, 1, '#d6cfbf')
  px(g, 7, 7, 2, 2, '#d8b040')
}

/** 砂利の 街道（宿場町） */
function gravel(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#cbb994')
  const r = rng(c.v * 43 + 9)
  for (let i = 0; i < 18; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, i % 3 ? '#ab9a74' : '#e6d8b8')
}

function paving(g: G, c: Ctx) {
  if (TH.pave === 'brick') bricks(g, c)
  else if (TH.pave === 'slab') slabs(g, c)
  else if (TH.pave === 'mirror') mirrorTiles(g, c)
  else if (TH.pave === 'royal') marble(g, c)
  else if (TH.pave === 'gravel') gravel(g, c)
  else cobbles(g, c)
  if (TH.pave === 'snow') {
    // 石畳に 雪が 積もっている
    const r = rng(c.v * 7 + 21)
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(r() * 12)
      const y = Math.floor(r() * 12)
      px(g, x, y, 4, 2, '#f2f6fa')
      px(g, x + 1, y + 2, 2, 1, '#f2f6fa')
    }
  }
  const curb = TH.pave === 'royal' ? '#b8a878' : '#6e685e'
  if (GRASSY.has(c.n)) px(g, 0, 0, 16, 1, curb)
  if (GRASSY.has(c.s)) px(g, 0, 15, 16, 1, curb)
  if (GRASSY.has(c.w)) px(g, 0, 0, 1, 16, curb)
  if (GRASSY.has(c.e)) px(g, 15, 0, 1, 16, curb)
}

function water(g: G, c: Ctx, shore = true) {
  const [base, ripple, shoreCol] = TH.water
  px(g, 0, 0, TS, TS, base)
  const r = rng(c.v * 19 + 1)
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * 12)
    const y = Math.floor(r() * 14) + 1
    px(g, (x + c.f * 3) % 13, y, 3, 1, ripple)
  }
  if (c.f % 2) px(g, Math.floor(r() * 14), Math.floor(r() * 14), 1, 1, '#e8f6ff')
  if (!shore) return
  // 砂浜に 接する 岸は 砂の 色
  const bank = (n: string) => (n === 'σ' ? '#e8d49a' : shoreCol)
  const foam = '#a8dcff'
  if (!WATERY.has(c.n)) {
    px(g, 0, 0, 16, 2, bank(c.n))
    px(g, 0, 2, 16, 1, foam)
  }
  if (!WATERY.has(c.s)) {
    px(g, 0, 15, 16, 1, bank(c.s))
    px(g, 0, 14, 16, 1, foam)
  }
  if (!WATERY.has(c.w)) {
    px(g, 0, 0, 1, 16, bank(c.w))
    px(g, 1, 0, 1, 16, foam)
  }
  if (!WATERY.has(c.e)) {
    px(g, 15, 0, 1, 16, bank(c.e))
    px(g, 14, 0, 1, 16, foam)
  }
}

// ---------------------------------------------------------------- 自然物
const TREE = [
  '......oooo......',
  '....ooDGGDoo....',
  '...oDGGLLGGDo...',
  '..oDGGLLLLGGDo..',
  '..oGGLLLGGGGGo..',
  '.oDGGGLGGGGGGDo.',
  '.oGGGGGGGGLLGGo.',
  '.oDGGGGGGLLLGGo.',
  '.oDDGGGGGGGGGDo.',
  '..oDDGGGGGGDDo..',
  '...ooDDDDDDoo...',
  '.....ooTToo.....',
  '......oTTo......',
  '......oTTo......',
  '....ssoTtoss....',
  '.....ssssss.....',
]
const PINE = [
  '.......oo.......',
  '......oLGo......',
  '.....oLGGGo.....',
  '....oLGGGGDo....',
  '.....oGGGDo.....',
  '....oLGGGGDo....',
  '...oLGGGGGGDo...',
  '....oGGGGGDo....',
  '...oLGGGGGGDo...',
  '..oLGGGGGGGGDo..',
  '.oLGGGGGGGGGGDo.',
  '..ooDDDDDDDDoo..',
  '......oTTo......',
  '......oTTo......',
  '....ssoTtoss....',
  '.....ssssss.....',
]
const BUSH = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '....oooooooo....',
  '...oGGLLGGGGo...',
  '..oGGLLLGGGGGo..',
  '.oDGGGGGGGLGGDo.',
  '.oDGGGGGGGGGGDo.',
  '.oDDGGGGGGGGDDo.',
  '..oDDDGGGGDDDo..',
  '...oooooooooo...',
  '...ssssssssss...',
  '................',
  '................',
]
const ROCK = [
  '................',
  '................',
  '................',
  '................',
  '.....oooooo.....',
  '...ooLLLGGGoo...',
  '..oLLLGGGGGGGo..',
  '.oLLGGGGGGGGGDo.',
  '.oLGGGGGGGGGDDo.',
  '.oGGGGGGGGGDDDo.',
  '.oDGGGGGGGDDDDo.',
  '..oDDDDDDDDDDo..',
  '...oooooooooo...',
  '..ssssssssssss..',
  '................',
  '................',
]
const MOUNTAIN = [
  '.......oo.......',
  '......oLLo......',
  '.....oLLLGo.....',
  '....oLLLGGGo....',
  '...oLLGGGGGDo...',
  '...oLGGGGGGDo...',
  '..oLGGGGGGGDDo..',
  '..oGGGGGGGGDDo..',
  '.oLGGGGGGGGGDDo.',
  '.oGGGGGGGGGGDDo.',
  'oLGGGGGGGGGGGDDo',
  'oGGGGGGGGGGGGDDo',
  'oooooooooooooooo',
]
const PALM = [
  '....oo.....oo...',
  '...oLGo...oGLo..',
  '..oLGGGo.oGGGLo.',
  '.oLGoooGoGoooGLo',
  'oLGo..oGGGo..oGo',
  'oGo..oGLLLGo..o.',
  '.o..oGo.T.oGo...',
  '....oo..T..oo...',
  '........Tt......',
  '.......TTt......',
  '.......Tt.......',
  '.......Tt.......',
  '......TTt.......',
  '......Tt........',
  '....ssTtss......',
  '.....ssss.......',
]
const WILLOW = [
  '.....oooooo.....',
  '...ooLLGGLLoo...',
  '..oLGGGGGGGGLo..',
  '.oLGGLGGGGLGGLo.',
  '.oGGLoGGGGoLGGo.',
  'oGGLo.GTTG.oLGGo',
  'oGLo.oG.TGo.oLGo',
  'oGo..oG.T.Go..Go',
  'oG...oG.T..o..Go',
  '.o...oG.T..o..o.',
  '.o....o.Tt....o.',
  '........Tt......',
  '........Tt......',
  '........Tt......',
  '......ssTtss....',
  '.......ssss.....',
]
const TOPIARY = [
  '................',
  '.....oooooo.....',
  '....oLLGGGGo....',
  '...oLLGGGGGDo...',
  '...oLGGGGGGDo...',
  '...oGGGGGGGDo...',
  '...oDGGGGGDDo...',
  '....oDDDDDDo....',
  '.....oooooo.....',
  '.......TT.......',
  '.......Tt.......',
  '.......Tt.......',
  '.....pppppp.....',
  '.....PPPPPP.....',
  '......PPPP......',
  '.....ssssss.....',
]
const TREE_PAL = { o: '#1d4a1e', D: '#2a6e2a', G: '#3d9a3a', L: '#6cc45a', T: '#6b4424', t: '#50301a', s: 'rgba(0,0,0,0.22)' }
const PALM_PAL = { o: '#1d4a1e', G: '#3d9a3a', L: '#7fca60', T: '#a8783e', t: '#6b4424', s: 'rgba(0,0,0,0.22)' }
const WILLOW_PAL = { o: '#2a5a2a', G: '#5aa84a', L: '#9ad87a', T: '#6b4424', t: '#50301a', s: 'rgba(0,0,0,0.22)' }
const TOPIARY_PAL = { ...TREE_PAL, p: '#e8e4d8', P: '#c4bca8' }
const SAKURA_PAL = { o: '#8a4a62', D: '#d884a8', G: '#f2a8c8', L: '#ffdbe8', T: '#5a3a2a', t: '#3a2418', s: 'rgba(0,0,0,0.22)' }
const MAPLE_PAL = { o: '#5a1a10', D: '#b8341c', G: '#e05a28', L: '#f8a83a', T: '#5a3a2a', t: '#3a2418', s: 'rgba(0,0,0,0.22)' }
const SNOWPINE_PAL = { o: '#1a3a38', D: '#24584a', G: '#3a7a62', L: '#f4f8fc', T: '#5a4030', t: '#3a2820', s: 'rgba(60,80,110,0.25)' }
const PINE_PAL = { o: '#133a22', D: '#1f5a30', G: '#2d7a3e', L: '#4fa85a', T: '#6b4424', t: '#50301a', s: 'rgba(0,0,0,0.22)' }
const ROCK_PAL = { o: '#3a3a40', D: '#6c6c74', G: '#9696a0', L: '#c4c4cc', s: 'rgba(0,0,0,0.2)' }
const MOUNT_PAL = { o: '#3a2a1e', L: '#c4a482', G: '#8e6c4e', D: '#6a4c34' }

function treeSprite(g: G, kind: TreeKind) {
  if (kind === 'pine') return drawRows(g, PINE, PINE_PAL)
  if (kind === 'snowpine') return drawRows(g, PINE, SNOWPINE_PAL)
  if (kind === 'palm') return drawRows(g, PALM, PALM_PAL)
  if (kind === 'willow') return drawRows(g, WILLOW, WILLOW_PAL)
  if (kind === 'topiary') return drawRows(g, TOPIARY, TOPIARY_PAL)
  if (kind === 'sakura') return drawRows(g, TREE, SAKURA_PAL)
  if (kind === 'maple') return drawRows(g, TREE, MAPLE_PAL)
  drawRows(g, TREE, TREE_PAL)
}

// ---------------------------------------------------------------- 建物
/** 瓦の 屋根（ふつう） */
function tileRoof(g: G, base: string, c: Ctx) {
  const dark = shade(base, -0.32)
  const light = shade(base, 0.2)
  px(g, 0, 0, TS, TS, base)
  for (let band = 0; band < 4; band++) {
    px(g, 0, band * 4, 16, 1, light)
    px(g, 0, band * 4 + 3, 16, 1, dark)
    for (let sx = band % 2 ? 4 : 0; sx < 16; sx += 8) px(g, sx, band * 4, 1, 3, dark)
  }
  roofOutline(g, base, c)
}

function roofOutline(g: G, base: string, c: Ctx) {
  if (!isRoof(c.n)) {
    px(g, 0, 0, 16, 1, OUT)
    px(g, 0, 1, 16, 1, shade(base, 0.4))
  }
  if (!isRoof(c.s)) {
    px(g, 0, 13, 16, 2, shade(base, -0.45))
    px(g, 0, 15, 16, 1, OUT)
  }
  if (!isRoof(c.w)) px(g, 0, 0, 1, 16, OUT)
  if (!isRoof(c.e)) px(g, 15, 0, 1, 16, OUT)
}

const ROOF_TINT: Record<string, number> = { R: 0, U: -0.06, E: 0.05, N: 0.1, Q: -0.12, '+': -0.04 }

/** わらぶき・かやぶき の 屋根 */
function thatch(g: G, ch: string, c: Ctx) {
  const base = shade(TH.roof === 'kaya' ? '#a08a62' : '#d6b45a', ROOF_TINT[ch] ?? 0)
  const dark = shade(base, -0.3)
  const light = shade(base, 0.25)
  px(g, 0, 0, TS, TS, base)
  const r = rng(c.v * 11 + ch.charCodeAt(0))
  for (let x = 0; x < 16; x++) {
    px(g, x, Math.floor(r() * 4), 1, 3 + Math.floor(r() * 4), x % 2 ? dark : light)
    px(g, x, 8 + Math.floor(r() * 3), 1, 3, x % 3 ? dark : light)
  }
  if (!isRoof(c.n)) {
    px(g, 0, 0, 16, 3, shade(base, -0.4))
    px(g, 0, 0, 16, 1, OUT)
  }
  if (!isRoof(c.s)) {
    px(g, 0, 12, 16, 3, dark)
    for (let x = 0; x < 16; x += 2) px(g, x, 13, 1, 2, shade(base, -0.5))
    px(g, 0, 15, 16, 1, OUT)
  }
  if (!isRoof(c.w)) px(g, 0, 0, 1, 16, OUT)
  if (!isRoof(c.e)) px(g, 15, 0, 1, 16, OUT)
}

/** スレート（うろこ状の 石板）の 屋根 */
function slateRoof(g: G, base: string, c: Ctx) {
  const dark = shade(base, -0.38)
  const light = shade(base, 0.28)
  px(g, 0, 0, TS, TS, base)
  for (let band = 0; band < 4; band++) {
    const y = band * 4
    for (let sx = (band % 2) * 2 - 2; sx < 16; sx += 4) {
      px(g, sx, y + 3, 4, 1, dark)
      px(g, sx, y + 2, 1, 1, dark)
      px(g, sx + 3, y + 2, 1, 1, dark)
      px(g, sx + 1, y, 2, 1, light)
    }
  }
  roofOutline(g, base, c)
}

/** 日本の 瓦屋根 */
function kawara(g: G, ch: string, c: Ctx) {
  const base = shade('#535c6c', ROOF_TINT[ch] ?? 0)
  const dark = shade(base, -0.42)
  const light = shade(base, 0.25)
  px(g, 0, 0, TS, TS, base)
  for (let x = 1; x < 16; x += 4) {
    px(g, x, 0, 2, 16, light)
    px(g, x + 2, 0, 1, 16, dark)
  }
  for (let y = 3; y < 16; y += 4) px(g, 0, y, 16, 1, dark)
  if (!isRoof(c.n)) {
    // 棟（白い しっくいの 線）
    px(g, 0, 0, 16, 3, '#2a2e36')
    px(g, 0, 1, 16, 1, '#f0ece4')
    px(g, 0, 0, 16, 1, OUT)
  }
  if (!isRoof(c.s)) {
    px(g, 0, 13, 16, 2, '#2a2e36')
    for (let x = 1; x < 16; x += 4) px(g, x, 13, 2, 2, light)
    px(g, 0, 15, 16, 1, OUT)
  }
  if (!isRoof(c.w)) px(g, 0, 0, 1, 16, OUT)
  if (!isRoof(c.e)) px(g, 15, 0, 1, 16, OUT)
}

/** 屋根に 積もった 雪 */
function snowCap(g: G, c: Ctx) {
  const r = rng(c.v * 3 + 1)
  const top = isRoof(c.n) ? 0 : 1
  // 下の 段は 軒先だけ 屋根が 見え、つららが 下がる
  const bottom = isRoof(c.s) ? 16 : 10
  for (let x = 0; x < 16; x++) px(g, x, top, 1, bottom - top + (isRoof(c.s) ? 0 : Math.floor(r() * 2)), '#f2f6fb')
  for (let x = 1; x < 16; x += 5) px(g, x, top + 2 + (x % 3), 3, 1, '#d6e2ef')
  if (!isRoof(c.n)) px(g, 0, top, 16, 1, '#ffffff')
  if (!isRoof(c.s)) for (let x = 2; x < 15; x += 4) px(g, x, 13, 1, 2 + (x % 2), '#dff0ff')
}

function roof(g: G, ch: string, c: Ctx) {
  const base = TH.roofs?.[ch] ?? ROOFS[ch]
  if (TH.roof === 'thatch' || TH.roof === 'kaya') thatch(g, ch, c)
  else if (TH.roof === 'slate') slateRoof(g, base, c)
  else if (TH.roof === 'kawara') kawara(g, ch, c)
  else tileRoof(g, base, c)
  if (TH.roof === 'snow') snowCap(g, c)
  if (ch === '+') {
    px(g, 6, 1, 4, 13, OUT)
    px(g, 3, 4, 10, 4, OUT)
    px(g, 7, 2, 2, 11, '#f2c440')
    px(g, 4, 5, 8, 2, '#f2c440')
  }
}

function plaster(g: G, c: Ctx) {
  if (TH.wall === 'log') return logWall(g, c)
  if (TH.wall === 'timber') return timberWall(g, c)
  if (TH.wall === 'white') return simpleWall(g, c, '#f6f4ee', '#e6e2d8', '#8aa0b8')
  if (TH.wall === 'mirror') return simpleWall(g, c, '#eceaf6', '#dcdaec', '#8a90b0')
  if (TH.wall === 'royal') return royalWall(g, c)
  if (TH.wall === 'edo') return edoWall(g, c)
  if (TH.wall === 'earth') return earthWall(g, c)
  simpleWall(g, c, '#efe0c2', '#e0cfaa', '#7a4e2a')
}

function simpleWall(g: G, c: Ctx, base: string, speck: string, beam: string) {
  px(g, 0, 0, TS, TS, base)
  const r = rng(c.v * 41 + 2)
  for (let i = 0; i < 5; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 12), 1, 1, speck)
  wallEdges(g, c, beam)
}

/** 丸太の 壁（村・砦） */
function logWall(g: G, c: Ctx) {
  const cold = !!TH.snow
  px(g, 0, 0, TS, TS, cold ? '#3e2c20' : '#7a4e28')
  for (let y = 0; y < 16; y += 4) {
    px(g, 0, y, 16, 3, cold ? '#6a4a32' : '#a0683a')
    px(g, 0, y, 16, 1, cold ? '#8a6448' : '#c08850')
  }
  wallEdges(g, c, cold ? '#2e2018' : '#5a361a')
}

/** 木組みの 壁（しっくいに 黒い 柱と 筋かい） */
function timberWall(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#f0e6cc')
  const beam = '#4a3020'
  px(g, 0, 0, 16, 2, beam)
  if (c.v % 2) for (let i = 0; i < 11; i++) px(g, 2 + i, 2 + i, 2, 1, beam)
  else px(g, 7, 2, 2, 12, beam)
  wallEdges(g, c, beam)
}

/** 白い 大理石の 壁と 金の 縁（王都） */
function royalWall(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#f6f2e8')
  px(g, 0, 0, 16, 2, '#d8b040')
  px(g, 0, 2, 16, 1, '#b08a2a')
  wallEdges(g, c, '#ddd4bc')
}

/** 白壁と 板張りの 腰壁（宿場町） */
function edoWall(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#f2eee4')
  px(g, 0, 8, 16, 8, '#4a3424')
  for (let x = 1; x < 16; x += 3) px(g, x, 8, 1, 8, '#33241a')
  px(g, 0, 7, 16, 1, '#2a1c12')
  wallEdges(g, c, '#2a1c12')
}

/** 土壁と 横木（暦の里） */
function earthWall(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#d4b07c')
  const r = rng(c.v * 13 + 4)
  for (let i = 0; i < 6; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 12), 2, 1, '#c09868')
  if (c.v % 3 === 0) px(g, 7, 0, 2, 16, '#6a4a2a')
  wallEdges(g, c, '#5a3a1e')
}

function stoneWall(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#8b877f')
  const r = rng(c.v * 23 + 9)
  const cols = ['#bdb9b0', '#b3afa6', '#c6c2ba']
  for (let row = 0; row < 4; row++) {
    for (let sx = row % 2 ? -4 : 0; sx < 16; sx += 8) {
      const x = Math.max(0, sx)
      const w = Math.min(sx + 7, 16) - x
      const col = cols[Math.floor(r() * 3)]
      px(g, x, row * 4, w, 3, col)
      px(g, x, row * 4, w, 1, shade(col, 0.2))
    }
  }
  wallEdges(g, c, '#5c5850')
}

function wallEdges(g: G, c: Ctx, beam: string) {
  if (!isWall(c.w)) px(g, 0, 0, 2, 16, beam)
  if (!isWall(c.e)) px(g, 14, 0, 2, 16, beam)
  if (isRoof(c.n)) px(g, 0, 0, 16, 2, 'rgba(60,30,10,0.35)')
  if (!isWall(c.s)) {
    px(g, 0, 13, 16, 3, '#8e8a82')
    px(g, 0, 13, 16, 1, '#6e6a62')
    px(g, 5, 14, 1, 2, '#6e6a62')
    px(g, 11, 14, 1, 2, '#6e6a62')
  } else px(g, 0, 14, 16, 2, beam)
}

function windowTile(g: G, c: Ctx) {
  plaster(g, c)
  if (TH.wall === 'edo') {
    // 格子窓
    px(g, 2, 1, 12, 7, '#2a1c12')
    for (let x = 3; x < 14; x += 2) px(g, x, 2, 1, 5, '#9a7a52')
    return
  }
  if (TH.wall === 'earth') {
    // 障子
    px(g, 2, 1, 12, 10, '#5a3a1e')
    px(g, 3, 2, 10, 8, '#f6f0de')
    px(g, 6, 2, 1, 8, '#b8a888')
    px(g, 9, 2, 1, 8, '#b8a888')
    px(g, 3, 5, 10, 1, '#b8a888')
    return
  }
  const sh = TH.shutter
  px(g, 1, 2, 2, 9, sh)
  px(g, 13, 2, 2, 9, sh)
  px(g, 1, 5, 2, 1, shade(sh, -0.3))
  px(g, 13, 5, 2, 1, shade(sh, -0.3))
  px(g, 3, 2, 10, 9, '#5a3a1e')
  px(g, 4, 3, 8, 7, '#7fb6e0')
  px(g, 5, 4, 2, 1, '#e0f4ff')
  px(g, 5, 5, 1, 1, '#e0f4ff')
  px(g, 8, 3, 1, 7, '#5a3a1e')
  px(g, 4, 6, 8, 1, '#5a3a1e')
  px(g, 3, 11, 10, 2, '#8a5a2a')
  const fl = ['#e84a5a', '#f8d040', '#f07ab0', '#e84a5a']
  ;[4, 6, 9, 11].forEach((x, i) => px(g, x, 10, 1, 1, fl[(i + c.v) % 4]))
  px(g, 5, 10, 1, 1, '#3d8a2c')
  px(g, 10, 10, 1, 1, '#3d8a2c')
}

function door(g: G, c: Ctx) {
  plaster(g, c)
  if (TH.wall === 'edo') {
    // のれん
    px(g, 2, 1, 12, 15, '#1e140c')
    px(g, 2, 1, 12, 8, '#2a3a6a')
    px(g, 6, 3, 1, 6, '#1e140c')
    px(g, 9, 3, 1, 6, '#1e140c')
    px(g, 3, 4, 2, 2, '#f0ece4')
    px(g, 11, 4, 2, 2, '#f0ece4')
    px(g, 2, 15, 12, 1, '#8e8a82')
    return
  }
  if (TH.wall === 'earth') {
    // 引き戸
    px(g, 3, 1, 10, 15, '#4a2e16')
    px(g, 4, 2, 8, 14, '#8a6238')
    px(g, 8, 2, 1, 14, '#4a2e16')
    for (let y = 4; y < 15; y += 3) px(g, 4, y, 8, 1, '#6a4a28')
    px(g, 2, 15, 12, 1, '#8e8a82')
    return
  }
  px(g, 3, 1, 10, 15, '#4a2e16')
  px(g, 4, 2, 8, 14, '#9a6232')
  px(g, 6, 2, 1, 14, '#7a4a22')
  px(g, 9, 2, 1, 14, '#7a4a22')
  px(g, 4, 2, 1, 1, '#4a2e16')
  px(g, 11, 2, 1, 1, '#4a2e16')
  px(g, 10, 9, 1, 1, '#f2c440')
  px(g, 2, 15, 12, 1, '#8e8a82')
}

function stoneWindow(g: G, c: Ctx) {
  stoneWall(g, c)
  px(g, 4, 2, 8, 11, '#4a4640')
  px(g, 5, 1, 6, 1, '#4a4640')
  const panes = ['#e05050', '#4a7ad8', '#f0c848', '#50a860']
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 2; x++) px(g, 5 + x * 3, 3 + y * 2 + (y > 1 ? 1 : 0), 2, 2, panes[(x + y + c.v) % 4])
  px(g, 5, 2, 6, 1, '#f0c848')
}

function bigDoor(g: G, c: Ctx) {
  stoneWall(g, c)
  px(g, 2, 2, 12, 14, '#2e1c0e')
  px(g, 4, 1, 8, 1, '#2e1c0e')
  px(g, 3, 3, 10, 13, '#6a3e1c')
  px(g, 8, 3, 1, 13, '#2e1c0e')
  px(g, 3, 7, 10, 1, '#4a4a50')
  px(g, 3, 12, 10, 1, '#4a4a50')
  px(g, 6, 9, 1, 1, '#f2c440')
  px(g, 10, 9, 1, 1, '#f2c440')
}

function battlement(g: G, c: Ctx) {
  // 塔の屋上（石の床に面している）なら 夜空、地上の塔なら 草地
  if ([c.n, c.s, c.w, c.e].some((x) => x === ':' || x === '{' || x === '}')) {
    px(g, 0, 0, TS, TS, '#0e1426')
    if (c.v % 3 === 0) px(g, 3 + c.v, 2, 1, 1, '#c8d4ff')
  } else grass(g, c.v)
  px(g, 0, 8, 16, 8, '#aaa69e')
  for (const x of [0, 6, 12]) {
    px(g, x, 2, 4, 7, '#bdb9b0')
    px(g, x, 2, 4, 1, '#d6d2ca')
    px(g, x, 2, 1, 7, OUT)
    px(g, x + 3, 2, 1, 7, '#6c6860')
  }
  px(g, 0, 1, 16, 1, 'rgba(0,0,0,0)')
  px(g, 0, 8, 16, 1, '#d6d2ca')
  px(g, 0, 15, 16, 1, '#6c6860')
}

const SIGN_ICONS: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  '1': { rows: ['o.....', 'o.pp..', 'oooooo', 'orrrro', 'o....o'], pal: { o: '#3a2a1a', p: '#ffffff', r: '#c83838' } },
  '2': { rows: ['..oo..', '..oo..', '.obbo.', 'obbbbo', '.oooo.'], pal: { o: '#2a2a3a', b: '#3ac070' } },
  '3': { rows: ['....ob', '...ob.', 'h.ob..', '.hh...', 'h.h...'], pal: { o: '#6a7080', b: '#e0e4ec', h: '#8a5a2a' } },
  '4': { rows: ['.oooo.', 'obbbbo', 'obobob', 'obbbbo', '.oooo.'], pal: { o: '#7a4a1a', b: '#e8a850' } },
  '5': { rows: ['oooooo', 'obboww', 'obboww', 'obboww', 'oooooo'], pal: { o: '#2a3a7a', b: '#ffffff', w: '#e8e8f0' } },
  '6': { rows: ['o.o.o.', 'oooooo', 'ogogog', 'oooooo', '......'], pal: { o: '#7a5a10', g: '#f2c440' } },
  '7': { rows: ['..o...', 'ooooo.', '..o...', '..o...', '..o...'], pal: { o: '#c09020' } },
  '8': { rows: ['oooooo', 'obbgbo', 'obgggo', '.obgo.', '..oo..'], pal: { o: '#2a2a3a', b: '#3a64c0', g: '#f2c440' } },
  '9': { rows: ['..g...', '.gggg.', 'ggg...', '..ggg.', 'gggg..'], pal: { g: '#2a8a4a' } },
}

function signTile(g: G, ch: string, c: Ctx) {
  if (STONE.has(c.w) || STONE.has(c.e)) stoneWall(g, c)
  else plaster(g, c)
  px(g, 2, 2, 11, 1, '#3a3a3a')
  px(g, 4, 3, 1, 2, '#3a3a3a')
  px(g, 11, 3, 1, 2, '#3a3a3a')
  px(g, 3, 5, 10, 8, '#5a3a1e')
  px(g, 4, 6, 8, 6, '#d8aa66')
  const icon = SIGN_ICONS[ch]
  drawRows(g, icon.rows, icon.pal, 5, 6)
}

// ---------------------------------------------------------------- 小物
function groundOf(c: Ctx): string {
  const ns = [c.n, c.s, c.w, c.e]
  if (ns.includes('i')) return 'i'
  if (ns.includes(';')) return ';'
  if (ns.includes(':')) return ':'
  if (ns.some((x) => INDOOR_FLOOR.has(x))) return '_'
  const plank = ns.filter((x) => x === 'ψ').length
  const beach = ns.filter((x) => x === 'σ').length
  if (plank && plank >= beach) return 'ψ'
  if (beach >= 2) return 'σ'
  const t = ns.filter((x) => x === 'T' || x === 'u' || x === 'f').length
  const d = ns.filter((x) => x === '=').length
  const gr = ns.filter((x) => GRASSY.has(x)).length
  if (t >= d && t >= gr && t > 0) return 'T'
  if (d > gr) return '='
  return '.'
}
function ground(g: G, c: Ctx) {
  const k = groundOf(c)
  if (k === '_') woodFloor(g, c)
  else if (k === ':') stoneFloor(g, c)
  else if (k === 'i') templeFloor(g, c)
  else if (k === ';') deckFloor(g, c)
  else if (k === 'ψ') boardwalk(g, { ...c, n: 'ψ', s: 'ψ', w: 'ψ', e: 'ψ' })
  else if (k === 'σ') sand(g, { ...c, n: 'σ', s: 'σ', w: 'σ', e: 'σ' })
  else if (k === 'T') paving(g, { ...c, n: 'T', s: 'T', w: 'T', e: 'T' })
  else if (k === '=') dirt(g, { ...c, n: '=', s: '=', w: '=', e: '=' })
  else grass(g, c.v)
}

/** 町の 灯り（テーマごと） */
function themedLamp(g: G, c: Ctx) {
  const lit = c.f % 2
  px(g, 5, 14, 6, 2, 'rgba(0,0,0,0.2)')
  if (TH.lamp === 'torch') {
    // たいまつ
    px(g, 7, 6, 2, 9, '#6a4020')
    px(g, 6, 5, 4, 2, '#3a2a1a')
    px(g, 6, 1 + lit, 4, 4, '#f07a20')
    px(g, 7, lit, 2, 4, '#ffd040')
    px(g, 7, 2 + lit, 1, 2, '#fff4b0')
  } else if (TH.lamp === 'lantern') {
    // ちょうちん
    px(g, 7, 7, 2, 8, '#3a2a1a')
    px(g, 4, 1, 8, 1, '#3a2a1a')
    px(g, 7, 1, 1, 2, '#3a2a1a')
    px(g, 5, 3, 6, 6, lit ? '#f05040' : '#e04030')
    px(g, 5, 3, 6, 1, '#2a1a10')
    px(g, 5, 8, 6, 1, '#2a1a10')
    px(g, 5, 5, 6, 1, '#f8a080')
    px(g, 7, 4, 2, 3, lit ? '#ffe0a0' : '#ffc080')
  } else if (TH.lamp === 'brazier') {
    // かがり火
    px(g, 4, 11, 1, 4, '#3a3a40')
    px(g, 11, 11, 1, 4, '#3a3a40')
    px(g, 7, 11, 2, 4, '#3a3a40')
    px(g, 3, 8, 10, 3, '#4a4a52')
    px(g, 3, 8, 10, 1, '#6a6a74')
    px(g, 4, 3 + lit, 8, 5 - lit, '#f07a20')
    px(g, 5, 1 + lit, 6, 5, '#ffb030')
    px(g, 7, lit, 2, 4, '#fff0a0')
  } else if (TH.lamp === 'crystal') {
    // 水晶の 灯り
    px(g, 7, 7, 2, 8, '#9aa0b0')
    px(g, 6, 14, 4, 2, '#7a8090')
    px(g, 5, 1, 6, 6, '#3a5a8a')
    px(g, 6, 2, 4, 4, lit ? '#a8e0ff' : '#8ad0ff')
    px(g, 6, 2, 2, 1, '#ffffff')
    if (lit) px(g, 4, 3, 1, 2, '#c8ecff')
  }
}

const DECOR: Record<string, (g: G, c: Ctx) => void> = {
  L: (g, c) => {
    ground(g, c)
    if (TH.lamp !== 'lamp') return themedLamp(g, c)
    px(g, 5, 14, 6, 2, 'rgba(0,0,0,0.2)')
    px(g, 7, 5, 2, 10, '#2e2e38')
    px(g, 6, 14, 4, 2, '#2e2e38')
    px(g, 6, 0, 4, 1, '#2e2e38')
    px(g, 5, 1, 6, 5, '#2e2e38')
    px(g, 6, 2, 4, 3, c.f % 2 ? '#fff0a8' : '#ffe07a')
  },
  o: (g, c) => {
    ground(g, c)
    px(g, 4, 14, 9, 2, 'rgba(0,0,0,0.2)')
    px(g, 3, 4, 10, 11, OUT)
    px(g, 4, 5, 8, 9, '#9a6230')
    px(g, 6, 5, 1, 9, '#7a4a20')
    px(g, 9, 5, 1, 9, '#7a4a20')
    px(g, 4, 3, 8, 3, '#b87a40')
    px(g, 5, 4, 6, 1, '#6a4020')
    px(g, 4, 7, 8, 1, '#50505a')
    px(g, 4, 12, 8, 1, '#50505a')
  },
  x: (g, c) => {
    ground(g, c)
    px(g, 3, 14, 11, 2, 'rgba(0,0,0,0.2)')
    px(g, 2, 3, 12, 12, '#6a4420')
    px(g, 3, 4, 10, 2, '#d6a664')
    px(g, 3, 6, 10, 8, '#b8864a')
    for (let i = 0; i < 8; i++) {
      px(g, 3 + i + 1, 6 + i, 1, 1, '#8a5a2a')
      px(g, 12 - i - 1, 6 + i, 1, 1, '#8a5a2a')
    }
  },
  p: (g, c) => {
    ground(g, c)
    px(g, 4, 9, 8, 2, '#d8783c')
    px(g, 5, 11, 6, 4, '#b8582a')
    px(g, 4, 15, 8, 1, 'rgba(0,0,0,0.2)')
    px(g, 4, 5, 8, 4, '#3d8a2c')
    px(g, 5, 4, 6, 1, '#4fa83a')
    const cols = ['#f04a5a', '#f8d040', '#ffffff']
    px(g, 5, 4, 2, 2, cols[c.v % 3])
    px(g, 9, 5, 2, 2, cols[(c.v + 1) % 3])
  },
  n: (g, c) => {
    ground(g, c)
    px(g, 1, 3, 14, 2, '#8a5a2a')
    px(g, 2, 5, 1, 3, '#5a3a1e')
    px(g, 13, 5, 1, 3, '#5a3a1e')
    px(g, 1, 8, 14, 3, '#b07a40')
    px(g, 1, 9, 14, 1, '#8a5a2a')
    px(g, 2, 11, 2, 4, '#5a3a1e')
    px(g, 12, 11, 2, 4, '#5a3a1e')
  },
  a: (g, c) => {
    ground(g, c)
    px(g, 2, 5, 12, 3, '#4a4c56')
    px(g, 1, 5, 2, 2, '#4a4c56')
    px(g, 2, 5, 12, 1, '#7a7e8c')
    px(g, 6, 8, 4, 3, '#3a3c44')
    px(g, 4, 11, 8, 3, '#3a3c44')
  },
  m: (g, c) => {
    ground(g, c)
    px(g, 0, 6, 16, 10, '#8a5a2c')
    px(g, 0, 5, 16, 3, '#c89050')
    px(g, 0, 10, 16, 1, '#6a4420')
    px(g, 0, 13, 16, 1, '#6a4420')
    const r = rng(c.v + 77)
    for (let i = 0; i < 5; i++) {
      const x = 1 + Math.floor(r() * 12)
      px(g, x, 3, 3, 3, i % 2 ? '#e03838' : '#e8a850')
      px(g, x, 3, 1, 1, '#ffffff')
    }
  },
  A: (g, c) => {
    ground(g, c)
    // 和風の 町は 藍色の 日よけ
    const stripe = TH.wall === 'edo' || TH.wall === 'earth' ? '#2a3a6a' : '#d83a3a'
    for (let x = 0; x < 16; x += 4) {
      px(g, x, 1, 2, 10, stripe)
      px(g, x + 2, 1, 2, 10, '#f4f0e8')
    }
    px(g, 0, 0, 16, 1, OUT)
    for (let x = 0; x < 16; x += 4) {
      px(g, x, 11, 4, 1, x % 8 ? '#f4f0e8' : stripe)
      px(g, x + 1, 12, 2, 1, x % 8 ? '#f4f0e8' : stripe)
    }
    px(g, 0, 11, 1, 5, '#4a3a2a')
    px(g, 15, 11, 1, 5, '#4a3a2a')
  },
  P: (g, c) => {
    ground(g, c)
    px(g, 0, 0, 16, 3, '#8a4a2a')
    px(g, 0, 0, 16, 1, OUT)
    px(g, 2, 3, 2, 6, '#6a4020')
    px(g, 12, 3, 2, 6, '#6a4020')
    px(g, 4, 4, 8, 1, '#6a4020')
    px(g, 7, 5, 2, 3, '#a87a40')
    px(g, 1, 8, 14, 7, '#9a968e')
    px(g, 1, 8, 14, 1, '#c4c0b8')
    px(g, 3, 8, 10, 2, '#1c2c54')
    px(g, 5, 11, 1, 4, '#76726a')
    px(g, 10, 11, 1, 4, '#76726a')
    px(g, 1, 15, 14, 1, OUT)
  },
  S: (g, c) => {
    ground(g, c)
    px(g, 7, 9, 2, 7, '#6a4020')
    px(g, 2, 2, 12, 8, '#6a4020')
    px(g, 3, 3, 10, 6, '#d8aa66')
    px(g, 4, 4, 8, 1, '#8a5a2a')
    px(g, 4, 6, 6, 1, '#8a5a2a')
  },
  // 網干し（港町）
  ν: (g, c) => {
    ground(g, c)
    px(g, 2, 14, 13, 2, 'rgba(0,0,0,0.2)')
    px(g, 2, 3, 2, 12, '#6a4020')
    px(g, 12, 3, 2, 12, '#6a4020')
    px(g, 2, 3, 12, 1, '#5a3a1a')
    for (let x = 4; x < 12; x += 2) px(g, x, 4, 1, 8, '#d0c49a')
    for (let y = 5; y < 12; y += 2) px(g, 4, y, 8, 1, '#d0c49a')
    px(g, 6, 7, 3, 1, '#8ab0c8')
    px(g, 8, 9, 3, 1, '#a8c0d0')
  },
  // いかり（港町）
  α: (g, c) => {
    ground(g, c)
    px(g, 3, 14, 10, 2, 'rgba(0,0,0,0.2)')
    px(g, 6, 0, 4, 3, '#2a2a30')
    px(g, 7, 1, 2, 1, '#8a8a94')
    px(g, 7, 3, 2, 9, '#3a3a44')
    px(g, 4, 4, 8, 2, '#3a3a44')
    px(g, 3, 11, 10, 2, '#3a3a44')
    px(g, 2, 8, 2, 4, '#3a3a44')
    px(g, 12, 8, 2, 4, '#3a3a44')
    px(g, 7, 3, 1, 9, '#6a6a78')
  },
  // 薪の 山（村）
  ω: (g, c) => {
    ground(g, c)
    px(g, 1, 14, 14, 2, 'rgba(0,0,0,0.2)')
    for (const [x, y] of [[1, 10], [5, 10], [9, 10], [3, 6], [7, 6], [5, 2]]) {
      px(g, x, y, 5, 4, '#5a3a1a')
      px(g, x + 1, y, 3, 4, '#8a5a2a')
      px(g, x + 1, y + 1, 3, 2, '#d8a868')
      px(g, x + 2, y + 1, 1, 2, '#b07a40')
    }
  },
  // テント（砦）
  τ: (g, c) => {
    ground(g, c)
    px(g, 1, 14, 14, 2, 'rgba(0,0,0,0.2)')
    for (let y = 2; y < 15; y++) {
      const half = Math.floor((y - 2) * 0.55) + 1
      px(g, 8 - half, y, half, 1, '#a8986a')
      px(g, 8, y, half, 1, '#c8b88a')
    }
    for (let y = 9; y < 15; y++) px(g, 7 - Math.floor((y - 9) / 2), y, 2 + Math.floor((y - 9) / 2) * 2, 1, '#3a2a1a')
    px(g, 7, 0, 2, 3, '#6a4020')
    px(g, 8, 0, 3, 2, '#c03030')
    if (TH.snow) px(g, 6, 3, 4, 2, '#ffffff')
  },
  // たき火（砦）
  φ: (g, c) => {
    ground(g, c)
    const lit = c.f % 2
    px(g, 3, 11, 10, 3, '#6a6a70')
    px(g, 4, 12, 8, 1, '#4a4a50')
    px(g, 4, 10, 8, 2, '#6a4020')
    px(g, 5, 5 + lit, 6, 6 - lit, '#f07a20')
    px(g, 6, 3 + lit, 4, 6, '#ffb030')
    px(g, 7, 2 + lit, 2, 4, '#fff0a0')
    px(g, lit ? 4 : 11, 2, 1, 1, '#ffd040')
  },
  // 鏡（鏡の町）
  μ: (g, c) => {
    ground(g, c)
    px(g, 3, 14, 10, 2, 'rgba(0,0,0,0.2)')
    px(g, 4, 13, 2, 3, '#7a7a90')
    px(g, 10, 13, 2, 3, '#7a7a90')
    px(g, 3, 1, 10, 13, '#c8c8d8')
    px(g, 3, 1, 10, 1, OUT)
    px(g, 3, 13, 10, 1, '#8a8aa0')
    px(g, 4, 2, 8, 11, '#7ab8e8')
    px(g, 5, 3, 2, 6, '#c8e8ff')
    px(g, c.f % 2 ? 9 : 6, c.f % 2 ? 4 : 9, 2, 2, '#ffffff')
    px(g, 7, 0, 2, 1, '#e0b040')
  },
  // 像（王都）
  θ: (g, c) => {
    ground(g, c)
    px(g, 2, 15, 12, 1, 'rgba(0,0,0,0.25)')
    px(g, 3, 11, 10, 5, '#b0aca2')
    px(g, 3, 11, 10, 1, '#d6d2ca')
    px(g, 6, 13, 4, 1, '#d8b040')
    px(g, 6, 4, 4, 7, '#c8c4ba')
    px(g, 6, 1, 4, 3, '#c8c4ba')
    px(g, 10, 2, 1, 4, '#c8c4ba')
    px(g, 11, 0, 1, 3, '#e8e4da')
    px(g, 9, 4, 1, 7, '#9a968c')
    px(g, 7, 2, 1, 1, '#9a968c')
  },
  // 石灯籠（宿場町・暦の里）
  ζ: (g, c) => {
    ground(g, c)
    px(g, 4, 15, 8, 1, 'rgba(0,0,0,0.25)')
    px(g, 5, 13, 6, 2, '#8a8a88')
    px(g, 7, 8, 2, 5, '#a4a4a0')
    px(g, 5, 5, 6, 3, '#b4b4b0')
    px(g, 7, 6, 2, 1, c.f % 2 ? '#ffd080' : '#f0b050')
    px(g, 3, 3, 10, 2, '#8a8a88')
    px(g, 5, 2, 6, 1, '#8a8a88')
    px(g, 7, 0, 2, 2, '#7a7a78')
  },
  // 日時計（暦の里）
  ξ: (g, c) => {
    ground(g, c)
    px(g, 3, 5, 10, 10, '#a8a498')
    px(g, 2, 6, 12, 8, '#a8a498')
    px(g, 3, 6, 10, 7, '#e8e4d8')
    for (const [x, y] of [[7, 6], [12, 9], [7, 12], [3, 9], [10, 7], [10, 11], [4, 7], [4, 11]]) px(g, x, y, 1, 1, '#6a6a70')
    px(g, 7, 4, 2, 6, '#5a5a62')
    px(g, 9, 9, 3, 1, '#8a8678')
    px(g, 2, 14, 12, 1, '#7a7668')
  },
  // 馬車（町の 門で 待っている）
  χ: (g, c) => {
    ground(g, c)
    px(g, 1, 14, 14, 2, 'rgba(0,0,0,0.25)')
    px(g, 2, 1, 12, 1, OUT)
    px(g, 2, 2, 12, 7, '#f0ead8')
    px(g, 5, 2, 1, 7, '#c8bfa8')
    px(g, 10, 2, 1, 7, '#c8bfa8')
    px(g, 6, 4, 4, 5, '#3a2a1a')
    px(g, 2, 9, 12, 3, '#8a5a2a')
    px(g, 2, 9, 12, 1, '#a87a40')
    for (const x of [2, 10]) {
      px(g, x, 11, 4, 4, '#3a2a1a')
      px(g, x + 1, 12, 2, 2, '#a87a40')
    }
  },
  // 旗（城下町）
  λ: (g, c) => {
    ground(g, c)
    px(g, 6, 15, 4, 1, 'rgba(0,0,0,0.25)')
    px(g, 7, 1, 1, 15, '#5a5a64')
    px(g, 6, 0, 3, 1, '#e0b040')
    px(g, 8, 1, 6, 10, '#2a4aa8')
    px(g, 8, 1, 6, 1, '#e0b040')
    px(g, 10, 4, 2, 3, '#e0b040')
    px(g, 8, 11, 2, 2, '#2a4aa8')
    px(g, 12, 11, 2, 2, '#2a4aa8')
  },
}

const BOAT = [
  '................',
  '.......m........',
  '.......mSS......',
  '.......mSSS.....',
  '.......mSSSS....',
  '.......mSSSSS...',
  '.oooooooooooooo.',
  'oHHHHHHHHHHHHHHo',
  'oHhhhshhhhshhhHo',
  'oHhhhshhhhshhhHo',
  '.oHHHHHHHHHHHHo.',
  '..oooooooooooo..',
  '................',
]
const BOAT_PAL = { o: '#2a1a10', H: '#9a6a34', h: '#6a4020', s: '#c08a50', m: '#5a3a1a', S: '#f4f0e8' }

/** 小舟（水に 浮かんでいる。帆の ある 舟と ない 舟） */
function boat(g: G, c: Ctx) {
  water(g, { ...c, n: '~', s: '~', w: '~', e: '~' }, false)
  const bob = c.f % 2
  // 帆の ない 舟は 船体だけ
  drawRows(g, c.v % 2 ? BOAT : BOAT.map((row, i) => (i < 6 ? '' : row)), BOAT_PAL, 0, bob)
  px(g, 2, 13 + bob, 12, 1, 'rgba(255,255,255,0.45)')
}

/** 柳（川辺） */
function willowTile(g: G, c: Ctx) {
  grass(g, c.v)
  drawRows(g, WILLOW, WILLOW_PAL)
}

/** 田んぼ（暦の里） */
function paddy(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#6a8a72')
  px(g, (c.v * 3) % 10 + 2, 5, 4, 1, '#9ab8b0')
  for (const y of [4, 9, 14]) for (let x = 1 + (y % 2); x < 16; x += 3) {
    px(g, x, y - 3, 1, 3, '#4aa040')
    px(g, x + 1, y - 4, 1, 2, '#8ad06a')
  }
  const aze = '#8a6a40'
  if (c.n !== 'ρ') px(g, 0, 0, 16, 2, aze)
  if (c.s !== 'ρ') px(g, 0, 14, 16, 2, aze)
  if (c.w !== 'ρ') px(g, 0, 0, 2, 16, aze)
  if (c.e !== 'ρ') px(g, 14, 0, 2, 16, aze)
}

/** かかし（村の 畑） */
function scarecrow(g: G, c: Ctx) {
  if ([c.n, c.s, c.w, c.e].includes('k')) farm(g, c)
  else grass(g, c.v)
  px(g, 7, 4, 2, 12, '#6a4020')
  px(g, 2, 7, 12, 2, '#6a4020')
  px(g, 5, 6, 6, 5, '#c84a3a')
  px(g, 5, 8, 6, 1, '#a83a2a')
  px(g, 6, 2, 4, 4, '#e8d090')
  px(g, 7, 3, 1, 1, '#3a2a1a')
  px(g, 9, 3, 1, 1, '#3a2a1a')
  px(g, 4, 1, 8, 2, '#a87a30')
  px(g, 5, 0, 6, 1, '#a87a30')
}

/** 丸太の 柵（砦） */
function palisade(g: G, c: Ctx) {
  grass(g, c.v)
  for (let x = 0; x < 16; x += 4) {
    px(g, x, 3, 4, 13, '#6a4628')
    px(g, x, 3, 1, 13, '#8a6038')
    px(g, x + 3, 3, 1, 13, '#4a2e18')
    px(g, x + 1, 1, 2, 2, '#6a4628')
    px(g, x + 1, 0, 2, 1, '#4a2e18')
    if (TH.snow) px(g, x, 2, 4, 2, '#f4f8fc')
  }
  px(g, 0, 8, 16, 1, '#3a2a1a')
}

/** 刈りこんだ 生け垣（王都） */
function hedge(g: G, c: Ctx) {
  grass(g, c.v)
  const isH = (x: string) => x === 'η'
  const x0 = isH(c.w) ? 0 : 1
  const x1 = isH(c.e) ? 16 : 15
  const y0 = isH(c.n) ? 0 : 3
  const y1 = isH(c.s) ? 16 : 14
  px(g, x0, y0, x1 - x0, y1 - y0, '#2f7a30')
  if (!isH(c.n)) px(g, x0, y0, x1 - x0, 3, '#56aa44')
  const r = rng(c.v * 9 + 4)
  for (let i = 0; i < 6; i++) px(g, x0 + Math.floor(r() * (x1 - x0 - 1)), y0 + 3 + Math.floor(r() * (y1 - y0 - 4)), 1, 1, '#6cc45a')
  if (!isH(c.s)) {
    px(g, x0, y1 - 1, x1 - x0, 1, '#1d4a1e')
    px(g, x0 + 1, y1, x1 - x0 - 1, 2, 'rgba(0,0,0,0.2)')
  }
}

/** 城壁（城下町の 外まわり） */
function rampart(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#7a766e')
  const r = rng(c.v * 23 + 9)
  const cols = ['#b3afa6', '#a8a49a', '#bdb9b0']
  for (let row = 0; row < 4; row++)
    for (let sx = row % 2 ? -4 : 0; sx < 16; sx += 8) {
      const x = Math.max(0, sx)
      const w = Math.min(sx + 7, 16) - x
      const col = cols[Math.floor(r() * 3)]
      px(g, x, row * 4, w, 3, col)
      px(g, x, row * 4, w, 1, shade(col, 0.2))
    }
  if (c.n !== 'ι') {
    for (const x of [0, 6, 12]) px(g, x + 1, 0, 3, 2, '#6a665e')
    px(g, 0, 0, 16, 1, OUT)
  }
  if (c.s !== 'ι') px(g, 0, 14, 16, 2, '#4e4a44')
}

function fence(g: G, c: Ctx) {
  grass(g, c.v)
  const wood = '#a8743c'
  const dark = '#6a4420'
  if (c.w === 'F') {
    px(g, 0, 5, 8, 2, wood)
    px(g, 0, 10, 8, 2, wood)
  }
  if (c.e === 'F') {
    px(g, 8, 5, 8, 2, wood)
    px(g, 8, 10, 8, 2, wood)
  }
  if (c.n === 'F') px(g, 7, 0, 2, 6, wood)
  if (c.s === 'F') px(g, 7, 10, 2, 6, wood)
  px(g, 6, 3, 4, 12, dark)
  px(g, 7, 3, 2, 11, wood)
  px(g, 7, 3, 2, 1, '#d09a5a')
}

function fountainBasin(g: G, c: Ctx, center: boolean) {
  water(g, c, false)
  const rim = '#c2bcb0'
  const inBasin = (x: string) => x === 'u' || x === 'f'
  if (!inBasin(c.n)) {
    px(g, 0, 0, 16, 3, rim)
    px(g, 0, 3, 16, 1, '#7a746a')
  }
  if (!inBasin(c.s)) {
    px(g, 0, 13, 16, 3, rim)
    px(g, 0, 15, 16, 1, '#7a746a')
  }
  if (!inBasin(c.w)) {
    px(g, 0, 0, 3, 16, rim)
    px(g, 3, 0, 1, 16, '#7a746a')
  }
  if (!inBasin(c.e)) {
    px(g, 13, 0, 3, 16, rim)
    px(g, 12, 0, 1, 16, '#7a746a')
  }
  if (center) {
    px(g, 5, 8, 6, 7, '#c8c2b6')
    px(g, 5, 8, 6, 1, '#e8e2d6')
    px(g, 7, 3, 2, 6, '#c8c2b6')
    const drops = c.f % 2 ? [[4, 2], [11, 3], [6, 0], [10, 1], [3, 6], [12, 7]] : [[5, 1], [10, 2], [7, 0], [3, 4], [12, 5], [4, 8]]
    drops.forEach(([x, y]) => px(g, x, y, 1, 2, '#e0f4ff'))
    px(g, 6, 1, 4, 2, '#ffffff')
  }
}

function barrier(g: G, c: Ctx) {
  if ([c.n, c.s, c.w, c.e].includes('B')) {
    water(g, { ...c, n: '~', s: '~', w: '~', e: '~' }, false)
    px(g, 0, 2, 16, 12, '#a8743c')
    for (let x = 3; x < 16; x += 4) px(g, x, 2, 1, 12, '#7a4e22')
  } else grass(g, c.v)
  g.fillStyle = 'rgba(150,40,200,0.55)'
  g.fillRect(0, 0, TS, TS)
  const r = rng(c.f * 11 + c.v)
  for (let i = 0; i < 6; i++) px(g, Math.floor(r() * 15), Math.floor(r() * 15), 1, 1, '#f0c0ff')
  px(g, 0, 0, TS, 1, '#d080ff')
}

function farm(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#7a5230')
  for (let y = 2; y < 16; y += 5) {
    px(g, 0, y + 2, 16, 1, '#5e3e22')
    for (let x = 1 + (c.v % 2); x < 16; x += 4) {
      px(g, x, y, 1, 2, '#4fa83a')
      px(g, x + 1, y - 1, 1, 2, '#6cc45a')
      px(g, x - 1, y + 1, 1, 1, '#3d8a2c')
    }
  }
}

function hay(g: G, c: Ctx) {
  grass(g, c.v)
  px(g, 2, 13, 12, 2, 'rgba(0,0,0,0.2)')
  px(g, 2, 5, 12, 9, '#8a6a20')
  px(g, 3, 4, 10, 10, '#e8c860')
  px(g, 3, 4, 10, 2, '#f4dc88')
  for (let x = 4; x < 13; x += 3) px(g, x, 6, 1, 8, '#c8a040')
  px(g, 3, 9, 10, 1, '#a07820')
}

// ---------------------------------------------------------------- 室内
function woodFloor(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#b98552')
  for (let row = 0; row < 4; row++) {
    const y = row * 4
    px(g, 0, y, 16, 1, '#c99865')
    px(g, 0, y + 3, 16, 1, '#8e5e34')
    px(g, (row % 2 ? 5 : 11) + (c.v % 3), y, 1, 3, '#8e5e34')
  }
}
function stoneFloor(g: G, c: Ctx) {
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 2; x++) {
      px(g, x * 8, y * 8, 8, 8, (x + y + c.v) % 2 ? '#c2bdb2' : '#b0aa9e')
      px(g, x * 8, y * 8, 8, 1, '#d4cfc4')
      px(g, x * 8, y * 8 + 7, 8, 1, '#8e8a80')
    }
}
function carpetTile(g: G, c: Ctx) {
  const base = ':' === c.n || ':' === c.s ? stoneFloor : woodFloor
  base(g, c)
  px(g, 0, 0, 16, 16, '#a8303c')
  for (let y = 2; y < 16; y += 4) for (let x = (y / 2) % 4; x < 16; x += 4) px(g, x, y, 1, 1, '#c85060')
  const gold = '#e0b040'
  if (c.w !== 'g') px(g, 0, 0, 2, 16, gold)
  if (c.e !== 'g') px(g, 14, 0, 2, 16, gold)
  if (c.n !== 'g') px(g, 0, 0, 16, 2, gold)
  if (c.s !== 'g' && c.s !== 'z') px(g, 0, 14, 16, 2, gold)
}
function ceiling(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#1e1510')
  const trim = '#5a3a24'
  if (c.s !== '^' && c.s !== '#') px(g, 0, 14, 16, 2, trim)
  if (INDOOR_FLOOR.has(c.w) || DECOR_ON_GROUND.has(c.w)) px(g, 0, 0, 2, 16, trim)
  if (INDOOR_FLOOR.has(c.e) || DECOR_ON_GROUND.has(c.e)) px(g, 14, 0, 2, 16, trim)
  if (INDOOR_FLOOR.has(c.n)) px(g, 0, 0, 16, 2, trim)
}
function woodWall(g: G) {
  px(g, 0, 0, TS, TS, '#c89a6a')
  for (let x = 3; x < 16; x += 4) px(g, x, 2, 1, 9, '#ad8052')
  px(g, 0, 0, 16, 2, '#5a3a24')
  px(g, 0, 11, 16, 4, '#8a5a34')
  px(g, 0, 11, 16, 1, '#6a4024')
  px(g, 0, 15, 16, 1, '#3a2414')
}
function stoneWallIn(g: G, c: Ctx) {
  stoneWall(g, { ...c, n: 'V', s: 'V', w: 'V', e: 'V' })
  px(g, 0, 0, 16, 2, '#4a4640')
  px(g, 0, 15, 16, 1, '#3a3630')
}
function wallBase(g: G, c: Ctx) {
  if (c.w === '!' || c.e === '!') stoneWallIn(g, c)
  else woodWall(g)
}
const INTERIOR: Record<string, (g: G, c: Ctx) => void> = {
  _: (g, c) => woodFloor(g, c),
  ':': (g, c) => stoneFloor(g, c),
  g: carpetTile,
  '^': ceiling,
  '|': (g) => woodWall(g),
  '!': stoneWallIn,
  '/': (g) => {
    // 壁掛けの 鏡
    woodWall(g)
    px(g, 4, 2, 8, 12, '#6a4a1a')
    px(g, 5, 3, 6, 10, '#e0b040')
    px(g, 6, 4, 4, 8, '#8ac0e8')
    px(g, 6, 4, 2, 3, '#e8f6ff')
  },
  O: (g, c) => {
    wallBase(g, c)
    px(g, 3, 2, 10, 8, '#5a3a1e')
    px(g, 4, 3, 8, 6, '#a6dcff')
    px(g, 5, 4, 3, 1, '#e8f8ff')
    px(g, 8, 3, 1, 6, '#5a3a1e')
    px(g, 4, 6, 8, 1, '#5a3a1e')
    px(g, 1, 2, 3, 9, '#c04050')
    px(g, 12, 2, 3, 9, '#c04050')
    px(g, 2, 3, 1, 7, '#a03040')
    px(g, 13, 3, 1, 7, '#a03040')
  },
  j: (g, c) => {
    wallBase(g, c)
    px(g, 1, 0, 14, 16, '#4a2c14')
    px(g, 2, 1, 12, 14, '#6a4020')
    const cols = ['#c83838', '#3a6ac8', '#3a9a4a', '#e0b040', '#8a4aa8', '#e07a30']
    for (let row = 0; row < 3; row++) {
      px(g, 2, 5 + row * 5, 12, 1, '#4a2c14')
      for (let x = 2; x < 14; x += 2) px(g, x, 1 + row * 5, 2, 4, cols[(x + row + c.v) % cols.length])
    }
  },
  y: (g, c) => {
    wallBase(g, c)
    px(g, 1, 3, 14, 13, '#8a867e')
    px(g, 1, 3, 14, 2, '#6a4020')
    px(g, 3, 7, 10, 9, '#1a1010')
    const f = c.f % 2
    px(g, 5, 11 - f, 6, 5 + f, '#e8502a')
    px(g, 6, 9 + f, 4, 6, '#f8a030')
    px(g, 7, 12, 2, 3, '#fff0a0')
  },
  H: (g, c) => {
    wallBase(g, c)
    px(g, 1, 3, 14, 1, '#4a2c14')
    for (const x of [3, 7, 11]) {
      px(g, x, 1, 2, 9, '#d8dce4')
      px(g, x, 1, 1, 9, '#f4f6fa')
      px(g, x - 1, 9, 4, 1, '#8a6a2a')
      px(g, x, 10, 2, 2, '#6a4020')
    }
  },
  $: (g, c) => {
    wallBase(g, c)
    px(g, 1, 3, 14, 1, '#4a2c14')
    for (const [x, col] of [[1, '#3a64c0'], [9, '#c43a3a']] as [number, string][]) {
      px(g, x, 4, 6, 7, '#2a2a3a')
      px(g, x + 1, 5, 4, 5, col)
      px(g, x + 2, 11, 2, 1, '#2a2a3a')
      px(g, x + 2, 6, 2, 3, '#f2c440')
    }
  },
  I: (g, c) => {
    wallBase(g, c)
    px(g, 1, 2, 14, 12, '#6a4020')
    px(g, 2, 3, 12, 4, '#8a5a30')
    px(g, 2, 9, 12, 4, '#8a5a30')
    for (const [x, y] of [[3, 4], [8, 4], [4, 10], [9, 10]]) {
      px(g, x, y, 4, 3, '#d89048')
      px(g, x + 1, y, 2, 1, '#f0c078')
    }
  },
  J: (g, c) => {
    wallBase(g, c)
    px(g, 0, 2, 16, 9, '#2f5a3a')
    px(g, 0, 2, 16, 1, '#8a5a2a')
    px(g, 0, 10, 16, 1, '#8a5a2a')
    if (c.w !== 'J') px(g, 0, 2, 1, 9, '#8a5a2a')
    if (c.e !== 'J') px(g, 15, 2, 1, 9, '#8a5a2a')
    const r = rng(c.v * 3 + 1)
    for (let i = 0; i < 5; i++) px(g, 2 + Math.floor(r() * 11), 4 + Math.floor(r() * 5), 2 + Math.floor(r() * 3), 1, '#e8f0e8')
  },
  c: (g, c) => {
    ground(g, c)
    px(g, 0, 5, 16, 4, '#d09a5a')
    px(g, 0, 5, 16, 1, '#e8b87a')
    px(g, 0, 9, 16, 7, '#8a5a2c')
    px(g, 0, 12, 16, 1, '#6a4020')
    if (c.w !== 'c') px(g, 0, 5, 1, 11, '#4a2c14')
    if (c.e !== 'c') px(g, 15, 5, 1, 11, '#4a2c14')
  },
  e: (g, c) => {
    ground(g, c)
    px(g, 1, 0, 14, 16, '#6a4020')
    px(g, 2, 1, 12, 14, '#f4f0e8')
    px(g, 3, 2, 10, 3, '#ffffff')
    px(g, 3, 5, 10, 1, '#d8d0c0')
    px(g, 2, 7, 12, 8, c.v % 2 ? '#3a6ab0' : '#b04a5a')
    px(g, 2, 7, 12, 1, '#f4f0e8')
  },
  t: (g, c) => {
    ground(g, c)
    px(g, 2, 12, 2, 4, '#5a3418')
    px(g, 12, 12, 2, 4, '#5a3418')
    px(g, 1, 4, 14, 9, '#8a5a2c')
    px(g, 1, 3, 14, 7, '#b87a42')
    px(g, 1, 3, 14, 1, '#d09a5a')
    if (c.v % 3 === 0) {
      px(g, 4, 4, 3, 3, '#ffffff')
      px(g, 4, 4, 3, 1, '#7a4a22')
    } else if (c.v % 3 === 1) {
      px(g, 8, 4, 5, 4, '#f4f0e0')
      px(g, 8, 5, 5, 1, '#8a8aa0')
    }
  },
  l: (g, c) => {
    ground(g, c)
    px(g, 0, 5, 16, 10, '#e8e0cc')
    px(g, 0, 5, 16, 2, '#e0b040')
    px(g, 5, 7, 6, 8, '#6a2a8a')
    px(g, 7, 8, 2, 5, '#e0b040')
    px(g, 6, 9, 4, 1, '#e0b040')
    px(g, 2, 1, 2, 4, '#f4f0e0')
    px(g, 2, 0, 2, 1, '#ffd060')
    px(g, 12, 1, 2, 4, '#f4f0e0')
    px(g, 12, 0, 2, 1, '#ffd060')
  },
  z: (g, c) => {
    woodFloor(g, c)
    px(g, 2, 2, 12, 11, '#e0b040')
    px(g, 3, 3, 10, 9, '#a03a3a')
    px(g, 0, 13, 16, 3, 'rgba(255,240,200,0.45)')
  },
}

// ---------------------------------------------------------------- 洞窟
function caveFloor(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#5a5048')
  const r = rng(c.v * 29 + 3)
  for (let i = 0; i < 7; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, '#4a4038')
  for (let i = 0; i < 4; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, '#6e6258')
  const x = Math.floor(r() * 12)
  const y = Math.floor(r() * 12)
  px(g, x, y, 3, 2, '#6a5e54')
  px(g, x, y + 2, 3, 1, '#3e352e')
}
function caveWall(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#231d19')
  const r = rng(c.v * 17 + 5)
  for (let i = 0; i < 5; i++) px(g, Math.floor(r() * 15), Math.floor(r() * 15), 2, 1, '#2e2621')
  // 下が通路なら、岩肌の断面を描く
  if (CAVE_OPEN.has(c.s)) {
    px(g, 0, 6, 16, 10, '#4a4038')
    px(g, 0, 6, 16, 1, '#6a5c50')
    for (let x = 1; x < 16; x += 5) px(g, x, 8 + (x % 3), 1, 6, '#352d27')
    px(g, 3, 11, 4, 1, '#5e5246')
    px(g, 10, 9, 3, 1, '#5e5246')
    px(g, 0, 15, 16, 1, '#1a1512')
  }
  if (CAVE_OPEN.has(c.n)) px(g, 0, 0, 16, 2, '#3a312a')
}
// ---------------------------------------------------------------- 塔
function towerWall(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#24242c')
  for (let y = 0; y < 16; y += 4) px(g, 0, y, 16, 1, '#1a1a20')
  // 下が床なら、石積みの壁面を描く
  if (TOWER_OPEN.has(c.s)) {
    px(g, 0, 4, 16, 12, '#5c5c6a')
    for (let row = 0; row < 3; row++) {
      const y = 4 + row * 4
      px(g, 0, y, 16, 1, '#76768a')
      px(g, 0, y + 3, 16, 1, '#3e3e4a')
      for (let x = row % 2 ? 4 : 0; x < 16; x += 8) px(g, x, y, 1, 4, '#3e3e4a')
    }
    px(g, 0, 15, 16, 1, '#141418')
  }
}
/** 階段の下地：神殿の中なら 鏡の床、塔なら 石の床 */
const stairFloor = (g: G, c: Ctx) => {
  const ns = [c.n, c.s, c.w, c.e]
  if (ns.includes('i')) templeFloor(g, c)
  else if (ns.includes(';')) deckFloor(g, c)
  else stoneFloor(g, c)
}
const TOWER: Record<string, (g: G, c: Ctx) => void> = {
  '[': towerWall,
  '{': (g, c) => {
    stairFloor(g, c)
    for (let i = 0; i < 5; i++) {
      const y = 1 + i * 3
      px(g, 2 + i, y, 12 - i * 2, 3, i % 2 ? '#8e8a80' : '#aaa598')
      px(g, 2 + i, y, 12 - i * 2, 1, '#d4cfc4')
    }
  },
  '}': (g, c) => {
    stairFloor(g, c)
    px(g, 2, 2, 12, 12, '#1a1814')
    for (let i = 0; i < 4; i++) px(g, 3 + i, 3 + i * 3, 10 - i * 2, 2, '#4a463e')
  },
  '-': (g, c) => {
    stoneFloor(g, c)
    px(g, 3, 8, 10, 8, 'rgba(255,240,200,0.3)')
    px(g, 5, 11, 6, 5, 'rgba(255,245,215,0.5)')
  },
}

const CAVE: Record<string, (g: G, c: Ctx) => void> = {
  q: caveFloor,
  '0': caveWall,
  '9': (g, c) => {
    caveFloor(g, c)
    px(g, 3, 13, 11, 2, 'rgba(0,0,0,0.3)')
    px(g, 2, 4, 12, 10, '#231d19')
    px(g, 3, 5, 10, 8, '#7a6c5e')
    px(g, 4, 5, 5, 3, '#9a8a78')
    px(g, 3, 11, 10, 2, '#5a4e42')
  },
  C: (g, c) => {
    caveFloor(g, c)
    px(g, 3, 14, 10, 1, 'rgba(0,0,0,0.3)')
    for (const [x, h] of [[4, 8], [7, 11], [10, 7]] as [number, number][]) {
      px(g, x - 1, 14 - h, 4, h, '#1a3a5a')
      px(g, x, 15 - h, 2, h - 1, '#5ad0f0')
      px(g, x, 15 - h, 1, h - 2, '#c8f6ff')
    }
    if (c.f % 2) px(g, 8, 4, 1, 1, '#ffffff')
  },
  '(': (g, c) => {
    if (c.w === '[' || c.e === '[') towerWall(g, { ...c, s: ':' })
    else if (c.w === 'G' || c.e === 'G') templeWall(g, { ...c, s: 'i' })
    else if (c.w === ')' || c.e === ')') shipWall(g, { ...c, s: ';' })
    else caveWall(g, { ...c, s: 'q' })
    px(g, 2, 1, 12, 15, '#1a1512')
    px(g, 3, 2, 10, 14, '#6a6258')
    px(g, 8, 2, 1, 14, '#3a342e')
    // Excelの升目の紋章が光る
    const glow = c.f % 2 ? '#7cf0a8' : '#3ac878'
    px(g, 4, 5, 8, 7, '#2a3a2e')
    for (const x of [4, 6, 9, 11]) px(g, x, 5, 1, 7, glow)
    for (const y of [5, 8, 11]) px(g, 4, y, 8, 1, glow)
  },
  '<': (g, c) => {
    caveFloor(g, c)
    px(g, 3, 8, 10, 8, 'rgba(255,240,200,0.25)')
    px(g, 5, 11, 6, 5, 'rgba(255,245,215,0.45)')
  },
}

// ---------------------------------------------------------------- 幽霊船
function deckFloor(g: G, c: Ctx) {
  // くたびれた 甲板の 板張り
  px(g, 0, 0, TS, TS, '#6a5646')
  for (let y = 0; y < 16; y += 4) {
    px(g, 0, y, 16, 1, '#8a7258')
    px(g, 0, y + 3, 16, 1, '#4a3a30')
    const off = ((y / 4 + c.v) % 2) * 8
    px(g, (off + 5) % 16, y + 1, 1, 2, '#4a3a30')
  }
  if (c.v % 3 === 0) px(g, 11, 6, 1, 1, '#b0a080')
}
function shipWall(g: G, c: Ctx) {
  const ns = [c.n, c.s, c.w, c.e]
  if (SHIP_OPEN.has(c.s)) {
    // 船内の 壁（丸窓つき）
    px(g, 0, 0, TS, TS, '#1e1614')
    px(g, 0, 3, 16, 13, '#4a3528')
    for (const x of [0, 4, 8, 12]) px(g, x, 3, 1, 13, '#3a281e')
    px(g, 0, 3, 16, 1, '#7a5a3a')
    px(g, 5, 7, 6, 6, '#2a1e18')
    px(g, 6, 8, 4, 4, '#4a8a78')
    px(g, 6, 8, 2, 2, '#9af0c8')
    px(g, 0, 15, 16, 1, '#140e0c')
  } else if (c.s === '~') {
    // 海に面した 船腹
    px(g, 0, 0, 16, 3, '#6a4a30')
    px(g, 0, 3, 16, 10, '#4a3226')
    for (let y = 5; y < 13; y += 3) px(g, 0, y, 16, 1, '#3a261c')
    px(g, 0, 13, 16, 3, '#20303a')
  } else if (ns.includes('~')) {
    // 上から見た 手すり
    px(g, 0, 0, TS, TS, '#2a1e18')
    if (c.n === ')' || c.s === ')') {
      px(g, 5, 0, 6, 16, '#6a4a30')
      px(g, 7, 0, 1, 16, '#8a6a48')
    } else {
      px(g, 0, 5, 16, 6, '#6a4a30')
      px(g, 0, 7, 16, 1, '#8a6a48')
    }
  } else {
    px(g, 0, 0, TS, TS, '#1e1614')
    for (let y = 0; y < 16; y += 4) px(g, 0, y, 16, 1, '#171010')
  }
}
const SHIP: Record<string, (g: G, c: Ctx) => void> = {
  ';': deckFloor,
  ')': shipWall,
  ']': (g, c) => {
    // マストと ぼろぼろの 帆
    deckFloor(g, c)
    px(g, 5, 13, 6, 3, 'rgba(0,0,0,0.3)')
    px(g, 7, 0, 2, 16, '#3a2618')
    px(g, 1, 2, 14, 2, '#3a2618')
    px(g, 2, 4, 12, 8, '#c8c0a8')
    px(g, 2, 4, 12, 1, '#e8e0c8')
    px(g, 4, 9, 2, 3, '#6a5646')
    px(g, 10, 7, 2, 2, '#6a5646')
    px(g, 12, 11, 2, 1, '#6a5646')
    px(g, 7, 6, 2, 2, '#2a2a2a')
  },
  'Λ': (g, c) => {
    // 灯台の 上部
    ground(g, c)
    px(g, 4, 6, 8, 10, '#f0f0f0')
    px(g, 4, 11, 8, 3, '#d03030')
    px(g, 5, 2, 6, 4, '#3a3a3a')
    px(g, 6, 3, 4, 2, c.f % 2 ? '#fff8a0' : '#f0c040')
    px(g, 5, 0, 6, 2, '#d03030')
    if (c.f % 2) {
      px(g, 0, 3, 4, 1, '#fff8a0')
      px(g, 12, 3, 4, 1, '#fff8a0')
    }
  },
  'Π': (g, c) => {
    // 灯台の 土台
    ground(g, c)
    px(g, 3, 0, 10, 16, '#f0f0f0')
    px(g, 3, 3, 10, 3, '#d03030')
    px(g, 6, 9, 4, 7, '#5a3a1a')
    px(g, 3, 15, 10, 1, '#8a8a8a')
  },
}

// ---------------------------------------------------------------- 鏡の神殿
function templeFloor(g: G, c: Ctx) {
  // 磨かれた 水色の鏡タイル
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 2; x++) {
      const on = (x + y + c.v) % 2
      px(g, x * 8, y * 8, 8, 8, on ? '#a9c4dc' : '#93b2cf')
      px(g, x * 8, y * 8, 8, 1, '#d8e8f6')
      px(g, x * 8, y * 8, 1, 8, '#c4d8ea')
      px(g, x * 8, y * 8 + 7, 8, 1, '#6f8eaf')
    }
  // きらめき
  if ((c.v * 5) % 7 === 1) {
    px(g, 11, 3, 1, 3, '#ffffff')
    px(g, 10, 4, 3, 1, '#ffffff')
  }
}
function templeWall(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#1e1a30')
  for (let y = 0; y < 16; y += 4) px(g, 0, y, 16, 1, '#161224')
  if (TEMPLE_OPEN.has(c.s)) {
    px(g, 0, 3, 16, 13, '#4a4270')
    px(g, 0, 3, 16, 1, '#e0b040')
    px(g, 0, 4, 16, 1, '#8a7cc0')
    // 鏡の はめこまれた 壁面
    px(g, 4, 6, 8, 8, '#2c2648')
    px(g, 5, 7, 6, 6, '#9cc8e8')
    px(g, 5, 7, 2, 2, '#e8f6ff')
    px(g, 0, 15, 16, 1, '#100c1c')
  }
}
const TEMPLE: Record<string, (g: G, c: Ctx) => void> = {
  i: templeFloor,
  G: templeWall,
  s: (g, c) => {
    // 姿見（立てかけた 大きな鏡）
    templeFloor(g, c)
    px(g, 3, 14, 10, 2, 'rgba(0,0,0,0.25)')
    px(g, 3, 1, 10, 14, '#6a4a1a')
    px(g, 4, 1, 8, 13, '#e0b040')
    px(g, 5, 2, 6, 11, '#7ab0dc')
    px(g, 5, 2, 6, 3, '#b8dcf6')
    px(g, 6 + (c.f % 2) * 2, 4, 1, 6, '#ffffff')
  },
  '>': (g, c) => {
    if ([c.n, c.s, c.w, c.e].includes(';')) deckFloor(g, c)
    else templeFloor(g, c)
    px(g, 3, 8, 10, 8, 'rgba(255,240,200,0.3)')
    px(g, 5, 11, 6, 5, 'rgba(255,245,215,0.5)')
  },
}

// ---------------------------------------------------------------- ワールドマップ
function smallTree(g: G, x: number, y: number) {
  px(g, x + 1, y, 5, 1, '#1d4a1e')
  px(g, x, y + 1, 7, 4, '#2f7a30')
  px(g, x + 1, y + 1, 3, 2, '#5cb04a')
  px(g, x, y + 5, 7, 1, '#1d4a1e')
  px(g, x + 3, y + 6, 1, 2, '#6b4424')
}
const WORLD: Record<string, (g: G, c: Ctx) => void> = {
  '%': (g, c) => {
    grass(g, c.v)
    smallTree(g, 0, 0)
    smallTree(g, 8, 1)
    smallTree(g, 3, 8)
    if (c.v % 2) smallTree(g, 9, 8)
  },
  '@': (g, c) => {
    grass(g, c.v)
    px(g, 1, 14, 14, 1, '#8a5a2a')
    for (const [x, y, col] of [[1, 5, '#c4493a'], [8, 2, '#d27f38']] as [number, number, string][]) {
      px(g, x, y + 5, 7, 5, '#efe0c2')
      px(g, x, y + 5, 7, 1, '#231a16')
      px(g, x + 3, y + 7, 2, 3, '#6a4020')
      px(g, x - 1, y + 2, 9, 3, col)
      px(g, x, y + 1, 7, 1, col)
      px(g, x + 1, y, 5, 1, '#231a16')
    }
  },
  '&': (g, c) => {
    grass(g, c.v)
    px(g, 1, 7, 14, 8, '#bdb9b0')
    px(g, 1, 7, 14, 1, '#d6d2ca')
    for (let x = 1; x < 15; x += 3) px(g, x, 6, 2, 1, '#bdb9b0')
    px(g, 6, 10, 4, 5, '#4a2c14')
    for (const x of [1, 11]) {
      px(g, x, 2, 4, 13, '#aaa69e')
      px(g, x - 1, 0, 6, 3, '#3f67b6')
      px(g, x + 1, 5, 2, 2, '#231a16')
    }
    px(g, 0, 15, 16, 1, '#6c6860')
  },
  'Φ': (g, c) => {
    // 港町：海と 家並みと 灯台
    grass(g, c.v)
    px(g, 0, 11, 16, 5, '#2f6fd0')
    px(g, 0, 11, 16, 1, '#a8dcff')
    px(g, 1, 6, 7, 5, '#efe0c2')
    px(g, 0, 4, 9, 2, '#c4493a')
    px(g, 3, 8, 2, 3, '#6a4020')
    px(g, 11, 2, 3, 9, '#f0f0f0')
    px(g, 11, 5, 3, 2, '#d03030')
    px(g, 11, 0, 3, 2, c.f % 2 ? '#fff8a0' : '#f0c040')
    px(g, 3, 13, 6, 2, '#6a4020')
    px(g, 6, 10, 1, 3, '#3a2618')
  },
  '?': (g, c) => {
    // 鏡の町：水色の ドームと 光る鏡
    grass(g, c.v)
    px(g, 1, 9, 14, 6, '#e8e4f0')
    px(g, 1, 9, 14, 1, '#231a16')
    px(g, 3, 4, 10, 5, '#6aa8d8')
    px(g, 5, 2, 6, 2, '#6aa8d8')
    px(g, 7, 0, 2, 2, '#e0b040')
    px(g, 5, 3, 2, 3, c.f % 2 ? '#ffffff' : '#c8e8ff')
    px(g, 6, 11, 4, 4, '#4a3a6a')
    px(g, 2, 11, 2, 2, '#7ab0dc')
    px(g, 12, 11, 2, 2, '#7ab0dc')
    px(g, 0, 15, 16, 1, '#6c6860')
  },
  '*': (g, c) => {
    grass(g, c.v)
    px(g, 0, 0, 16, 12, '#163a1a')
    smallTree(g, 0, 0)
    smallTree(g, 9, 0)
    smallTree(g, 4, 3)
    px(g, 6, 10, 4, 6, '#d8b47a')
    px(g, 5, 8, 6, 3, '#0e2a12')
  },
}

// ---------------------------------------------------------------- 本体
function draw(g: G, ch: string, c: Ctx) {
  switch (ch) {
    case '.':
      return grass(g, c.v)
    case ',': {
      grass(g, c.v)
      if (TH.snow) {
        // 雪だまり
        px(g, 3, 8, 6, 3, '#ffffff')
        px(g, 4, 7, 4, 1, '#ffffff')
        px(g, 3, 11, 6, 1, '#b8c6d8')
        px(g, 10, 4, 3, 2, '#ffffff')
        px(g, 10, 6, 3, 1, '#b8c6d8')
        return
      }
      const cols = TH.flowers
      const r = rng(c.v * 13 + 7)
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(r() * 11)
        const y = 2 + Math.floor(r() * 11)
        const col = cols[(c.v + i) % cols.length]
        px(g, x, y - 1, 1, 1, col)
        px(g, x - 1, y, 3, 1, col)
        px(g, x, y + 1, 1, 1, col)
        px(g, x, y, 1, 1, '#f8e060')
      }
      return
    }
    case '"': {
      grass(g, c.v)
      const r = rng(c.v * 5 + 1)
      const [a, b, top] = TH.snow ? ['#9aaabc', '#b4c2d2', '#ffffff'] : TH === DEFAULT_THEME ? ['#3f8a2c', '#4f9e36', '#8fd46a'] : [shade(TH.grass[1], -0.12), TH.grass[1], TH.grass[2]]
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(r() * 10)
        const y = 5 + Math.floor(r() * 8)
        px(g, x, y, 1, 3, a)
        px(g, x + 2, y, 1, 3, a)
        px(g, x + 1, y - 1, 1, 4, b)
        px(g, x + 1, y - 2, 1, 1, top)
      }
      return
    }
    case '=':
      return dirt(g, c)
    case 'T':
      return paving(g, c)
    case '~':
      return water(g, c)
    case 'B': {
      water(g, { ...c, n: '~', s: '~' })
      px(g, 1, 0, 14, 16, '#a8743c')
      for (let y = 0; y < 16; y += 4) px(g, 1, y + 3, 14, 1, '#7a4e22')
      if (WATERY.has(c.w) && c.w !== 'B') {
        px(g, 0, 0, 2, 16, '#5a3a1a')
        px(g, 0, 2, 3, 2, '#3a2410')
        px(g, 0, 10, 3, 2, '#3a2410')
      }
      if (WATERY.has(c.e) && c.e !== 'B') {
        px(g, 14, 0, 2, 16, '#5a3a1a')
        px(g, 13, 2, 3, 2, '#3a2410')
        px(g, 13, 10, 3, 2, '#3a2410')
      }
      return
    }
    case '#':
      grass(g, c.v)
      return treeSprite(g, TH.trees[0])
    case 'Y':
      grass(g, c.v)
      return treeSprite(g, TH.trees[1])
    case 'b':
      grass(g, c.v)
      return drawRows(g, BUSH, TH.snow ? SNOWPINE_PAL : TH.trees[0] === 'sakura' ? SAKURA_PAL : TREE_PAL)
    case 'r':
      grass(g, c.v)
      return drawRows(g, ROCK, ROCK_PAL)
    case 'M':
      grass(g, c.v)
      return drawRows(g, MOUNTAIN, TH.mountain ?? MOUNT_PAL)
    case 'K':
      grass(g, c.v)
      drawRows(g, MOUNTAIN, TH.mountain ?? MOUNT_PAL)
      px(g, 4, 6, 8, 7, OUT)
      px(g, 5, 5, 6, 1, OUT)
      px(g, 5, 7, 6, 6, '#0a0806')
      return
    case 'W':
      return plaster(g, c)
    case 'w':
      return windowTile(g, c)
    case 'D':
      return door(g, c)
    case 'V':
      return stoneWall(g, c)
    case 'v':
      return stoneWindow(g, c)
    case 'd':
      return bigDoor(g, c)
    case 'X':
      return battlement(g, c)
    case 'F':
      return fence(g, c)
    case 'u':
      return fountainBasin(g, c, false)
    case 'f':
      return fountainBasin(g, c, true)
    case 'Z':
      return barrier(g, c)
    case 'k':
      return farm(g, c)
    case 'h':
      return hay(g, c)
    case 'σ':
      return sand(g, c)
    case 'ψ':
      return boardwalk(g, c)
    case 'β':
      return boat(g, c)
    case 'ρ':
      return paddy(g, c)
    case 'κ':
      return scarecrow(g, c)
    case 'π':
      return palisade(g, c)
    case 'η':
      return hedge(g, c)
    case 'ι':
      return rampart(g, c)
    case 'υ':
      return willowTile(g, c)
  }
  if (SHIP[ch]) return SHIP[ch](g, c)
  if (TEMPLE[ch]) return TEMPLE[ch](g, c)
  if (TOWER[ch]) return TOWER[ch](g, c)
  if (CAVE[ch]) return CAVE[ch](g, c)
  if (INTERIOR[ch]) return INTERIOR[ch](g, c)
  if (WORLD[ch]) return WORLD[ch](g, c)
  if (isRoof(ch)) return roof(g, ch, c)
  if (ch in SIGN_ICONS) return signTile(g, ch, c)
  if (DECOR[ch]) return DECOR[ch](g, c)
  grass(g, c.v)
}

const cache = new Map<string, HTMLCanvasElement>()

/** 隣のタイルに応じて描き分けるので、キャッシュのキーにも隣接情報を含める */
export function drawTile(g: G, at: At, x: number, y: number, frame: number, dx: number, dy: number, theme: ThemeName = 'default') {
  const ch = at(x, y)
  const c: Ctx = { n: at(x, y - 1), s: at(x, y + 1), w: at(x - 1, y), e: at(x + 1, y), v: (x * 7 + y * 13) % 8, f: ANIMATED.has(ch) ? frame % 2 : 0 }
  const neighborAware = !['.', '#', 'Y', 'b', 'r', 'M', 'K', ',', '"', 'k', 'h'].includes(ch)
  const nb = neighborAware ? (DECOR_ON_GROUND.has(ch) ? groundOf(c) : `${c.n}${c.s}${c.w}${c.e}`) : ''
  const key = `${theme}|${ch}|${c.v}|${c.f}|${nb}`
  let t = cache.get(key)
  if (!t) {
    t = document.createElement('canvas')
    t.width = t.height = TS
    TH = THEMES[theme] ?? DEFAULT_THEME
    draw(t.getContext('2d')!, ch, c)
    cache.set(key, t)
  }
  g.drawImage(t, dx, dy)
}
