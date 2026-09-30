/**
 * BGM・ジングルの 楽譜（すべて オリジナル曲）。
 *
 * 書き方：音は「C5:4」（ド・5オクターブ目・16分音符 4つぶん）。長さを 省くと 前と 同じ長さ。
 *   r は 休符、| は 小節線（npm run check で 小節の 長さを 確かめる）、[ … ]x4 は くり返し。
 *   ドラムは k（バスドラム）s（スネア）h（ハイハット）。
 * 伴奏は gen() で コード進行から 作る（R=根音、O=1オクターブ上、F=5度、L=5度下、T=3度、0〜=和音の 下から n 番目、- =休符）。
 */

export type Wave = 'square' | 'pulse25' | 'pulse12' | 'triangle' | 'sine' | 'drums'
export interface Voice {
  wave: Wave
  vol: number
  notes: string
  /** pluck：ポロンと 減衰／pad：ふわっと 立ち上がる／hold（既定）：のばす */
  env?: 'pluck' | 'pad' | 'hold'
}
export interface Song {
  bpm: number
  /** 1小節の 長さ（16分音符 いくつ） */
  bar: number
  loop: boolean
  voices: Voice[]
}

// ---------------------------------------------------------------- 伴奏づくり
const PC: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
const name = (m: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`

const CHORDS: Record<string, string[]> = {
  C: ['C', 'E', 'G'],
  C7: ['C', 'E', 'G', 'Bb'],
  D: ['D', 'F#', 'A'],
  Dm: ['D', 'F', 'A'],
  Dm7: ['D', 'F', 'A', 'C'],
  E: ['E', 'G#', 'B'],
  Em: ['E', 'G', 'B'],
  Em7: ['E', 'G', 'B', 'D'],
  F: ['F', 'A', 'C'],
  Fmaj7: ['F', 'A', 'C', 'E'],
  G: ['G', 'B', 'D'],
  G7: ['G', 'B', 'D', 'F'],
  Gm: ['G', 'Bb', 'D'],
  Gm7: ['G', 'Bb', 'D', 'F'],
  Am: ['A', 'C', 'E'],
  Am7: ['A', 'C', 'E', 'G'],
  Bb: ['Bb', 'D', 'F'],
  Bbmaj7: ['Bb', 'D', 'F', 'A'],
  B: ['B', 'D#', 'F#'],
}

/**
 * コード進行（1つが seg 拍ぶん）に 合わせて、pat の 形で 伴奏を 作る。
 * base：根音（R）と 和音（0〜）を 置く いちばん 低い 音（MIDI 番号）
 */
export function gen(prog: string, pat: string, base: number): string {
  return prog
    .trim()
    .split(/\s+/)
    .map((tok) => {
      if (tok === '|') return '|'
      const tones = CHORDS[tok]
      if (!tones) throw new Error(`コード ${tok} が ない`)
      const pcs = tones.map((t) => PC[t])
      const root = base + ((pcs[0] - base) % 12 + 12) % 12
      const third = root + ((pcs[1] - pcs[0] + 12) % 12)
      const up: number[] = []
      for (let m = base; up.length < 10; m++) if (pcs.includes(m % 12)) up.push(m)
      return pat
        .trim()
        .split(/\s+/)
        .map((p) => {
          const [sym, len] = p.split(':')
          const l = len ? `:${len}` : ''
          if (sym === '-') return `r${l}`
          if ('ksh'.includes(sym)) return `${sym}${l}`
          const m = sym === 'R' ? root : sym === 'O' ? root + 12 : sym === 'F' ? root + 7 : sym === 'L' ? root - 5 : sym === 'T' ? third : up[Number(sym)]
          if (m === undefined || Number.isNaN(m)) throw new Error(`伴奏の 記号 ${sym} が わからない`)
          return name(m) + l
        })
        .join(' ')
    })
    .join(' ')
}

// ---------------------------------------------------------------- タイトル（行進曲）
const TITLE_LEAD = `
| C5:6 G4:2 C5:4 E5:4 | D5:6 B4:2 D5:4 G5:4 | E5:6 C5:2 E5:4 A5:4 | A5:8 G5:4 F5:4 |
| F5:6 E5:2 D5:4 C5:4 | E5:6 D5:2 C5:4 G4:4 | A4:4 D5:4 F5:4 B4:4 | C5:12 r:4 |
| A5:6 G5:2 E5:4 C5:4 | B4:6 C5:2 B4:4 G4:4 | A4:4 C5:4 F5:4 A5:4 | G5:8 D5:4 B4:4 |
| C6:6 B5:2 A5:4 G5:4 | A5:6 G5:2 F5:4 C5:4 | D5:4 G5:4 F5:4 D5:4 | C5:8 G4:4 r:4 |`
const TITLE_PROG = 'C C | G G | Am Am | F F | F F | C C | Dm G | C C | Am Am | Em Em | F F | G G | C C | F F | G7 G7 | C C'

const title: Song = {
  bpm: 120,
  bar: 16,
  loop: true,
  voices: [
    { wave: 'pulse25', vol: 0.16, notes: TITLE_LEAD },
    { wave: 'pulse12', vol: 0.07, env: 'pluck', notes: gen(TITLE_PROG, '-:2 1:2 -:2 2:2', 55) },
    { wave: 'triangle', vol: 0.34, notes: gen(TITLE_PROG, 'R:4 L:4', 45) },
    { wave: 'drums', vol: 0.3, notes: '[k:2 h:2 s:2 h:2 k:2 h:2 s:2 h:2 |]x15 s:1 s:1 s:2 s:2 s:2 s:2 s:2 s:1 s:1 s:2 |' },
  ],
}

// ---------------------------------------------------------------- プロローグ（昼のオフィス／夜）
const OFFICE_PROG = 'Fmaj7 | Em7 | Dm7 | C | Bbmaj7 | Am7 | Gm7 | C7'
const office: Song = {
  bpm: 100,
  bar: 16,
  loop: true,
  voices: [
    {
      wave: 'pulse25',
      vol: 0.1,
      notes: `
| A4:3 C5:3 E5:2 r:2 D5:2 C5:4 | B4:3 G4:3 E4:2 r:4 D5:4 | C5:3 A4:3 F4:2 r:2 A4:2 C5:4 | E5:8 r:4 G4:4 |
| D5:3 F5:3 A5:2 r:2 G5:2 F5:4 | E5:3 C5:3 A4:2 r:4 G4:4 | F4:3 Bb4:3 D5:2 r:2 C5:2 Bb4:4 | C5:8 Bb4:4 G4:4 |`,
    },
    { wave: 'pulse12', vol: 0.06, env: 'pluck', notes: gen(OFFICE_PROG, '-:4 0:2 1:2 -:4 2:2 1:2', 57) },
    { wave: 'triangle', vol: 0.3, notes: gen(OFFICE_PROG, 'R:6 R:2 F:4 R:4', 41) },
    { wave: 'drums', vol: 0.16, notes: '[k:4 h:2 h:2 s:4 h:2 h:2 |]x8' },
  ],
}

const NIGHT_PROG = 'Am | F | C | G | Am | F | Dm | E'
const night: Song = {
  bpm: 72,
  bar: 16,
  loop: true,
  voices: [
    { wave: 'triangle', vol: 0.26, notes: '| E5:8 D5:4 C5:4 | C5:8 A4:4 C5:4 | G5:8 E5:4 D5:4 | D5:12 r:4 | E5:8 A5:4 G5:4 | F5:6 E5:2 C5:8 | D5:6 C5:2 A4:4 F5:4 | E5:12 r:4 |' },
    { wave: 'pulse12', vol: 0.05, env: 'pluck', notes: gen(NIGHT_PROG, '0:2 1:2 2:2 3:2 4:2 3:2 2:2 1:2', 57) },
    { wave: 'triangle', vol: 0.26, env: 'pad', notes: gen(NIGHT_PROG, 'R:16', 40) },
  ],
}

// ---------------------------------------------------------------- 町（ワルツ）
const TOWN_PROG = 'F | F | Bb | F | C | C7 | F | F | Dm | Am | Bb | F | Gm | C | F | C7'
const town: Song = {
  bpm: 138,
  bar: 12,
  loop: true,
  voices: [
    {
      wave: 'pulse25',
      vol: 0.13,
      notes: `
| C5:4 F5:4 A5:4 | G5:4 F5:2 E5:2 F5:4 | D5:4 F5:4 Bb5:4 | A5:8 F5:4 |
| G5:4 E5:4 C5:4 | Bb4:4 C5:2 D5:2 E5:4 | F5:4 A5:4 C6:4 | F5:8 r:4 |
| D5:4 F5:4 A5:4 | C6:4 A5:2 G5:2 E5:4 | F5:4 D5:4 Bb4:4 | C5:8 A4:4 |
| Bb4:4 D5:4 G5:4 | E5:4 G5:2 F5:2 E5:4 | F5:4 C5:4 A4:4 | G4:4 A4:2 Bb4:2 C5:4 |`,
    },
    { wave: 'pulse12', vol: 0.06, env: 'pluck', notes: gen(TOWN_PROG, '-:4 0:4 1:4', 60) },
    { wave: 'triangle', vol: 0.32, notes: gen(TOWN_PROG, 'R:4 F:4 T:4', 45) },
    { wave: 'drums', vol: 0.18, notes: '[k:4 h:4 h:4 |]x16' },
  ],
}

// ---------------------------------------------------------------- フィールド（冒険）
const FIELD_PROG = 'G G | D D | Em Em | C C | G G | C D | G G | D D | Em Em | C C | G G | D D | C C | D D | C C | D D'
const field: Song = {
  bpm: 138,
  bar: 16,
  loop: true,
  voices: [
    {
      wave: 'square',
      vol: 0.1,
      notes: `
| G4:4 B4:4 D5:6 G5:2 | F#5:6 E5:2 D5:8 | E5:4 G5:4 B5:6 A5:2 | G5:8 E5:4 C5:4 |
| D5:6 B4:2 G4:4 B4:4 | C5:4 E5:4 D5:4 F#5:4 | G5:12 r:4 | A5:4 F#5:4 D5:4 A4:4 |
| B4:6 E5:2 G5:4 E5:4 | C5:6 E5:2 G5:4 C6:4 | B5:6 A5:2 G5:4 D5:4 | A5:8 F#5:4 D5:4 |
| E5:6 F#5:2 G5:4 E5:4 | F#5:6 G5:2 A5:4 D5:4 | E5:4 C5:4 G5:8 | F#5:4 A5:4 D5:4 F#4:4 |`,
    },
    { wave: 'pulse12', vol: 0.06, env: 'pad', notes: gen(FIELD_PROG, '1:8', 55) },
    { wave: 'triangle', vol: 0.34, notes: gen(FIELD_PROG, 'R:2 O:2 R:2 O:2', 40) },
    { wave: 'drums', vol: 0.26, notes: '[k:4 h:2 h:2 s:4 h:2 k:2 |]x15 k:2 k:2 s:2 s:2 s:2 s:2 s:1 s:1 s:2 |' },
  ],
}

// ---------------------------------------------------------------- ダンジョン（洞窟・塔・神殿・船・書庫）
const dungeon: Song = {
  bpm: 76,
  bar: 16,
  loop: true,
  voices: [
    {
      wave: 'pulse12',
      vol: 0.09,
      env: 'pad',
      notes: `
| r:4 F4:4 E4:4 D4:4 | A4:12 r:4 | Bb4:4 A4:4 G4:4 F4:4 | E4:12 r:4 |
| D5:4 C5:4 Bb4:4 A4:4 | A4:8 F4:4 D4:4 | Eb4:4 G4:4 Bb4:4 G4:4 | C#4:8 E4:4 A4:4 |`,
    },
    {
      wave: 'triangle',
      vol: 0.32,
      notes: `
| D3:4 A2:4 D3:4 A2:4 | D3:4 A2:4 C#3:4 A2:4 | Bb2:4 F2:4 Bb2:4 F2:4 | A2:4 E2:4 A2:4 C#3:4 |
| G2:4 D3:4 G2:4 D3:4 | D3:4 A2:4 D3:4 A2:4 | Eb3:4 Bb2:4 Eb3:4 Bb2:4 | A2:8 C#3:8 |`,
    },
    { wave: 'triangle', vol: 0.12, env: 'pluck', notes: '| r:12 D6:1 r:3 | r:16 | r:8 A5:1 r:7 | r:16 | r:12 D6:1 r:3 | r:16 | r:8 Bb5:1 r:7 | r:16 |' },
    { wave: 'drums', vol: 0.3, notes: '[k:3 k:13 |]x8' },
  ],
}

// ---------------------------------------------------------------- 戦闘
const BATTLE_PROG = 'Am | Am | F | G | Am | Am | F | E | Dm | E | F | G | Am | F | Dm | E'
const battle: Song = {
  bpm: 160,
  bar: 16,
  loop: true,
  voices: [
    {
      wave: 'pulse25',
      vol: 0.14,
      notes: `
| A4:2 C5:2 E5:2 A5:6 G5:2 E5:2 | A5:4 G5:2 E5:2 G5:4 E5:4 | F5:2 E5:2 C5:2 F5:6 E5:2 C5:2 | D5:8 B4:4 G4:4 |
| A4:2 C5:2 E5:2 A5:6 B5:2 C6:2 | B5:4 A5:2 G5:2 A5:4 E5:4 | F5:4 A5:4 C6:4 A5:4 | G#5:8 E5:4 B4:4 |
| D5:2 F5:2 A5:2 D6:6 C6:2 A5:2 | B5:4 G#5:4 E5:4 B4:4 | C5:2 F5:2 A5:2 C6:6 A5:2 F5:2 | D6:4 B5:4 G5:4 D5:4 |
| E5:2 A5:2 C6:2 E6:6 D6:2 C6:2 | C6:4 A5:4 F5:4 A5:4 | D5:4 F5:4 A5:4 D6:4 | E6:4 D6:2 C6:2 B5:4 G#5:4 |`,
    },
    { wave: 'pulse12', vol: 0.06, env: 'pluck', notes: gen(BATTLE_PROG, '-:2 0:2 -:2 1:2 -:2 0:2 -:2 1:2', 60) },
    { wave: 'triangle', vol: 0.36, notes: gen(BATTLE_PROG, 'R:2 O:2 R:2 O:2 R:2 O:2 R:2 O:2', 40) },
    { wave: 'drums', vol: 0.3, notes: '[k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:2 |]x16' },
  ],
}

// ---------------------------------------------------------------- ボス戦
const BE = 'E2:2 E2:2 E3:2 E2:2 F2:2 E2:2 G2:2 F2:2 |'
const BC = 'C3:2 C3:2 C4:2 C3:2 D3:2 C3:2 E3:2 D3:2 |'
const BD = 'D3:2 D3:2 D4:2 D3:2 E3:2 D3:2 F3:2 E3:2 |'
const BB = 'B2:2 B2:2 B3:2 B2:2 C3:2 B2:2 D3:2 C3:2 |'
const boss: Song = {
  bpm: 168,
  bar: 16,
  loop: true,
  voices: [
    {
      wave: 'square',
      vol: 0.11,
      notes: `
| E5:6 F5:2 G5:4 F5:4 | E5:4 B4:4 E5:4 G5:4 | A5:6 G5:2 F5:4 E5:4 | F5:8 E5:8 |
| G5:6 A5:2 G5:4 E5:4 | C6:8 B5:4 G5:4 | A5:6 B5:2 A5:4 F5:4 | D6:8 C6:4 A5:4 |
| E6:4 D6:2 B5:2 G5:4 E5:4 | F5:4 G5:4 A5:4 B5:4 | C6:6 B5:2 A5:4 G5:4 | F5:4 E5:4 F5:4 G5:4 |
| E5:4 G5:4 C6:4 E6:4 | F6:4 E6:2 D6:2 A5:8 | D#6:8 B5:8 | F#5:4 B5:4 A5:4 D#5:4 |`,
    },
    { wave: 'pulse12', vol: 0.05, notes: gen('E | E | E | E | C | C | D | D | E | E | E | E | C | D | B | B', 'L:2 R:2 L:2 R:2 L:2 R:2 L:2 R:2', 59) },
    { wave: 'triangle', vol: 0.36, notes: `${BE} ${BE} ${BE} ${BE} ${BC} ${BC} ${BD} ${BD} ${BE} ${BE} ${BE} ${BE} ${BC} ${BD} ${BB} ${BB}` },
    { wave: 'drums', vol: 0.32, notes: '[k:2 k:2 s:2 h:2 k:2 k:2 s:2 s:2 |]x16' },
  ],
}

// ---------------------------------------------------------------- 依頼・謎解き（考えごと）
const QUEST_PROG = 'C | Am | F | G | C | Am | Dm | G7'
const quest: Song = {
  bpm: 96,
  bar: 16,
  loop: true,
  voices: [
    { wave: 'pulse25', vol: 0.08, notes: '| E5:6 G5:2 E5:4 C5:4 | A4:8 C5:4 E5:4 | F5:6 E5:2 D5:4 C5:4 | D5:12 r:4 | G5:6 E5:2 G5:4 C6:4 | B5:4 A5:4 E5:8 | F5:6 E5:2 D5:4 A4:4 | B4:8 D5:4 F5:4 |' },
    { wave: 'triangle', vol: 0.26, env: 'pluck', notes: gen(QUEST_PROG, '0:2 1:2 2:2 1:2 0:2 1:2 2:2 1:2', 48) },
    { wave: 'triangle', vol: 0.2, env: 'pad', notes: gen(QUEST_PROG, 'R:16', 36) },
    { wave: 'drums', vol: 0.12, notes: '[k:4 h:4 h:4 h:4 |]x8' },
  ],
}

// ---------------------------------------------------------------- 章の おわり（タイトル曲を ゆっくり）
const ending: Song = {
  bpm: 84,
  bar: 16,
  loop: true,
  voices: [
    { wave: 'pulse25', vol: 0.11, env: 'pad', notes: TITLE_LEAD },
    { wave: 'pulse12', vol: 0.05, env: 'pluck', notes: gen(TITLE_PROG, '0:2 1:2 2:2 1:2', 55) },
    { wave: 'triangle', vol: 0.3, env: 'pad', notes: gen(TITLE_PROG, 'R:8', 40) },
  ],
}

// ---------------------------------------------------------------- ジングル
const victory: Song = {
  bpm: 140,
  bar: 16,
  loop: false,
  voices: [
    { wave: 'pulse25', vol: 0.16, notes: '| C5:2 E5:2 G5:2 C6:6 B5:2 C6:2 | D6:4 C6:12 |' },
    { wave: 'pulse12', vol: 0.08, notes: '| E4:2 G4:2 C5:2 E5:6 D5:2 E5:2 | F5:4 E5:12 |' },
    { wave: 'triangle', vol: 0.34, notes: '| C3:2 r:2 C3:2 G2:6 G2:2 G2:2 | G2:4 C3:12 |' },
    { wave: 'drums', vol: 0.3, notes: '| s:1 s:1 s:2 s:2 k:6 s:2 s:2 | s:4 k:12 |' },
  ],
}
const levelup: Song = {
  bpm: 170,
  bar: 16,
  loop: false,
  voices: [
    { wave: 'pulse25', vol: 0.15, notes: '| C5:2 E5:2 G5:2 C6:2 E6:2 G6:6 |' },
    { wave: 'pulse12', vol: 0.08, notes: '| G4:2 C5:2 E5:2 G5:2 C6:2 E6:6 |' },
    { wave: 'triangle', vol: 0.3, notes: '| C3:10 C4:6 |' },
  ],
}
const clear: Song = {
  bpm: 150,
  bar: 16,
  loop: false,
  voices: [
    { wave: 'pulse25', vol: 0.15, notes: '| G5:2 E5:2 C5:2 E5:2 G5:2 C6:4 r:2 | C6:2 D6:2 E6:12 |' },
    { wave: 'pulse12', vol: 0.07, notes: '| C5:12 r:4 | A5:2 B5:2 C6:12 |' },
    { wave: 'triangle', vol: 0.32, notes: '| C3:12 r:4 | F2:2 G2:2 C3:12 |' },
  ],
}
const item: Song = {
  bpm: 150,
  bar: 16,
  loop: false,
  voices: [
    { wave: 'pulse25', vol: 0.14, notes: '| G5:2 A5:2 B5:2 C6:10 |' },
    { wave: 'pulse12', vol: 0.07, notes: '| E5:2 F5:2 G5:2 E5:10 |' },
    { wave: 'triangle', vol: 0.3, notes: '| C3:6 C3:10 |' },
  ],
}
const inn: Song = {
  bpm: 96,
  bar: 16,
  loop: false,
  voices: [
    { wave: 'triangle', vol: 0.28, notes: '| C5:4 E5:4 G5:4 E5:4 | F5:4 A5:4 G5:8 | E5:4 D5:4 C5:8 |' },
    { wave: 'pulse12', vol: 0.05, env: 'pad', notes: '| E4:16 | A4:8 B4:8 | G4:16 |' },
    { wave: 'triangle', vol: 0.24, env: 'pad', notes: '| C3:16 | F2:8 G2:8 | C3:16 |' },
  ],
}
const save: Song = {
  bpm: 160,
  bar: 16,
  loop: false,
  voices: [
    { wave: 'pulse25', vol: 0.13, notes: '| C6:2 G5:2 C6:2 E6:10 |' },
    { wave: 'pulse12', vol: 0.06, notes: '| E5:6 G5:10 |' },
  ],
}
const lose: Song = {
  bpm: 72,
  bar: 16,
  loop: false,
  voices: [
    { wave: 'pulse25', vol: 0.13, env: 'pad', notes: '| E5:4 D5:4 C5:4 B4:4 | A4:8 G#4:4 A4:4 |' },
    { wave: 'pulse12', vol: 0.05, env: 'pad', notes: '| C5:8 G#4:8 | C5:8 B4:4 C5:4 |' },
    { wave: 'triangle', vol: 0.28, env: 'pad', notes: '| A2:16 | F2:8 E2:8 |' },
  ],
}

export const SONGS = { title, office, night, town, field, dungeon, battle, boss, quest, ending, victory, levelup, clear, item, inn, save, lose }
export type SongName = keyof typeof SONGS
