import { useEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { ENEMIES, type BossDef, type Question, type QuestionSrc } from '../data/bosses'
import { ITEMS } from '../data/items'
import { useKeys } from '../game/keys'
import { drawRows } from '../game/sprites'
import { CREATURES } from '../game/spriteParts'
import { makeGrid, evaluate, normalizeInput, parseAddr, colName, formatValue, usesFn, shiftFormula, toggleAbsAt } from '../game/formula'
import { maxHp } from '../game/progress'
import { gearStats } from '../data/equipment'
import type { GameState, ItemId } from '../game/types'
import { useInputMode } from '../game/inputMode'
import { battlePad, learnedFuncs, pickRef, toggleLastRef, type ChipGroup } from '../game/formulaTokens'
import { FormulaPad } from './FormulaPad'
import { useCellPick } from './useCellPick'
import { BossVisual } from './BossVisual'
import { hasBossArt } from '../game/bossArt'
import { cue, sfx, useBgm } from '../game/sound'

interface Props {
  bossId: string
  /** 最初の戦闘（操作説明つき・逃げられない） */
  tutorial?: boolean
  /** 背景（森・草原・ボス） */
  scene?: 'boss' | 'field' | 'forest' | 'cave' | 'temple' | 'ship' | 'library' | 'treasury' | 'printing'
  gs: GameState
  setGs(f: (g: GameState) => GameState): void
  onWin(): void
  onLose(): void
  onFlee(): void
}

type Phase = 'msg' | 'command' | 'items' | 'question'
/** 表示された瞬間に fx を実行するメッセージ（ダメージ反映など） */
type Msg = string | { text: string; fx: () => void }
const runFx = (m?: Msg) => {
  if (!m) return
  cue(typeof m === 'string' ? m : m.text)
  if (typeof m === 'object') m.fx()
}

const shuffle = <T,>(a: T[]) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}
const rand = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
/** 制限時間のうち、最初のこの割合で答えると「即答ボーナス」 */
const QUICK = 0.4
/** 一発決裁（大ダメージ）の基本確率。ブルーライトメガネで 10% に上がる */
const CRIT = 0.05
/** ボス戦：敵の問題に正解したとき、ダメージがゼロになる確率 */
const PERFECT_GUARD = 0.05
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const CRIT_LINES = ['部長の ハンコが 即日 押された！', '稟議が 一発で 通った！', '根回しが 完璧に きまった！', '社長の「いいね」が ついた！']
const GUARD_LINES = [
  '「前向きに 検討します」――攻撃を 見事に かわした！',
  '「その件は 持ち帰ります」――攻撃を 華麗に スルーした！',
  '「担当が 不在でして」――攻撃が 空を 切った！',
]

function BossSprite({ id, hit }: { id: BossDef['sprite']; hit: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const g = ref.current!.getContext('2d')!
    g.clearRect(0, 0, 16, 16)
    drawRows(g, CREATURES[id].rows, CREATURES[id].pal)
  }, [id])
  return <canvas ref={ref} width={16} height={16} className={`boss-sprite ${hit ? 'hit' : ''}`} />
}

export function Battle({ bossId, tutorial, scene = 'boss', gs, setGs, onWin, onLose, onFlee }: Props) {
  const boss = ENEMIES[bossId]
  useBgm(boss.boss ? 'boss' : 'battle')
  const deck = useRef<QuestionSrc[]>([])
  const [bossHp, setBossHp] = useState(boss.hp)
  const [phase, setPhase] = useState<Phase>('msg')
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    `${boss.name}が あらわれた！`,
    ...(tutorial
      ? [
          '（戦いは「Excelの問題」で 行われる！）',
          '（「たたかう」を選ぶと 問題が出る。正解すると 敵に ダメージ！）',
          '（まちがえたり 時間切れになると、敵の 反撃を うける）',
          '（本番の戦いでは、残り時間のバーが 緑のうちに 答えると「即答ボーナス」で ダメージアップ！）',
          '（連続正解でも 威力が上がる。ごくまれに「一発決裁」で 大ダメージも 出るぞ）',
          '（答えは タップ、または 数字キー 1〜4 でも 選べるぞ）',
        ]
      : []),
  ])
  const after = useRef<() => void>(() => setPhase('command'))
  const [cursor, setCursor] = useState(0)
  const [q, setQ] = useState<Question | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [formula, setFormula] = useState('=')
  const touch = useInputMode() === 'touch'
  /** スマホ：押した ボタン（= は 最初から 入っている） */
  const [chips, setChips] = useState<string[]>([])
  /** スマホ：この問題で 選べる 数式ボタン */
  const [pad, setPad] = useState<ChipGroup[]>([])
  /** attack：こちらの攻撃の問題 ／ defense：ボスの攻撃の問題（正解でダメージ減） */
  const [mode, setMode] = useState<'attack' | 'defense'>('attack')
  const guardHinted = useRef(false)
  const [deadline, setDeadline] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [combo, setCombo] = useState(0)
  const [buff, setBuff] = useState<{ scroll: boolean; sand: boolean }>({ scroll: false, sand: false })
  const [hit, setHit] = useState(0)
  const [shake, setShake] = useState(0)
  const startedAt = useRef(0)
  const answered = useRef(false)
  const mhp = maxHp(gs.level)
  const gear = gearStats(gs)
  /** 敵の攻撃。守備力（よろい・たて・かぶと）の分だけ軽くなる */
  const hurt = () => Math.max(1, rand(boss.attack[0], boss.attack[1]) - Math.floor(gear.def * 0.7))

  const say = (list: Msg[], then: () => void) => {
    runFx(list[0])
    setMsgs(list)
    after.current = then
    setPhase('msg')
  }
  const nextMsg = () => {
    if (msgs.length > 1) {
      runFx(msgs[1])
      setMsgs(msgs.slice(1))
    } else after.current()
  }

  const nextQuestion = (m: 'attack' | 'defense' = 'attack') => {
    if (!deck.current.length) deck.current = shuffle(boss.questions)
    const src = deck.current.shift()!
    // 自動生成の問題は、出すたびに 数値が変わる
    const nq = typeof src === 'function' ? src() : src
    setMode(m)
    setQ(nq)
    answered.current = false
    if (nq.type === 'choice') {
      let cs = shuffle(nq.choices)
      if (buff.scroll) {
        const wrong = cs.filter((c) => c !== nq.answer).slice(0, 2)
        cs = cs.filter((c) => !wrong.includes(c))
      }
      setChoices(cs)
    } else {
      setFormula('=')
      setChips([])
      const t = parseAddr(nq.target)
      const rows = Math.max(nq.table.length, t.r + 1)
      const cols = Math.max(...nq.table.map((r) => r.length), t.c + 1)
      setPad(battlePad(nq.hint, rows, cols, nq.target, learnedFuncs(gs.skills)))
    }
    setCursor(0)
    const limit = (nq.type === 'choice' ? 20000 : 60000) + gear.time * 1000
    startedAt.current = Date.now()
    setDeadline(Date.now() + limit)
    setPhase('question')
  }

  // タイマー
  useEffect(() => {
    if (phase !== 'question') return
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [phase])
  useEffect(() => {
    if (phase === 'question' && now >= deadline) answer(false, '時間切れ！')
  }, [now]) // eslint-disable-line react-hooks/exhaustive-deps

  const correctText = (x: Question) => (x.type === 'choice' ? x.answer : x.hint)

  /** ボス戦：こちらの攻撃のあと、ボスが問題を出して攻撃してくる */
  const enemyTurn = (pre: Msg[]) => {
    const lines: Msg[] = [...pre, `${boss.name}の こうげき！`]
    if (boss.attackText) lines.push(boss.attackText)
    if (!guardHinted.current) {
      lines.push('（ボスの問題に 正解すれば、ダメージを へらせる！）')
      guardHinted.current = true
    }
    say(lines, () => nextQuestion('defense'))
  }

  /** ボスの攻撃の問題に答えた */
  const defend = (ok: boolean, note?: string) => {
    if (!q) return
    const full = hurt()
    const lines: Msg[] = []
    let dmg = full
    if (ok) {
      lines.push('せいかい！')
      if (Math.random() < PERFECT_GUARD) {
        dmg = 0
        lines.push(pick(GUARD_LINES), `${gs.name}は ダメージを うけなかった！`)
      } else {
        dmg = Math.max(1, Math.round(full * 0.3))
        lines.push('ガード せいこう！ ダメージを おさえた！')
      }
    } else {
      sfx('wrong')
      lines.push(note ?? 'ざんねん……。', `こたえ：${correctText(q)}`, `（${q.explain}）`)
      if (buff.sand) {
        setBuff((b) => ({ ...b, sand: false }))
        dmg = 0
        lines.push('すなどけいが ひかった！', 'ダメージを なかったことに した！')
      }
    }
    const hp = Math.max(0, gs.hp - dmg)
    if (dmg > 0)
      lines.push({
        text: `${gs.name}は ${dmg}の ダメージを うけた！`,
        fx: () => {
          setShake((s) => s + 1)
          setGs((g) => ({ ...g, hp }))
        },
      })
    if (hp <= 0) say([...lines, `${gs.name}は ちからつきた……。`], onLose)
    else say(lines, () => setPhase('command'))
  }

  const answer = (ok: boolean, note?: string) => {
    if (!q || answered.current) return
    answered.current = true
    const usedScroll = buff.scroll
    if (usedScroll) setBuff((b) => ({ ...b, scroll: false }))
    if (mode === 'defense') return defend(ok, note)
    if (ok) {
      const limit = deadline - startedAt.current
      const quick = Date.now() - startedAt.current <= limit * QUICK
      const c = combo + 1
      const lines: Msg[] = ['せいかい！']
      let dmg: number
      if (boss.hits) {
        // チュートリアル：決まった回数の正解で倒れる
        dmg = Math.ceil(boss.hp / boss.hits)
      } else {
        // 攻撃力（ぶき）の分だけ ダメージが増える
        const base = 10 + gs.level * 2 + gear.atk + rand(-2, 3)
        dmg = base * (1 + 0.15 * (c - 1))
        if (quick) {
          dmg *= 1.25
          lines.push('そくとう ボーナス！')
        }
        if (Math.random() < CRIT + gear.crit) {
          dmg *= 1.6
          lines.push(`一発決裁！ ${pick(CRIT_LINES)}`)
        }
        dmg = Math.round(dmg)
        if (c >= 2) lines.push(`${c}れんぞく せいかい！`)
      }
      const hp = Math.max(0, bossHp - dmg)
      lines.push({
        text: `${boss.name}に ${dmg}の ダメージ！`,
        fx: () => {
          setHit((h) => h + 1)
          setBossHp(hp)
        },
      })
      setCombo(c)
      if (hp <= 0) say([...lines, `${boss.name}を やっつけた！`], onWin)
      else if (boss.boss) enemyTurn(lines)
      else say(lines, () => setPhase('command'))
    } else {
      sfx('wrong')
      setCombo(0)
      const lines: Msg[] = [note ?? 'ざんねん……。', `こたえ：${correctText(q)}`, `（${q.explain}）`]
      // ボス戦：まちがえると 攻撃が 空振りし、そのまま ボスの攻撃へ
      if (boss.boss) return enemyTurn([...lines, 'こうげきは 空振りに おわった……。'])
      if (buff.sand) {
        setBuff((b) => ({ ...b, sand: false }))
        say([...lines, 'すなどけいが ひかった！', 'ミスが なかったことに なった！'], () => setPhase('command'))
        return
      }
      const dmg = hurt()
      const hp = Math.max(0, gs.hp - dmg)
      lines.push(`${boss.name}の こうげき！`, {
        text: `${gs.name}は ${dmg}の ダメージを うけた！`,
        fx: () => {
          setShake((s) => s + 1)
          setGs((g) => ({ ...g, hp }))
        },
      })
      if (hp <= 0) say([...lines, `${gs.name}は ちからつきた……。`], onLose)
      else say(lines, () => setPhase('command'))
    }
  }

  const submitFormula = () => {
    if (!q || q.type !== 'formula') return
    const raw = normalizeInput(touch ? '=' + chips.join('') : formula)
    const t = parseAddr(q.target)
    const rows = Math.max(q.table.length, t.r + 1)
    const cols = Math.max(...q.table.map((r) => r.length), t.c + 1)
    const copies = (q.copies ?? []).map((cp) => ({ ...cp, p: parseAddr(cp.at) }))
    const grid = makeGrid(
      Math.max(rows, ...copies.map((cp) => cp.p.r + 1)),
      Math.max(cols, ...copies.map((cp) => cp.p.c + 1)),
      q.table,
    )
    grid[t.r][t.c].raw = raw
    for (const cp of copies) grid[cp.p.r][cp.p.c].raw = shiftFormula(raw, cp.p.r - t.r, cp.p.c - t.c)
    const vals = evaluate(grid)
    const v = vals[t.r][t.c]
    const same = (x: typeof v, n: number | string) =>
      typeof n === 'string' ? typeof x === 'string' && x.trim() === n : typeof x === 'number' && Math.abs(x - n) < 1e-9
    const okVal = same(v, q.expect)
    const bad = copies.find((cp) => !same(vals[cp.p.r][cp.p.c], cp.expect))
    const okUse =
      !q.mustUse || (q.mustUse === '*' || q.mustUse === '$' || q.mustUse === '&' ? raw.includes(q.mustUse) : usesFn(raw, q.mustUse))
    if (!raw.startsWith('=')) answer(false, '数式は「=」で はじめよう！')
    else if (/[≧≦≠]/.test(raw)) answer(false, '「≧ ≦ ≠」は 使えない！ 以上は >=、以下は <=、等しくないは <> と 書こう。')
    else if (okVal && bad) {
      const got = `${bad.at}に コピーすると ${grid[bad.p.r][bad.p.c].raw} → ${formatValue(vals[bad.p.r][bad.p.c]) || '（空）'}`
      // 文字の答え（IF）なら 条件の まちがい、数値なら 参照の ずれ
      const why = typeof bad.expect === 'string' ? `本当は「${bad.expect}」。条件を 見直そう……！` : '参照が ずれた……！'
      answer(false, `${q.target}は 合ってる！ でも ${got}。${why}`)
    }
    else if (okVal && okUse) answer(true)
    else if (okVal) answer(false, `答えは合ってる！ でも ${q.mustUse} を使ってほしかった……。`)
    else answer(false, `あなたの数式の結果：${formatValue(v) || '（空）'}`)
  }

  const commands = ['たたかう', 'どうぐ', 'にげる']
  const battleItems = (['herb', 'scroll', 'sandglass'] as ItemId[]).filter((id) => gs.items[id] > 0)

  const useItem = (id: ItemId) => {
    setGs((g) => ({ ...g, items: { ...g.items, [id]: g.items[id] - 1 } }))
    if (id === 'herb') {
      const heal = Math.min(30, mhp - gs.hp)
      setGs((g) => ({ ...g, hp: Math.min(mhp, g.hp + 30) }))
      say([`${gs.name}は やくそうを つかった！`, `HPが ${heal} かいふくした！`], () => setPhase('command'))
    } else if (id === 'scroll') {
      setBuff((b) => ({ ...b, scroll: true }))
      say([`${gs.name}は ヘルプのまきものを ひらいた！`, 'つぎの問題で ヒントが 出る！'], () => setPhase('command'))
    } else {
      setBuff((b) => ({ ...b, sand: true }))
      say([`${gs.name}は すなどけいを かかげた！`, 'つぎの ミスを 1回 ふせげる！'], () => setPhase('command'))
    }
  }

  const choose = (i: number) => {
    if (phase === 'command') {
      if (i === 0) nextQuestion()
      else if (i === 1) {
        setCursor(0)
        setPhase('items')
      } else if (tutorial) say(['（ここは 逃げずに 戦ってみよう！）'], () => setPhase('command'))
      else if (boss.boss || Math.random() < 0.65) say([`${gs.name}は にげだした！`], onFlee)
      else {
        const dmg = hurt()
        const hp = Math.max(0, gs.hp - dmg)
        say(
          [
            `${gs.name}は にげだした！`,
            'しかし まわりこまれてしまった！',
            `${boss.name}の こうげき！`,
            {
              text: `${gs.name}は ${dmg}の ダメージを うけた！`,
              fx: () => {
                setShake((sh) => sh + 1)
                setGs((g) => ({ ...g, hp }))
              },
            },
            ...(hp <= 0 ? [`${gs.name}は ちからつきた……。`] : []),
          ],
          hp <= 0 ? onLose : () => setPhase('command'),
        )
      }
    } else if (phase === 'items') {
      if (i >= battleItems.length) {
        setCursor(1)
        setPhase('command')
      } else useItem(battleItems[i])
    } else if (phase === 'question' && q?.type === 'choice') answer(choices[i] === q.answer)
  }

  const listLen = phase === 'command' ? 3 : phase === 'items' ? battleItems.length + 1 : phase === 'question' && q?.type === 'choice' ? choices.length : 0
  useKeys(
    (k) => {
      if (phase === 'msg') {
        if (k === 'ok' || k === 'cancel') {
          if (msgs.length > 1) sfx('blip')
          nextMsg()
        }
        return
      }
      if (k === 'up' || k === 'down' || ((k === 'left' || k === 'right') && phase === 'question')) sfx('cursor')
      if (k === 'up') setCursor((c) => (c + listLen - 1) % listLen)
      else if (k === 'down') setCursor((c) => (c + 1) % listLen)
      else if (k === 'left' && phase === 'question') setCursor((c) => (c + listLen - 1) % listLen)
      else if (k === 'right' && phase === 'question') setCursor((c) => (c + 1) % listLen)
      else if (k === 'ok') {
        if (phase !== 'question') sfx('select')
        choose(cursor)
      } else if (k === 'cancel' && phase === 'items') {
        sfx('cancel')
        setCursor(1)
        setPhase('command')
      }
    },
    true,
  )
  // 数字キー（1〜4）も拾う
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'question' && q?.type === 'choice' && /^[1-4]$/.test(e.key)) choose(Number(e.key) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const remain = Math.max(0, deadline - now)
  const limit = Math.max(1, deadline - startedAt.current)
  // 即答ボーナスは こちらの攻撃のときだけ（チュートリアルは固定ダメージなので出さない）
  const showQuick = mode === 'attack' && !boss.hits
  const quickZone = showQuick && 1 - remain / limit < QUICK
  const target = q?.type === 'formula' ? parseAddr(q.target) : null
  const copyCells = q?.type === 'formula' ? (q.copies ?? []).map((cp) => parseAddr(cp.at)) : []
  const tableCols = q?.type === 'formula' ? Math.max(...q.table.map((r) => r.length), target!.c + 1, ...copyCells.map((p) => p.c + 1)) : 0
  const tableRows = q?.type === 'formula' ? Math.max(q.table.length, target!.r + 1, ...copyCells.map((p) => p.r + 1)) : 0

  // スマホの 数式ボタンは 画面の下いっぱいに 出す（ゲーム画面の中だと 小さすぎる）
  const touchFormula = touch && q?.type === 'formula'

  // 表を タップ・ドラッグして セル・範囲を 数式に 入れる（直前が 参照なら 置きかえ）
  const cellPick = useCellPick(
    q?.type === 'formula'
      ? (ref) => {
          if (ref === q.target) return
          if (touch) setChips((c) => pickRef(c, ref))
          else setFormula((f) => f.replace(/\$?[A-Z]{1,3}\$?\d+(:\$?[A-Z]{1,3}\$?\d+)?$/, '') + ref)
        }
      : null,
  )
  const portal = (el: ReactElement) => (touchFormula ? createPortal(el, document.body) : el)

  return (
    <div className={`battle bg-${scene} ${shake % 2 ? 'shake-a' : shake ? 'shake-b' : ''}`}>
      <div className="win status-win">
        <div>{gs.name}</div>
        <div>
          H {gs.hp}/{mhp}
        </div>
        <div>Lv {gs.level}</div>
        {(buff.scroll || buff.sand) && (
          <div className="buffs">
            {buff.scroll && '📜'}
            {buff.sand && '⏳'}
          </div>
        )}
      </div>
      <div className="boss-area">
        <div className="boss-hp">
          <span>{boss.name}</span>
          <div className="bar">
            <div style={{ width: `${(bossHp / boss.hp) * 100}%` }} />
          </div>
        </div>
        {bossHp <= 0 ? (
          <div className="boss-gone">✨</div>
        ) : boss.boss && hasBossArt(boss.sprite) ? (
          <BossVisual key={hit} id={boss.sprite} hit={hit} />
        ) : (
          <BossSprite key={hit} id={boss.sprite} hit={hit} />
        )}
      </div>

      {phase === 'question' && q && portal(
        <div className={`win question-win ${mode} ${touchFormula ? 'touch-q' : ''}`}>
          {boss.boss && (
            <div className="q-mode">{mode === 'defense' ? `🛡 ${boss.name}の 攻撃！ 正解で ダメージを へらせ！` : '⚔ こちらの 攻撃！'}</div>
          )}
          <div className={`timer ${quickZone ? 'quick' : remain / limit < 0.2 ? 'danger' : mode === 'defense' ? 'guard' : 'normal'}`}>
            <div className="timer-fill" style={{ width: `${(remain / limit) * 100}%` }} />
            {showQuick && <div className="timer-mark" style={{ left: `${(1 - QUICK) * 100}%` }} />}
            {quickZone && <span className="timer-label">即答ボーナス！</span>}
          </div>
          <div className="q-text">{q.q}</div>
          {q.type === 'choice' ? (
            <div className="q-choices">
              {choices.map((c, i) => (
                <div key={c} className={`opt ${i === cursor ? 'on' : ''}`} onPointerEnter={() => setCursor(i)} onClick={() => choose(i)}>
                  <span className="num">{i + 1}</span> {c}
                </div>
              ))}
            </div>
          ) : (
            <div className="q-formula">
              <table className="mini-table picking" {...cellPick.handlers}>
                <thead>
                  <tr>
                    <th />
                    {Array.from({ length: tableCols }, (_, c) => (
                      <th key={c}>{colName(c)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: tableRows }, (_, r) => (
                    <tr key={r}>
                      <th>{r + 1}</th>
                      {Array.from({ length: tableCols }, (_, c) => {
                        const isT = r === target!.r && c === target!.c
                        const isCopy = copyCells.some((p) => p.r === r && p.c === c)
                        const a = `${colName(c)}${r + 1}`
                        return (
                          <td key={c} data-a={a} className={`${isT ? 'target' : isCopy ? 'copy' : ''} ${cellPick.selecting.has(a) ? 'selecting' : ''}`}>
                            {isT ? '？' : isCopy ? '⇩' : (q.table[r]?.[c] ?? '')}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submitFormula()
                }}
              >
                {touch ? (
                  <>
                    <div className="fpad-formula">
                      <span className="fpad-target">{q.target}</span>
                      <span className="fpad-text">
                        ={chips.join('')}
                        {!chips.length && <span className="fpad-ph">ボタンか、表を タップ・ドラッグ</span>}
                      </span>
                    </div>
                    <FormulaPad
                      groups={pad}
                      onChip={(t) => setChips((c) => [...c, t])}
                      actions={[
                        { label: 'F4 ($)', onClick: () => setChips(toggleLastRef) },
                        { label: '⌫', onClick: () => setChips((c) => c.slice(0, -1)) },
                        { label: 'クリア', onClick: () => setChips([]) },
                      ]}
                    />
                  </>
                ) : (
                  <label>
                    {q.target} ＝{' '}
                    <input
                      autoFocus
                      value={formula}
                      onChange={(e) => setFormula(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'F4') return
                        // F4 で カーソル位置の参照に「$」を付け外し
                        e.preventDefault()
                        const el = e.currentTarget
                        const t = toggleAbsAt(el.value, el.selectionStart ?? el.value.length)
                        if (t) {
                          el.value = t.text
                          el.setSelectionRange(t.caret, t.caret)
                          setFormula(t.text)
                          requestAnimationFrame(() => el.setSelectionRange(t.caret, t.caret))
                        }
                      }}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </label>
                )}
                <button className="btn primary" data-nosfx>{mode === 'defense' ? 'ふせぐ！' : 'こうげき！'}</button>
                {q.copies && <div className="copy-note">⇩ の セルにも この数式を コピーして 確かめるぞ！（F4 で $ 切替）</div>}
                {buff.scroll && <div className="hint">📜 ヒント：{q.hint.replace(/\(.*\)/, '(…)')}</div>}
              </form>
            </div>
          )}
        </div>,
      )}

      {(phase === 'command' || phase === 'items') && (
        <div className="battle-cmds">
          <div className="win cmd-win">
            {commands.map((c, i) => (
              <div key={c} className={`opt ${phase === 'command' && i === cursor ? 'on' : ''}`}
                onClick={() => phase === 'command' && choose(i)}>
                {c}
              </div>
            ))}
          </div>
          {phase === 'items' && (
            <div className="win item-win">
              {battleItems.map((id, i) => (
                <div key={id} className={`opt ${i === cursor ? 'on' : ''}`} onPointerEnter={() => setCursor(i)} onClick={() => choose(i)}>
                  {ITEMS[id].name} ×{gs.items[id]}
                </div>
              ))}
              <div className={`opt ${cursor === battleItems.length ? 'on' : ''}`} onClick={() => choose(battleItems.length)}>
                もどる
              </div>
            </div>
          )}
          <div className="win combo-win">{combo >= 2 ? `🔥 ${combo}れんぞく` : '　'}</div>
        </div>
      )}

      {phase === 'msg' && (
        <div
          className="win dialog-win"
          onClick={() => {
            if (msgs.length > 1) sfx('blip')
            nextMsg()
          }}
        >
          <div className="dialog-text">
            {typeof msgs[0] === 'object' ? msgs[0].text : msgs[0]}
            <span className="next">▼</span>
          </div>
        </div>
      )}
    </div>
  )
}
