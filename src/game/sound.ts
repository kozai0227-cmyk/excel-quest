import { useEffect, useSyncExternalStore } from 'react'
import { SONGS, type Song, type SongName, type Voice, type Wave } from '../data/music'

/**
 * BGM と 効果音（Web Audio で その場で 合成する。音声ファイルは 使わない）。
 * ブラウザは 最初に 画面を タップ（キーを 押す）するまで 音を 出せないので、
 * それまでに 頼まれた BGM は 覚えておき、音が 出せるように なったら 流す。
 */

// ---------------------------------------------------------------- 楽譜の 読みこみ
export interface NoteEvent {
  step: number
  len: number
  voice: number
  midi?: number
  drum?: 'k' | 's' | 'h'
}

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** 1声部を 読む。bars は 小節ごとの 長さ（チェック用） */
export function parseVoice(src: string): { events: Omit<NoteEvent, 'voice'>[]; total: number; bars: number[] } {
  let s = src
  // [ … ]xN を 展開
  for (let guard = 0; /\[[^\[\]]*\]x\d+/.test(s) && guard < 20; guard++)
    s = s.replace(/\[([^\[\]]*)\]x(\d+)/g, (_, body: string, n: string) => Array(Number(n)).fill(body).join(' '))
  const events: Omit<NoteEvent, 'voice'>[] = []
  const bars: number[] = []
  let step = 0
  let barStart = 0
  let len = 4
  for (const tok of s.trim().split(/\s+/)) {
    if (!tok) continue
    if (tok === '|') {
      if (step > barStart) bars.push(step - barStart)
      barStart = step
      continue
    }
    const [sym, l] = tok.split(':')
    if (l) len = Number(l)
    if (!(len > 0)) throw new Error(`長さが おかしい：${tok}`)
    if (sym === 'r') {
      // 休符
    } else if (sym === 'k' || sym === 's' || sym === 'h') events.push({ step, len, drum: sym })
    else {
      const m = /^([A-G])([#b]?)(-?\d)$/.exec(sym)
      if (!m) throw new Error(`音が 読めない：${tok}`)
      events.push({ step, len, midi: PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12 })
    }
    step += len
  }
  if (step > barStart) bars.push(step - barStart)
  return { events, total: step, bars }
}

// ---------------------------------------------------------------- 設定（ON/OFF）
const KEY = 'excel-quest-sound'
let enabled = (() => {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
})()
const listeners = new Set<() => void>()

export const isSoundOn = () => enabled
export function setSoundOn(on: boolean) {
  enabled = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* 保存できなくても 動く */
  }
  listeners.forEach((f) => f())
  if (!ctx) return
  if (on) resume()
  else {
    stopTrack(0)
    void ctx.suspend()
  }
}
const subscribe = (f: () => void) => {
  listeners.add(f)
  return () => {
    listeners.delete(f)
  }
}
export function useSoundOn() {
  return useSyncExternalStore(subscribe, () => enabled)
}

// ---------------------------------------------------------------- 設定（音量）
/** 音量は 0〜10 の 段階。BGM と 効果音を 別々に 決める */
export interface Volume {
  bgm: number
  sfx: number
}
export const VOLUME_MAX = 10
const VOL_KEY = 'excel-quest-volume'
let volume: Volume = (() => {
  try {
    const v = JSON.parse(localStorage.getItem(VOL_KEY) ?? '{}') as Partial<Volume>
    const ok = (n: unknown, d: number) => (typeof n === 'number' && n >= 0 && n <= VOLUME_MAX ? Math.round(n) : d)
    return { bgm: ok(v.bgm, 7), sfx: ok(v.sfx, 7) }
  } catch {
    return { bgm: 7, sfx: 7 }
  }
})()
/** 音量 7（はじめの 値）の ときの 大きさ。効果音は BGM に 負けないよう 大きめ */
const BGM_GAIN = 0.6 / 7
const SFX_GAIN = 2.2 / 7

export function setVolume(kind: keyof Volume, v: number) {
  volume = { ...volume, [kind]: Math.min(VOLUME_MAX, Math.max(0, Math.round(v))) }
  try {
    localStorage.setItem(VOL_KEY, JSON.stringify(volume))
  } catch {
    /* 保存できなくても 動く */
  }
  applyVolume()
  listeners.forEach((f) => f())
}
export function useVolume() {
  return useSyncExternalStore(subscribe, () => volume)
}
function applyVolume() {
  if (!ctx) return
  const now = ctx.currentTime
  bgmBus.gain.setTargetAtTime(volume.bgm * BGM_GAIN, now, 0.03)
  jingleBus.gain.setTargetAtTime(volume.bgm * BGM_GAIN, now, 0.03)
  sfxBus.gain.setTargetAtTime(volume.sfx * SFX_GAIN, now, 0.03)
}

// ---------------------------------------------------------------- 音の 部品
let ctx: AudioContext | null = null
let master: GainNode
let bgmBus: GainNode
/** ジングルの 間だけ BGM を 小さくする */
let duck: GainNode
let sfxBus: GainNode
let jingleBus: GainNode
let noiseBuf: AudioBuffer
let meter: AnalyserNode
const waves: Partial<Record<Wave, PeriodicWave>> = {}

function pulse(duty: number) {
  const n = 40
  const real = new Float32Array(n)
  const imag = new Float32Array(n)
  for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty)
  return ctx!.createPeriodicWave(real, imag)
}

function setup() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  ctx = new AC()
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -8
  comp.ratio.value = 4
  comp.connect(ctx.destination)
  master = ctx.createGain()
  master.gain.value = 0.8
  master.connect(comp)
  meter = ctx.createAnalyser()
  comp.connect(meter)
  bgmBus = ctx.createGain()
  bgmBus.gain.value = volume.bgm * BGM_GAIN
  bgmBus.connect(master)
  duck = ctx.createGain()
  duck.connect(bgmBus)
  jingleBus = ctx.createGain()
  jingleBus.gain.value = volume.bgm * BGM_GAIN
  jingleBus.connect(master)
  sfxBus = ctx.createGain()
  sfxBus.gain.value = volume.sfx * SFX_GAIN
  sfxBus.connect(master)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  waves.pulse25 = pulse(0.25)
  waves.pulse12 = pulse(0.125)
}

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

function osc(wave: Wave, f: number) {
  const o = ctx!.createOscillator()
  if (wave === 'pulse25' || wave === 'pulse12') o.setPeriodicWave(waves[wave]!)
  else o.type = wave === 'drums' ? 'square' : wave
  o.frequency.value = f
  return o
}

function noise(t: number, dur: number, vol: number, type: BiquadFilterType, f: number, out: AudioNode, to?: number) {
  const src = ctx!.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  const filt = ctx!.createBiquadFilter()
  filt.type = type
  filt.frequency.setValueAtTime(f, t)
  if (to) filt.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = ctx!.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filt).connect(g).connect(out)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.02)
}

function drum(kind: 'k' | 's' | 'h', t: number, vol: number, out: AudioNode) {
  if (kind === 'k') {
    const o = ctx!.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
    const g = ctx!.createGain()
    g.gain.setValueAtTime(vol * 1.6, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    o.connect(g).connect(out)
    o.start(t)
    o.stop(t + 0.18)
  } else if (kind === 's') noise(t, 0.13, vol * 0.8, 'bandpass', 1800, out)
  else noise(t, 0.04, vol * 0.45, 'highpass', 7000, out)
}

function note(v: Voice, midi: number, t: number, dur: number, out: AudioNode) {
  const o = osc(v.wave, freq(midi))
  const g = ctx!.createGain()
  const vol = v.vol
  const env = v.env ?? 'hold'
  g.gain.setValueAtTime(0.0001, t)
  if (env === 'pluck') {
    g.gain.linearRampToValueAtTime(vol, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.45))
  } else {
    const a = env === 'pad' ? Math.min(0.08, dur / 3) : 0.008
    g.gain.linearRampToValueAtTime(vol, t + a)
    g.gain.linearRampToValueAtTime(vol * 0.8, t + Math.max(a + 0.01, dur * 0.5))
    g.gain.linearRampToValueAtTime(0.0001, t + dur * 0.95)
  }
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + dur + 0.05)
}

// ---------------------------------------------------------------- 曲を 流す しくみ
interface Track {
  name: SongName
  song: Song
  gain: GainNode
  byStep: Map<number, NoteEvent[]>
  total: number
  stepDur: number
  start: number
  next: number
  done: boolean
}

const parsed = new Map<SongName, { byStep: Map<number, NoteEvent[]>; total: number }>()
function load(name: SongName) {
  let p = parsed.get(name)
  if (!p) {
    const byStep = new Map<number, NoteEvent[]>()
    let total = 0
    SONGS[name].voices.forEach((v, voice) => {
      const r = parseVoice(v.notes)
      total = Math.max(total, r.total)
      for (const e of r.events) byStep.set(e.step, [...(byStep.get(e.step) ?? []), { ...e, voice }])
    })
    p = { byStep, total }
    parsed.set(name, p)
  }
  return p
}

const tracks: Track[] = []
let current: Track | null = null
let wanted: SongName | null | undefined
/** 勝利などの ジングルが 終わるまで、次の BGM を 待たせる */
let holdUntil = 0
let timer = 0

function startTrack(name: SongName, at: number, out: AudioNode): Track {
  const song = SONGS[name]
  const { byStep, total } = load(name)
  const gain = ctx!.createGain()
  gain.connect(out)
  const t: Track = { name, song, gain, byStep, total, stepDur: 60 / song.bpm / 4, start: at, next: 0, done: false }
  tracks.push(t)
  if (!timer) timer = window.setInterval(pump, 25)
  pump()
  return t
}

function pump() {
  if (!ctx) return
  const until = ctx.currentTime + 0.15
  for (const t of tracks) {
    while (!t.done && t.start + t.next * t.stepDur < until) {
      const at = t.start + t.next * t.stepDur
      for (const e of t.byStep.get(t.next % t.total) ?? []) {
        const v = t.song.voices[e.voice]
        if (e.drum) drum(e.drum, at, v.vol, t.gain)
        else if (e.midi !== undefined) note(v, e.midi, at, e.len * t.stepDur, t.gain)
      }
      t.next++
      if (!t.song.loop && t.next >= t.total) t.done = true
    }
  }
  for (let i = tracks.length - 1; i >= 0; i--) {
    const t = tracks[i]
    if (t.done && ctx.currentTime > t.start + t.total * t.stepDur + 1) {
      t.gain.disconnect()
      tracks.splice(i, 1)
    }
  }
  if (!tracks.length) {
    clearInterval(timer)
    timer = 0
  }
}

function stopTrack(fade: number) {
  if (!current || !ctx) return
  const t = current
  current = null
  t.done = true
  const now = ctx.currentTime
  t.gain.gain.cancelScheduledValues(now)
  t.gain.gain.setValueAtTime(t.gain.gain.value, now)
  t.gain.gain.linearRampToValueAtTime(0, now + fade + 0.01)
  // すでに 予約した 音も 消えるよう、少し あとで 切りはなす
  setTimeout(() => t.gain.disconnect(), (fade + 0.3) * 1000)
}

/** BGM を 切りかえる（null で 止める） */
export function bgm(name: SongName | null) {
  if (name === wanted && (current?.name === name || !name)) return
  wanted = name
  if (!ctx || !enabled || ctx.state !== 'running') return
  if (current?.name === name) return
  stopTrack(0.5)
  if (name) current = startTrack(name, Math.max(ctx.currentTime + 0.08, holdUntil), duck)
}

/** 画面ごとの BGM（undefined の ときは 子の 画面に まかせる） */
export function useBgm(name: SongName | null | undefined) {
  useEffect(() => {
    if (name !== undefined) bgm(name)
  }, [name])
}

/**
 * ジングル（短い 曲）。stop：BGM を 止めて 流す（勝利・全滅）。
 * それ以外は BGM を 小さくして 流し、終わったら 元に もどす。
 */
export function jingle(name: SongName, opt: { stop?: boolean; delay?: number } = {}) {
  if (!ctx || !enabled || ctx.state !== 'running') return
  const at = ctx.currentTime + 0.05 + (opt.delay ?? 0)
  const { total } = load(name)
  const end = at + total * (60 / SONGS[name].bpm / 4)
  if (opt.stop) {
    wanted = null
    stopTrack(0.25)
    holdUntil = end + 0.3
  } else {
    const g = duck.gain
    g.cancelScheduledValues(ctx.currentTime)
    g.setValueAtTime(g.value, ctx.currentTime)
    g.linearRampToValueAtTime(0.08, at)
    g.setValueAtTime(0.08, end)
    g.linearRampToValueAtTime(1, end + 0.8)
  }
  startTrack(name, at, jingleBus)
}

// ---------------------------------------------------------------- 効果音
interface ToneOpt {
  f: number
  to?: number
  t?: number
  dur: number
  wave?: Wave
  vol?: number
}
function tone({ f, to, t = 0, dur, wave = 'square', vol = 0.12 }: ToneOpt) {
  const at = ctx!.currentTime + t
  const o = osc(wave, f)
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur)
  const g = ctx!.createGain()
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(sfxBus)
  o.start(at)
  o.stop(at + dur + 0.02)
}
const notes = (list: [number, number][], opt: Partial<ToneOpt> = {}) => {
  let t = opt.t ?? 0
  for (const [m, d] of list) {
    tone({ vol: 0.1, wave: 'pulse25', ...opt, f: freq(m), t, dur: d * 1.2 })
    t += d
  }
}
const nz = (dur: number, vol: number, type: BiquadFilterType, f: number, to?: number, t = 0) => noise(ctx!.currentTime + t, dur, vol, type, f, sfxBus, to)

const SFX = {
  /** ボタン・決定 */
  select: () => tone({ f: 1050, dur: 0.06, vol: 0.09, wave: 'pulse25' }),
  /** カーソル移動 */
  cursor: () => tone({ f: 1400, dur: 0.04, vol: 0.07, wave: 'pulse12' }),
  /** 会話を 送る */
  blip: () => tone({ f: 780, dur: 0.05, vol: 0.09, wave: 'pulse25' }),
  cancel: () => tone({ f: 520, to: 300, dur: 0.08, vol: 0.07, wave: 'pulse25' }),
  /** 出入り口・階段 */
  door: () => {
    notes([[67, 0.05], [62, 0.05], [55, 0.08]], { wave: 'square', vol: 0.08 })
    nz(0.15, 0.08, 'lowpass', 900)
  },
  /** 敵に 出会った */
  encounter: () => {
    for (let i = 0; i < 6; i++) tone({ f: 300 + i * 160, to: 900 + i * 160, t: i * 0.05, dur: 0.06, vol: 0.08 })
    nz(0.35, 0.12, 'bandpass', 800, 4000)
  },
  correct: () => notes([[88, 0.07], [95, 0.18]], { wave: 'square', vol: 0.09 }),
  wrong: () => {
    tone({ f: 180, dur: 0.35, vol: 0.09, wave: 'square' })
    tone({ f: 191, dur: 0.35, vol: 0.07, wave: 'square' })
  },
  /** こちらの 攻撃が 当たった */
  hit: () => {
    nz(0.14, 0.3, 'bandpass', 2500, 400)
    tone({ f: 320, to: 70, dur: 0.14, vol: 0.12 })
  },
  crit: () => {
    tone({ f: 1200, to: 2400, dur: 0.18, vol: 0.08, wave: 'pulse25' })
    tone({ f: 1800, to: 3600, t: 0.08, dur: 0.18, vol: 0.06, wave: 'pulse25' })
  },
  quick: () => notes([[91, 0.05], [96, 0.1]], { wave: 'pulse12', vol: 0.07 }),
  /** 敵の 攻撃 */
  enemyAttack: () => nz(0.22, 0.18, 'bandpass', 600, 3000),
  /** ダメージを うけた */
  hurt: () => {
    nz(0.3, 0.3, 'lowpass', 1200, 200)
    tone({ f: 160, to: 50, dur: 0.3, vol: 0.14 })
  },
  guard: () => {
    tone({ f: 1500, dur: 0.12, vol: 0.06, wave: 'square' })
    tone({ f: 2260, dur: 0.1, vol: 0.05, wave: 'square' })
    nz(0.06, 0.12, 'highpass', 3000)
  },
  /** 敵が 消える */
  defeat: () => {
    tone({ f: 900, to: 90, dur: 0.5, vol: 0.1 })
    nz(0.5, 0.12, 'bandpass', 3000, 200)
  },
  flee: () => notes([[72, 0.05], [69, 0.05], [72, 0.05], [69, 0.05], [65, 0.1]], { wave: 'square', vol: 0.07 }),
  heal: () => notes([[72, 0.06], [76, 0.06], [79, 0.06], [84, 0.06], [88, 0.2]], { wave: 'triangle', vol: 0.2 }),
  magic: () => {
    for (let i = 0; i < 8; i++) tone({ f: freq(84 + ((i * 5) % 12)), t: i * 0.04, dur: 0.12, vol: 0.05, wave: 'pulse12' })
  },
  /** 石の扉が 開く（ゴゴゴ） */
  rumble: () => {
    nz(1.4, 0.35, 'lowpass', 180)
    tone({ f: 55, to: 40, dur: 1.3, vol: 0.2, wave: 'triangle' })
  },
  /** 結界が とける */
  barrier: () => {
    for (let i = 0; i < 10; i++) tone({ f: freq(96 - i * 2), t: i * 0.05, dur: 0.15, vol: 0.05, wave: 'triangle' })
    nz(0.6, 0.06, 'highpass', 6000)
  },
  chest: () => {
    tone({ f: 200, to: 420, dur: 0.18, vol: 0.08, wave: 'pulse25' })
    nz(0.12, 0.08, 'lowpass', 1500)
  },
  /** プロローグ：画面が 壊れる */
  glitch: () => {
    for (let i = 0; i < 10; i++) tone({ f: 200 + Math.random() * 1800, t: i * 0.06, dur: 0.05, vol: 0.06, wave: Math.random() < 0.5 ? 'square' : 'pulse12' })
  },
  /** プロローグ：光に のみこまれる */
  storm: () => {
    nz(4.2, 0.2, 'bandpass', 200, 6000)
    tone({ f: 80, to: 900, dur: 4.2, vol: 0.06, wave: 'pulse25' })
  },
  white: () => [72, 76, 79, 84, 88].forEach((m, i) => tone({ f: freq(m), t: i * 0.08, dur: 1.6, vol: 0.06, wave: 'sine' })),
}
export type SfxName = keyof typeof SFX
export const SFX_NAMES = Object.keys(SFX) as SfxName[]

export function sfx(name: SfxName) {
  if (!ctx || !enabled || ctx.state !== 'running') return
  SFX[name]()
}

/**
 * 会話・戦闘の メッセージに 合わせて 鳴らす（文を 見て 判断する）。
 * メッセージを 書き足しても、決まった 言い回しなら 自動で 音が つく。
 */
export function cue(text: string) {
  if (/レベルが .*あがった/.test(text)) return jingle('levelup')
  if (/てにいれた/.test(text) && !/ゴールドを てにいれた/.test(text)) return jingle('item')
  if (/きろくしました/.test(text)) return jingle('save')
  if (/ゴゴゴ/.test(text)) return sfx('rumble')
  if (/結界が とける/.test(text)) return sfx('barrier')
  if (/たからばこを あけた/.test(text)) return sfx('chest')
  if (/HPが .*かいふく|HPが まんたん/.test(text)) return sfx('heal')
  if (/すなどけい|まきものを ひらいた/.test(text)) return sfx('magic')
  // 戦闘
  if (/^せいかい/.test(text)) return sfx('correct')
  if (/^一発決裁/.test(text)) return sfx('crit')
  if (/^そくとう/.test(text)) return sfx('quick')
  if (/に \d+の ダメージ！/.test(text)) return sfx('hit')
  if (/の こうげき！$/.test(text)) return sfx('enemyAttack')
  if (/ダメージを うけた！/.test(text)) return sfx('hurt')
  if (/ガード せいこう|ダメージを うけなかった|攻撃を 見事に|攻撃を 華麗に|攻撃が 空を/.test(text)) return sfx('guard')
  if (/を やっつけた！/.test(text)) {
    sfx('defeat')
    return jingle('victory', { stop: true, delay: 0.45 })
  }
  if (/ちからつきた/.test(text)) return jingle('lose', { stop: true })
  if (/は にげだした！$/.test(text)) return sfx('flee')
  if (/まわりこまれて/.test(text)) return sfx('wrong')
}

/** 音を 出せる 状態に もどし、待たせていた BGM を 流す */
function resume() {
  void ctx?.resume().then(() => {
    const w = wanted
    wanted = undefined
    if (w) bgm(w)
  })
}

// ---------------------------------------------------------------- はじめの タップで 音を 出せるように する
function unlock() {
  if (!ctx) setup()
  if (!ctx || !enabled) return
  // タップの 中で 作った ときは すぐ 音が 出せる。待たせていた BGM を 流す
  if (ctx.state === 'running' && wanted && !current) resume()
  if (ctx.state !== 'running') {
    resume()
    // iOS の 古い Safari 対策：無音を 1回 鳴らす
    const b = ctx.createBufferSource()
    b.buffer = ctx.createBuffer(1, 1, 22050)
    b.connect(ctx.destination)
    b.start(0)
  }
}

/** ボタンの タップ音（問題の 答えは 正解／不正解の 音が 鳴るので 除く） */
const TAP = '.btn, .opt, .chip, .brief-toggle, .guide-hint-btn, .skip'
const NO_TAP = '.q-choices .opt, .guide-choice, .guide-go, [data-nosfx]'

/** 動作確認用（ブラウザの コンソールから window.__sound() で 見られる） */
function debugState() {
  let level = 0
  if (meter) {
    const d = new Float32Array(meter.fftSize)
    meter.getFloatTimeDomainData(d)
    level = Math.sqrt(d.reduce((a, x) => a + x * x, 0) / d.length)
  }
  return { state: ctx?.state ?? 'none', bgm: current?.name ?? null, playing: tracks.filter((t) => !t.done).map((t) => t.name), level, enabled }
}

export function initSound() {
  Object.assign(window, { __sound: debugState, __play: (n: string) => (n in SFX ? sfx(n as SfxName) : jingle(n as SongName)) })
  for (const ev of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(ev, unlock, { capture: true, passive: true })
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest?.(TAP)
      if (el && !el.closest(NO_TAP) && !(el as HTMLButtonElement).disabled) sfx('select')
    },
    true,
  )
  // 別の アプリに 切りかえたら 止める
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) void ctx.suspend()
    else if (enabled) resume()
  })
}
