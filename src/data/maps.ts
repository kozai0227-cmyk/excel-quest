import type { CharSpec } from '../game/sprites'
import type { MapDef, NpcDef } from '../game/types'
import { isUnlocked } from '../game/store'

// ================================================================ マップ組み立て
type M = string[][]
const blank = (w: number, h: number): M => Array.from({ length: h }, () => Array(w).fill('.'))
const rect = (m: M, ch: string, x: number, y: number, w: number, h: number) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) m[j][i] = ch
}
const put = (m: M, ch: string, pts: [number, number][]) => pts.forEach(([x, y]) => (m[y][x] = ch))

function hash(x: number, y: number, s = 1) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** 外周を広葉樹と針葉樹の森で囲む */
function forest(m: M) {
  const h = m.length
  const w = m[0].length
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (x === 0 || y === 0 || x === w - 1 || y === h - 1) m[y][x] = hash(x, y) < 0.5 ? '#' : 'Y'
}

/** 草地に花や草むらを散らす */
function sprinkle(m: M, seed: number, y0 = 0) {
  for (let y = y0; y < m.length; y++)
    for (let x = 0; x < m[0].length; x++) {
      if (m[y][x] !== '.') continue
      const r = hash(x, y, seed)
      if (r < 0.035) m[y][x] = ','
      else if (r < 0.065) m[y][x] = '"'
    }
}

function fenceRect(m: M, x: number, y: number, w: number, h: number) {
  rect(m, 'F', x, y, w, 1)
  rect(m, 'F', x, y + h - 1, w, 1)
  rect(m, 'F', x, y, 1, h)
  rect(m, 'F', x + w - 1, y, 1, h)
}

interface BuildingOpt {
  roof: string
  door: number
  stone?: boolean
  upper?: boolean
  winUpper?: number[]
  winLower?: number[]
  sign?: [number, string]
  cross?: boolean
}
/** 屋根2段＋壁1〜2段の建物。ドアは最下段 */
function building(m: M, x: number, y: number, w: number, o: BuildingOpt) {
  const wall = o.stone ? 'V' : 'W'
  const win = o.stone ? 'v' : 'w'
  rect(m, o.roof, x, y, w, 2)
  if (o.cross) m[y][x + Math.floor(w / 2)] = '+'
  let wy = y + 2
  if (o.upper) {
    rect(m, wall, x, wy, w, 1)
    o.winUpper?.forEach((dx) => (m[wy][x + dx] = win))
    wy++
  }
  rect(m, wall, x, wy, w, 1)
  o.winLower?.forEach((dx) => (m[wy][x + dx] = win))
  m[wy][x + o.door] = o.stone ? 'd' : 'D'
  if (o.sign) m[wy][x + o.sign[0]] = o.sign[1]
}
const done = (m: M) => m.map((r) => r.join(''))

// ================================================================ キャラクター
export const PLAYER_SPEC: CharSpec = {
  hair: 'neat',
  hairColor: '#2a211c',
  outfit: 'suit',
  color: '#2c3858',
  inner: '#f6f7f9',
  accent: '#d42a3a',
  pants: '#2c3858',
  shoes: '#1a1614',
}

const C: Record<string, CharSpec> = {
  elder: { hair: 'bald', hairColor: '#e4e4e4', beard: 'long', beardColor: '#f4f4f4', eyes: 'closed', outfit: 'robe', color: '#6a3e9a', accent: '#f2c440', shoes: '#5a3a1e' },
  inn: { hair: 'slick', hairColor: '#6a3a1a', beard: 'mustache', outfit: 'vest', color: '#7a4a2a', inner: '#f4f0e8', accent: '#c03030', pants: '#3a3a3a' },
  priest: { hair: 'neat', hairColor: '#8a8a8a', eyes: 'closed', outfit: 'robe', color: '#f2f2f6', accent: '#3a64c0', hat: 'miter', hatColor: '#f4f4f8', hatAccent: '#3a64c0' },
  shop: { hair: 'messy', hairColor: '#8a5a2a', beard: 'stubble', outfit: 'leather', color: '#e8e0cc', accent: '#3a8a4a', pants: '#4a3a2a', hat: 'beret', hatColor: '#3a7a3a' },
  meel: { hair: 'twin', hairColor: '#f0d890', eyes: 'big', blush: true, outfit: 'apron', color: '#6aa84a', inner: '#fbf6ea', hat: 'straw', hatColor: '#e8c870', hatAccent: '#e04a5a', shoes: '#6a4020' },
  riko: { hair: 'bob', hairColor: '#e8704a', eyes: 'big', blush: true, outfit: 'apron', color: '#d04050', inner: '#ffffff', shoes: '#6a3020' },
  guard: { hair: 'neat', hairColor: '#5a3a2a', eyes: 'narrow', outfit: 'armor', color: '#3a5ab0', hat: 'helmet', hatAccent: '#d03030', pants: '#4a4a58', shoes: '#3a3a40' },
  pen: { hair: 'messy', hairColor: '#3a2a4a', glasses: true, mouth: true, outfit: 'robe', color: '#3a8a8a', accent: '#e8e0c0' },
  toki: { hair: 'bun', hairColor: '#d8d8d8', eyes: 'closed', outfit: 'dress', color: '#8a4a7a', inner: '#e8d8c8', shoes: '#5a3a2a', skin: '#f0c8a0' },
  bold: { hair: 'spiky', hairColor: '#e07020', skin: '#e0a878', eyes: 'narrow', outfit: 'overalls', color: '#3a5a9a', inner: '#f0e8d8', hat: 'bandana', hatColor: '#d83a30', shoes: '#4a3020' },
  kid: { hair: 'spiky', hairColor: '#f0c030', eyes: 'big', blush: true, outfit: 'tunic', color: '#e04a3a', accent: '#6a4020', pants: '#3a5ab0' },
  gate1: { hair: 'buzz', hairColor: '#3a2a1a', beard: 'stubble', outfit: 'armor', color: '#8a3a3a', hat: 'helmet', hatAccent: '#f0c040', pants: '#4a4a58' },
  gantetsu: { hair: 'buzz', hairColor: '#1a1410', skin: '#d89a68', beard: 'mustache', beardColor: '#1a1410', eyes: 'narrow', outfit: 'leather', color: '#3a3a44', accent: '#8a5a30', pants: '#2a2a30' },
  martha: { hair: 'bob', hairColor: '#c0602a', eyes: 'closed', blush: true, outfit: 'apron', color: '#e8a0a0', inner: '#ffffff', hat: 'chef', hatColor: '#ffffff' },
  minerva: { hair: 'long', hairColor: '#5a3a8a', glasses: true, outfit: 'coat', color: '#2a3a6a', inner: '#f0f0f8', accent: '#e0c050', pants: '#2a2a3a' },
  calk: { hair: 'bald', hairColor: '#b8b8b8', beard: 'mustache', beardColor: '#d0d0d0', outfit: 'coat', color: '#a02838', inner: '#f8f0e0', accent: '#f2c440', hat: 'tophat', hatColor: '#26222a', hatAccent: '#a02838', pants: '#2a2020', skin: '#f2c49a' },
  inn2: { hair: 'bun', hairColor: '#7a3a2a', eyes: 'closed', outfit: 'apron', color: '#4a6a9a', inner: '#ffffff' },
  kaun: { hair: 'slick', hairColor: '#2a2a2a', glasses: true, eyes: 'narrow', outfit: 'vest', color: '#5a5a6a', inner: '#f4f4f4', accent: '#2a2a60', pants: '#3a3a44' },
  shop2: { hair: 'neat', hairColor: '#4a3a2a', beard: 'stubble', outfit: 'leather', color: '#e8e0cc', accent: '#2a6ab0', pants: '#3a3a44', hat: 'beret', hatColor: '#2a6ab0' },
  namio: { hair: 'buzz', hairColor: '#1a1a1a', skin: '#c8885a', beard: 'stubble', outfit: 'vest', color: '#2a6ab0', inner: '#e8e8e0', accent: '#2a6ab0', hat: 'knit', hatColor: '#d8483a', pants: '#3a3a3a' },
  official: { hair: 'messy', hairColor: '#4a4040', eyes: 'tired', outfit: 'suit', color: '#6a6a72', inner: '#e8e8e0', accent: '#3a3a8a' },
  kid2: { hair: 'twin', hairColor: '#7a3a1a', eyes: 'big', blush: true, outfit: 'dress', color: '#f080a8', inner: '#ffffff' },
  traveler: { hair: 'neat', hairColor: '#6a4a2a', outfit: 'robe', color: '#5a7a3a', accent: '#8a6a3a', hat: 'hood', hatColor: '#4a6a30' },
  gate2: { hair: 'neat', hairColor: '#2a2a2a', beard: 'mustache', outfit: 'armor', color: '#2a7a5a', hat: 'helmet', hatAccent: '#3ab070', pants: '#4a4a58' },
}

/** 名前 → 見た目（会話ウィンドウの顔グラ用） */
export const SPEAKER_LOOKS: Record<string, CharSpec> = {}

Object.assign(C, {
  elderWife: { hair: 'bun', hairColor: '#e0e0e0', eyes: 'closed', outfit: 'dress', color: '#5a7a4a', inner: '#f0e8d8' },
  guest: { hair: 'neat', hairColor: '#8a5a2a', beard: 'stubble', outfit: 'tunic', color: '#6a8aa0', accent: '#4a3a2a', pants: '#4a4a58' },
  prayer: { hair: 'long', hairColor: '#5a4a3a', eyes: 'closed', outfit: 'dress', color: '#6a6aa0', inner: '#f0f0f8' },
  youth: { hair: 'messy', hairColor: '#6a4020', outfit: 'tunic', color: '#3a8a6a', accent: '#6a4020', pants: '#5a4a3a' },
  wife2: { hair: 'bob', hairColor: '#3a2a2a', eyes: 'closed', blush: true, outfit: 'apron', color: '#8a6aa0', inner: '#ffffff' },
  student: { hair: 'spiky', hairColor: '#5a3a1a', eyes: 'big', outfit: 'tunic', color: '#3a6ab0', accent: '#6a4020', pants: '#4a4a58' },
  ken: { hair: 'spiky', hairColor: '#3a2a1a', skin: '#e0a878', beard: 'mustache', outfit: 'leather', color: '#5a3a2a', accent: '#8a5a30', hat: 'bandana', hatColor: '#3a64c0' },
  mamoru: { hair: 'neat', hairColor: '#7a5a3a', eyes: 'narrow', outfit: 'armor', color: '#6a8a3a', hat: 'helmet', hatAccent: '#3a64c0', pants: '#4a4a58' },
  hanma: { hair: 'messy', hairColor: '#c0602a', eyes: 'big', blush: true, outfit: 'overalls', color: '#6a4a2a', inner: '#e8e0d0' },
  yoroida: { hair: 'long', hairColor: '#a0a0a8', glasses: true, outfit: 'coat', color: '#3a4a5a', inner: '#e0e0e8', accent: '#c0c8d0', pants: '#2a2a3a' },
} satisfies Record<string, CharSpec>)

// 第2章 サンショウの人々
Object.assign(C, {
  kagami: { hair: 'long', hairColor: '#dcdce8', glasses: true, outfit: 'dress', color: '#4a5aa8', inner: '#f0f0ff', shoes: '#2a2a3a', skin: '#f6d0b0' },
  hanten: { hair: 'buzz', hairColor: '#3a2a1a', skin: '#d89a68', beard: 'stubble', outfit: 'apron', color: '#3a8a4a', inner: '#f4f0e0', hat: 'bandana', hatColor: '#e0b040' },
  dolma: { hair: 'slick', hairColor: '#1a1a1a', glasses: true, beard: 'mustache', beardColor: '#1a1a1a', outfit: 'vest', color: '#1a4a3a', inner: '#f4f4f4', accent: '#e0b040', hat: 'tophat', hatColor: '#1a3a2a', hatAccent: '#e0b040', pants: '#2a2a2a' },
  nui: { hair: 'bun', hairColor: '#3a2a4a', glasses: true, outfit: 'dress', color: '#b05a8a', inner: '#fbeef4' },
  flora: { hair: 'long', hairColor: '#e8a040', eyes: 'big', blush: true, outfit: 'apron', color: '#e07aa0', inner: '#ffffff', hat: 'straw', hatColor: '#f0d890', hatAccent: '#6aa84a' },
  kakeru: { hair: 'neat', hairColor: '#3a3a3a', glasses: true, beard: 'stubble', outfit: 'robe', color: '#3a5a8a', accent: '#e8e0c0' },
  utsushi: { hair: 'messy', hairColor: '#b8b8c8', eyes: 'narrow', beard: 'long', beardColor: '#c8c8d8', outfit: 'leather', color: '#5a5a70', accent: '#9cc8e8', pants: '#3a3a44' },
  ginji: { hair: 'slick', hairColor: '#c0c0cc', outfit: 'armor', color: '#8a8aa0', hat: 'helmet', hatAccent: '#9cc8e8', pants: '#4a4a58' },
  inn3: { hair: 'bob', hairColor: '#4a6aa0', eyes: 'closed', outfit: 'apron', color: '#6a8ac0', inner: '#ffffff' },
  shop3: { hair: 'neat', hairColor: '#7a5a3a', beard: 'stubble', outfit: 'leather', color: '#e8e0cc', accent: '#7a4ea4', pants: '#3a3a44', hat: 'beret', hatColor: '#7a4ea4' },
  mira: { hair: 'twin', hairColor: '#c8d8f0', eyes: 'big', blush: true, outfit: 'dress', color: '#5a8ad0', inner: '#ffffff' },
  rami: { hair: 'twin', hairColor: '#c8d8f0', eyes: 'big', blush: true, outfit: 'dress', color: '#d05a8a', inner: '#ffffff' },
  keeper: { hair: 'neat', hairColor: '#8a8aa0', eyes: 'closed', outfit: 'robe', color: '#4a4270', accent: '#e0b040', hat: 'hood', hatColor: '#3a3260' },
  townsman: { hair: 'spiky', hairColor: '#4a3a2a', outfit: 'tunic', color: '#8a6aa0', accent: '#4a3a2a', pants: '#3a3a44' },
  kid3: { hair: 'spiky', hairColor: '#9ab0d0', eyes: 'big', blush: true, outfit: 'tunic', color: '#3a9ab0', accent: '#6a4020', pants: '#4a4a58' },
  worker: { hair: 'buzz', hairColor: '#3a2a1a', skin: '#d89a68', beard: 'stubble', outfit: 'overalls', color: '#d88a30', inner: '#f0e8d8', hat: 'helmet', hatAccent: '#f0c040' },
} satisfies Record<string, CharSpec>)

// 第3章 イフポートの人々
Object.assign(C, {
  minato: { hair: 'bob', hairColor: '#6a3a2a', skin: '#e8b890', outfit: 'coat', color: '#1a3a6a', inner: '#f4f4f4', accent: '#e0b040', hat: 'beret', hatColor: '#1a2a4a', pants: '#1a2a3a' },
  tomoshi: { hair: 'bald', hairColor: '#d0d0d0', beard: 'long', beardColor: '#e8e8e8', eyes: 'narrow', outfit: 'coat', color: '#8a3030', inner: '#f0e8d8', accent: '#e0b040', hat: 'knit', hatColor: '#3a3a6a' },
  ami: { hair: 'bob', hairColor: '#3a2a1a', skin: '#d89a68', eyes: 'big', outfit: 'overalls', color: '#e8a030', inner: '#f4f0e0', hat: 'bandana', hatColor: '#3a6ab0' },
  hakobu: { hair: 'spiky', hairColor: '#4a3020', beard: 'stubble', outfit: 'vest', color: '#6a4a2a', inner: '#e8e0cc', accent: '#d06a20', hat: 'knit', hatColor: '#d06a20', pants: '#3a3a44' },
  rope: { hair: 'buzz', hairColor: '#2a2a2a', beard: 'mustache', beardColor: '#2a2a2a', eyes: 'narrow', outfit: 'suit', color: '#f0f0f0', inner: '#1a2a4a', accent: '#e0b040', pants: '#f0f0f0', hat: 'beret', hatColor: '#f4f4f4' },
  kazami: { hair: 'long', hairColor: '#8ab0e0', glasses: true, eyes: 'big', outfit: 'robe', color: '#4a7ab0', accent: '#f0f0f0' },
  mori: { hair: 'messy', hairColor: '#1a1a1a', skin: '#c8885a', beard: 'long', beardColor: '#1a1a1a', outfit: 'leather', color: '#3a4a5a', accent: '#8a5a30', pants: '#2a2a30' },
  uroko: { hair: 'slick', hairColor: '#3a8a8a', outfit: 'armor', color: '#3a8a8a', hat: 'helmet', hatAccent: '#e0b040', pants: '#3a4a4a' },
  inn4: { hair: 'bun', hairColor: '#c07030', eyes: 'closed', outfit: 'apron', color: '#3a8ab0', inner: '#ffffff' },
  shop4: { hair: 'neat', hairColor: '#5a3a2a', beard: 'stubble', outfit: 'leather', color: '#e8e0cc', accent: '#2a8a6a', pants: '#3a3a44', hat: 'beret', hatColor: '#2a8a6a' },
  cadet: { hair: 'spiky', hairColor: '#3a2a1a', eyes: 'big', outfit: 'tunic', color: '#f0f0f0', accent: '#1a2a4a', pants: '#1a2a4a' },
  sailor: { hair: 'buzz', hairColor: '#3a2a1a', skin: '#d89a68', beard: 'stubble', outfit: 'tunic', color: '#f0f0f0', accent: '#3a6ab0', pants: '#3a6ab0', hat: 'bandana', hatColor: '#3a6ab0' },
  fishmonger: { hair: 'buzz', hairColor: '#2a1a1a', beard: 'mustache', beardColor: '#2a1a1a', outfit: 'apron', color: '#3a6ab0', inner: '#f0f0f0', hat: 'bandana', hatColor: '#f0f0f0' },
  kid4: { hair: 'messy', hairColor: '#c0602a', eyes: 'big', blush: true, outfit: 'overalls', color: '#3a6ab0', inner: '#f0e8d8' },
  kiri: { hair: 'long', hairColor: '#b0b0c0', eyes: 'closed', outfit: 'robe', color: '#8a8aa0', accent: '#c0c0d0', hat: 'hood', hatColor: '#6a6a80' },
  storekeeper: { hair: 'bald', hairColor: '#a0a0a0', beard: 'stubble', outfit: 'overalls', color: '#6a5a3a', inner: '#e8e0d0' },
  amiMother: { hair: 'bob', hairColor: '#5a3a2a', eyes: 'closed', blush: true, outfit: 'apron', color: '#c05a3a', inner: '#ffffff' },
} satisfies Record<string, CharSpec>)

// 第4章 ルックアップの人々
Object.assign(C, {
  sagasu: { hair: 'slick', hairColor: '#d8d8e0', glasses: true, beard: 'mustache', beardColor: '#e0e0e8', outfit: 'robe', color: '#2a4a8a', accent: '#e0b040', hat: 'tophat', hatColor: '#1a2a4a', hatAccent: '#e0b040' },
  post: { hair: 'spiky', hairColor: '#6a3a1a', eyes: 'big', outfit: 'tunic', color: '#d84030', accent: '#f0c040', pants: '#2a3a6a', hat: 'beret', hatColor: '#d84030' },
  catalog: { hair: 'bob', hairColor: '#2a2a3a', glasses: true, outfit: 'apron', color: '#4a7a5a', inner: '#ffffff' },
  hantei: { hair: 'buzz', hairColor: '#5a4a3a', beard: 'mustache', beardColor: '#5a4a3a', eyes: 'narrow', outfit: 'armor', color: '#8a8a9a', hat: 'helmet', hatAccent: '#d03030', pants: '#4a4a58' },
  shoko: { hair: 'long', hairColor: '#4a2a1a', glasses: true, eyes: 'closed', outfit: 'dress', color: '#6a4a8a', inner: '#f0e8f8' },
  roll: { hair: 'neat', hairColor: '#c0a060', glasses: true, outfit: 'coat', color: '#3a3a6a', inner: '#f4f4f4', accent: '#e0b040', pants: '#2a2a3a' },
  quill: { hair: 'messy', hairColor: '#8a8a8a', beard: 'long', beardColor: '#c0c0c0', outfit: 'leather', color: '#4a3a2a', accent: '#c09040' },
  shelfa: { hair: 'bun', hairColor: '#e0c060', outfit: 'armor', color: '#5a6a8a', hat: 'helmet', hatAccent: '#e0b040', pants: '#3a3a4a' },
  inn5: { hair: 'bob', hairColor: '#8a4a2a', eyes: 'closed', outfit: 'apron', color: '#8a5ab0', inner: '#ffffff' },
  shop5: { hair: 'neat', hairColor: '#3a2a1a', beard: 'stubble', outfit: 'leather', color: '#e8e0cc', accent: '#8a3a3a', pants: '#3a3a44', hat: 'beret', hatColor: '#8a3a3a' },
  reader: { hair: 'twin', hairColor: '#3a3a3a', glasses: true, eyes: 'big', outfit: 'tunic', color: '#e0a040', accent: '#5a3a1a', pants: '#3a3a44' },
  kid5: { hair: 'spiky', hairColor: '#e0a040', eyes: 'big', blush: true, outfit: 'overalls', color: '#3a8a5a', inner: '#f0e8d8' },
  ferryman: { hair: 'buzz', hairColor: '#2a1a1a', skin: '#c8885a', beard: 'stubble', outfit: 'tunic', color: '#f0f0f0', accent: '#1a3a6a', pants: '#1a3a6a', hat: 'knit', hatColor: '#1a3a6a' },
} satisfies Record<string, CharSpec>)

// 第5章 ピボリアの人々
Object.assign(C, {
  hyouma: { hair: 'slick', hairColor: '#3a3a4a', glasses: true, beard: 'mustache', beardColor: '#3a3a4a', outfit: 'robe', color: '#7a1a2a', accent: '#f0c040', hat: 'tophat', hatColor: '#3a0a14', hatAccent: '#f0c040' },
  kazoe: { hair: 'buzz', hairColor: '#4a3020', beard: 'stubble', eyes: 'narrow', outfit: 'armor', color: '#a08a3a', hat: 'helmet', hatAccent: '#7a1a2a', pants: '#4a4a58' },
  akina: { hair: 'bun', hairColor: '#c05a2a', eyes: 'big', blush: true, outfit: 'apron', color: '#e0903a', inner: '#fff4e0', hat: 'bandana', hatColor: '#7a1a2a' },
  zeim: { hair: 'neat', hairColor: '#5a5a6a', glasses: true, eyes: 'tired', outfit: 'suit', color: '#3a3a4a', inner: '#f0f0f0', accent: '#7a1a2a' },
  manabu: { hair: 'messy', hairColor: '#e8e8e8', glasses: true, beard: 'long', beardColor: '#f0f0f0', outfit: 'robe', color: '#2a5a3a', accent: '#f0c040', hat: 'hood', hatColor: '#1a3a2a' },
  shoukei: { hair: 'bob', hairColor: '#2a1a1a', glasses: true, outfit: 'coat', color: '#5a3a6a', inner: '#f4f0f8', accent: '#f0c040', pants: '#2a2a3a' },
  coachman: { hair: 'messy', hairColor: '#5a3a1a', beard: 'mustache', beardColor: '#5a3a1a', outfit: 'vest', color: '#5a3a1a', inner: '#e8e0cc', accent: '#c03030', hat: 'tophat', hatColor: '#2a2a2a', pants: '#3a3a44' },
  inn6: { hair: 'long', hairColor: '#c08040', eyes: 'closed', outfit: 'apron', color: '#7a1a2a', inner: '#ffffff' },
  shop6: { hair: 'neat', hairColor: '#2a2a2a', beard: 'stubble', outfit: 'leather', color: '#e8e0cc', accent: '#7a1a2a', pants: '#3a3a44', hat: 'beret', hatColor: '#7a1a2a' },
  smith6: { hair: 'buzz', hairColor: '#1a1a1a', skin: '#d89a68', beard: 'long', beardColor: '#3a2a1a', outfit: 'leather', color: '#4a3a2a', accent: '#c09040', pants: '#2a2a30' },
  noble: { hair: 'long', hairColor: '#f0d890', eyes: 'closed', blush: true, outfit: 'dress', color: '#c04a7a', inner: '#fff0f8', shoes: '#5a2a3a' },
  kid6: { hair: 'twin', hairColor: '#5a3a1a', eyes: 'big', blush: true, outfit: 'dress', color: '#3a8ab0', inner: '#ffffff' },
} satisfies Record<string, CharSpec>)

// 第6章 テキストリアの人々
Object.assign(C, {
  kakiko: { hair: 'bun', hairColor: '#2a1a1a', glasses: true, eyes: 'closed', outfit: 'robe', color: '#2a6a5a', accent: '#f0c040', hat: 'hood', hatColor: '#1a4a3a' },
  fumi: { hair: 'long', hairColor: '#3a2a1a', eyes: 'big', blush: true, outfit: 'apron', color: '#c05a7a', inner: '#ffffff' },
  kodo: { hair: 'buzz', hairColor: '#2a2a2a', beard: 'stubble', outfit: 'overalls', color: '#5a6a3a', inner: '#e8e0d0', hat: 'bandana', hatColor: '#c08030' },
  denwa: { hair: 'messy', hairColor: '#4a3a2a', glasses: true, eyes: 'tired', outfit: 'vest', color: '#3a4a6a', inner: '#f0f0f0', accent: '#c03030' },
  kanba: { hair: 'twin', hairColor: '#e07040', eyes: 'big', blush: true, outfit: 'overalls', color: '#e0a030', inner: '#fff4e0', hat: 'beret', hatColor: '#3a6ab0' },
  narabe: { hair: 'neat', hairColor: '#1a1a1a', glasses: true, outfit: 'coat', color: '#4a4a5a', inner: '#f4f4f4', accent: '#2a6a5a', pants: '#2a2a3a' },
  printer: { hair: 'messy', hairColor: '#5a5a5a', skin: '#d8a070', beard: 'mustache', beardColor: '#5a5a5a', outfit: 'apron', color: '#3a3a3a', inner: '#e8e0d0' },
  inn7: { hair: 'bob', hairColor: '#5a2a1a', eyes: 'closed', outfit: 'apron', color: '#2a6a5a', inner: '#ffffff' },
  shop7: { hair: 'neat', hairColor: '#3a2a1a', beard: 'stubble', outfit: 'leather', color: '#e8e0cc', accent: '#2a6a5a', pants: '#3a3a44', hat: 'beret', hatColor: '#2a6a5a' },
  kid7: { hair: 'spiky', hairColor: '#2a1a1a', eyes: 'big', blush: true, outfit: 'tunic', color: '#e0a030', accent: '#5a3a1a', pants: '#3a5ab0' },
} satisfies Record<string, CharSpec>)

// 第7章 コヨミノの人々
Object.assign(C, {
  tokiwa: { hair: 'bald', hairColor: '#d0d0d0', beard: 'long', beardColor: '#f0f0f0', eyes: 'closed', outfit: 'robe', color: '#5a4a8a', accent: '#f0c040' },
  hayate: { hair: 'spiky', hairColor: '#2a1a1a', skin: '#d89a68', outfit: 'tunic', color: '#3a6ab0', accent: '#f0c040', pants: '#2a2a3a', hat: 'bandana', hatColor: '#d03030' },
  nokori: { hair: 'messy', hairColor: '#6a3a1a', eyes: 'big', outfit: 'overalls', color: '#5a5a6a', inner: '#e8e0d0' },
  hare: { hair: 'twin', hairColor: '#f0a040', eyes: 'big', blush: true, outfit: 'dress', color: '#f080a8', inner: '#ffffff' },
  youbi: { hair: 'bald', hairColor: '#a0a0a0', beard: 'mustache', beardColor: '#e0e0e0', outfit: 'vest', color: '#3a7a4a', inner: '#f0e8d0', hat: 'straw', hatColor: '#e0c060' },
  tsukimi: { hair: 'long', hairColor: '#1a1a2a', glasses: true, eyes: 'closed', outfit: 'coat', color: '#2a3a6a', inner: '#f4f4f4', accent: '#e0c050' },
  clockman: { hair: 'neat', hairColor: '#8a8a8a', glasses: true, beard: 'mustache', beardColor: '#8a8a8a', outfit: 'vest', color: '#6a4a2a', inner: '#f0e8d0', accent: '#e0b040' },
  inn8: { hair: 'bun', hairColor: '#3a2a1a', eyes: 'closed', outfit: 'apron', color: '#5a4a8a', inner: '#ffffff' },
  shop8: { hair: 'neat', hairColor: '#2a1a1a', beard: 'stubble', outfit: 'leather', color: '#e8e0cc', accent: '#5a4a8a', pants: '#3a3a44', hat: 'beret', hatColor: '#5a4a8a' },
  kid8: { hair: 'bob', hairColor: '#3a2a1a', eyes: 'big', blush: true, outfit: 'tunic', color: '#3aa07a', accent: '#5a3a1a', pants: '#4a4a58' },
} satisfies Record<string, CharSpec>)

// 最終章 ホープの人々
Object.assign(C, {
  ganbaru: { hair: 'buzz', hairColor: '#8a8a8a', beard: 'long', beardColor: '#b0b0b0', eyes: 'narrow', outfit: 'armor', color: '#7a6a3a', hat: 'helmet', hatAccent: '#c03030', pants: '#3a3a44' },
  warizan: { hair: 'spiky', hairColor: '#4a3020', beard: 'stubble', outfit: 'apron', color: '#6a5a3a', inner: '#e8e0d0' },
  miharu: { hair: 'long', hairColor: '#3a2a4a', eyes: 'narrow', outfit: 'armor', color: '#3a5a7a', hat: 'helmet', hatAccent: '#e0b040', pants: '#3a3a4a' },
  kakumisu: { hair: 'messy', hairColor: '#5a3a2a', glasses: true, eyes: 'tired', outfit: 'tunic', color: '#5a6a8a', accent: '#3a2a1a', pants: '#3a3a44' },
  tsunagi: { hair: 'bob', hairColor: '#c06a3a', eyes: 'big', outfit: 'coat', color: '#3a6a4a', inner: '#f0e8d8', accent: '#e0b040', hat: 'beret', hatColor: '#3a4a2a' },
  matome: { hair: 'slick', hairColor: '#2a2a2a', beard: 'mustache', beardColor: '#2a2a2a', outfit: 'armor', color: '#4a4a6a', hat: 'helmet', hatAccent: '#3a64c0', pants: '#2a2a3a' },
  inn9: { hair: 'bun', hairColor: '#6a4a2a', eyes: 'closed', outfit: 'apron', color: '#7a3a3a', inner: '#ffffff' },
  shop9: { hair: 'neat', hairColor: '#2a2a2a', beard: 'stubble', outfit: 'leather', color: '#e8e0cc', accent: '#7a3a3a', pants: '#3a3a44', hat: 'beret', hatColor: '#7a3a3a' },
  soldier9: { hair: 'neat', hairColor: '#3a2a1a', outfit: 'armor', color: '#5a5a6a', hat: 'helmet', hatAccent: '#c03030', pants: '#3a3a44' },
} satisfies Record<string, CharSpec>)

const inn = (id: string, x: number, y: number, look: CharSpec): NpcDef => ({ id, x, y, name: '宿屋', look, kind: 'inn' })
const church = (id: string, x: number, y: number): NpcDef => ({ id, x, y, name: '神父', look: C.priest, kind: 'church' })
const shop = (id: string, x: number, y: number, look: CharSpec): NpcDef => ({ id, x, y, name: '道具屋', look, kind: 'shop' })

// ================================================================ セルノ
function celunoTiles() {
  const m = blank(30, 24)
  forest(m)
  rect(m, 'M', 1, 1, 28, 3)
  m[1][15] = 'K'
  rect(m, '.', 14, 2, 3, 1)
  rect(m, 'Z', 14, 3, 3, 1)
  rect(m, '=', 15, 4, 1, 19)
  building(m, 3, 5, 6, { roof: 'N', upper: true, winUpper: [1, 4], winLower: [1, 4], door: 2 })
  building(m, 20, 5, 6, { roof: 'R', upper: true, winUpper: [1, 4], winLower: [4], door: 2, sign: [3, '1'] })
  building(m, 3, 16, 5, { roof: 'U', cross: true, stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  building(m, 21, 16, 5, { roof: 'E', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '2'] })
  building(m, 9, 17, 4, { roof: 'Q', winLower: [1], door: 2 })
  building(m, 10, 5, 4, { roof: 'U', upper: true, winUpper: [0, 3], winLower: [3], door: 1, sign: [2, '3'] })
  building(m, 16, 5, 4, { roof: 'N', upper: true, winUpper: [0, 3], winLower: [3], door: 1, sign: [2, '8'] })
  building(m, 17, 17, 4, { roof: 'R', winLower: [2], door: 1 })
  rect(m, '=', 5, 9, 10, 1)
  rect(m, '=', 16, 9, 7, 1)
  rect(m, '=', 5, 20, 10, 1)
  rect(m, '=', 16, 20, 8, 1)
  rect(m, 'T', 12, 11, 7, 5)
  m[13][15] = 'P'
  put(m, 'L', [[12, 11], [18, 11], [12, 15], [18, 15]])
  rect(m, '=', 19, 13, 11, 1)
  rect(m, '=', 9, 13, 3, 1)
  fenceRect(m, 2, 11, 7, 5)
  m[13][8] = '='
  m[12][3] = 'h'
  m[14][3] = 'h'
  rect(m, 'k', 1, 21, 4, 2)
  rect(m, '~', 24, 21, 4, 2)
  put(m, 'S', [[14, 4], [21, 12]])
  put(m, 'x', [[21, 14]])
  put(m, 'o', [[22, 14]])
  put(m, 'L', [[23, 12], [27, 14]])
  put(m, 'p', [[3, 9], [24, 9], [2, 20]])
  put(m, 'n', [[13, 16], [17, 16]])
  put(m, '#', [[9, 6], [27, 16], [13, 18], [8, 21], [20, 22], [1, 17]])
  put(m, 'Y', [[27, 5], [28, 7], [1, 10], [28, 17], [1, 20], [28, 10]])
  put(m, 'b', [[16, 17], [13, 22], [18, 22], [10, 10], [26, 10]])
  put(m, 'r', [[11, 4], [19, 4]])
  sprinkle(m, 3, 4)
  return done(m)
}

// ================================================================ カルキュレ
function calculetTiles() {
  const m = blank(34, 31)
  forest(m)
  rect(m, 'M', 1, 1, 32, 6)
  rect(m, 'X', 12, 1, 7, 1)
  rect(m, 'V', 12, 2, 7, 3)
  put(m, 'v', [[13, 2], [17, 2], [13, 3], [17, 3], [15, 2]])
  m[4][15] = 'd'
  rect(m, '.', 14, 5, 3, 1)
  rect(m, 'Z', 14, 6, 3, 1)
  // 大通り（南北）と東西の道
  rect(m, 'T', 14, 7, 3, 14)
  rect(m, 'T', 0, 11, 34, 3)
  rect(m, 'T', 1, 19, 32, 1)
  building(m, 2, 7, 5, { roof: 'R', upper: true, winUpper: [1, 3], winLower: [1], door: 2, sign: [3, '3'] })
  building(m, 7, 7, 5, { roof: 'N', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '4'] })
  building(m, 19, 7, 6, { roof: 'U', stone: true, upper: true, winUpper: [0, 2, 3, 5], winLower: [0, 5], door: 2, sign: [3, '5'] })
  building(m, 26, 7, 6, { roof: 'Q', stone: true, upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '6'] })
  building(m, 1, 15, 6, { roof: 'R', upper: true, winUpper: [1, 4], winLower: [4], door: 2, sign: [3, '1'] })
  building(m, 7, 15, 5, { roof: 'U', cross: true, stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  building(m, 20, 15, 5, { roof: 'E', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '2'] })
  building(m, 26, 15, 5, { roof: 'N', upper: true, winUpper: [1, 3], winLower: [1, 4], door: 2 })
  // 噴水広場
  rect(m, 'T', 12, 11, 7, 6)
  rect(m, 'u', 14, 12, 3, 3)
  m[13][15] = 'f'
  // 屋台（運河の南の 市場通り）
  put(m, 'A', [[21, 25], [22, 25], [27, 25], [28, 25]])
  put(m, 'm', [[21, 26], [22, 26], [27, 26], [28, 26]])
  // 運河と橋
  rect(m, '~', 1, 21, 32, 2)
  rect(m, 'B', 14, 21, 3, 2)
  // 運河の南の区画
  rect(m, 'T', 14, 23, 3, 5)
  rect(m, 'T', 1, 28, 32, 1)
  building(m, 3, 24, 5, { roof: 'E', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '8'] })
  // 飾り
  put(m, 'S', [[12, 7]])
  put(m, 'L', [[13, 7], [17, 7], [3, 14], [9, 14], [21, 14], [27, 14], [5, 20], [11, 20], [19, 20], [25, 20]])
  put(m, 'p', [[6, 14], [24, 14], [12, 10], [18, 10], [1, 14], [32, 14]])
  put(m, 'n', [[8, 20], [22, 20], [20, 25]])
  put(m, 'a', [[6, 11]])
  put(m, 'o', [[25, 10], [32, 13]])
  put(m, 'x', [[32, 11]])
  put(m, '#', [[10, 25], [11, 26], [27, 24], [30, 23], [19, 26], [31, 27], [24, 26], [32, 16], [25, 17]])
  put(m, 'Y', [[1, 23], [32, 24], [12, 24], [9, 26], [32, 8]])
  put(m, 'b', [[23, 23], [18, 24], [26, 27], [25, 9]])
  put(m, 'L', [[10, 27], [20, 27]])
  m[11][33] = '#'
  m[13][33] = '#'
  sprinkle(m, 7, 7)
  return done(m)
}

// ================================================================ 鏡の町 サンショウ（左右対称の町）
function sanshoTiles() {
  const m = blank(33, 30)
  forest(m)
  rect(m, 'M', 1, 1, 31, 6)
  // 北の 鏡の神殿
  rect(m, 'X', 12, 1, 9, 1)
  rect(m, 'V', 12, 2, 9, 3)
  put(m, 'v', [[13, 2], [19, 2], [13, 3], [19, 3], [16, 2]])
  m[4][16] = 'd'
  rect(m, '.', 15, 5, 3, 1)
  rect(m, 'Z', 15, 6, 3, 1)
  // 大通り（南北）と 東西の道
  rect(m, 'T', 15, 7, 3, 22)
  rect(m, 'T', 0, 12, 32, 3)
  // 中央広場
  rect(m, 'T', 13, 10, 7, 9)
  // 北の並び（左右対称）
  building(m, 2, 7, 6, { roof: 'Q', stone: true, upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '6'] })
  building(m, 8, 7, 5, { roof: 'U', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '3'] })
  building(m, 20, 7, 5, { roof: 'U', upper: true, winUpper: [1, 3], winLower: [0], door: 2, sign: [3, '8'] })
  building(m, 25, 7, 6, { roof: 'Q', upper: true, winUpper: [1, 4], winLower: [0, 5], door: 3, sign: [2, '1'] })
  // 南の並び
  building(m, 2, 15, 5, { roof: 'U', cross: true, stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  building(m, 8, 15, 5, { roof: 'E', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '2'] })
  building(m, 20, 15, 5, { roof: 'E', stone: true, upper: true, winUpper: [1, 3], winLower: [0], door: 2, sign: [3, '9'] })
  building(m, 26, 15, 5, { roof: 'R', upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  // 鏡の湖と 橋
  rect(m, '~', 2, 21, 29, 3)
  rect(m, 'B', 15, 21, 3, 3)
  // 湖の南：市場と 寺子屋
  building(m, 3, 24, 6, { roof: 'N', winLower: [1, 4], door: 2, sign: [3, '5'] })
  building(m, 24, 24, 6, { roof: 'R', winLower: [1, 4], door: 3 })
  rect(m, 'T', 4, 27, 25, 1)
  put(m, 'A', [[11, 24], [12, 24], [20, 24], [21, 24]])
  put(m, 'm', [[11, 25], [12, 25], [20, 25], [21, 25]])
  put(m, ',', [[22, 25], [23, 25], [22, 26], [19, 26], [10, 26], [23, 28], [22, 28], [9, 25]])
  // 飾り（左右対称に）
  put(m, 'S', [[14, 7]])
  put(m, 'L', [[13, 10], [19, 10], [13, 18], [19, 18], [14, 20], [18, 20], [14, 24], [18, 24]])
  put(m, 'p', [[13, 11], [19, 11], [1, 11], [31, 11]])
  put(m, 'b', [[13, 8], [19, 8], [7, 11], [25, 11], [1, 20], [31, 20]])
  put(m, '#', [[13, 7], [1, 15], [31, 15], [1, 25], [31, 25], [9, 28], [23, 28]])
  put(m, 'Y', [[19, 7], [1, 17], [31, 17], [2, 28], [30, 28]])
  put(m, 'n', [[11, 20], [21, 20]])
  m[12][32] = '#'
  m[14][32] = '#'
  sprinkle(m, 11, 7)
  return done(m)
}

const TEMPLE1 = [
  'GGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGG',
  'GGiiiiiGGGi{iGGGiiiiiGG',
  'GGiiiiiGGGiiiGGGiiiiiGG',
  'GGsiiiiGGGiiiGGGiiiisGG',
  'GGGGiGGGGGG(GGGGGGiGGGG',
  'GGiiiiiiiiiiiiiiiiiiiGG',
  'GGisiiiiiLiiiLiiiiisiGG',
  'GGiiiiiiiiiiiiiiiiiiiGG',
  'GGiiiiiiiiiiiiiiiiiiiGG',
  'GGGGGGGGGGG(GGGGGGGGGGG',
  'GGiiiiiiiiiiiiiiiiiiiGG',
  'GGisiiiiiiiiiiiiiiisiGG',
  'GGiiiiiLiiiiiiiLiiiiiGG',
  'GGiiiiiiiiiiiiiiiiiiiGG',
  'GGGGGGGGGGG>GGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGG',
]
const TEMPLE2 = [
  'GGGGGGGGGGGGGGGGGGG',
  'GGiiiiiiiiiiiiiiiGG',
  'GGsiiiiiiiiiiiiisGG',
  'GGiiiiiLiiiLiiiiiGG',
  'GGiiiiiiiiiiiiiiiGG',
  'GGGGGGGGG(GGGGGGGGG',
  'GGiiiiiiiiiiiiiiiGG',
  'GGiiiiiiiiiiiiiiiGG',
  'GGsiiiiiiiiiiiiisGG',
  'GGiiiiiiiiiiiiiiiGG',
  'GGiiiiiii}iiiiiiiGG',
  'GGGGGGGGGGGGGGGGGGG',
]

const templeEnemies = () => ['kagamin', 'zuredori', 'kagamin']
const TEMPLE_RATE = 1 / 32

// ================================================================ 条件の港町 イフポート
function ifportTiles() {
  const m = blank(34, 32)
  forest(m)
  rect(m, '~', 0, 24, 34, 8)
  // 北の入口から 港へ 下る 大通り、東西の通り、岸壁
  rect(m, 'T', 16, 0, 2, 24)
  rect(m, 'T', 1, 7, 32, 2)
  rect(m, 'T', 1, 15, 32, 2)
  rect(m, 'T', 1, 22, 32, 2)
  // 北の並び
  building(m, 2, 2, 6, { roof: 'U', stone: true, upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '6'] })
  building(m, 9, 2, 5, { roof: 'R', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '3'] })
  building(m, 20, 2, 5, { roof: 'E', upper: true, winUpper: [1, 3], winLower: [0], door: 2, sign: [3, '8'] })
  building(m, 26, 2, 6, { roof: 'N', upper: true, winUpper: [1, 4], winLower: [0, 5], door: 3, sign: [2, '1'] })
  // 中の並び
  building(m, 2, 10, 5, { roof: 'U', cross: true, stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  building(m, 8, 10, 5, { roof: 'E', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '2'] })
  building(m, 20, 10, 6, { roof: 'Q', upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '5'] })
  building(m, 27, 10, 5, { roof: 'R', upper: true, winUpper: [1, 3], winLower: [0, 4], door: 2 })
  // 海辺の並び
  building(m, 2, 18, 5, { roof: 'N', winLower: [1, 3], door: 2 })
  building(m, 8, 18, 5, { roof: 'U', winLower: [1, 4], door: 2 })
  building(m, 26, 18, 6, { roof: 'E', winLower: [1, 5], door: 3 })
  // 魚市場の 屋台
  put(m, 'A', [[19, 18], [20, 18], [22, 18], [23, 18]])
  put(m, 'm', [[19, 19], [20, 19], [22, 19], [23, 19]])
  // 灯台（岸壁の 西の はし）
  m[21][1] = 'Λ'
  m[22][1] = 'Π'
  // 桟橋
  rect(m, 'B', 16, 24, 2, 4)
  rect(m, 'B', 21, 24, 1, 4)
  // 幽霊船（桟橋の 東に 停泊）
  rect(m, ')', 22, 25, 10, 6)
  rect(m, ';', 23, 26, 8, 4)
  m[27][22] = 'Z'
  m[27][26] = ']'
  m[28][28] = '}'
  put(m, 'x', [[23, 26], [30, 29]])
  put(m, 'o', [[30, 26]])
  // 飾り
  put(m, 'S', [[21, 21]])
  put(m, 'L', [[15, 3], [18, 3], [15, 11], [18, 11], [15, 19], [18, 21], [7, 21], [25, 21]])
  put(m, 'x', [[13, 21], [14, 21], [24, 20], [31, 21]])
  put(m, 'o', [[12, 21], [32, 21]])
  put(m, 'p', [[8, 6], [25, 6], [7, 14], [26, 14], [1, 6], [32, 6]])
  put(m, 'n', [[12, 17], [21, 17]])
  put(m, 'b', [[14, 5], [19, 5], [14, 13], [19, 13]])
  put(m, '#', [[1, 12], [32, 12], [1, 18], [32, 17]])
  put(m, 'Y', [[1, 3], [32, 3], [7, 18]])
  sprinkle(m, 17, 1)
  return done(m)
}

function ship1Tiles() {
  const m: M = Array.from({ length: 15 }, () => Array(21).fill(')'))
  rect(m, ';', 2, 10, 17, 3)
  m[13][10] = '>'
  m[9][10] = '('
  rect(m, ';', 2, 5, 17, 4)
  rect(m, ';', 2, 1, 5, 3)
  m[4][4] = ';'
  rect(m, ';', 14, 1, 5, 3)
  m[4][16] = ';'
  rect(m, ';', 9, 1, 3, 3)
  m[4][10] = '('
  m[1][10] = '{'
  put(m, 'x', [[2, 10], [18, 12], [2, 8], [18, 5], [6, 3]])
  put(m, 'o', [[3, 10], [17, 12], [14, 3]])
  put(m, ']', [[6, 6], [14, 6]])
  return done(m)
}

function ship2Tiles() {
  const m: M = Array.from({ length: 11 }, () => Array(17).fill(')'))
  rect(m, ';', 2, 1, 13, 3)
  m[4][8] = '('
  rect(m, ';', 2, 5, 13, 4)
  m[9][8] = '}'
  put(m, 'x', [[2, 1], [14, 1], [2, 8], [14, 8]])
  put(m, 'o', [[3, 1], [13, 1]])
  return done(m)
}

const shipEnemies = () => ['jelly', 'crab', 'jelly']
const SHIP_RATE = 1 / 32

// ================================================================ 検索の城下町 ルックアップ
function lookupTiles() {
  const m = blank(34, 30)
  forest(m)
  rect(m, 'M', 1, 1, 32, 5)
  // 北の城（大書庫の 入口）
  rect(m, 'X', 10, 1, 14, 1)
  rect(m, 'V', 10, 2, 14, 3)
  put(m, 'v', [[11, 2], [13, 2], [20, 2], [22, 2], [11, 3], [22, 3], [16, 2]])
  m[4][16] = 'd'
  rect(m, '.', 15, 5, 3, 1)
  rect(m, 'Z', 15, 6, 3, 1)
  // 大通りと 東西の 通り、岸壁
  rect(m, 'T', 15, 7, 3, 17)
  rect(m, 'T', 1, 11, 32, 2)
  rect(m, 'T', 1, 19, 32, 2)
  rect(m, 'T', 1, 22, 32, 2)
  // 北の並び
  building(m, 2, 7, 6, { roof: 'Q', stone: true, upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '6'] })
  building(m, 9, 7, 5, { roof: 'R', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '3'] })
  building(m, 20, 7, 5, { roof: 'N', upper: true, winUpper: [1, 3], winLower: [0], door: 2, sign: [3, '8'] })
  building(m, 26, 7, 6, { roof: 'E', upper: true, winUpper: [1, 4], winLower: [0, 5], door: 3, sign: [2, '1'] })
  // 南の並び
  building(m, 2, 15, 5, { roof: 'U', cross: true, stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  building(m, 8, 15, 5, { roof: 'E', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '2'] })
  building(m, 20, 15, 6, { roof: 'Q', stone: true, upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '5'] })
  building(m, 27, 15, 5, { roof: 'U', upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  // 港と 定期船
  rect(m, '~', 0, 24, 34, 6)
  rect(m, 'B', 16, 24, 2, 3)
  rect(m, ')', 19, 25, 8, 4)
  rect(m, ';', 20, 26, 6, 2)
  m[26][22] = ']'
  put(m, 'x', [[20, 26], [25, 27]])
  // 市場と 飾り
  put(m, 'A', [[9, 21], [10, 21], [23, 21], [24, 21]])
  put(m, 'S', [[14, 7]])
  put(m, 'L', [[14, 10], [18, 10], [14, 18], [18, 18], [14, 21], [18, 21], [7, 13], [26, 13]])
  put(m, 'p', [[1, 10], [32, 10], [8, 14], [25, 14], [1, 18], [32, 18]])
  put(m, 'b', [[19, 7], [19, 8], [25, 13], [8, 13], [1, 21], [32, 21]])
  put(m, 'n', [[12, 13], [21, 13]])
  sprinkle(m, 23, 7)
  return done(m)
}

const LIBRARY1 = [
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[:::::[[:{:[[:::::[[[',
  '[[:::::[[:::[[:::::[[[',
  '[[[[:[[[[[([[[[[:[[[[[',
  '[[:::::::::::::::::[[[',
  '[[:L:::::::::::::L:[[[',
  '[[:::[[[[:::[[[[:::[[[',
  '[[:::::::::::::::::[[[',
  '[[[[[[[[[[([[[[[[[[[[[',
  '[[:::::::::::::::::[[[',
  '[[:L:::::::::::::L:[[[',
  '[[:::::::::::::::::[[[',
  '[[[[[[[[[[-[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
]
const LIBRARY2 = [
  '[[[[[[[[[[[[[[[[[[',
  '[::::::::::::::::[',
  '[::L::::::::::L::[',
  '[::::::::::::::::[',
  '[::::::::::::::::[',
  '[[[[[[[[([[[[[[[[[',
  '[::::::::::::::::[',
  '[::::::::::::::::[',
  '[:::::::}::::::::[',
  '[[[[[[[[[[[[[[[[[[',
]
const libraryEnemies = () => ['nainai', 'shiori', 'nainai']
const LIBRARY_RATE = 1 / 32

// ================================================================ 集計の王都 ピボリア
function pivoriaTiles() {
  const m = blank(34, 30)
  forest(m)
  rect(m, 'M', 1, 1, 32, 5)
  // 北の 王宮（宝物庫の 入口）
  rect(m, 'X', 9, 1, 16, 1)
  rect(m, 'V', 9, 2, 16, 3)
  put(m, 'v', [[10, 2], [12, 2], [14, 2], [19, 2], [21, 2], [23, 2], [10, 3], [12, 3], [21, 3], [23, 3], [16, 2], [17, 2]])
  m[4][16] = 'd'
  rect(m, '.', 15, 5, 3, 1)
  rect(m, 'Z', 15, 6, 3, 1)
  // 大通りと 東西の 通り
  rect(m, 'T', 15, 7, 3, 21)
  rect(m, 'T', 1, 11, 32, 2)
  rect(m, 'T', 1, 19, 32, 2)
  rect(m, 'T', 1, 22, 32, 2)
  // 噴水広場
  rect(m, 'T', 13, 13, 7, 6)
  rect(m, 'u', 15, 14, 3, 3)
  m[15][16] = 'f'
  // 北の並び
  building(m, 2, 7, 6, { roof: 'Q', stone: true, upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '6'] })
  building(m, 9, 7, 5, { roof: 'R', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '3'] })
  building(m, 19, 7, 5, { roof: 'N', upper: true, winUpper: [1, 3], winLower: [0], door: 2, sign: [3, '8'] })
  building(m, 26, 7, 6, { roof: 'E', upper: true, winUpper: [1, 4], winLower: [0, 5], door: 3, sign: [2, '1'] })
  // 南の並び
  building(m, 2, 15, 5, { roof: 'U', cross: true, stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  building(m, 8, 15, 5, { roof: 'E', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '2'] })
  building(m, 20, 15, 6, { roof: 'Q', stone: true, upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '5'] })
  building(m, 27, 15, 5, { roof: 'R', stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  // 市場と 飾り
  put(m, 'A', [[9, 21], [10, 21], [11, 21], [22, 21], [23, 21], [24, 21]])
  put(m, 'S', [[14, 7]])
  put(m, 'L', [[14, 10], [18, 10], [12, 13], [20, 13], [14, 24], [18, 24], [7, 13], [26, 13]])
  put(m, 'p', [[1, 10], [32, 10], [8, 14], [25, 14], [1, 18], [32, 18], [13, 21], [19, 21]])
  put(m, 'b', [[18, 7], [25, 13], [8, 13], [1, 21], [32, 21], [12, 26], [20, 26]])
  put(m, 'n', [[13, 17], [19, 17]])
  sprinkle(m, 29, 7)
  return done(m)
}

const TREASURY1 = [
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[::::[[[[{[[[[::::[[[',
  '[[::::[[[:::[[[::::[[[',
  '[[[:[[[[[[([[[[[[:[[[[',
  '[[:::::::::::::::::[[[',
  '[[:L::[[[:::[[[::L:[[[',
  '[[:::::::::::::::::[[[',
  '[[::[[[[[:::[[[[[::[[[',
  '[[[[[[[[[[([[[[[[[[[[[',
  '[[:::::::::::::::::[[[',
  '[[:L:::::::::::::L:[[[',
  '[[:::::::::::::::::[[[',
  '[[[[[[[[[[-[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
]
const TREASURY2 = [
  '[[[[[[[[[[[[[[[[[[',
  '[::::::::::::::::[',
  '[:L::::::::::::L:[',
  '[::::::::::::::::[',
  '[::L::::::::::L::[',
  '[[[[[[[[([[[[[[[[[',
  '[::::::::::::::::[',
  '[::::::::::::::::[',
  '[:::::::}::::::::[',
  '[[[[[[[[[[[[[[[[[[',
]
const treasuryEnemies = () => ['dupli', 'chirakari', 'dupli']
const TREASURY_RATE = 1 / 32

// ================================================================ 文字の宿場町 テキストリア
function textriaTiles() {
  const m = blank(34, 28)
  forest(m)
  rect(m, 'M', 1, 1, 32, 4)
  // 北の 活版印刷所（ダンジョンの 入口）
  rect(m, 'X', 11, 1, 12, 1)
  rect(m, 'V', 11, 2, 12, 3)
  put(m, 'v', [[12, 2], [14, 2], [19, 2], [21, 2], [12, 3], [21, 3]])
  m[4][16] = 'd'
  rect(m, '.', 15, 5, 3, 1)
  rect(m, 'Z', 15, 6, 3, 1)
  // 南北の 道と、宿場の 大通り
  rect(m, 'T', 15, 7, 3, 20)
  rect(m, 'T', 1, 12, 32, 3)
  rect(m, 'T', 1, 21, 32, 2)
  // 北の並び
  building(m, 2, 7, 6, { roof: 'N', upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '6'] })
  building(m, 9, 7, 5, { roof: 'R', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '3'] })
  building(m, 19, 7, 5, { roof: 'E', upper: true, winUpper: [1, 3], winLower: [0], door: 2, sign: [3, '8'] })
  building(m, 26, 7, 6, { roof: 'Q', upper: true, winUpper: [1, 4], winLower: [0, 5], door: 3, sign: [2, '1'] })
  // 南の並び
  building(m, 2, 16, 5, { roof: 'U', cross: true, stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  building(m, 8, 16, 5, { roof: 'N', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '2'] })
  building(m, 20, 16, 6, { roof: 'R', stone: true, upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '5'] })
  building(m, 27, 16, 5, { roof: 'E', stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  // 市場と 飾り
  put(m, 'A', [[8, 24], [9, 24], [10, 24], [22, 24], [23, 24], [24, 24]])
  put(m, 'S', [[14, 7]])
  put(m, 'L', [[14, 11], [18, 11], [7, 15], [26, 15], [14, 20], [18, 20], [14, 24], [18, 24]])
  put(m, 'p', [[1, 11], [32, 11], [1, 15], [32, 15], [13, 23], [19, 23]])
  put(m, 'b', [[18, 7], [8, 11], [25, 11], [1, 24], [32, 24], [12, 26], [20, 26]])
  put(m, 'n', [[11, 15], [22, 15]])
  sprinkle(m, 41, 7)
  return done(m)
}

const PRINT1 = [
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[:::[[[[[{[[[[[:::[[[',
  '[[:::[[[[:::[[[[:::[[[',
  '[[[:[[[[[[([[[[[[:[[[[',
  '[[:::::::::::::::::[[[',
  '[[::[[:L:::::L:[[::[[[',
  '[[::[[:::::::::[[::[[[',
  '[[:::::::::::::::::[[[',
  '[[[[[[[[[[([[[[[[[[[[[',
  '[[:::::::::::::::::[[[',
  '[[:L::[[[:::[[[::L:[[[',
  '[[:::::::::::::::::[[[',
  '[[[[[[[[[[-[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
]
const PRINT2 = [
  '[[[[[[[[[[[[[[[[[[',
  '[::::::::::::::::[',
  '[:L::::::::::::L:[',
  '[::::::::::::::::[',
  '[[[[[[[[([[[[[[[[[',
  '[::::::::::::::::[',
  '[::L::::::::::L::[',
  '[::::::::::::::::[',
  '[:::::::}::::::::[',
  '[[[[[[[[[[[[[[[[[[',
]
const printEnemies = () => ['kuuhaku', 'kirehashi', 'kuuhaku']
const PRINT_RATE = 1 / 32

// ================================================================ 暦の里 コヨミノ
function koyomiTiles() {
  const m = blank(34, 28)
  forest(m)
  rect(m, 'M', 1, 1, 32, 4)
  // 北の 時計塔（ダンジョンの 入口）
  rect(m, 'X', 13, 1, 8, 1)
  rect(m, 'V', 13, 2, 8, 3)
  put(m, 'v', [[14, 2], [19, 2], [14, 3], [19, 3], [16, 2], [17, 2]])
  m[4][16] = 'd'
  rect(m, '.', 15, 5, 3, 1)
  rect(m, 'Z', 15, 6, 3, 1)
  // 道と 広場
  rect(m, 'T', 15, 7, 3, 20)
  rect(m, 'T', 1, 12, 32, 2)
  rect(m, 'T', 1, 21, 32, 2)
  rect(m, 'T', 12, 14, 9, 5)
  rect(m, 'u', 15, 15, 3, 3)
  m[16][16] = 'f'
  // 北の並び
  building(m, 2, 7, 6, { roof: 'Q', stone: true, upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '6'] })
  building(m, 9, 7, 5, { roof: 'E', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '3'] })
  building(m, 19, 7, 5, { roof: 'R', upper: true, winUpper: [1, 3], winLower: [0], door: 2, sign: [3, '8'] })
  building(m, 26, 7, 6, { roof: 'N', upper: true, winUpper: [1, 4], winLower: [0, 5], door: 3, sign: [2, '1'] })
  // 南の並び
  building(m, 2, 16, 5, { roof: 'U', cross: true, stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  building(m, 7, 16, 5, { roof: 'R', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '2'] })
  building(m, 22, 16, 5, { roof: 'Q', stone: true, upper: true, winUpper: [1, 3], winLower: [0, 4], door: 2, sign: [3, '5'] })
  building(m, 28, 16, 5, { roof: 'E', upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  // 市場と 飾り
  put(m, 'A', [[5, 24], [6, 24], [7, 24], [25, 24], [26, 24], [27, 24]])
  put(m, 'S', [[14, 7]])
  put(m, 'L', [[14, 11], [18, 11], [7, 14], [26, 14], [14, 24], [18, 24]])
  put(m, 'p', [[1, 11], [32, 11], [12, 19], [20, 19], [13, 23], [19, 23]])
  put(m, 'b', [[18, 7], [8, 11], [25, 11], [1, 24], [32, 24], [11, 26], [21, 26]])
  put(m, 'n', [[13, 18], [19, 18]])
  sprinkle(m, 53, 7)
  return done(m)
}

const CLOCK1 = [
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[:::::[[[{[[[:::::[[[',
  '[[:::::[[:::[[:::::[[[',
  '[[[[[:[[[[([[[[:[[[[[[',
  '[[:::::::::::::::::[[[',
  '[[:L:[[[:::::[[[:L:[[[',
  '[[:::[[[:::::[[[:::[[[',
  '[[:::::::::::::::::[[[',
  '[[[[[[[[[[([[[[[[[[[[[',
  '[[:::::::::::::::::[[[',
  '[[:::L:::::::::L:::[[[',
  '[[:::::::::::::::::[[[',
  '[[[[[[[[[[-[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
]
const CLOCK2 = [
  '[[[[[[[[[[[[[[[[[[',
  '[::::::::::::::::[',
  '[::L::::::::::L::[',
  '[::::::::::::::::[',
  '[[[[[[[[([[[[[[[[[',
  '[::::::::::::::::[',
  '[:L::::::::::::L:[',
  '[::::::::::::::::[',
  '[:::::::}::::::::[',
  '[[[[[[[[[[[[[[[[[[',
]
const clockEnemies = () => ['karendaru', 'tokeidori', 'karendaru']
const CLOCK_RATE = 1 / 32

// ================================================================ 最果ての砦 ホープ
function hopeTiles() {
  const m = blank(34, 28)
  forest(m)
  rect(m, 'M', 1, 1, 32, 4)
  // 北の 魔王城の 門
  rect(m, 'X', 10, 1, 14, 1)
  rect(m, 'V', 10, 2, 14, 3)
  put(m, 'v', [[11, 2], [13, 2], [20, 2], [22, 2], [11, 3], [22, 3], [15, 2], [18, 2]])
  m[4][16] = 'd'
  rect(m, '.', 15, 5, 3, 1)
  rect(m, 'Z', 15, 6, 3, 1)
  // 砦の 道
  rect(m, 'T', 15, 7, 3, 20)
  rect(m, 'T', 1, 12, 32, 2)
  rect(m, 'T', 1, 21, 32, 2)
  // 北の並び
  building(m, 2, 7, 6, { roof: 'Q', stone: true, upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '6'] })
  building(m, 9, 7, 5, { roof: 'R', stone: true, upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '3'] })
  building(m, 19, 7, 5, { roof: 'U', stone: true, upper: true, winUpper: [1, 3], winLower: [0], door: 2, sign: [3, '8'] })
  building(m, 26, 7, 6, { roof: 'E', upper: true, winUpper: [1, 4], winLower: [0, 5], door: 3, sign: [2, '1'] })
  // 南の並び
  building(m, 2, 16, 5, { roof: 'U', cross: true, stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  building(m, 8, 16, 5, { roof: 'N', upper: true, winUpper: [1, 3], winLower: [4], door: 2, sign: [1, '2'] })
  building(m, 20, 16, 6, { roof: 'R', stone: true, upper: true, winUpper: [1, 4], winLower: [0, 5], door: 2, sign: [3, '5'] })
  building(m, 27, 16, 5, { roof: 'Q', stone: true, upper: true, winUpper: [1, 3], winLower: [1, 3], door: 2 })
  // 野営と 飾り
  put(m, 'A', [[7, 24], [8, 24], [24, 24], [25, 24]])
  put(m, 'S', [[14, 7]])
  put(m, 'L', [[14, 11], [18, 11], [7, 14], [26, 14], [14, 20], [18, 20], [14, 24], [18, 24]])
  put(m, 'p', [[1, 11], [32, 11], [12, 23], [20, 23]])
  put(m, 'b', [[18, 7], [8, 11], [25, 11], [1, 24], [32, 24], [11, 26], [21, 26]])
  put(m, 'n', [[11, 14], [22, 14]])
  sprinkle(m, 67, 7)
  return done(m)
}

const CASTLE1 = [
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[:::[[[[[{[[[[[:::[[[',
  '[[:::[[[[:::[[[[:::[[[',
  '[[[:[[[[[[([[[[[[:[[[[',
  '[[:::::[[:::[[:::::[[[',
  '[[:L:::::::::::::L:[[[',
  '[[:::::[[:::[[:::::[[[',
  '[[[[:[[[[:::[[[[:[[[[[',
  '[[:::::::::(::::::::[[',
  '[[:::::::::::::::::::[',
  '[[:L:::[[[:::[[[:::L:[',
  '[[::::::::::::::::::[[',
  '[[[[[[[[[[-[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
]
const CASTLE2 = [
  '[[[[[[[[[[[[[[[[[[',
  '[::::::::::::::::[',
  '[:L::::::::::::L:[',
  '[::::::::::::::::[',
  '[[[[[[[[([[[[[[[[[',
  '[::::::::::::::::[',
  '[:L::::::::::::L:[',
  '[::::::::::::::::[',
  '[:::::::}::::::::[',
  '[[[[[[[[[[[[[[[[[[',
]
const castleEnemies = () => ['zerowarin', 'nanashi', 'zerowarin']
const CASTLE_RATE = 1 / 30

// ================================================================ はじまりの森
function forestTiles() {
  const m = blank(22, 16)
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 22; x++) if (x < 2 || y < 2 || x > 19 || y > 13) m[y][x] = hash(x, y, 5) < 0.5 ? '#' : 'Y'
  // 目覚める広場と、東へ抜ける小道以外は うっそうとした森
  const open = (x: number, y: number) =>
    (x >= 3 && x <= 8 && y >= 6 && y <= 12) || (y >= 8 && y <= 10 && x >= 8) || (x >= 3 && x <= 6 && y >= 2 && y <= 5)
  for (let y = 2; y < 14; y++)
    for (let x = 2; x < 20; x++) {
      if (open(x, y)) continue
      const r = hash(x, y, 13)
      m[y][x] = r < 0.42 ? '#' : r < 0.72 ? 'Y' : r < 0.8 ? 'b' : '"'
    }
  rect(m, '=', 8, 9, 14, 1)
  rect(m, '~', 3, 3, 3, 2)
  put(m, 'r', [[3, 7], [15, 8]])
  put(m, 'b', [[7, 12], [12, 10]])
  put(m, 'S', [[18, 8]])
  put(m, ',', [[5, 8], [7, 10], [4, 10], [6, 7], [8, 11], [4, 6]])
  put(m, '"', [[3, 9], [7, 7], [13, 8], [17, 10]])
  return done(m)
}

// ================================================================ ワールドマップ
function worldTiles() {
  const m = blank(64, 32)
  rect(m, '~', 0, 0, 64, 2)
  rect(m, '~', 0, 30, 64, 2)
  rect(m, '~', 0, 0, 2, 32)
  rect(m, '~', 62, 0, 2, 32)
  // カルキュレの東の 海峡（第2章で 橋が 完成する）
  rect(m, '~', 42, 0, 2, 32)
  put(m, '~', [[2, 2], [3, 2], [2, 3], [40, 2], [41, 3], [41, 2], [2, 28], [2, 29], [3, 29], [41, 28], [40, 29], [41, 29], [20, 2], [21, 2], [24, 2], [25, 29], [2, 16], [2, 17]])
  rect(m, '~', 22, 2, 2, 28)
  rect(m, 'M', 10, 3, 10, 4)
  rect(m, 'M', 26, 20, 9, 5)
  rect(m, 'M', 36, 3, 5, 6)
  rect(m, 'M', 39, 14, 3, 10)
  rect(m, 'M', 3, 3, 4, 3)
  rect(m, '%', 3, 20, 9, 8)
  rect(m, '%', 14, 9, 5, 4)
  rect(m, '%', 25, 6, 6, 4)
  rect(m, '%', 30, 15, 5, 4)
  rect(m, '%', 14, 21, 6, 5)
  rect(m, '%', 34, 25, 5, 3)
  // 道
  rect(m, '=', 8, 24, 2, 1)
  rect(m, '=', 9, 15, 1, 10)
  rect(m, '=', 10, 14, 12, 1)
  rect(m, 'B', 22, 14, 2, 1)
  rect(m, '=', 24, 14, 12, 1)
  rect(m, '=', 35, 12, 1, 2)
  // 海峡の東：鏡の大地
  put(m, '~', [[44, 2], [45, 2], [44, 29], [61, 2], [61, 3], [60, 2], [61, 29], [60, 29], [61, 28]])
  rect(m, 'M', 46, 3, 7, 4)
  rect(m, 'M', 57, 13, 4, 8)
  rect(m, 'M', 45, 23, 5, 4)
  rect(m, '%', 55, 4, 5, 5)
  rect(m, '%', 47, 16, 6, 5)
  rect(m, '%', 53, 24, 6, 4)
  rect(m, '~', 50, 8, 4, 3)
  rect(m, '=', 36, 12, 6, 1)
  rect(m, 'B', 42, 12, 2, 1)
  rect(m, '=', 44, 12, 10, 1)
  // 南の 峠（鏡の霧が 晴れると 通れる）と 港町への 道
  rect(m, 'M', 44, 21, 10, 2)
  rect(m, 'M', 55, 21, 7, 2)
  rect(m, '=', 54, 13, 1, 16)
  // 町・森の入口
  m[29][54] = 'Φ'
  m[24][7] = '*'
  m[14][9] = '@'
  m[12][36] = '&'
  m[12][54] = '?'
  for (let y = 2; y < 30; y++)
    for (let x = 2; x < 62; x++) if (m[y][x] === '.' && hash(x, y, 9) < 0.05) m[y][x] = '"'
  return done(m)
}

// ================================================================ 散らかりの洞窟
const CAVE_TILES = [
  '0000000000000000000000000000',
  '0000000000000000000000000000',
  '000qqqqqqqqqqq00000000000000',
  '00qqqqqqqqqqqqq0000000000000',
  '00qqCqqqqqqqqCq0qqqqqqqqqq00',
  '00qqqqqqqqqqqqq0qqqqqqqqqq00',
  '00qq9qqqqqqq9qq(qqqqqqqqqq00',
  '00qqqqqqqqqqqqq0qqqqqCqqqq00',
  '00qqCqqqqqqqqCq0qqqqqqqqqq00',
  '000qqqqqqqqqqq00qqqqqqqqqq00',
  '000000000000000000000(000000',
  '00qqqqqqqqqqqqqqqqqqqqqqqq00',
  '00qq9qqqqq9qqqqqqq9qqqqqqq00',
  '00qqqqqqCqqqqqqqqqqqqqCqqq00',
  '00qqq9qqqqqqq9qqqqq9qqqqqq00',
  '00qqqqqqqqqqqqqqqqqqqqqqqq00',
  '00000000000000(0000000000000',
  '0000000000qqqqqqqqq000000000',
  '0000000000qqqqqqqqq000000000',
  '0000000000qCqqqqqCq000000000',
  '0000000000qqqqqqqqq000000000',
  '0000000000qqqqqqqqq000000000',
  '00000000000000<0000000000000',
  '0000000000000000000000000000',
]

/** 宝箱（開けると 空の箱に 置きかわる） */
const chest = (id: string, x: number, y: number, loot: NpcDef['loot']): NpcDef[] => [
  { id, x, y, name: 'たからばこ', creature: 'chest', kind: 'chest', loot, hideIf: (s) => !!s.flags[`chest_${id}`] },
  { id: `${id}_open`, x, y, name: 'たからばこ', creature: 'chestOpen', kind: 'talk', lines: ['からっぽだ。'], hideIf: (s) => !s.flags[`chest_${id}`] },
]

const cave: MapDef = {
  id: 'cave',
  name: '散らかりの洞窟',
  kind: 'dungeon',
  tiles: CAVE_TILES,
  spawn: { x: 14, y: 21, dir: 'up' },
  exits: [{ x: 14, y: 22, to: 'celuno', tx: 15, ty: 2, dir: 'down' }],
  bossExit: { map: 'celuno', x: 15, y: 2, dir: 'down' },
  signs: [],
  gates: [
    { x: 14, y: 16, puzzle: 'cave_days' },
    { x: 21, y: 10, puzzle: 'cave_mirror' },
    { x: 15, y: 6, puzzle: 'cave_words' },
  ],
  npcs: [
    ...chest('cave_chest1', 3, 12, { item: 'herb' }),
    ...chest('cave_chest2', 25, 15, { gold: 60 }),
    ...chest('cave_chest3', 17, 4, { equip: 'clipboard' }),
    { id: 'cave_spring', x: 24, y: 5, name: 'ふしぎな泉', creature: 'spring', kind: 'heal' },
    { id: 'boss_slime', x: 8, y: 3, name: '散らかりセルイム', creature: 'slime', kind: 'boss', bossId: 'slime', hideIf: (s) => s.bosses.includes('slime') },
  ],
  // ボスの部屋では 敵は出ない
  encounter: (x, y) => (y <= 9 && x <= 15 ? null : ['celime', 'celime', 'frog']),
}

// ================================================================ 計算の塔（手計算ゴーレムのステージ）
const TOWER1 = [
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[[[[[[[::{::[[[[[[[[[',
  '[[[[[[[[:::::[[[[[[[[[',
  '[[[[[[[[[[([[[[[[[[[[[',
  '[[:::::::::::::::::[[[',
  '[[:L:::::::::::::L:[[[',
  '[[::::[[:::::[[::::[[[',
  '[[::::[[:::::[[::::[[[',
  '[[:::::::::::::::::[[[',
  '[[:::::::::::::::::[[[',
  '[[[[[[[[[:::[[[[[[[[[[',
  '[[[[[[[[[:::[[[[[[[[[[',
  '[[[[[[[[[[-[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
]
const TOWER2 = [
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
  '[[:::::[[[[[[[[:{::[[[',
  '[[:::::[[[[[[[[::::[[[',
  '[[::::::::::::[[([[[[[',
  '[[::::::::::::::::::[[',
  '[[:L::::::::::::::L:[[',
  '[[::::[[[[[[[[::::::[[',
  '[[::::[[[[[[[[::::::[[',
  '[[::::::::::::::::::[[',
  '[[::::::::::::::::::[[',
  '[[[[[[[[[:}:[[[[[[[[[[',
  '[[[[[[[[[[[[[[[[[[[[[[',
]
const TOWER3 = [
  'XXXXXXXXXXXXXXXXXX',
  'X::::::::::::::::X',
  'X::L::::::::::L::X',
  'X::::::::::::::::X',
  'X::::::::::::::::X',
  'X[[[[[[[([[[[[[[[X',
  'X::::::::::::::::X',
  'X::::::::::::::::X',
  'X:::::::}::::::::X',
  'XXXXXXXXXXXXXXXXXX',
]

const towerEnemies = () => ['bat', 'ghost', 'bat']
/** 塔は狭いので、敵の出現率を低めに（1フロアで平均1回くらい） */
const TOWER_RATE = 1 / 36

const tower1: MapDef = {
  id: 'tower1',
  name: '計算の塔 1階',
  kind: 'dungeon',
  tiles: TOWER1,
  spawn: { x: 10, y: 12, dir: 'up' },
  exits: [
    { x: 10, y: 13, to: 'calculet', tx: 15, ty: 5, dir: 'down' },
    { x: 10, y: 2, to: 'tower2', tx: 10, ty: 10, dir: 'up' },
  ],
  signs: [],
  gates: [{ x: 10, y: 4, puzzle: 'tower_price' }],
  npcs: [...chest('tower_chest1', 18, 9, { item: 'herb' }), ...chest('tower_chest2', 2, 7, { gold: 120 })],
  encounter: towerEnemies,
  encounterRate: TOWER_RATE,
}

const tower2: MapDef = {
  id: 'tower2',
  name: '計算の塔 2階',
  kind: 'dungeon',
  tiles: TOWER2,
  spawn: { x: 10, y: 10, dir: 'up' },
  exits: [
    { x: 10, y: 11, to: 'tower1', tx: 10, ty: 3, dir: 'down' },
    { x: 16, y: 2, to: 'tower3', tx: 8, ty: 7, dir: 'up' },
  ],
  signs: [],
  gates: [{ x: 16, y: 4, puzzle: 'tower_sum' }],
  npcs: [
    ...chest('tower_chest3', 2, 2, { equip: 'iron_binder' }),
    { id: 'tower_spring', x: 5, y: 3, name: 'ふしぎな泉', creature: 'spring', kind: 'heal' },
  ],
  encounter: towerEnemies,
  encounterRate: TOWER_RATE,
}

const tower3: MapDef = {
  id: 'tower3',
  name: '計算の塔 屋上',
  kind: 'dungeon',
  light: true,
  tiles: TOWER3,
  spawn: { x: 8, y: 7, dir: 'up' },
  exits: [{ x: 8, y: 8, to: 'tower2', tx: 16, ty: 3, dir: 'down' }],
  bossExit: { map: 'calculet', x: 15, y: 5, dir: 'down' },
  signs: [],
  gates: [{ x: 8, y: 5, puzzle: 'tower_stats' }],
  npcs: [{ id: 'boss_golem', x: 8, y: 2, name: '手計算ゴーレム', creature: 'golem', kind: 'boss', bossId: 'golem', hideIf: (s) => s.bosses.includes('golem') }],
}

// ================================================================ 室内
const ROOMS: Record<string, string[]> = {
  elder: ['^^^^^^^^^^^', '^|O|jyj|O|^', '^e________^', '^e__tt____^', '^____ggg__^', '^p___ggg_p^', '^_________^', '^^^^^z^^^^^'],
  inn: ['^^^^^^^^^^^^^', '^|O|j|O|j|O|^', '^e_e__c___o_^', '^e_e__cccccc^', '^___________^', '^__tt___n___^', '^___________^', '^p_________p^', '^^^^^^z^^^^^^'],
  church: ['^^^^^^^^^^^', '^!v!!!!!v!^', '^:::::::::^', '^:::lll:::^', '^:::::::::^', '^nn:ggg:nn^', '^:::ggg:::^', '^nn:ggg:nn^', '^:::ggg:::^', '^^^^^z^^^^^'],
  shop: ['^^^^^^^^^^^', '^|j|O|j|j|^', '^___c__xo_^', '^cccc_____^', '^_________^', '^_p____t__^', '^_________^', '^^^^^z^^^^^'],
  small: ['^^^^^^^^^', '^|jOj|j|^', '^e______^', '^___tt__^', '^_______^', '^_x_____^', '^^^^z^^^^'],
  cozy: ['^^^^^^^^^', '^|O|y|O|^', '^e______^', '^___g___^', '^_t_g_p_^', '^_______^', '^^^^z^^^^'],
  weapon: ['^^^^^^^^^^^', '^|H|H|O|H|^', '^___c_____^', '^cccc___a_^', '^_________^', '^_o_____x_^', '^_________^', '^^^^^z^^^^^'],
  bakery: ['^^^^^^^^^^^', '^|I|I|O|y|^', '^___c_____^', '^cccc_____^', '^_________^', '^_tt___tt_^', '^_________^', '^^^^^z^^^^^'],
  school: ['^^^^^^^^^^^^^', '^|O|JJJJJ|O|^', '^_____t_____^', '^___________^', '^_tt_tt_tt__^', '^___________^', '^_tt_tt_tt__^', '^___________^', '^^^^^^z^^^^^^'],
  hall: ['^^^^^^^^^^^^^', '^!j!v!!!v!j!^', '^:::::::::::^', '^:::ttttt:::^', '^:::::g:::::^', '^:::::g:::::^', '^:p:::g:::p:^', '^:::::g:::::^', '^^^^^^z^^^^^^'],
  armor: ['^^^^^^^^^^^', '^|$|O|$|$|^', '^___c_____^', '^cccc___x_^', '^_________^', '^_o_____p_^', '^_________^', '^^^^^z^^^^^'],
  home: ['^^^^^^^^^^^', '^|O|y|O|j|^', '^e________^', '^e___tt___^', '^_________^', '^_p___o___^', '^_________^', '^^^^^z^^^^^'],
  bank: ['^^^^^^^^^^^', '^|O|/|O|j|^', '^:::c:::::^', '^cccc::::x^', '^:::::::::^', '^:p:::::p:^', '^:::::::::^', '^^^^^z^^^^^'],
  tailor: ['^^^^^^^^^^^', '^|/|O|/|y|^', '^e________^', '^___tt____^', '^_________^', '^_p_____x_^', '^^^^^z^^^^^'],
}

function room(id: string, name: string, town: string, layout: string, npcs: NpcDef[]): MapDef {
  const tiles = ROOMS[layout]
  const mx = tiles[tiles.length - 1].indexOf('z')
  return { id, name, kind: 'interior', town, tiles, exits: [], npcs, signs: [], spawn: { x: mx, y: tiles.length - 2, dir: 'up' } }
}

/** 町のドアと室内の出入口をつなぐ */
function link(town: MapDef, doorX: number, doorY: number, r: MapDef) {
  const mat = { x: r.spawn.x, y: r.tiles.length - 1 }
  town.exits.push({ x: doorX, y: doorY, to: r.id, tx: mat.x, ty: mat.y - 1, dir: 'up' })
  r.exits.push({ x: mat.x, y: mat.y, to: town.id, tx: doorX, ty: doorY + 1, dir: 'down' })
}

// ================================================================ マップ定義
const celuno: MapDef = {
  id: 'celuno',
  name: 'はじまりの村 セルノ',
  kind: 'town',
  town: 'celuno',
  bossId: 'slime',
  tiles: celunoTiles(),
  spawn: { x: 28, y: 13, dir: 'left' },
  respawn: { map: 'celuno_church', x: 5, y: 4 },
  exits: [
    { x: 29, y: 13, to: 'world', tx: 10, ty: 14, dir: 'right' },
    { x: 15, y: 1, to: 'cave', tx: 14, ty: 21, dir: 'up' },
  ],
  signs: [
    { x: 14, y: 4, lines: ['北のどうくつ ― 散らかりセルイムの すみか。', '奥へ進むには、石版の扉の 謎を 解かねば ならぬという。', '村の悩みを すべて解決すれば、入口の 呪いの結界は とけるだろう。'] },
    { x: 21, y: 12, lines: ['「ボルド看板店」', '見出しは太く、看板は目立て！ ― 店主'] },
  ],
  npcs: [
    { id: 'meel', x: 9, y: 12, name: '羊飼いのメェル', look: C.meel, kind: 'quest', questId: 'celuno_input', dir: 'left' },
    { id: 'sheep1', x: 4, y: 13, name: 'ヒツジ', creature: 'sheep', kind: 'talk', wander: true, lines: ['メェ〜。'], emote: 'note' },
    { id: 'sheep2', x: 6, y: 12, name: 'ヒツジ', creature: 'sheep', kind: 'talk', wander: true, lines: ['メェ〜〜。（ヒツジは のんびりしている）'] },
    { id: 'sheep3', x: 5, y: 14, name: 'ヒツジ', creature: 'sheep', kind: 'talk', wander: true, lines: ['メェ？'] },
    { id: 'guard1', x: 17, y: 4, name: '見張りのガード', look: C.guard, kind: 'quest', questId: 'celuno_copy', dir: 'left' },
    { id: 'cat', x: 20, y: 21, name: 'ネコ', creature: 'cat', kind: 'talk', wander: true, lines: ['ニャーン。', '（トキおばあさんの 飼いネコのようだ）'], emote: 'heart' },
    { id: 'bold', x: 20, y: 14, name: '看板職人ボルド', look: C.bold, kind: 'quest', questId: 'celuno_bold' },
    {
      id: 'kid1', x: 14, y: 17, name: '村の子ども', look: C.kid, kind: 'talk', wander: true, emote: 'note',
      lines: ['ねえねえ、「表計算」って 魔法なんでしょ？', 'ぼくも 大きくなったら 表の魔法使いに なるんだ！'],
    },
    {
      id: 'youth', x: 25, y: 12, name: '村の若者', look: C.youth, kind: 'talk', wander: true,
      lines: ['村の外には セルイムや マチガエルが 出るぜ。', 'やつらは 表の知識を ためしてくる。答えられないと 痛い目を見るぞ。', 'ケガをしたら 宿屋で 休むといい。'],
    },
  ],
}

const calculet: MapDef = {
  id: 'calculet',
  name: '計算の町 カルキュレ',
  kind: 'town',
  town: 'calculet',
  bossId: 'golem',
  tiles: calculetTiles(),
  spawn: { x: 1, y: 12, dir: 'right' },
  respawn: { map: 'calc_church', x: 5, y: 4 },
  exits: [
    { x: 0, y: 11, to: 'world', tx: 35, ty: 12, dir: 'left' },
    { x: 0, y: 12, to: 'world', tx: 35, ty: 12, dir: 'left' },
    { x: 0, y: 13, to: 'world', tx: 35, ty: 12, dir: 'left' },
    { x: 33, y: 12, to: 'world', tx: 37, ty: 12, dir: 'right' },
  ],
  signs: [{ x: 12, y: 7, lines: ['北の塔 ― 手計算ゴーレムの 見張る塔。', '塔の扉は 計算の謎で 閉ざされ、最上階に ゴーレムが いるという。', '町の悩みを すべて解決すれば、入口の 結界は とけるだろう。'] }],
  npcs: [
    { id: 'namio', x: 8, y: 23, name: '漁師ナミオ', look: C.namio, kind: 'quest', questId: 'calc_maxmin', dir: 'up' },
    {
      id: 'kid2', x: 24, y: 24, name: '町の子ども', look: C.kid2, kind: 'talk', wander: true, emote: 'note',
      lines: ['大人って みんな 紙に 筆算してるんだよ。', '「すうしき」を使えば、数字を変えても 答えが勝手に 変わるんだって！'],
    },
    { id: 'dog', x: 19, y: 24, name: 'イヌ', creature: 'dog', kind: 'talk', wander: true, lines: ['ワン！ ワン！', '（しっぽを ぶんぶん ふっている）'] },
    {
      id: 'traveler', x: 30, y: 13, name: '旅人', look: C.traveler, kind: 'talk', wander: true,
      lines: ['東の「鏡の町 サンショウ」では、数式をコピーすると 答えが ずれてしまう呪いが あるらしい。', '「$」の印が 鍵を にぎるとか……。'],
    },
    {
      id: 'gate2', x: 32, y: 12, name: '国境の兵士', look: C.gate2, kind: 'guard', dir: 'left',
      lines: ['この先は 鏡の町 サンショウへ 続く 海峡だ。', 'だが 橋が 工事中でな。北の塔の ゴーレムが 石材を 独り占めしているらしい。'],
      hideIf: (s) => s.bosses.includes('golem'),
    },
    {
      id: 'gate2_open', x: 31, y: 11, name: '国境の兵士', look: C.gate2, kind: 'talk', dir: 'down',
      lines: ['ゴーレムが 石材を 返してくれて、海峡の 橋が 完成したぞ！', '東へ 進めば 鏡の町 サンショウだ。', 'あの町では、数式を コピーすると 答えが ずれてしまう 呪いが 広がっているらしい……。'],
      hideIf: (s) => !s.bosses.includes('golem'),
    },
    {
      id: 'stall_man', x: 25, y: 27, name: '屋台の おじさん', look: C.guest, kind: 'talk',
      lines: ['いらっしゃい！ 運河の南の 市場へ ようこそ。', '売上の 計算？ ……それが 呪いのせいで 毎晩 大変なんだよ。'],
      linesAfter: { when: (s) => s.solved.includes('calc_sum'), lines: ['パン屋の マーサさんから SUMって 魔法を 教わったよ！', '閉店後の 計算が 一瞬で 終わるように なったんだ！'] },
    },
  ],
}

const forestMap: MapDef = {
  id: 'forest',
  name: 'はじまりの森',
  kind: 'field',
  tiles: forestTiles(),
  spawn: { x: 5, y: 9, dir: 'right' },
  exits: [{ x: 21, y: 9, to: 'world', tx: 8, ty: 24, dir: 'right' }],
  signs: [{ x: 18, y: 8, lines: ['→ 森の出口', 'この先、北東に「はじまりの村 セルノ」'] }],
  npcs: [{ id: 'celime_npc', x: 10, y: 9, name: 'セルイム', creature: 'celime', kind: 'boss', bossId: 'celime_tutorial', hideIf: (s) => !!s.flags.tutorial }],
}

const world: MapDef = {
  id: 'world',
  name: 'セルシア大陸',
  kind: 'world',
  tiles: worldTiles(),
  spawn: { x: 8, y: 24, dir: 'right' },
  exits: [
    { x: 7, y: 24, to: 'forest', tx: 20, ty: 9, dir: 'left' },
    { x: 9, y: 14, to: 'celuno', tx: 28, ty: 13, dir: 'left' },
    { x: 36, y: 12, to: 'calculet', tx: 1, ty: 12, dir: 'right' },
    { x: 54, y: 12, to: 'sansho', tx: 1, ty: 13, dir: 'right' },
    { x: 54, y: 29, to: 'ifport', tx: 16, ty: 1, dir: 'down' },
  ],
  signs: [],
  npcs: [
    {
      id: 'bridge_guard', x: 21, y: 14, name: '橋の見張り', look: C.gate1, kind: 'guard', dir: 'left',
      lines: ['この橋の先は 計算の町 カルキュレだ。', 'だが今は 魔王の手下が うろついていて 危険でな。', 'セルノ村の北にいる 散らかりセルイムを 何とかしてからにしな。'],
      hideIf: (s) => s.bosses.includes('slime'),
    },
    {
      id: 'bridge_worker', x: 42, y: 12, name: '橋の職人', look: C.worker, kind: 'guard', dir: 'left',
      lines: ['おっと、この橋は まだ 工事中だ！', 'カルキュレの 北の塔にいる 手計算ゴーレムが「石材ノ 数ハ 手デ 数エロ」って 言い張ってな……。', '石材が 届かなくて 工事が 進まないんだよ。'],
      hideIf: (s) => s.bosses.includes('golem'),
    },
    {
      id: 'fog_guard', x: 54, y: 21, name: '霧の見張り', look: C.kiri, kind: 'guard', dir: 'up',
      lines: ['この 峠の 先は、港町 イフポート……', 'だが 今は「鏡の霧」が 立ちこめ、進んでも 進んでも 元の場所に 戻されてしまう。', 'サンショウの 神殿に 巣くう ミラージュの しわざ らしいが……。'],
      hideIf: (s) => s.bosses.includes('mirage'),
    },
    {
      // 無料で 遊べるのは 第2章まで。全章解放の 前は ここで 止まる
      id: 'pass_guard', x: 54, y: 21, name: '峠の見張り', look: C.kiri, kind: 'unlock', dir: 'up',
      lines: ['おお、霧が 晴れたぞ！ あんたの おかげだ。', 'この 峠を 越えれば 港町 イフポート。その 先には、もっと 手強い 呪いが 待っている……。'],
      hideIf: (s) => !s.bosses.includes('mirage') || isUnlocked(),
    },
  ],
  encounter: (x, y) =>
    x < 22 ? ['celime', 'celime', 'frog'] : x < 42 ? ['frog', 'bat', 'ghost'] : y >= 23 ? ['jelly', 'crab', 'jelly'] : ['kagamin', 'kagamin', 'zuredori'],
}

// ---------------------------------------------------------------- 第3章
const ifport: MapDef = {
  id: 'ifport',
  name: '条件の港町 イフポート',
  kind: 'town',
  town: 'ifport',
  bossId: 'captain',
  tiles: ifportTiles(),
  spawn: { x: 16, y: 1, dir: 'down' },
  respawn: { map: 'port_church', x: 5, y: 4 },
  exits: [
    { x: 16, y: 0, to: 'world', tx: 54, ty: 28, dir: 'up' },
    { x: 17, y: 0, to: 'world', tx: 54, ty: 28, dir: 'up' },
    { x: 28, y: 28, to: 'ship1', tx: 10, ty: 12, dir: 'up' },
  ],
  signs: [
    { x: 21, y: 21, lines: ['幽霊船 ― 霧の夜に 現れ、港に 居すわった 謎の船。', '船長室には「幽霊船長モシナラバ」が いるという。', '町の悩みを すべて解決すれば、桟橋の 結界は とけるだろう。'] },
  ],
  npcs: [
    { id: 'tomoshi', x: 2, y: 22, name: '灯台守トモシ', look: C.tomoshi, kind: 'quest', questId: 'port_compare', dir: 'right' },
    { id: 'ami', x: 16, y: 27, name: '漁師アミ', look: C.ami, kind: 'quest', questId: 'port_if', dir: 'down' },
    {
      id: 'fishmonger', x: 21, y: 19, name: '魚屋のおやじ', look: C.fishmonger, kind: 'talk', dir: 'down',
      lines: ['らっしゃい！ ……と 言いたいが、魚の 仕分けが 追いつかねえ。', '「この魚は 大きいか？ 小さいか？」って、1匹ずつ 目で 見て 判断してんだ。', '「もし ○○なら」って ルールを 決めて、自動で 分けられたら なぁ……。'],
      linesAfter: { when: (s) => s.solved.includes('port_if'), lines: ['アミから IF って 魔法を 教わったぜ！', 'ルールさえ 決めりゃ、仕分けは 一瞬だ！ らっしゃい らっしゃい！'] },
    },
    {
      id: 'ghost_sailor', x: 25, y: 28, name: '幽霊の船員', creature: 'ghost', kind: 'talk', wander: true,
      lines: ['ヨーソロー……。', '船長は……船倉の 奥から 船長室へ……。もしも……もしも……と つぶやきながら……。'],
      hideIf: (s) => s.bosses.includes('captain'),
    },
    {
      id: 'sailor', x: 24, y: 16, name: '船乗り', look: C.sailor, kind: 'talk', wander: true,
      lines: ['あの 幽霊船が 来てから、町の みんなが 何も 決められなく なっちまった。', '「もしも 嵐だったら？」「もしも 赤字だったら？」……って、毎回 1件ずつ 悩んで 手が 止まるんだ。'],
    },
    {
      id: 'kid4', x: 10, y: 8, name: '港の子ども', look: C.kid4, kind: 'talk', wander: true, emote: 'note',
      lines: ['ねえねえ、「もしも」って 言葉、知ってる？', 'もしも 晴れたら 海で 遊ぶ！ もしも 雨なら おうちで あそぶ！ ……これも IF なんだって！'],
    },
    { id: 'dog2', x: 23, y: 8, name: 'イヌ', creature: 'dog', kind: 'talk', wander: true, lines: ['ワン！', '（海の においを かいで しっぽを ふっている）'] },
    {
      id: 'port_ferry', x: 21, y: 25, name: '定期船の船乗り', look: C.ferryman, kind: 'ferry', dir: 'up',
      lines: ['幽霊船が 消えて、南の 海の 定期船が また 出せるように なった！', '行き先は 海の 向こうの「検索の城下町 ルックアップ」。お城の 大書庫で 有名な 町さ。'],
      ferry: { to: 'lookup', x: 16, y: 23, dir: 'up', place: '検索の城下町 ルックアップ' },
      hideIf: (s) => !s.bosses.includes('captain'),
    },
  ],
}

const ship1: MapDef = {
  id: 'ship1',
  name: '幽霊船 船倉',
  kind: 'dungeon',
  tiles: ship1Tiles(),
  spawn: { x: 10, y: 12, dir: 'up' },
  exits: [
    { x: 10, y: 13, to: 'ifport', tx: 27, ty: 28, dir: 'left' },
    { x: 10, y: 1, to: 'ship2', tx: 8, ty: 8, dir: 'up' },
  ],
  signs: [],
  gates: [
    { x: 10, y: 9, puzzle: 'ship_if' },
    { x: 10, y: 4, puzzle: 'ship_nested' },
  ],
  npcs: [
    ...chest('ship_chest1', 3, 2, { item: 'herb' }),
    ...chest('ship_chest2', 17, 2, { gold: 300 }),
    ...chest('ship_chest3', 17, 10, { item: 'sandglass' }),
  ],
  encounter: shipEnemies,
  encounterRate: SHIP_RATE,
}

const ship2: MapDef = {
  id: 'ship2',
  name: '幽霊船 船長室',
  kind: 'dungeon',
  light: true,
  tiles: ship2Tiles(),
  spawn: { x: 8, y: 8, dir: 'up' },
  exits: [{ x: 8, y: 9, to: 'ship1', tx: 10, ty: 2, dir: 'down' }],
  bossExit: { map: 'ifport', x: 21, y: 23, dir: 'up' },
  signs: [],
  gates: [{ x: 8, y: 4, puzzle: 'ship_countif' }],
  npcs: [
    ...chest('ship_chest4', 3, 6, { equip: 'captain_hat' }),
    { id: 'ship_spring', x: 13, y: 6, name: 'ふしぎな水がめ', creature: 'spring', kind: 'heal' },
    { id: 'boss_captain', x: 8, y: 2, name: '幽霊船長モシナラバ', creature: 'captain', kind: 'boss', bossId: 'captain', hideIf: (s) => s.bosses.includes('captain') },
  ],
  // 船長の 前では 敵は出ない
  encounter: (_x, y) => (y <= 3 ? null : shipEnemies()),
  encounterRate: SHIP_RATE,
}

// ---------------------------------------------------------------- 第2章
const sansho: MapDef = {
  id: 'sansho',
  name: '鏡の町 サンショウ',
  kind: 'town',
  town: 'sansho',
  bossId: 'mirage',
  tiles: sanshoTiles(),
  spawn: { x: 1, y: 13, dir: 'right' },
  respawn: { map: 'sansho_church', x: 5, y: 4 },
  exits: [
    { x: 0, y: 12, to: 'world', tx: 53, ty: 12, dir: 'left' },
    { x: 0, y: 13, to: 'world', tx: 53, ty: 12, dir: 'left' },
    { x: 0, y: 14, to: 'world', tx: 53, ty: 12, dir: 'left' },
    { x: 16, y: 4, to: 'temple1', tx: 11, ty: 14, dir: 'up' },
  ],
  signs: [
    { x: 14, y: 7, lines: ['北の 鏡の神殿 ― ズレズレ・ミラージュの 棲む ところ。', '神殿の扉は 参照の謎で 閉ざされ、最奥の 大鏡に ミラージュが 潜むという。', '町の悩みを すべて解決すれば、入口の 結界は とけるだろう。'] },
  ],
  npcs: [
    { id: 'hanten', x: 12, y: 26, name: '八百屋ハンテン', look: C.hanten, kind: 'quest', questId: 'sansho_rel', dir: 'down' },
    { id: 'flora', x: 20, y: 26, name: '花屋フローラ', look: C.flora, kind: 'quest', questId: 'sansho_share', dir: 'down' },
    {
      id: 'mira', x: 7, y: 20, name: '双子のミラ', look: C.mira, kind: 'talk', dir: 'right',
      lines: ['ねえ、知ってる？ この町の 湖は 何でも 映すんだよ！', 'わたしが ミラで、向こうに いるのが ラミ。'],
    },
    {
      id: 'rami', x: 25, y: 20, name: '双子のラミ', look: C.rami, kind: 'talk', dir: 'left',
      lines: ['？よだんす 映も でん何 は 湖の 町の こ、てっ知 、えね', '……あっ、ごめん！ 呪いで ことばまで 反転しちゃった！'],
      linesAfter: { when: (s) => s.bosses.includes('mirage'), lines: ['ミラージュが いなくなって、ことばも もとに もどったよ！', 'ありがとう、おにいさん！'] },
    },
    {
      id: 'keeper', x: 18, y: 7, name: '神殿の番人', look: C.keeper, kind: 'talk', dir: 'down',
      lines: ['この神殿の 大鏡に、ズレズレ・ミラージュという 魔物が 住みついて しまった……。', 'やつが 映した 表は、コピーするたびに 参照が ずれていく。', '「ずれない 印」を 知る者だけが、奥へ 進めるであろう。'],
      linesAfter: {
        when: (s) => s.bosses.includes('mirage'),
        lines: ['ミラージュが 消え、南の 峠を おおっていた「鏡の霧」も 晴れたそうだ。', '峠を 越えた 先の 海辺には、港町 イフポートが ある。', 'だが あの港にも、幽霊船が 居すわって いると 聞く……。'],
      },
    },
    {
      id: 'townsman', x: 26, y: 13, name: '町の男', look: C.townsman, kind: 'talk', wander: true,
      lines: ['店の 売上表を 1行 作って、下に コピーしたら……', '全部 同じ セルを 見てたり、関係ない セルを 見てたり……。もう めちゃくちゃだよ。'],
    },
    {
      id: 'kid3', x: 9, y: 12, name: '町の子ども', look: C.kid3, kind: 'talk', wander: true, emote: 'note',
      lines: ['鏡って、右と左が 反対に なるでしょ？', 'でも 上と下は 反対に ならないんだって。ふしぎだよね〜。'],
    },
    { id: 'cat2', x: 14, y: 16, name: 'ネコ', creature: 'cat', kind: 'talk', wander: true, lines: ['ニャ〜。', '（湖に 映った 自分を じっと 見つめている）'] },
  ],
}

const temple1: MapDef = {
  id: 'temple1',
  name: '鏡の神殿 前殿',
  kind: 'dungeon',
  tiles: TEMPLE1,
  spawn: { x: 11, y: 14, dir: 'up' },
  exits: [
    { x: 11, y: 15, to: 'sansho', tx: 16, ty: 5, dir: 'down' },
    { x: 11, y: 2, to: 'temple2', tx: 9, ty: 9, dir: 'up' },
  ],
  signs: [],
  gates: [
    { x: 11, y: 10, puzzle: 'temple_tax' },
    { x: 11, y: 5, puzzle: 'temple_share' },
  ],
  npcs: [
    ...chest('temple_chest1', 3, 2, { item: 'sandglass' }),
    ...chest('temple_chest2', 20, 2, { gold: 200 }),
    ...chest('temple_chest3', 20, 14, { item: 'herb' }),
  ],
  encounter: templeEnemies,
  encounterRate: TEMPLE_RATE,
}

const temple2: MapDef = {
  id: 'temple2',
  name: '鏡の神殿 大鏡の間',
  kind: 'dungeon',
  light: true,
  tiles: TEMPLE2,
  spawn: { x: 9, y: 9, dir: 'up' },
  exits: [{ x: 9, y: 10, to: 'temple1', tx: 11, ty: 3, dir: 'down' }],
  bossExit: { map: 'sansho', x: 16, y: 5, dir: 'down' },
  signs: [],
  gates: [{ x: 9, y: 5, puzzle: 'temple_times' }],
  npcs: [
    ...chest('temple_chest4', 3, 6, { equip: 'mirror_shield' }),
    { id: 'temple_spring', x: 15, y: 6, name: 'ふしぎな泉', creature: 'spring', kind: 'heal' },
    { id: 'boss_mirage', x: 9, y: 2, name: 'ズレズレ・ミラージュ', creature: 'mirage', kind: 'boss', bossId: 'mirage', hideIf: (s) => s.bosses.includes('mirage') },
  ],
  // 大鏡の前では 敵は出ない
  encounter: (_x, y) => (y <= 4 ? null : templeEnemies()),
  encounterRate: TEMPLE_RATE,
}

// ---------------------------------------------------------------- 第4章
const lookup: MapDef = {
  id: 'lookup',
  name: '検索の城下町 ルックアップ',
  kind: 'town',
  town: 'lookup',
  bossId: 'mitsukaranu',
  tiles: lookupTiles(),
  spawn: { x: 16, y: 23, dir: 'up' },
  respawn: { map: 'lookup_church', x: 5, y: 4 },
  exits: [{ x: 16, y: 4, to: 'library1', tx: 10, ty: 12, dir: 'up' }],
  signs: [
    { x: 14, y: 7, lines: ['ルックアップ城 大書庫 ― 城と 町の すべての 記録が 眠る 場所。', 'いまは「迷宮書庫の主 ミツカラーヌ」が 巣くい、何を 探しても 見つからないという。', '城下の 悩みを すべて 解決すれば、城門の 結界は とけるだろう。'] },
  ],
  npcs: [
    { id: 'post', x: 12, y: 21, name: '郵便屋ポスト', look: C.post, kind: 'quest', questId: 'lookup_vlookup', dir: 'down' },
    { id: 'hantei', x: 18, y: 8, name: '兵士長ハンテイ', look: C.hantei, kind: 'quest', questId: 'lookup_approx', dir: 'left' },
    {
      id: 'lookup_ferry', x: 17, y: 24, name: '定期船の船乗り', look: C.ferryman, kind: 'ferry', dir: 'up',
      lines: ['イフポート行きの 定期船だ。いつでも 乗せてやるぜ。'],
      ferry: { to: 'ifport', x: 21, y: 23, dir: 'up', place: '条件の港町 イフポート' },
    },
    {
      id: 'lookup_coach', x: 32, y: 11, name: '馬車の御者', look: C.coachman, kind: 'ferry', dir: 'left',
      lines: ['書庫の 呪いが 解けて、王都への 街道も 通れるように なったぞ！', '行き先は「集計の王都 ピボリア」。国じゅうの 記録が 集まる 都さ。'],
      ferry: { to: 'pivoria', x: 16, y: 26, dir: 'up', place: '集計の王都 ピボリア', verb: '向かう' },
      hideIf: (s) => !s.bosses.includes('mitsukaranu'),
    },
    {
      id: 'quill', x: 25, y: 21, name: '古本屋のクイル', look: C.quill, kind: 'talk', dir: 'down',
      lines: ['この 町の 人間は、何でも 分厚い 帳簿に 書き残す。', 'だが 城の 大書庫が 呪われてから、書いた ものが 見つからねえ。', '1行ずつ 指で たどって「ない……ない……」って つぶやく 声が、町じゅうから 聞こえるのさ。'],
      linesAfter: { when: (s) => s.solved.includes('lookup_vlookup'), lines: ['VLOOKUP って 魔法が はやってるらしいな。', '番号さえ わかれば、帳簿の どこに あっても 一発で 引ける……古本屋 泣かせだぜ。'] },
    },
    {
      id: 'kid5', x: 8, y: 13, name: '城下の子ども', look: C.kid5, kind: 'talk', wander: true, emote: 'note',
      lines: ['かくれんぼ しよう！ ……あ、でも いま 探しても 見つからない 呪いが かかってるんだっけ。', 'ずっと 見つけて もらえないのは さみしいよ〜。'],
    },
    {
      id: 'shelfa', x: 14, y: 6, name: '城門の衛兵', look: C.shelfa, kind: 'guard', dir: 'down',
      lines: ['この先は ルックアップ城の 大書庫だ。', 'ミツカラーヌの 結界が 張られていて、今は 誰も 入れん。', '城下の 者たちの 悩みを 晴らせば、結界も 弱まるはずだが……。'],
      linesAfter: { when: (s) => s.bosses.includes('mitsukaranu'), lines: ['大書庫の 記録が、ふたたび 引けるように なった！', '城の 者 一同、感謝して おるぞ。'] },
    },
    { id: 'cat3', x: 27, y: 21, name: 'ネコ', creature: 'cat', kind: 'talk', wander: true, lines: ['ニャ。', '（本の 山の 上で 丸くなるのが 好きらしい）'] },
  ],
}

const library1: MapDef = {
  id: 'library1',
  name: 'ルックアップ城 大書庫',
  kind: 'dungeon',
  tiles: LIBRARY1,
  spawn: { x: 10, y: 12, dir: 'up' },
  exits: [
    { x: 10, y: 13, to: 'lookup', tx: 16, ty: 5, dir: 'down' },
    { x: 10, y: 2, to: 'library2', tx: 8, ty: 7, dir: 'up' },
  ],
  signs: [],
  gates: [
    { x: 10, y: 9, puzzle: 'lib_shelf' },
    { x: 10, y: 4, puzzle: 'lib_left' },
  ],
  npcs: [
    ...chest('lib_chest1', 3, 2, { item: 'herb' }),
    ...chest('lib_chest2', 18, 2, { gold: 400 }),
    ...chest('lib_chest3', 18, 12, { item: 'sandglass' }),
  ],
  encounter: libraryEnemies,
  encounterRate: LIBRARY_RATE,
}

const library2: MapDef = {
  id: 'library2',
  name: 'ルックアップ城 禁書の間',
  kind: 'dungeon',
  light: true,
  tiles: LIBRARY2,
  spawn: { x: 8, y: 7, dir: 'up' },
  exits: [{ x: 8, y: 8, to: 'library1', tx: 10, ty: 3, dir: 'down' }],
  bossExit: { map: 'lookup', x: 16, y: 5, dir: 'down' },
  signs: [],
  gates: [{ x: 8, y: 5, puzzle: 'lib_missing' }],
  npcs: [
    ...chest('lib_chest4', 3, 7, { equip: 'catalog_shield' }),
    { id: 'lib_spring', x: 14, y: 7, name: 'ふしぎな インク壺', creature: 'spring', kind: 'heal' },
    { id: 'boss_mitsukaranu', x: 8, y: 2, name: '迷宮書庫の主 ミツカラーヌ', creature: 'mitsukaranu', kind: 'boss', bossId: 'mitsukaranu', hideIf: (s) => s.bosses.includes('mitsukaranu') },
  ],
  // ミツカラーヌの 前では 敵は出ない
  encounter: (_x, y) => (y <= 4 ? null : libraryEnemies()),
  encounterRate: LIBRARY_RATE,
}

// ---------------------------------------------------------------- 第5章
const pivoria: MapDef = {
  id: 'pivoria',
  name: '集計の王都 ピボリア',
  kind: 'town',
  town: 'pivoria',
  bossId: 'barabaran',
  tiles: pivoriaTiles(),
  spawn: { x: 16, y: 26, dir: 'up' },
  respawn: { map: 'pivo_church', x: 5, y: 4 },
  exits: [{ x: 16, y: 4, to: 'treasury1', tx: 10, ty: 12, dir: 'up' }],
  signs: [
    { x: 14, y: 7, lines: ['ピボリア王宮 宝物庫 ― 王国の 財宝と、すべての 記録の 原本が 眠る 場所。', 'いまは「散乱帳簿の王 バラバラン」が 居座り、記録を バラバラに 散らかしているという。', '王都の 悩みを すべて 解決すれば、王宮の 結界は とけるだろう。'] },
  ],
  npcs: [
    { id: 'kazoe', x: 18, y: 9, name: '衛兵長カゾエ', look: C.kazoe, kind: 'quest', questId: 'pivo_countifs', dir: 'left' },
    { id: 'akina', x: 12, y: 21, name: '市場頭アキナ', look: C.akina, kind: 'quest', questId: 'pivo_sumifs', dir: 'down' },
    {
      id: 'pivo_coach', x: 17, y: 27, name: '馬車の御者', look: C.coachman, kind: 'ferry', dir: 'up',
      lines: ['ルックアップ行きの 馬車だ。いつでも 乗せて やるぞ。'],
      ferry: { to: 'lookup', x: 31, y: 11, dir: 'right', place: '検索の城下町 ルックアップ', verb: '向かう' },
    },
    {
      id: 'noble', x: 21, y: 14, name: '王都の貴婦人', look: C.noble, kind: 'talk', wander: true, emote: 'sweat',
      lines: ['ごきげんよう。……と 言いたいところですけれど、王宮の 舞踏会の 招待客名簿が バラバラで。', '「北の 貴族で、しかも 未返信の 方」を 数えるだけで 3日も かかって おりますの。'],
      linesAfter: { when: (s) => s.solved.includes('pivo_countifs'), lines: ['COUNTIFS という 魔法で、条件を 2つ つけて 数えられるのですって？', '名簿の 整理が 楽しみに なって きましたわ。'] },
    },
    {
      id: 'kid6', x: 23, y: 24, name: '王都の子ども', look: C.kid6, kind: 'talk', wander: true, emote: 'note',
      lines: ['どんぐりを 集めたの！ 大きいの・小さいの、赤いの・茶色いの……', 'ねえ「大きくて 赤い」のは いくつ？ ……数えてたら わかんなく なっちゃった。'],
    },
    {
      id: 'pivo_gate', x: 14, y: 6, name: '王宮の衛兵', look: C.kazoe, kind: 'guard', dir: 'down',
      lines: ['この先は ピボリア王宮の 宝物庫だ。', 'バラバランの 結界が 張られていて、陛下でさえ 入れぬ。', '王都の 者たちの 悩みを 晴らせば、結界も 弱まるはずだ。'],
      linesAfter: { when: (s) => s.bosses.includes('barabaran'), lines: ['宝物庫の 記録が、1冊の 帳簿に まとまった！', '王都の 者 一同、感謝して おるぞ。'] },
    },
    {
      id: 'pivo_coach2', x: 1, y: 20, name: '宿場行きの御者', look: C.coachman, kind: 'ferry', dir: 'right',
      lines: ['王都の 帳簿が 戻って、西の 宿場町への 便も 再開だ！', '行き先は「文字の宿場町 テキストリア」。手紙と 書物の 町さ。……最近は 文字が 化けて 読めないって 噂だがね。'],
      ferry: { to: 'textria', x: 16, y: 25, dir: 'up', place: '文字の宿場町 テキストリア', verb: '向かう' },
      hideIf: (s) => !s.bosses.includes('barabaran'),
    },
    { id: 'cat4', x: 27, y: 21, name: 'ネコ', creature: 'cat', kind: 'talk', wander: true, lines: ['ニャー。', '（市場の 魚屋の 前から 動かない）'] },
    { id: 'dog3', x: 6, y: 23, name: 'イヌ', creature: 'dog', kind: 'talk', wander: true, lines: ['ワン！', '（馬車の 車輪を じっと 見ている）'] },
  ],
}

const treasury1: MapDef = {
  id: 'treasury1',
  name: 'ピボリア王宮 宝物庫',
  kind: 'dungeon',
  tiles: TREASURY1,
  spawn: { x: 10, y: 12, dir: 'up' },
  exits: [
    { x: 10, y: 13, to: 'pivoria', tx: 16, ty: 5, dir: 'down' },
    { x: 10, y: 2, to: 'treasury2', tx: 8, ty: 7, dir: 'up' },
  ],
  signs: [],
  gates: [
    { x: 10, y: 9, puzzle: 'trs_count' },
    { x: 10, y: 4, puzzle: 'trs_sum' },
  ],
  npcs: [
    ...chest('trs_chest1', 2, 2, { item: 'herb' }),
    ...chest('trs_chest2', 18, 2, { gold: 600 }),
    ...chest('trs_chest3', 18, 12, { item: 'scroll' }),
  ],
  encounter: treasuryEnemies,
  encounterRate: TREASURY_RATE,
}

const treasury2: MapDef = {
  id: 'treasury2',
  name: 'ピボリア王宮 王の間',
  kind: 'dungeon',
  light: true,
  tiles: TREASURY2,
  spawn: { x: 8, y: 7, dir: 'up' },
  exits: [{ x: 8, y: 8, to: 'treasury1', tx: 10, ty: 3, dir: 'down' }],
  bossExit: { map: 'pivoria', x: 16, y: 5, dir: 'down' },
  signs: [],
  gates: [{ x: 8, y: 5, puzzle: 'trs_cross' }],
  npcs: [
    ...chest('trs_chest4', 3, 7, { equip: 'pivot_crown' }),
    { id: 'trs_spring', x: 14, y: 7, name: 'ふしぎな 泉', creature: 'spring', kind: 'heal' },
    { id: 'boss_barabaran', x: 8, y: 2, name: '散乱帳簿の王 バラバラン', creature: 'barabaran', kind: 'boss', bossId: 'barabaran', hideIf: (s) => s.bosses.includes('barabaran') },
  ],
  // バラバランの 前では 敵は出ない
  encounter: (_x, y) => (y <= 4 ? null : treasuryEnemies()),
  encounterRate: TREASURY_RATE,
}

// ---------------------------------------------------------------- 第6章
const textria: MapDef = {
  id: 'textria',
  name: '文字の宿場町 テキストリア',
  kind: 'town',
  town: 'textria',
  bossId: 'mojibake',
  tiles: textriaTiles(),
  spawn: { x: 16, y: 25, dir: 'up' },
  respawn: { map: 'text_church', x: 5, y: 4 },
  exits: [{ x: 16, y: 4, to: 'print1', tx: 10, ty: 12, dir: 'up' }],
  signs: [
    { x: 14, y: 7, lines: ['テキストリア 活版印刷所 ― 宿場の 手紙・看板・書物を すべて 刷る 場所。', 'いまは「文字化けの怪 モジバケーラ」が 住みつき、刷る 文字が すべて 化けてしまうという。', '宿場の 悩みを すべて 解決すれば、印刷所の 結界は とけるだろう。'] },
  ],
  npcs: [
    { id: 'kodo', x: 25, y: 23, name: '倉庫番コード', look: C.kodo, kind: 'quest', questId: 'text_leftright', dir: 'down' },
    {
      id: 'text_coach', x: 17, y: 26, name: '王都行きの御者', look: C.coachman, kind: 'ferry', dir: 'up',
      lines: ['ピボリア行きの 馬車だ。いつでも 乗せて やるぞ。'],
      ferry: { to: 'pivoria', x: 2, y: 20, dir: 'left', place: '集計の王都 ピボリア', verb: '向かう' },
    },
    {
      id: 'printer', x: 18, y: 8, name: '印刷工のハンコ', look: C.printer, kind: 'guard', dir: 'left',
      lines: ['この先は 活版印刷所だ。……いや、もう 印刷所とは 呼べんな。', 'モジバケーラが 住みついてから、刷る 文字が ぜんぶ「縺薙ｓ縺ｫ縺｡縺ｯ」みたいに 化けちまう。', '宿場の みんなの 悩みが 晴れれば、結界も 弱まるはずなんだが……。'],
      linesAfter: { when: (s) => s.bosses.includes('mojibake'), lines: ['見ろ、刷りたての 新聞だ！ 1文字も 化けて ねえ！', 'あんたの おかげだ。宿場の 文字が 戻ってきたぜ。'] },
    },
    {
      id: 'kid7', x: 23, y: 13, name: '宿場の子ども', look: C.kid7, kind: 'talk', wander: true, emote: 'note',
      lines: ['しりとり しよう！ 「テキスト」……「トマト」……「ト……縺ｨ」……あれ？', 'なんか 言葉が 化けちゃう！ 呪いのせいだって 母ちゃんが 言ってた。'],
      linesAfter: { when: (s) => s.bosses.includes('mojibake'), lines: ['しりとり 再開！ 「テキスト」「トマト」「とけい」……ちゃんと 言えるよ！'] },
    },
    {
      id: 'poet', x: 9, y: 13, name: '旅の歌詠み', look: C.traveler, kind: 'talk', wander: true,
      lines: ['五・七・五の 歌を 詠んで いるのだが、文字数を 数えるのが 苦手でね。', 'LEN という 魔法が あれば、指を 折らずに すむのだが……。'],
      linesAfter: { when: (s) => s.solved.includes('text_len'), lines: ['LEN で 数えたら、わたしの 歌は 5・8・5 だった……。字余りじゃ。'] },
    },
    {
      id: 'text_coach2', x: 32, y: 13, name: '里行きの御者', look: C.coachman, kind: 'ferry', dir: 'left',
      lines: ['宿場の 文字が 戻って、東の 里への 便も 出せるように なった！', '行き先は「暦の里 コヨミノ」。時計塔の ある 静かな 里さ。……もっとも 最近は、日付が 狂って 大騒ぎらしいがね。'],
      ferry: { to: 'koyomi', x: 16, y: 25, dir: 'up', place: '暦の里 コヨミノ', verb: '向かう' },
      hideIf: (s) => !s.bosses.includes('mojibake'),
    },
    { id: 'cat5', x: 6, y: 23, name: 'ネコ', creature: 'cat', kind: 'talk', wander: true, lines: ['ニャ……ニ繝｣……？', '（ネコの 鳴き声まで 化けている……）'] },
  ],
}

const print1: MapDef = {
  id: 'print1',
  name: 'テキストリア 活版印刷所',
  kind: 'dungeon',
  tiles: PRINT1,
  spawn: { x: 10, y: 12, dir: 'up' },
  exits: [
    { x: 10, y: 13, to: 'textria', tx: 16, ty: 5, dir: 'down' },
    { x: 10, y: 2, to: 'print2', tx: 8, ty: 7, dir: 'up' },
  ],
  signs: [],
  gates: [
    { x: 10, y: 9, puzzle: 'prt_join' },
    { x: 10, y: 4, puzzle: 'prt_mid' },
  ],
  npcs: [
    ...chest('prt_chest1', 2, 2, { item: 'herb' }),
    ...chest('prt_chest2', 18, 2, { gold: 800 }),
    ...chest('prt_chest3', 18, 12, { item: 'sandglass' }),
  ],
  encounter: printEnemies,
  encounterRate: PRINT_RATE,
}

const print2: MapDef = {
  id: 'print2',
  name: 'テキストリア 活版印刷所 奥の間',
  kind: 'dungeon',
  light: true,
  tiles: PRINT2,
  spawn: { x: 8, y: 7, dir: 'up' },
  exits: [{ x: 8, y: 8, to: 'print1', tx: 10, ty: 3, dir: 'down' }],
  bossExit: { map: 'textria', x: 16, y: 5, dir: 'down' },
  signs: [],
  gates: [{ x: 8, y: 4, puzzle: 'prt_find' }],
  npcs: [
    ...chest('prt_chest4', 3, 7, { equip: 'proof_glasses' }),
    { id: 'prt_spring', x: 14, y: 7, name: 'ふしぎな インク壺', creature: 'spring', kind: 'heal' },
    { id: 'boss_mojibake', x: 8, y: 2, name: '文字化けの怪 モジバケーラ', creature: 'mojibake', kind: 'boss', bossId: 'mojibake', hideIf: (s) => s.bosses.includes('mojibake') },
  ],
  // モジバケーラの 前では 敵は出ない
  encounter: (_x, y) => (y <= 3 ? null : printEnemies()),
  encounterRate: PRINT_RATE,
}

// ---------------------------------------------------------------- 第7章
const koyomi: MapDef = {
  id: 'koyomi',
  name: '暦の里 コヨミノ',
  kind: 'town',
  town: 'koyomi',
  bossId: 'shimekiris',
  tiles: koyomiTiles(),
  spawn: { x: 16, y: 25, dir: 'up' },
  respawn: { map: 'koyo_church', x: 5, y: 4 },
  exits: [{ x: 16, y: 4, to: 'clock1', tx: 10, ty: 12, dir: 'up' }],
  signs: [
    { x: 14, y: 7, lines: ['コヨミノ 時計塔 ― 里の 暦と 時を 刻み続けて 300年。', 'いまは「刻を喰らう者 シメキリス」が 棲みつき、里の 日付を 狂わせているという。', '里の 悩みを すべて 解決すれば、時計塔の 結界は とけるだろう。'] },
  ],
  npcs: [
    { id: 'nokori', x: 10, y: 22, name: '鍛冶屋の弟子ノコリ', look: C.nokori, kind: 'quest', questId: 'date_diff', dir: 'down' },
    { id: 'youbi', x: 26, y: 23, name: '市場番ヨウビ', look: C.youbi, kind: 'quest', questId: 'date_weekday', dir: 'down' },
    {
      id: 'koyo_coach', x: 17, y: 26, name: '宿場行きの御者', look: C.coachman, kind: 'ferry', dir: 'up',
      lines: ['テキストリア行きの 馬車だ。いつでも 乗せて やるぞ。'],
      ferry: { to: 'textria', x: 31, y: 13, dir: 'right', place: '文字の宿場町 テキストリア', verb: '向かう' },
    },
    {
      id: 'clockman', x: 18, y: 8, name: '時計守りのゼンマイ', look: C.clockman, kind: 'guard', dir: 'left',
      lines: ['この先は 時計塔じゃ。わしは 300年 この 塔の 時計を 守ってきた 家の 者。', 'シメキリスが 棲みついてから、時計は 好き勝手に 進んだり 戻ったり……里の 暦も めちゃくちゃじゃ。', '里の 者たちの 悩みが 晴れれば、結界も 弱まるはずじゃが……。'],
      linesAfter: { when: (s) => s.bosses.includes('shimekiris'), lines: ['聞こえるかの、正しい 鐘の 音が。', '里の 暦が 戻った。あんたの おかげじゃ。'] },
    },
    {
      id: 'kid8', x: 22, y: 13, name: '里の子ども', look: C.kid8, kind: 'talk', wander: true, emote: 'question',
      lines: ['ぼくの 誕生日まで あと 何日？ ってきいたら、母ちゃんが「わからない」って。', 'カレンダーの 呪いで、日付が 数えられないんだって！'],
      linesAfter: { when: (s) => s.bosses.includes('shimekiris'), lines: ['誕生日まで あと 12日！ 引き算で すぐ わかったよ！'] },
    },
    {
      id: 'koyo_coach2', x: 32, y: 12, name: '砦行きの御者', look: C.coachman, kind: 'ferry', dir: 'left',
      lines: ['時計塔の 鐘が 鳴って、北の 果てへの 道が 開けた……。', '行き先は「最果ての砦 ホープ」。魔王レフエラーの 城を 見張る 最後の 砦さ。……覚悟は いいかい？'],
      ferry: { to: 'hope', x: 16, y: 25, dir: 'up', place: '最果ての砦 ホープ', verb: '向かう' },
      hideIf: (s) => !s.bosses.includes('shimekiris'),
    },
    { id: 'hen', x: 7, y: 20, name: 'ニワトリ', creature: 'sheep', kind: 'talk', wander: true, lines: ['メェ〜。', '（……ヒツジだった。時計の 呪いで 朝を 知らせる 鳥が いなく なったらしい）'] },
    { id: 'dog4', x: 28, y: 13, name: 'イヌ', creature: 'dog', kind: 'talk', wander: true, lines: ['ワン！', '（毎日 同じ 時間に 散歩に 行きたいのに、時計が 狂って ふきげんらしい）'] },
  ],
}

const clock1: MapDef = {
  id: 'clock1',
  name: 'コヨミノ 時計塔',
  kind: 'dungeon',
  tiles: CLOCK1,
  spawn: { x: 10, y: 12, dir: 'up' },
  exits: [
    { x: 10, y: 13, to: 'koyomi', tx: 16, ty: 5, dir: 'down' },
    { x: 10, y: 2, to: 'clock2', tx: 8, ty: 7, dir: 'up' },
  ],
  signs: [],
  gates: [
    { x: 10, y: 9, puzzle: 'clk_add' },
    { x: 10, y: 4, puzzle: 'clk_weekday' },
  ],
  npcs: [
    ...chest('clk_chest1', 2, 2, { item: 'herb' }),
    ...chest('clk_chest2', 18, 2, { gold: 1000 }),
    ...chest('clk_chest3', 18, 12, { item: 'scroll' }),
  ],
  encounter: clockEnemies,
  encounterRate: CLOCK_RATE,
}

const clock2: MapDef = {
  id: 'clock2',
  name: 'コヨミノ 時計塔 最上階',
  kind: 'dungeon',
  light: true,
  tiles: CLOCK2,
  spawn: { x: 8, y: 7, dir: 'up' },
  exits: [{ x: 8, y: 8, to: 'clock1', tx: 10, ty: 3, dir: 'down' }],
  bossExit: { map: 'koyomi', x: 16, y: 5, dir: 'down' },
  signs: [],
  gates: [{ x: 8, y: 4, puzzle: 'clk_months' }],
  npcs: [
    ...chest('clk_chest4', 3, 7, { equip: 'hourglass_shield' }),
    { id: 'clk_spring', x: 14, y: 7, name: 'ふしぎな 泉', creature: 'spring', kind: 'heal' },
    { id: 'boss_shimekiris', x: 8, y: 2, name: '刻を喰らう者 シメキリス', creature: 'shimekiris', kind: 'boss', bossId: 'shimekiris', hideIf: (s) => s.bosses.includes('shimekiris') },
  ],
  // シメキリスの 前では 敵は出ない
  encounter: (_x, y) => (y <= 3 ? null : clockEnemies()),
  encounterRate: CLOCK_RATE,
}

// ---------------------------------------------------------------- 最終章
const hope: MapDef = {
  id: 'hope',
  name: '最果ての砦 ホープ',
  kind: 'town',
  town: 'hope',
  bossId: 'refera',
  tiles: hopeTiles(),
  spawn: { x: 16, y: 25, dir: 'up' },
  respawn: { map: 'hope_church', x: 5, y: 4 },
  exits: [{ x: 16, y: 4, to: 'castle1', tx: 10, ty: 12, dir: 'up' }],
  signs: [
    { x: 14, y: 7, lines: ['この先 魔王レフエラーの 城。', '城門は 魔王の 結界で 閉ざされている。', '砦の 者たちの 悩みを すべて 解決すれば、結界は とけるだろう。'] },
  ],
  npcs: [
    { id: 'miharu', x: 23, y: 13, name: '見張り番ミハル', look: C.miharu, kind: 'quest', questId: 'err_value', dir: 'up' },
    {
      id: 'hope_coach', x: 17, y: 26, name: '里行きの御者', look: C.coachman, kind: 'ferry', dir: 'up',
      lines: ['コヨミノ行きの 馬車だ。準備が 足りなければ、いつでも 戻れるぞ。'],
      ferry: { to: 'koyomi', x: 31, y: 12, dir: 'right', place: '暦の里 コヨミノ', verb: '向かう' },
    },
    {
      id: 'gatekeeper', x: 18, y: 8, name: '城門の見張り', look: C.soldier9, kind: 'guard', dir: 'left',
      lines: ['この先は 魔王レフエラーの 城だ。', '城門には「#REF!」の 結界が 張られている。どんな 参照も 届かない、黒い 壁だ。', '砦の みんなの 悩みが 晴れれば、結界も 弱まるはずだ。'],
      linesAfter: { when: (s) => s.bosses.includes('refera'), lines: ['魔王が 倒れた……！ 世界じゅうの 数式が、元に 戻っていく！', 'あんたは 本物の 勇者だ。'] },
    },
    {
      id: 'veteran', x: 9, y: 13, name: '古参兵', look: C.ganbaru, kind: 'talk', wander: true,
      lines: ['エラーが 出ると、新兵は すぐ 慌てて 表を 全部 消しちまう。', 'だが エラーには 種類が ある。#DIV/0!・#VALUE!・#NAME?・#REF!・#N/A……。種類を 読めば、直し方は 見える。'],
    },
    {
      id: 'recruit', x: 26, y: 23, name: '新兵', look: C.kid7, kind: 'talk', wander: true, emote: 'sweat',
      lines: ['ま、魔王の 城って、ほんとに 行くんですか……？', '自分の 作った 表が エラーだらけで……もう 何が 何だか……。'],
      linesAfter: { when: (s) => s.bosses.includes('refera'), lines: ['エラーの 意味が わかったら、怖く なくなりました！', '自分の 表は、自分で 直せます！'] },
    },
    { id: 'horse', x: 6, y: 23, name: 'ウマ', creature: 'sheep', kind: 'talk', wander: true, lines: ['メェ〜。', '（……砦の 人いわく、ウマらしい）'] },
  ],
}

const castle1: MapDef = {
  id: 'castle1',
  name: '魔王城',
  kind: 'dungeon',
  tiles: CASTLE1,
  spawn: { x: 10, y: 12, dir: 'up' },
  exits: [
    { x: 10, y: 13, to: 'hope', tx: 16, ty: 5, dir: 'down' },
    { x: 10, y: 2, to: 'castle2', tx: 8, ty: 7, dir: 'up' },
  ],
  signs: [],
  gates: [
    { x: 11, y: 9, puzzle: 'cst_iferror' },
    { x: 10, y: 4, puzzle: 'cst_lookup' },
  ],
  npcs: [
    ...chest('cst_chest1', 2, 2, { item: 'herb' }),
    ...chest('cst_chest2', 18, 2, { item: 'sandglass' }),
    ...chest('cst_chest3', 20, 10, { gold: 1500 }),
  ],
  encounter: castleEnemies,
  encounterRate: CASTLE_RATE,
}

const castle2: MapDef = {
  id: 'castle2',
  name: '魔王城 玉座の間',
  kind: 'dungeon',
  light: true,
  tiles: CASTLE2,
  spawn: { x: 8, y: 7, dir: 'up' },
  exits: [{ x: 8, y: 8, to: 'castle1', tx: 10, ty: 3, dir: 'down' }],
  bossExit: { map: 'hope', x: 16, y: 5, dir: 'down' },
  signs: [],
  gates: [{ x: 8, y: 4, puzzle: 'cst_seals' }],
  npcs: [
    ...chest('cst_chest4', 3, 7, { equip: 'excel_sword' }),
    { id: 'cst_spring', x: 14, y: 7, name: 'ふしぎな 泉', creature: 'spring', kind: 'heal' },
    { id: 'boss_refera', x: 8, y: 2, name: '魔王レフエラー', creature: 'refera', kind: 'boss', bossId: 'refera', hideIf: (s) => s.bosses.includes('refera') },
  ],
  // 魔王の 前では 敵は出ない
  encounter: (_x, y) => (y <= 3 ? null : castleEnemies()),
  encounterRate: CASTLE_RATE,
}

const rooms: MapDef[] = [
  room('celuno_elder', '長老の家', 'celuno', 'elder', [
    {
      id: 'elder', x: 5, y: 4, name: '長老', look: C.elder, kind: 'talk',
      lines: ['村の皆の悩みを 聞いてやってくれ。頭の上に「！」が出ている者が 困っておる。', '家の中に いる者もおるぞ。ドアの上に「！」が出ておる家を 訪ねてみなされ。', '全員を助ければ、北の結界が とけるはずじゃ。'],
      linesAfter: { when: (s) => s.bosses.includes('slime'), lines: ['セルイムを 正気に戻してくれたか！', '東の橋を 渡った先の「計算の町 カルキュレ」も 呪いで 大変らしい。行ってやってくれんか。'] },
    },
    { id: 'elder_wife', x: 8, y: 2, name: '長老の妻', look: C.elderWife, kind: 'talk', lines: ['あらあら、お客さんかい。', 'うちの人ったら、魔王の話になると 止まらなくてねぇ。お茶でも 飲んでいきなさいな。'] },
  ]),
  room('celuno_inn', 'セルノの宿屋', 'celuno', 'inn', [
    inn('inn1', 8, 2, C.inn),
    { id: 'guest1', x: 5, y: 5, name: '旅の商人', look: C.guest, kind: 'talk', lines: ['東の カルキュレじゃ、みんな 手計算で ヘトヘトらしい。', 'わしも 帳簿つけで 目が しょぼしょぼだよ……。'] },
  ]),
  room('celuno_church', 'セルノの教会', 'celuno', 'church', [
    church('church1', 5, 2),
    { id: 'prayer', x: 2, y: 6, name: '祈る村人', look: C.prayer, kind: 'talk', lines: ['どうか 表の呪いが とけますように……。', '神父さまに 話せば、冒険の記録を 残してくださいますよ。'] },
  ]),
  room('celuno_shop', 'リコ商店', 'celuno', 'shop', [
    shop('shop1', 2, 2, C.shop),
    { id: 'riko', x: 7, y: 4, name: '道具屋のリコ', look: C.riko, kind: 'quest', questId: 'celuno_fix' },
  ]),
  room('celuno_weapon', 'ケン武器店', 'celuno', 'weapon', [
    {
      id: 'ken', x: 2, y: 2, name: '武器屋ケン', look: C.ken, kind: 'gear',
      stock: ['hinoki_pen', 'copper_pencil', 'marker_sword'],
      lines: ['へいらっしゃい！ ここは 武器の店だ。', 'この世界じゃ ペン1本が 立派な 武器になるんだぜ。'],
    },
  ]),
  room('celuno_armor', 'マモル防具店', 'celuno', 'armor', [
    {
      id: 'mamoru', x: 2, y: 2, name: '防具屋マモル', look: C.mamoru, kind: 'gear',
      stock: ['coolbiz', 'business_vest', 'clipboard', 'hachimaki'],
      lines: ['ようこそ、防具の店へ。', '守りを かためれば、まちがえても 痛くないぞ。'],
    },
  ]),
  room('celuno_pen', '書記ペンの家', 'celuno', 'small', [{ id: 'pen', x: 3, y: 4, name: '書記のペン', look: C.pen, kind: 'quest', questId: 'celuno_undo' }]),
  room('celuno_toki', 'トキの家', 'celuno', 'cozy', [{ id: 'toki', x: 4, y: 2, name: '暦のおばば トキ', look: C.toki, kind: 'quest', questId: 'celuno_fill' }]),
  room('calc_weapon', 'ガンテツ武器店', 'calculet', 'weapon', [
    {
      id: 'hanma', x: 2, y: 2, name: '見習いのハンマ', look: C.hanma, kind: 'gear',
      stock: ['copper_pencil', 'marker_sword', 'iron_mouse', 'steel_keyboard', 'shortcut_sword'],
      lines: ['いらっしゃいませ！ 親方の 自慢の品ばかりっす！'],
    },
    { id: 'gantetsu', x: 7, y: 4, name: '武器屋ガンテツ', look: C.gantetsu, kind: 'quest', questId: 'calc_arith' },
  ]),
  room('calc_armor', 'ヨロイダ防具店', 'calculet', 'armor', [
    {
      id: 'yoroida', x: 2, y: 2, name: '防具屋ヨロイダ', look: C.yoroida, kind: 'gear',
      stock: ['business_vest', 'new_suit', 'order_suit', 'iron_binder', 'laptop_shield', 'bluelight', 'headphones'],
      lines: ['いらっしゃい。「身だしなみ」は 最強の 防具よ。'],
    },
  ]),
  room('calc_bakery', 'マーサのパン屋', 'calculet', 'bakery', [
    { id: 'martha', x: 2, y: 2, name: 'パン屋のマーサ', look: C.martha, kind: 'quest', questId: 'calc_sum' },
    { id: 'bread_kid', x: 7, y: 4, name: 'パン好きの少年', look: C.student, kind: 'talk', wander: true, lines: ['ここの クロワッサン、世界一なんだ！', 'でも マーサさん、最近 計算ばっかりで 元気ないんだよね。'] },
  ]),
  room('calc_school', 'モンスター学校', 'calculet', 'school', [
    { id: 'minerva', x: 7, y: 3, name: '先生ミネルバ', look: C.minerva, kind: 'quest', questId: 'calc_average' },
    { id: 'surao', x: 3, y: 5, name: 'プルお', creature: 'celime', kind: 'talk', lines: ['ぼく 72点だったよ。', '平均点より 上かなぁ？ 下かなぁ？ ぷるぷる……。'] },
    { id: 'student', x: 6, y: 5, name: 'タケ吉', look: C.student, kind: 'talk', lines: ['ピカ坊は 100点なんだって！ ずるいよ〜。', '平均点が わかれば、自分が どのへんか わかるのになぁ。'] },
  ]),
  room('calc_hall', 'カルキュレ町役場', 'calculet', 'hall', [
    { id: 'calk', x: 6, y: 2, name: '町長カルク', look: C.calk, kind: 'quest', questId: 'calc_report' },
    {
      id: 'official', x: 10, y: 4, name: 'つかれた役人', look: C.official, kind: 'talk', emote: 'sweat',
      lines: ['うう……月報の 足し算が……終わらない……。', 'たし……たし……くりあがり……。'],
      linesAfter: { when: (s) => s.solved.includes('calc_report'), lines: ['町長から 聞きました！ SUMという魔法で 月報が一瞬で……！', '今日は 定時で 帰れそうです！'] },
    },
  ]),
  room('calc_inn', 'カルキュレの宿屋', 'calculet', 'inn', [
    inn('inn2', 8, 2, C.inn2),
    { id: 'count', x: 2, y: 5, name: '帳簿番カウン', look: C.kaun, kind: 'quest', questId: 'calc_count', dir: 'right' },
  ]),
  room('calc_church', 'カルキュレの教会', 'calculet', 'church', [church('church2', 5, 2)]),
  room('calc_shop', 'カルキュレ道具店', 'calculet', 'shop', [shop('shop2', 2, 2, C.shop2)]),
  room('sansho_hall', 'サンショウ町長の館', 'sansho', 'hall', [
    { id: 'kagami', x: 6, y: 2, name: '町長カガミ', look: C.kagami, kind: 'quest', questId: 'sansho_round' },
    {
      id: 'secretary', x: 2, y: 5, name: '町長の秘書', look: C.official, kind: 'talk', wander: true,
      lines: ['町の 予算表が ずれたせいで、税金の 計算が 合わないんです……。', '1円でも ずれると、監査の人に 怒られちゃうんですよ……。'],
    },
  ]),
  room('sansho_weapon', 'ウツシ鏡工房', 'sansho', 'weapon', [
    {
      id: 'utsushi', x: 2, y: 2, name: '鏡職人ウツシ', look: C.utsushi, kind: 'gear',
      stock: ['marker_sword', 'shortcut_sword', 'mirror_rapier', 'dollar_lance'],
      lines: ['……鏡を 磨くように、武器も 磨く。', 'ブレない 刃は、ブレない 心に 宿るものだ。'],
    },
  ]),
  room('sansho_armor', 'ギンジ防具店', 'sansho', 'armor', [
    {
      id: 'ginji', x: 2, y: 2, name: '防具屋ギンジ', look: C.ginji, kind: 'gear',
      stock: ['order_suit', 'silver_suit', 'laptop_shield', 'mirror_shield', 'loupe'],
      lines: ['いらっしゃい！ 銀の防具は 呪いを はね返すぜ。', 'ルーペめがねは おすすめだ。細かい「$」も 見逃さない！'],
    },
  ]),
  room('sansho_inn', 'サンショウの宿屋', 'sansho', 'inn', [
    inn('inn3', 8, 2, C.inn3),
    { id: 'guest3', x: 5, y: 5, name: '旅の会計士', look: C.guest, kind: 'talk', lines: ['この町の 呪いは やっかいだ。', '数式を 1つ 作って コピーすれば 済むはずが、全部 ずれて 手で 直す はめになる。', '……まるで 手計算に 逆もどりだよ。'] },
  ]),
  room('sansho_church', 'サンショウの教会', 'sansho', 'church', [church('church3', 5, 2)]),
  room('sansho_shop', 'サンショウ道具店', 'sansho', 'shop', [shop('shop3', 2, 2, C.shop3)]),
  room('sansho_bank', 'ドルマ両替所', 'sansho', 'bank', [
    { id: 'dolma', x: 2, y: 2, name: '両替商ドルマ', look: C.dolma, kind: 'quest', questId: 'sansho_abs' },
    { id: 'bank_guest', x: 7, y: 5, name: '両替に来た客', look: C.traveler, kind: 'talk', lines: ['両替してもらったら、計算が おかしいんだ。', '金貨 100枚が 0枚に なったって 言われたよ……。'] },
  ]),
  room('sansho_tailor', 'ヌイ仕立て屋', 'sansho', 'tailor', [{ id: 'nui', x: 6, y: 2, name: '仕立て屋ヌイ', look: C.nui, kind: 'quest', questId: 'sansho_f4', dir: 'down' }]),
  room('sansho_school', 'カケル寺子屋', 'sansho', 'school', [
    { id: 'kakeru', x: 7, y: 3, name: 'カケル先生', look: C.kakeru, kind: 'quest', questId: 'sansho_mix' },
    { id: 'pupil', x: 3, y: 5, name: '寺子屋の子', look: C.kid3, kind: 'talk', lines: ['九九の表を 作ってるんだけど、81マス 全部 手で 計算するの……？', 'もう 手が 痛いよ〜。'] },
  ]),
  room('sansho_house', 'ウツシの家', 'sansho', 'home', [
    { id: 'utsushi_wife', x: 6, y: 4, name: 'ウツシの妻', look: C.elderWife, kind: 'talk', lines: ['うちの人は 無口だけど、腕は 確かよ。', '神殿の 大鏡も、昔 うちの人が 磨いていたの。あんな 魔物が 住みつくなんてねぇ……。'] },
  ]),
  room('port_office', '港長の事務所', 'ifport', 'hall', [
    { id: 'minato', x: 6, y: 2, name: '港長ミナト', look: C.minato, kind: 'quest', questId: 'port_countif' },
    {
      id: 'port_clerk', x: 10, y: 5, name: '事務所の職員', look: C.official, kind: 'talk', wander: true, emote: 'sweat',
      lines: ['入港記録が 山のように……。', '「魚を 運んできた 船は 何隻？」って 聞かれるたびに、1行ずつ 指で 数えてるんです……。'],
      linesAfter: { when: (s) => s.solved.includes('port_countif'), lines: ['COUNTIF と SUMIF……。聞かれた 瞬間に 答えられるように なりました！'] },
    },
  ]),
  room('port_weapon', 'モリ武器店', 'ifport', 'weapon', [
    {
      id: 'mori', x: 2, y: 2, name: '武器屋モリ', look: C.mori, kind: 'gear',
      stock: ['mirror_rapier', 'dollar_lance', 'anchor_axe', 'branch_trident'],
      lines: ['……海の男の 武器を 見ていけ。', '分岐のトライデントは 3つ又だ。どんな「もしも」にも 対応できるぜ。'],
    },
  ]),
  room('port_armor', 'ウロコ防具店', 'ifport', 'armor', [
    {
      id: 'uroko', x: 2, y: 2, name: '防具屋ウロコ', look: C.uroko, kind: 'gear',
      stock: ['silver_suit', 'captain_coat', 'mirror_shield', 'buoy_shield', 'captain_hat'],
      lines: ['いらっしゃい！ 海の 防具なら うちに おまかせ！', '浮き輪のたては 見た目は アレだけど、性能は 本物よ。'],
    },
  ]),
  room('port_inn', 'イフポートの宿屋', 'ifport', 'inn', [
    inn('inn4', 8, 2, C.inn4),
    { id: 'guest4', x: 5, y: 5, name: '足止めの旅人', look: C.traveler, kind: 'talk', lines: ['船に 乗りたいんだが、「もしも 嵐だったら」と 船長たちが 決めきれなくて、出航しないんだ。', '決まりを 作っておけば、悩まずに すむのにな……。'] },
  ]),
  room('port_church', 'イフポートの教会', 'ifport', 'church', [church('church4', 5, 2)]),
  room('port_shop', 'イフポート道具店', 'ifport', 'shop', [shop('shop4', 2, 2, C.shop4)]),
  room('port_school', '航海士学校', 'ifport', 'school', [
    { id: 'rope', x: 7, y: 3, name: 'ロープ教官', look: C.rope, kind: 'quest', questId: 'port_nested' },
    { id: 'cadet', x: 3, y: 5, name: '航海士の卵', look: C.cadet, kind: 'talk', lines: ['試験の 評価が まだ 出ないんです……。', '教官、1人ずつ「80点以上なら A……いや 60点は……」って ずっと 悩んでて……。'] },
  ]),
  room('port_express', 'ハコブ運送', 'ifport', 'bank', [
    { id: 'hakobu', x: 2, y: 2, name: '運送屋ハコブ', look: C.hakobu, kind: 'quest', questId: 'port_ifcalc' },
  ]),
  room('port_fisher', 'アミの家', 'ifport', 'home', [
    { id: 'ami_mother', x: 6, y: 4, name: 'アミの母', look: C.amiMother, kind: 'talk', lines: ['アミは 朝から 晩まで 桟橋に いるのよ。', '海が 大好きなのは いいけど、帳簿つけは 苦手みたいでねぇ。'] },
  ]),
  room('port_weather', '気象台', 'ifport', 'small', [{ id: 'kazami', x: 3, y: 4, name: '天気予報士カザミ', look: C.kazami, kind: 'quest', questId: 'port_andor' }]),
  room('port_storage', '港の倉庫', 'ifport', 'cozy', [
    { id: 'storekeeper', x: 4, y: 4, name: '倉庫番', look: C.storekeeper, kind: 'talk', lines: ['積荷の 箱が 天井まで……。', '「重い箱は 右、軽い箱は 左」って 決めれば いいのに、1箱ずつ 「どっちかなぁ」と 悩んじまう。これも 幽霊船の 呪いかねぇ。'] },
  ]),
  room('lookup_hall', '大臣の館', 'lookup', 'hall', [
    { id: 'sagasu', x: 6, y: 2, name: '大臣サガス', look: C.sagasu, kind: 'quest', questId: 'lookup_minister' },
    {
      id: 'steward', x: 10, y: 5, name: '執事', look: C.official, kind: 'talk', wander: true, emote: 'sweat',
      lines: ['晩餐会の 準備が 進みません……。', '在庫台帳から 1品ずつ 探しているのですが、見つからない 品が あると そこで 手が 止まってしまうのです。'],
    },
  ]),
  room('lookup_weapon', 'ルーペ武器店', 'lookup', 'weapon', [
    {
      id: 'loupe_smith', x: 2, y: 2, name: '武器屋メガネ', look: C.roll, kind: 'gear',
      stock: ['anchor_axe', 'branch_trident', 'loupe_blade', 'index_spear'],
      lines: ['いらっしゃいませ。探しものに 強い 武器を そろえております。', '索引の槍は、目録の 1行を 正確に 貫きますよ。'],
    },
  ]),
  room('lookup_armor', 'ショカ防具店', 'lookup', 'armor', [
    {
      id: 'shoka', x: 2, y: 2, name: '防具屋ショカ', look: C.shelfa, kind: 'gear',
      stock: ['captain_coat', 'librarian_robe', 'buoy_shield', 'catalog_shield', 'bookmark_band'],
      lines: ['いらっしゃい！ 書庫の 司書たちが 愛用する 防具よ。', 'しおりのハチマキは、大事な ページを 見失わない すぐれもの！'],
    },
  ]),
  room('lookup_inn', 'ルックアップの宿屋', 'lookup', 'inn', [
    inn('inn5', 8, 2, C.inn5),
    { id: 'guest5', x: 5, y: 5, name: '調べものの 旅人', look: C.traveler, kind: 'talk', lines: ['大書庫に 古い 地図を 調べに 来たんだが、入れて もらえなくてね。', '城下の 人たちも、帳簿から 目当ての 行を 探すのに 一日 かかっているらしい。'] },
  ]),
  room('lookup_church', 'ルックアップの教会', 'lookup', 'church', [church('church5', 5, 2)]),
  room('lookup_shop', 'カタログ道具店', 'lookup', 'shop', [
    shop('shop5', 2, 2, C.shop5),
    { id: 'catalog', x: 7, y: 4, name: '道具屋のカタログ', look: C.catalog, kind: 'quest', questId: 'lookup_col' },
  ]),
  room('lookup_library', '城下の図書館', 'lookup', 'school', [
    { id: 'shoko', x: 7, y: 3, name: '司書ショコ', look: C.shoko, kind: 'quest', questId: 'lookup_iferror' },
    { id: 'reader', x: 3, y: 5, name: '本の虫の 少女', look: C.reader, kind: 'talk', lines: ['「#N/A」って 書いてある カードを 引いちゃった……。', 'なんだか 怖いよ。本は ちゃんと あるはず なのに。'] },
  ]),
  room('lookup_knights', '騎士団の詰所', 'lookup', 'bank', [
    { id: 'roll', x: 2, y: 2, name: '騎士団の書記ロール', look: C.roll, kind: 'quest', questId: 'lookup_xlookup' },
    { id: 'knight', x: 7, y: 5, name: '見習い騎士', look: C.hantei, kind: 'talk', lines: ['騎士番号で 呼ばれても、自分の 名前が 名簿の どこに あるか わからないんです……。', '名簿の いちばん 右に 番号、いちばん 左に 名前。遠すぎますよね？'] },
  ]),
  room('pivo_hall', '宰相の館', 'pivoria', 'hall', [
    { id: 'hyouma', x: 6, y: 2, name: '宰相ヒョウマ', look: C.hyouma, kind: 'quest', questId: 'pivo_crosstab' },
    { id: 'shoukei', x: 3, y: 5, name: '書記官ショウケイ', look: C.shoukei, kind: 'quest', questId: 'pivo_summary', dir: 'right' },
  ]),
  room('pivo_weapon', '王都の武器工房', 'pivoria', 'weapon', [
    {
      id: 'pivo_smith', x: 2, y: 2, name: '武器職人タバネ', look: C.smith6, kind: 'gear',
      stock: ['loupe_blade', 'index_spear', 'tally_hammer', 'royal_scepter'],
      lines: ['よう、旅の人。王都 いちばんの 鍛冶屋 タバネだ。', '集計のハンマーは、バラバラの 記録を 叩いて 1つに まとめる 逸品だぜ。'],
    },
  ]),
  room('pivo_armor', '王都の仕立屋', 'pivoria', 'armor', [
    {
      id: 'pivo_tailor', x: 2, y: 2, name: '仕立屋ツヅリ', look: C.noble, kind: 'gear',
      stock: ['librarian_robe', 'royal_suit', 'catalog_shield', 'ledger_shield', 'bookmark_band', 'pivot_crown'],
      lines: ['いらっしゃいませ。王宮御用達の 仕立屋 ツヅリですわ。', '王宮の礼服は、宰相さまも お認めに なった 正装ですのよ。'],
    },
  ]),
  room('pivo_inn', 'ピボリアの宿屋', 'pivoria', 'inn', [
    inn('inn6', 8, 2, C.inn6),
    { id: 'guest6', x: 5, y: 5, name: '旅の商人', look: C.traveler, kind: 'talk', lines: ['王都に 商売の 報告に 来たんだが、役所の 集計が 終わらなくて 足止めさ。', '「どの 店の、どの 品が、いくら 売れたか」……条件が 2つに なると、とたんに 手が 止まるらしい。'] },
  ]),
  room('pivo_church', 'ピボリアの大聖堂', 'pivoria', 'church', [church('church6', 5, 2)]),
  room('pivo_shop', '王都の道具屋', 'pivoria', 'shop', [
    shop('shop6', 2, 2, C.shop6),
    { id: 'clerk6', x: 7, y: 4, name: '道具屋の見習い', look: C.kid5, kind: 'talk', lines: ['在庫を 品目ごと・棚ごとに 数えろって 言われて……', '1つの 条件なら 数えられるのに、2つ に なると 頭が こんがらがるんです！'] },
  ]),
  room('pivo_school', '王立学院', 'pivoria', 'school', [
    { id: 'manabu', x: 6, y: 2, name: '学者マナブ', look: C.manabu, kind: 'quest', questId: 'pivo_average' },
    { id: 'student6', x: 3, y: 5, name: '学院の生徒', look: C.student, kind: 'talk', lines: ['クラス全体の 平均なら AVERAGE で 出せるんだ。', 'でも「赤組だけの 平均」って 言われると……赤組の 点数だけ 書き写すしか ないのかなぁ。'] },
  ]),
  room('pivo_bank', '王都の税務所', 'pivoria', 'bank', [
    { id: 'zeim', x: 2, y: 2, name: '税務官ゼイム', look: C.zeim, kind: 'quest', questId: 'pivo_compare' },
    { id: 'taxpayer', x: 7, y: 5, name: '納税に 来た 商人', look: C.shop5, kind: 'talk', lines: ['税務所は いつも 大行列だ。', '帳簿の 束を 1枚ずつ めくって、地区と 金額を 確かめているらしい。'] },
  ]),
  room('text_hall', '宿場長の屋敷', 'textria', 'hall', [
    { id: 'kakiko', x: 6, y: 2, name: '宿場長カキコ', look: C.kakiko, kind: 'quest', questId: 'text_find' },
    { id: 'clerk7', x: 9, y: 5, name: '屋敷の書生', look: C.student, kind: 'talk', wander: true, lines: ['伝書鳩の あて先が 読めなくて、手紙が 迷子に なって いるんです。', '「@」の 前と 後ろで 分けられたら、すぐ 届けられるのに……。'] },
  ]),
  room('text_weapon', '活字の武器屋', 'textria', 'weapon', [
    {
      id: 'text_smith', x: 2, y: 2, name: '武器屋スミツキ', look: C.smith6, kind: 'gear',
      stock: ['tally_hammer', 'royal_scepter', 'quill_saber', 'ampersand_blade'],
      lines: ['いらっしゃい。文字を 斬る 武器なら うちに おまかせ。', 'アンパサンドの剣は、離れた ものを 1つに つなぐ 不思議な 剣だよ。'],
    },
  ]),
  room('text_armor', '植字工の防具屋', 'textria', 'armor', [
    {
      id: 'text_tailor', x: 2, y: 2, name: '防具屋クミハン', look: C.printer, kind: 'gear',
      stock: ['royal_suit', 'typesetter_apron', 'ledger_shield', 'galley_shield', 'pivot_crown', 'proof_glasses'],
      lines: ['よう。印刷所の 職人たちの 防具を 作ってる クミハンだ。', 'ゲラ箱のたては、活字を 並べる 箱を 打ち直した 頑丈な 盾さ。'],
    },
  ]),
  room('text_inn', 'テキストリアの宿屋', 'textria', 'inn', [
    inn('inn7', 8, 2, C.inn7),
    { id: 'fumi', x: 2, y: 6, name: '宿帳係フミ', look: C.fumi, kind: 'quest', questId: 'text_concat', dir: 'right' },
  ]),
  room('text_church', 'テキストリアの教会', 'textria', 'church', [church('church7', 5, 2)]),
  room('text_shop', '看板と道具の店', 'textria', 'shop', [
    shop('shop7', 2, 2, C.shop7),
    { id: 'kanba', x: 7, y: 4, name: '看板屋カンバ', look: C.kanba, kind: 'quest', questId: 'text_len' },
  ]),
  room('text_school', '宿場の寺子屋', 'textria', 'school', [
    { id: 'narabe', x: 6, y: 2, name: '書記ナラベ', look: C.narabe, kind: 'quest', questId: 'text_clean' },
    { id: 'pupil7', x: 3, y: 5, name: '寺子屋の子', look: C.kid5, kind: 'talk', lines: ['名前を 並べたら、空白の せいで ガタガタに なっちゃった。', '先生が「よけいな 空白は 魔物の しわざ」だって。'] },
  ]),
  room('text_post', '宿場の通信所', 'textria', 'bank', [
    { id: 'denwa', x: 2, y: 2, name: '通信士デンワ', look: C.denwa, kind: 'quest', questId: 'text_mid' },
    { id: 'caller', x: 7, y: 5, name: '電話を かけに 来た 商人', look: C.shop5, kind: 'talk', lines: ['局番ごとに 料金が ちがうらしいんだが、番号の どこが 局番か わからなくてね。'] },
  ]),
  room('koyo_hall', '村長の家', 'koyomi', 'hall', [
    { id: 'tokiwa', x: 6, y: 2, name: '村長トキワ', look: C.tokiwa, kind: 'quest', questId: 'date_datedif' },
    { id: 'koyo_wife', x: 9, y: 5, name: '村長の妻', look: C.toki, kind: 'talk', wander: true, lines: ['うちの 人ったら、村人の 入村日を 帳面に 書いては、指折り 数えて いるのよ。', '「満 何年」って、数えるの 難しいのよね。誕生日を 過ぎたか どうかも あるし。'] },
  ]),
  room('koyo_weapon', '時の武器屋', 'koyomi', 'weapon', [
    {
      id: 'koyo_smith', x: 2, y: 2, name: '武器屋ハリ', look: C.smith6, kind: 'gear',
      stock: ['quill_saber', 'ampersand_blade', 'clockhand_spear', 'calendar_axe'],
      lines: ['いらっしゃい。時計の 針から 打った 槍が 自慢さ。', '暦のオノは、ひと振りで 1年分の 敵を なぎはらうって 評判だよ。'],
    },
  ]),
  room('koyo_armor', '時の防具屋', 'koyomi', 'armor', [
    {
      id: 'koyo_tailor', x: 2, y: 2, name: '防具屋トケ', look: C.clockman, kind: 'gear',
      stock: ['typesetter_apron', 'moonphase_robe', 'galley_shield', 'hourglass_shield', 'proof_glasses', 'alarm_band'],
      lines: ['いらっしゃい。時を 味方に つける 防具を そろえて おるよ。', '目覚ましのハチマキは、どんな 締め切りにも 遅れない 優れものじゃ。'],
    },
  ]),
  room('koyo_inn', 'コヨミノの宿屋', 'koyomi', 'inn', [
    inn('inn8', 8, 2, C.inn8),
    { id: 'guest8', x: 5, y: 5, name: '湯治の 旅人', look: C.traveler, kind: 'talk', lines: ['3泊の つもりで 来たのに、いつ 帰る 日なのか わからなく なってしまった。', '「到着日 ＋ 3」で わかるはず なんだが……。'] },
  ]),
  room('koyo_church', 'コヨミノの教会', 'koyomi', 'church', [church('church8', 5, 2)]),
  room('koyo_shop', '暦の道具屋', 'koyomi', 'shop', [
    shop('shop8', 2, 2, C.shop8),
    { id: 'tsukimi', x: 7, y: 4, name: '契約係ツキミ', look: C.tsukimi, kind: 'quest', questId: 'date_edate' },
  ]),
  room('koyo_school', '里の寄り合い所', 'koyomi', 'school', [
    { id: 'hare', x: 6, y: 2, name: 'お祝い係ハレ', look: C.hare, kind: 'quest', questId: 'date_parts' },
    { id: 'koyo_elder', x: 3, y: 5, name: '寄り合いの 老人', look: C.elder, kind: 'talk', lines: ['わしの 誕生日は 何月 じゃったかのう……。', '名簿には 書いて あるんじゃが、年も 月も 日も くっついとって 読みにくいわい。'] },
  ]),
  room('koyo_post', '飛脚屋', 'koyomi', 'bank', [
    { id: 'hayate', x: 2, y: 2, name: '飛脚ハヤテ', look: C.hayate, kind: 'quest', questId: 'date_add' },
    { id: 'koyo_client', x: 7, y: 5, name: '荷物を 頼みに 来た 客', look: C.shop5, kind: 'talk', lines: ['「10日後に 届けて くれ」と 頼んだら、「10日後って 何日？」と 聞き返されてね……。'] },
  ]),
  room('hope_hall', '砦の本陣', 'hope', 'hall', [
    { id: 'ganbaru', x: 6, y: 2, name: '砦の長ガンバル', look: C.ganbaru, kind: 'quest', questId: 'err_final' },
    { id: 'matome', x: 3, y: 5, name: '兵站長マトメ', look: C.matome, kind: 'quest', questId: 'err_report', dir: 'right' },
  ]),
  room('hope_weapon', '砦の武器庫', 'hope', 'weapon', [
    {
      id: 'hope_smith', x: 2, y: 2, name: '武器係ツルギ', look: C.smith6, kind: 'gear',
      stock: ['ampersand_blade', 'clockhand_spear', 'calendar_axe', 'iferror_lance'],
      lines: ['ここは 砦の 武器庫だ。魔王と 戦う 者に、最高の 武器を。', 'IFERRORの槍は、どんな エラーも 受け流して 貫く 槍だ。'],
    },
  ]),
  room('hope_armor', '砦の防具庫', 'hope', 'armor', [
    {
      id: 'hope_tailor', x: 2, y: 2, name: '防具係マモル', look: C.soldier9, kind: 'gear',
      stock: ['moonphase_robe', 'hero_suit', 'hourglass_shield', 'sheet_shield', 'alarm_band', 'focus_crown'],
      lines: ['防具庫だ。魔王の「#REF!」に 耐えられる 防具を 用意してある。', '勇者のスーツは、むかし この 世界を 救った 者が 着ていたと いう。'],
    },
  ]),
  room('hope_inn', '砦の宿舎', 'hope', 'inn', [
    inn('inn9', 8, 2, C.inn9),
    { id: 'guest9', x: 5, y: 5, name: '休んでいる 兵士', look: C.soldier9, kind: 'talk', lines: ['出陣の 前の 晩は、眠れないもんだ。', 'あんたが 7つの 町を 救ったって 本当か？ ……なら、きっと 勝てる。'] },
  ]),
  room('hope_church', '砦の礼拝堂', 'hope', 'church', [church('church9', 5, 2)]),
  room('hope_shop', '補給所', 'hope', 'shop', [
    shop('shop9', 2, 2, C.shop9),
    { id: 'warizan', x: 7, y: 4, name: '補給係ワリザン', look: C.warizan, kind: 'quest', questId: 'err_div0' },
  ]),
  room('hope_school', '書記の詰所', 'hope', 'school', [
    { id: 'kakumisu', x: 6, y: 2, name: '書記兵カクミス', look: C.kakumisu, kind: 'quest', questId: 'err_name' },
    { id: 'clerk9', x: 3, y: 5, name: '見習い書記', look: C.student, kind: 'talk', lines: ['先輩の 式、どこが 間違ってるか わからないって 嘆いてました。', '関数の 名前って、1文字 ちがうだけで 動かなく なるんですね……。'] },
  ]),
  room('hope_map', '地図の間', 'hope', 'bank', [
    { id: 'tsunagi', x: 2, y: 2, name: '地図係ツナギ', look: C.tsunagi, kind: 'quest', questId: 'err_ref' },
    { id: 'scout9', x: 7, y: 5, name: '斥候', look: C.traveler, kind: 'talk', lines: ['魔王城の 中は、扉の 謎だらけだ。', 'これまで 覚えた 魔法を、組み合わせないと 開かない らしい。'] },
  ]),
  room('calc_house', 'ナミオの家', 'calculet', 'home', [
    { id: 'wife2', x: 6, y: 4, name: 'ナミオの妻', look: C.wife2, kind: 'talk', lines: ['うちの人ったら、釣った魚の数を 毎日 紙に 書いてるのよ。', '表にすれば 一番多い日も すぐ わかるのにねぇ。'] },
  ]),
]

export const MAPS: Record<string, MapDef> = Object.fromEntries(
  [celuno, calculet, forestMap, world, cave, tower1, tower2, tower3, sansho, temple1, temple2, ifport, ship1, ship2, lookup, library1, library2, pivoria, treasury1, treasury2, textria, print1, print2, koyomi, clock1, clock2, hope, castle1, castle2, ...rooms].map((m) => [m.id, m]),
)

// 町のドア → 室内
link(celuno, 5, 8, MAPS.celuno_elder)
link(celuno, 22, 8, MAPS.celuno_inn)
link(celuno, 5, 19, MAPS.celuno_church)
link(celuno, 23, 19, MAPS.celuno_shop)
link(celuno, 11, 19, MAPS.celuno_pen)
link(celuno, 18, 19, MAPS.celuno_toki)
link(celuno, 11, 8, MAPS.celuno_weapon)
link(celuno, 17, 8, MAPS.celuno_armor)
link(calculet, 5, 27, MAPS.calc_armor)
// 北の塔の扉 → 塔の1階
calculet.exits.push({ x: 15, y: 4, to: 'tower1', tx: 10, ty: 12, dir: 'up' })
link(calculet, 4, 10, MAPS.calc_weapon)
link(calculet, 9, 10, MAPS.calc_bakery)
link(calculet, 21, 10, MAPS.calc_school)
link(calculet, 28, 10, MAPS.calc_hall)
link(calculet, 3, 18, MAPS.calc_inn)
link(calculet, 9, 18, MAPS.calc_church)
link(calculet, 22, 18, MAPS.calc_shop)
link(calculet, 28, 18, MAPS.calc_house)
link(sansho, 4, 10, MAPS.sansho_hall)
link(sansho, 10, 10, MAPS.sansho_weapon)
link(sansho, 22, 10, MAPS.sansho_armor)
link(sansho, 28, 10, MAPS.sansho_inn)
link(sansho, 4, 18, MAPS.sansho_church)
link(sansho, 10, 18, MAPS.sansho_shop)
link(sansho, 22, 18, MAPS.sansho_bank)
link(sansho, 28, 18, MAPS.sansho_tailor)
link(sansho, 5, 26, MAPS.sansho_school)
link(sansho, 27, 26, MAPS.sansho_house)
link(ifport, 4, 5, MAPS.port_office)
link(ifport, 11, 5, MAPS.port_weapon)
link(ifport, 22, 5, MAPS.port_armor)
link(ifport, 29, 5, MAPS.port_inn)
link(ifport, 4, 13, MAPS.port_church)
link(ifport, 10, 13, MAPS.port_shop)
link(ifport, 22, 13, MAPS.port_school)
link(ifport, 29, 13, MAPS.port_express)
link(ifport, 4, 20, MAPS.port_fisher)
link(ifport, 10, 20, MAPS.port_weather)
link(ifport, 29, 20, MAPS.port_storage)
link(lookup, 4, 10, MAPS.lookup_hall)
link(lookup, 11, 10, MAPS.lookup_weapon)
link(lookup, 22, 10, MAPS.lookup_armor)
link(lookup, 29, 10, MAPS.lookup_inn)
link(lookup, 4, 18, MAPS.lookup_church)
link(lookup, 10, 18, MAPS.lookup_shop)
link(lookup, 22, 18, MAPS.lookup_library)
link(lookup, 29, 18, MAPS.lookup_knights)
link(pivoria, 4, 10, MAPS.pivo_hall)
link(pivoria, 11, 10, MAPS.pivo_weapon)
link(pivoria, 21, 10, MAPS.pivo_armor)
link(pivoria, 29, 10, MAPS.pivo_inn)
link(pivoria, 4, 18, MAPS.pivo_church)
link(pivoria, 10, 18, MAPS.pivo_shop)
link(pivoria, 22, 18, MAPS.pivo_school)
link(pivoria, 29, 18, MAPS.pivo_bank)
link(textria, 4, 10, MAPS.text_hall)
link(textria, 11, 10, MAPS.text_weapon)
link(textria, 21, 10, MAPS.text_armor)
link(textria, 29, 10, MAPS.text_inn)
link(textria, 4, 19, MAPS.text_church)
link(textria, 10, 19, MAPS.text_shop)
link(textria, 22, 19, MAPS.text_school)
link(textria, 29, 19, MAPS.text_post)
link(koyomi, 4, 10, MAPS.koyo_hall)
link(koyomi, 11, 10, MAPS.koyo_weapon)
link(koyomi, 21, 10, MAPS.koyo_armor)
link(koyomi, 29, 10, MAPS.koyo_inn)
link(koyomi, 4, 19, MAPS.koyo_church)
link(koyomi, 9, 19, MAPS.koyo_shop)
link(koyomi, 24, 19, MAPS.koyo_school)
link(koyomi, 30, 19, MAPS.koyo_post)
link(hope, 4, 10, MAPS.hope_hall)
link(hope, 11, 10, MAPS.hope_weapon)
link(hope, 21, 10, MAPS.hope_armor)
link(hope, 29, 10, MAPS.hope_inn)
link(hope, 4, 19, MAPS.hope_church)
link(hope, 10, 19, MAPS.hope_shop)
link(hope, 22, 19, MAPS.hope_school)
link(hope, 29, 19, MAPS.hope_map)

for (const map of Object.values(MAPS)) for (const n of map.npcs) if (n.look && !SPEAKER_LOOKS[n.name]) SPEAKER_LOOKS[n.name] = n.look
