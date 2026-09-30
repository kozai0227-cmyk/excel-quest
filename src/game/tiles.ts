import { TS, drawRows, shade } from './sprites'

/** 歩けるタイル（それ以外はすべて通行不可） */
export const WALKABLE = new Set(['.', ',', '"', '=', 'T', 'B', 'D', 'd', '_', ':', 'g', 'z', '%', '@', '&', '*', 'q', '<', 'K', '{', '}', '-', 'i', '>', '?', ';', 'Φ'])
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

const GRASSY = new Set(['.', ',', '"', '#', 'Y', 'b', 'r', 'F', 'Z', 'h', 'k', 'M', 'K'])
// 船体 ')' も 水辺あつかい（船の まわりに 岸の 縁を 描かない）
const WATERY = new Set(['~', 'B', ')'])
const ROOFS: Record<string, string> = { R: '#c4493a', U: '#3f67b6', E: '#3f8c4c', N: '#d27f38', Q: '#7c4ea4', '+': '#3f67b6' }
const PLASTER = new Set(['W', 'w', 'D', '1', '2', '3', '4', '5', '8'])
const STONE = new Set(['V', 'v', 'd', '6', '7', '9', 'X'])
const isWall = (c: string) => PLASTER.has(c) || STONE.has(c)
const isRoof = (c: string) => c in ROOFS
const DECOR_ON_GROUND = new Set(['L', 'o', 'x', 'p', 'n', 'a', 'm', 'A', 'P', 'S', 'c', 'e', 't', 'l'])
const ANIMATED = new Set(['~', 'B', 'Z', 'u', 'f', 'L', 'y', 'C', '(', 's', '?', 'Φ', 'Λ'])
const INDOOR_FLOOR = new Set(['_', ':', 'g', 'z'])

const OUT = '#231a16'

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
  px(g, 0, 0, TS, TS, '#5eae44')
  const r = rng(v * 97 + 13)
  for (let i = 0; i < 7; i++) px(g, Math.floor(r() * 15), Math.floor(r() * 14), 1, 2, '#4b9534')
  for (let i = 0; i < 3; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, '#7fca60')
}

function dirt(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#d8b47a')
  const r = rng(c.v * 31 + 5)
  for (let i = 0; i < 6; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, '#bf985c')
  for (let i = 0; i < 3; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, '#ead0a0')
  fringe(g, c, '#5eae44', '#b8935a')
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

function paving(g: G, c: Ctx) {
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
  const curb = '#6e685e'
  if (GRASSY.has(c.n)) px(g, 0, 0, 16, 1, curb)
  if (GRASSY.has(c.s)) px(g, 0, 15, 16, 1, curb)
  if (GRASSY.has(c.w)) px(g, 0, 0, 1, 16, curb)
  if (GRASSY.has(c.e)) px(g, 15, 0, 1, 16, curb)
}

function water(g: G, c: Ctx, shore = true) {
  px(g, 0, 0, TS, TS, '#2f6fd0')
  const r = rng(c.v * 19 + 1)
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * 12)
    const y = Math.floor(r() * 14) + 1
    px(g, (x + c.f * 3) % 13, y, 3, 1, '#6fa8ee')
  }
  if (c.f % 2) px(g, Math.floor(r() * 14), Math.floor(r() * 14), 1, 1, '#e8f6ff')
  if (!shore) return
  const bank = '#3d7a2e'
  const foam = '#a8dcff'
  if (!WATERY.has(c.n)) {
    px(g, 0, 0, 16, 2, bank)
    px(g, 0, 2, 16, 1, foam)
  }
  if (!WATERY.has(c.s)) {
    px(g, 0, 15, 16, 1, bank)
    px(g, 0, 14, 16, 1, foam)
  }
  if (!WATERY.has(c.w)) {
    px(g, 0, 0, 1, 16, bank)
    px(g, 1, 0, 1, 16, foam)
  }
  if (!WATERY.has(c.e)) {
    px(g, 15, 0, 1, 16, bank)
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
const TREE_PAL = { o: '#1d4a1e', D: '#2a6e2a', G: '#3d9a3a', L: '#6cc45a', T: '#6b4424', t: '#50301a', s: 'rgba(0,0,0,0.22)' }
const PINE_PAL = { o: '#133a22', D: '#1f5a30', G: '#2d7a3e', L: '#4fa85a', T: '#6b4424', t: '#50301a', s: 'rgba(0,0,0,0.22)' }
const ROCK_PAL = { o: '#3a3a40', D: '#6c6c74', G: '#9696a0', L: '#c4c4cc', s: 'rgba(0,0,0,0.2)' }
const MOUNT_PAL = { o: '#3a2a1e', L: '#c4a482', G: '#8e6c4e', D: '#6a4c34' }

// ---------------------------------------------------------------- 建物
function roof(g: G, ch: string, c: Ctx) {
  const base = ROOFS[ch]
  const dark = shade(base, -0.32)
  const light = shade(base, 0.2)
  px(g, 0, 0, TS, TS, base)
  for (let band = 0; band < 4; band++) {
    px(g, 0, band * 4, 16, 1, light)
    px(g, 0, band * 4 + 3, 16, 1, dark)
    for (let sx = band % 2 ? 4 : 0; sx < 16; sx += 8) px(g, sx, band * 4, 1, 3, dark)
  }
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
  if (ch === '+') {
    px(g, 6, 1, 4, 13, OUT)
    px(g, 3, 4, 10, 4, OUT)
    px(g, 7, 2, 2, 11, '#f2c440')
    px(g, 4, 5, 8, 2, '#f2c440')
  }
}

function plaster(g: G, c: Ctx) {
  px(g, 0, 0, TS, TS, '#efe0c2')
  const r = rng(c.v * 41 + 2)
  for (let i = 0; i < 5; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 12), 1, 1, '#e0cfaa')
  wallEdges(g, c, '#7a4e2a')
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
  px(g, 1, 2, 2, 9, '#3f7a44')
  px(g, 13, 2, 2, 9, '#3f7a44')
  px(g, 1, 5, 2, 1, '#2c5a30')
  px(g, 13, 5, 2, 1, '#2c5a30')
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
  else if (k === 'T') paving(g, { ...c, n: 'T', s: 'T', w: 'T', e: 'T' })
  else if (k === '=') dirt(g, { ...c, n: '=', s: '=', w: '=', e: '=' })
  else grass(g, c.v)
}

const DECOR: Record<string, (g: G, c: Ctx) => void> = {
  L: (g, c) => {
    ground(g, c)
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
    for (let x = 0; x < 16; x += 4) {
      px(g, x, 1, 2, 10, '#d83a3a')
      px(g, x + 2, 1, 2, 10, '#f4f0e8')
    }
    px(g, 0, 0, 16, 1, OUT)
    for (let x = 0; x < 16; x += 4) {
      px(g, x, 11, 4, 1, x % 8 ? '#f4f0e8' : '#d83a3a')
      px(g, x + 1, 12, 2, 1, x % 8 ? '#f4f0e8' : '#d83a3a')
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
      const cols = ['#ffffff', '#f04a5a', '#f8d040', '#f07ab0', '#7aa8f8']
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
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(r() * 10)
        const y = 5 + Math.floor(r() * 8)
        px(g, x, y, 1, 3, '#3f8a2c')
        px(g, x + 2, y, 1, 3, '#3f8a2c')
        px(g, x + 1, y - 1, 1, 4, '#4f9e36')
        px(g, x + 1, y - 2, 1, 1, '#8fd46a')
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
      return drawRows(g, TREE, TREE_PAL)
    case 'Y':
      grass(g, c.v)
      return drawRows(g, PINE, PINE_PAL)
    case 'b':
      grass(g, c.v)
      return drawRows(g, BUSH, TREE_PAL)
    case 'r':
      grass(g, c.v)
      return drawRows(g, ROCK, ROCK_PAL)
    case 'M':
      grass(g, c.v)
      return drawRows(g, MOUNTAIN, MOUNT_PAL)
    case 'K':
      grass(g, c.v)
      drawRows(g, MOUNTAIN, MOUNT_PAL)
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
export function drawTile(g: G, at: At, x: number, y: number, frame: number, dx: number, dy: number) {
  const ch = at(x, y)
  const c: Ctx = { n: at(x, y - 1), s: at(x, y + 1), w: at(x - 1, y), e: at(x + 1, y), v: (x * 7 + y * 13) % 8, f: ANIMATED.has(ch) ? frame % 2 : 0 }
  const neighborAware = !['.', '#', 'Y', 'b', 'r', 'M', 'K', ',', '"', 'k', 'h'].includes(ch)
  const nb = neighborAware ? (DECOR_ON_GROUND.has(ch) ? groundOf(c) : `${c.n}${c.s}${c.w}${c.e}`) : ''
  const key = `${ch}|${c.v}|${c.f}|${nb}`
  let t = cache.get(key)
  if (!t) {
    t = document.createElement('canvas')
    t.width = t.height = TS
    draw(t.getContext('2d')!, ch, c)
    cache.set(key, t)
  }
  g.drawImage(t, dx, dy)
}
