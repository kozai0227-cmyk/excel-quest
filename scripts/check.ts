/**
 * 遊べるかどうかの 自動チェック（npm run check）
 * 1. すべての 依頼・謎に スマホ用の ステップが あり、正解どおりに 進めると 依頼の 判定を 通る
 * 2. 数式ステップの ボタンに、模範の 数式の 部品が そろっている／$ が 必要な 問題は $ なしだと 不正解
 * 3. 戦闘の 自動生成問題の 選択肢と 模範解答が 正しい
 * 4. マップの 出口・NPC が 表の 中にあり、出口の 行き先が 歩ける
 * 5. BGM の 楽譜：小節の 長さと、声部ごとの 長さが そろっている
 * 6. すべての 依頼・謎・ボス・モンスターが どこかの 章に 入っている（復習・達成率）
 * 7. 数式エンジンの 回帰テスト（scripts/engine-cases.ts）
 */
import { QUESTS, makeCtx } from '../src/data/quests'
import { GUIDES } from '../src/data/guides'
import { ENEMIES } from '../src/data/bosses'
import { MAPS } from '../src/data/maps'
import { COUNTER, WALKABLE } from '../src/game/tiles'
import { evaluate, formatValue, makeGrid, normalizeInput, parseAddr, shiftFormula, usesFn } from '../src/game/formula'
import { answerChips, guideChips, tryFormula } from '../src/game/guide'
import { ALL_FUNCS, battlePad, formulaChips } from '../src/game/formulaTokens'
import { SONGS } from '../src/data/music'
import { parseVoice } from '../src/game/sound'
import { ENGINE_CASES, ENGINE_DATA } from './engine-cases'
import { CHAPTERS, allCourse, chapterCourse, weakCourse } from '../src/data/chapters'

let errors = 0
let passed = 0
const bad = (msg: string) => {
  errors++
  console.error('✗ ' + msg)
}

// ---------------------------------------------------------------- 1・2. 依頼のステップ
for (const q of Object.values(QUESTS)) {
  const steps = GUIDES[q.id]
  if (!steps?.length) {
    bad(`${q.id}: スマホ用の ステップが ない`)
    continue
  }
  const puzzle = q.kind === 'puzzle'
  const history = q.history?.() ?? []
  let g = q.grid()
  const actions = new Set<string>()
  steps.forEach((s, i) => {
    const at = `${q.id} ステップ${i + 1}`
    if (s.kind === 'choice') {
      const all = [s.answer, ...s.wrong]
      if (new Set(all).size !== all.length) bad(`${at}: 選択肢が 重複している`)
      if (s.wrong.length < 2) bad(`${at}: まちがいの 選択肢が 少ない`)
      if (s.apply) g = s.apply(g, history)
      s.actions?.forEach((a) => actions.add(a))
      return
    }
    const chips = guideChips(s, g.length, g[0].length, q.town).flatMap((x) => x.chips)
    for (const t of answerChips(s.answer)) if (!chips.includes(t)) bad(`${at}: 部品「${t}」が ボタンに ない`)
    if ('=' + answerChips(s.answer).join('') !== s.answer.replace(/\$/g, '')) bad(`${at}: ボタンの 部品で ${s.answer} を 組み立てられない`)
    // $ が 必要な 問題は、$ なしでは 不正解に なること（コピーで ずれを 確かめられる）
    if (s.answer.includes('$') && !tryFormula(g, s, s.answer.replace(/\$/g, ''), puzzle).msg) bad(`${at}: $ が なくても 正解に なってしまう`)
    const r = tryFormula(g, s, s.answer, puzzle)
    if (r.msg) bad(`${at}: 模範の 数式 ${s.answer} が 不正解に なる：${r.msg}`)
    g = r.grid
    if (s.fill) actions.add('fill')
  })
  const res = q.check(makeCtx(g, evaluate(g), actions))
  if (res) bad(`${q.id}: ステップどおりに 解いても 依頼の 判定を 通らない：${res}`)
  else passed++
}
console.log(`依頼・謎：${passed}/${Object.keys(QUESTS).length} 件 OK`)

// ---------------------------------------------------------------- 3. 戦闘の 問題
let gens = 0
for (const boss of Object.values(ENEMIES))
  for (const [k, src] of boss.questions.entries())
    for (let n = 0; n < (typeof src === 'function' ? 40 : 1); n++) {
      const q = typeof src === 'function' ? src() : src
      const at = `${boss.id} 問題${k + 1}`
      gens++
      if (q.type === 'choice') {
        if (!q.choices.includes(q.answer)) bad(`${at}: 答え「${q.answer}」が 選択肢に ない（${q.q}）`)
        if (new Set(q.choices).size !== q.choices.length) bad(`${at}: 選択肢が 重複（${q.choices.join(' / ')}）`)
        continue
      }
      const raw = normalizeInput(q.hint)
      const t = parseAddr(q.target)
      const copies = (q.copies ?? []).map((cp) => ({ ...cp, p: parseAddr(cp.at) }))
      const rows = Math.max(q.table.length, t.r + 1, ...copies.map((cp) => cp.p.r + 1))
      const cols = Math.max(...q.table.map((r) => r.length), t.c + 1, ...copies.map((cp) => cp.p.c + 1))
      const grid = makeGrid(rows, cols, q.table)
      grid[t.r][t.c].raw = raw
      for (const cp of copies) grid[cp.p.r][cp.p.c].raw = shiftFormula(raw, cp.p.r - t.r, cp.p.c - t.c)
      const vals = evaluate(grid)
      const pad = battlePad(q.hint, rows, cols, q.target, ALL_FUNCS).flatMap((x) => x.chips)
      for (const c of formulaChips(q.hint)) if (!pad.includes(c)) bad(`${at}: 部品「${c}」が ボタンに ない（${q.hint}）`)
      if ('=' + formulaChips(q.hint).join('') !== q.hint.replace(/\$/g, '')) bad(`${at}: ボタンの 部品で ${q.hint} を 組み立てられない`)
      const same = (v: unknown, e: number | string) => (typeof e === 'string' ? v === e : typeof v === 'number' && Math.abs(v - e) < 1e-9)
      if (!same(vals[t.r][t.c], q.expect)) bad(`${at}: 模範 ${q.hint} → ${formatValue(vals[t.r][t.c])}（期待 ${q.expect}）`)
      for (const cp of copies) if (!same(vals[cp.p.r][cp.p.c], cp.expect)) bad(`${at}: コピー先 ${cp.at} が ${formatValue(vals[cp.p.r][cp.p.c])}（期待 ${cp.expect}）`)
      if (q.mustUse && q.mustUse.length > 1 && !usesFn(raw, q.mustUse)) bad(`${at}: 模範が ${q.mustUse} を 使っていない`)
    }
console.log(`戦闘の問題：${gens} 問 生成して チェック`)

// ---------------------------------------------------------------- 4. マップ
for (const m of Object.values(MAPS)) {
  const H = m.tiles.length
  const W = m.tiles[0].length
  if (m.tiles.some((row) => row.length !== W)) bad(`${m.id}: 行の 長さが そろっていない`)
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H
  for (const ex of m.exits) {
    if (!inside(ex.x, ex.y)) bad(`${m.id}: 出口 (${ex.x},${ex.y}) が マップの 外`)
    const dest = MAPS[ex.to]
    if (!dest) bad(`${m.id}: 出口の 行き先 ${ex.to} が ない`)
    else if (!WALKABLE.has(dest.tiles[ex.ty]?.[ex.tx] ?? '#')) bad(`${m.id} → ${ex.to}: 着く場所 (${ex.tx},${ex.ty}) が 歩けない`)
  }
  for (const npc of m.npcs) if (!inside(npc.x, npc.y)) bad(`${m.id}: ${npc.name} (${npc.x},${npc.y}) が マップの 外`)
  if (!WALKABLE.has(m.tiles[m.spawn.y]?.[m.spawn.x] ?? '#')) bad(`${m.id}: 出発地点が 歩けない`)

  // 出発地点から 歩いて 行けるか（謎の扉と 結界は いずれ 開くので 通れる ものとする）
  const open = (x: number, y: number) => inside(x, y) && (WALKABLE.has(m.tiles[y][x]) || m.tiles[y][x] === '(' || m.tiles[y][x] === 'Z')
  const seen = new Set([`${m.spawn.x},${m.spawn.y}`])
  const queue: [number, number][] = [[m.spawn.x, m.spawn.y]]
  while (queue.length) {
    const [x, y] = queue.shift()!
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`
      if (seen.has(k) || !open(x + dx, y + dy)) continue
      seen.add(k)
      queue.push([x + dx, y + dy])
    }
  }
  const reach = (x: number, y: number) => seen.has(`${x},${y}`)
  for (const ex of m.exits) if (!reach(ex.x, ex.y)) bad(`${m.id}: 出口 (${ex.x},${ex.y}) → ${ex.to} に 歩いて 行けない`)
  for (const npc of m.npcs) {
    if (npc.id.endsWith('_open')) continue
    const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(
      ([dx, dy]) => reach(npc.x + dx, npc.y + dy) || (COUNTER.has(m.tiles[npc.y + dy]?.[npc.x + dx] ?? '') && reach(npc.x + dx * 2, npc.y + dy * 2)),
    )
    if (!ok) bad(`${m.id}: ${npc.name} (${npc.x},${npc.y}) に 話しかけられない`)
    if (npc.ferry && !WALKABLE.has(MAPS[npc.ferry.to]?.tiles[npc.ferry.y]?.[npc.ferry.x] ?? '#')) bad(`${m.id}: ${npc.name} の 行き先が 歩けない`)
  }
}
console.log(`マップ：${Object.keys(MAPS).length} 枚`)

// ---------------------------------------------------------------- 5. BGM
for (const [name, song] of Object.entries(SONGS)) {
  const totals = song.voices.map((v, i) => {
    try {
      const r = parseVoice(v.notes)
      r.bars.forEach((b, k) => b !== song.bar && bad(`曲 ${name} 声部${i + 1} ${k + 1}小節目：長さ ${b}（${song.bar} のはず）`))
      return r.total
    } catch (e) {
      bad(`曲 ${name} 声部${i + 1}：${(e as Error).message}`)
      return 0
    }
  })
  if (new Set(totals).size > 1) bad(`曲 ${name}：声部の 長さが ちがう（${totals.join(' / ')}）`)
}
console.log(`BGM：${Object.keys(SONGS).length} 曲`)

// ---------------------------------------------------------------- 6. 章
const places = CHAPTERS.flatMap((ch) => [...ch.towns, ...ch.dungeons])
for (const q of Object.values(QUESTS)) if (!places.includes(q.town)) bad(`依頼 ${q.id}：どの 章にも 入っていない（${q.town}）`)
const members = CHAPTERS.flatMap((ch) => [...ch.bosses, ...ch.enemies])
for (const id of Object.keys(ENEMIES)) if (id !== 'celime_tutorial' && !members.includes(id)) bad(`敵 ${id}：どの 章にも 入っていない`)
for (const id of members) if (!ENEMIES[id]) bad(`章の 敵 ${id}：存在しない`)
for (const ch of CHAPTERS) if (chapterCourse(ch).length < 5) bad(`${ch.title}：復習の 問題が 足りない`)
if (allCourse(CHAPTERS).length < 10) bad('全章まとめ：問題が 足りない')
if (weakCourse(['frog#1', 'refera#3']).length < 5) bad('苦手克服：類題が 足りない')
console.log(`章：${CHAPTERS.length} 章`)

// ---------------------------------------------------------------- 7. 数式エンジン
for (const [f, want] of ENGINE_CASES) {
  const g = makeGrid(ENGINE_DATA.length + 1, 9, ENGINE_DATA)
  g[ENGINE_DATA.length][8].raw = f
  const got = formatValue(evaluate(g)[ENGINE_DATA.length][8])
  if (got !== want) bad(`数式エンジン ${f} → ${got}（期待 ${want}）`)
}
console.log(`数式エンジン：${ENGINE_CASES.length} 式`)

if (errors) {
  console.error(`\n${errors} 件の 問題が あります`)
  process.exit(1)
}
console.log('\nすべて OK')
