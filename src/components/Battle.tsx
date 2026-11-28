import { useEffect, useRef, useState, type ReactElement } from 'react'
import { BattleStage } from './BattleStage'
import './Verdict.css'
import './BattleLog.css'
import { Portrait } from './Portrait'
import { PLAYER_SPEC } from '../data/maps'
import { createPortal } from 'react-dom'
import { ENEMIES, type BossDef, type Question, type QuestionSrc } from '../data/bosses'
import { itemDesc, itemName } from '../data/items'
import { enemyName } from '../data/en'
import { tr } from '../game/lang'
import { useKeys } from '../game/keys'
import { drawRows } from '../game/sprites'
import { CREATURES } from '../game/spriteParts'
import { maxHp } from '../game/progress'
import { scaleEnemy } from '../game/scaling'
import { clearStars, winReward, type ClearStars } from '../game/clear'
import { FLINCH_STREAK, GARBLE_MS, RAGE_HEAL, RAGE_QUICK, RAGE_RULE, garble, rageAtk, rageRuleText, rageTime } from '../game/rage'
import { gearStats } from '../data/equipment'
import type { GameState, ItemId } from '../game/types'
import { useInputMode } from '../game/inputMode'
import { isTouchDevice } from '../game/layout'
import { FormulaQuestion } from './FormulaQuestion'
import { judgeFormula } from '../game/judge'
import { markWeak, questionKey } from '../game/weak'
import { BossVisual } from './BossVisual'
import { BattleWin } from './BattleWin'
import { BattleLose, type Missed } from './BattleLose'
import { hasBossArt } from '../game/bossArt'
import { cue, sfx, sfxNow, useBgm } from '../game/sound'

interface Props {
  bossId: string
  /** 最初の戦闘（操作説明つき・逃げられない） */
  tutorial?: boolean
  /** 倒した ボスへの 再挑戦（報酬 半分・負けても 罰なし） */
  rematch?: boolean
  /** 見える 敵に 背中から ふれた（first：先制）／ふれられた（ambush：不意打ち） */
  strike?: 'first' | 'ambush'
  /** 背景（森・草原・ボス） */
  scene?: 'boss' | 'field' | 'forest' | 'cave' | 'temple' | 'ship' | 'library' | 'treasury' | 'printing' | 'clock' | 'castle'
  gs: GameState
  setGs(f: (g: GameState) => GameState): void
  /** stars：ボス戦の 評価（★の 数 0〜3）。ボス戦 以外は なし */
  onWin(r?: { stars: number; retry?: boolean }): void
  onLose(): void
  onFlee(): void
}

type Phase = 'msg' | 'command' | 'items' | 'question' | 'win' | 'lose'
/** 答え合わせカード：正解・不正解・正しい 答え・自分の 答え・解説を 1枚に まとめて 見せる */
interface Verdict {
  ok: boolean
  /** 見出し（せいかい！／ざんねん……。／時間切れ！ など） */
  title: string
  /** 正しい 答え（まちがえた ときだけ 出す） */
  answer?: string
  /** 自分が 選んだ・入れた 答え */
  mine?: string
  explain: string
  /** 正解の ごほうびの 札（即答・れんぞく） */
  tags?: string[]
}
/** 表示された瞬間に fx を実行するメッセージ（ダメージ反映など）。verdict つきは 答え合わせカードで 見せる */
type Msg = string | { text: string; fx?: () => void; verdict?: Verdict }
const runFx = (m?: Msg) => {
  if (!m) return
  cue(typeof m === 'string' ? m : m.text)
  if (typeof m === 'object') m.fx?.()
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
/** 動きを 減らす 設定（正解・不正解の 反応を 見せる 時間を 短く） */
const REDUCED_MOTION = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
/** コマンドの 印（スマホでは 大きな ボタンに 出す） */
const CMD_KEYS = ['fight', 'items', 'run'] as const
const CMD_ICONS = ['⚔️', '🎒', '🏃']
const ITEM_ICONS: Record<ItemId, string> = { herb: '🌿', scroll: '📜', sandglass: '⏳' }
/** 一発決裁（大ダメージ）の基本確率。ブルーライトメガネで 10% に上がる */
const CRIT = 0.05
/** ボス戦：敵の問題に正解したとき、ダメージがゼロになる確率 */
const PERFECT_GUARD = 0.05
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const CRIT_LINES = () => [
  tr('部長の ハンコが 即日 押された！', 'The manager stamped it the same day!'),
  tr('稟議が 一発で 通った！', 'The proposal passed on the first try!'),
  tr('根回しが 完璧に きまった！', 'All that groundwork paid off perfectly!'),
  tr('社長の「いいね」が ついた！', 'The CEO gave it a "Like"!'),
]
const GUARD_LINES = () => [
  tr('「前向きに 検討します」――攻撃を 見事に かわした！', '"We\'ll give it positive consideration." Dodged the attack!'),
  tr('「その件は 持ち帰ります」――攻撃を 華麗に スルーした！', '"Let me take that back to the team." Slipped right past the attack!'),
  tr('「担当が 不在でして」――攻撃が 空を 切った！', '"The person in charge is out today." The attack hit nothing!'),
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

export function Battle({ bossId, tutorial, rematch, strike, scene = 'boss', gs, setGs, onWin, onLose, onFlee }: Props) {
  // 町は どの 順でも 回れるので、敵の 強さは レベルに 合わせる
  const [boss] = useState(() => scaleEnemy(ENEMIES[bossId], gs.level))
  const bossName = enemyName(boss)
  /** 先制：最初の こちらの 攻撃が 1.5倍 */
  const firstHit = useRef(strike === 'first')
  /** 不意打ち：戦いの はじめに 敵の 攻撃を うける（これで 倒れは しない） */
  const ambushLines = (): Msg[] => {
    const dmg = Math.max(1, Math.min(gs.hp - 1, rand(boss.attack[0], boss.attack[1]) - Math.floor(gearStats(gs).def * 0.7)))
    return [
      { text: tr('不意を つかれた！', 'Ambushed!'), fx: () => sfx('enemyAttack') },
      {
        text: tr(`${gs.name}は ${dmg}の ダメージを うけた！`, `${gs.name} took ${dmg} damage!`),
        fx: () => {
          setShake((s) => s + 1)
          setGs((g) => ({ ...g, hp: Math.max(1, g.hp - dmg) }))
          pop('me', 'hurt', `-${dmg}`)
        },
      },
    ]
  }
  useBgm(boss.id === 'refera' ? 'lastboss' : boss.boss ? 'boss' : 'battle')
  /** 山札（boss.questions の 番号） */
  const deck = useRef<number[]>([])
  /** 出題中の 問題の 出どころ（苦手リスト用） */
  const curKey = useRef('')
  /** 問題ごとに 入力欄を 作り直す */
  const [qNo, setQNo] = useState(0)
  const [bossHp, setBossHp] = useState(() =>
    boss.boss && !boss.hits && RAGE_RULE[boss.id] && location.hostname === 'localhost' && new URLSearchParams(location.search).has('rage') ? Math.round(boss.hp / 2) : boss.hp,
  )
  const [phase, setPhase] = useState<Phase>('msg')
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    tr(`${bossName}が あらわれた！`, `${bossName} appeared!`),
    ...(strike === 'first'
      ? [
          { text: tr('先制攻撃！ 敵は まだ こちらに 気づいていない！', "First strike! The enemy hasn't noticed you yet!"), fx: () => sfx('quick') },
          tr('（最初の 一撃は 威力 1.5倍！）', '(Your first hit deals 1.5x damage!)'),
        ]
      : []),
    ...(strike === 'ambush' ? ambushLines() : []),
    ...(tutorial
      ? [
          tr('（戦いは「表計算の問題」で 行われる！）', '(Battles are fought with spreadsheet questions!)'),
          tr('（「たたかう」を選ぶと 問題が出る。正解すると 敵に ダメージ！）', '(Choose "Fight" to get a question. Answer correctly to damage the enemy!)'),
          tr('（まちがえたり 時間切れになると、敵の 反撃を うける）', '(If you answer wrong or run out of time, the enemy strikes back.)'),
          tr('（本番の戦いでは、残り時間のバーが 緑のうちに 答えると「即答ボーナス」で ダメージアップ！）', '(In real battles, answer while the timer bar is green for a Quick Answer Bonus!)'),
          tr('（連続正解でも 威力が上がる。ごくまれに「一発決裁」で 大ダメージも 出るぞ）', '(Answer streaks boost your power, too. Very rarely, an "Instant Approval" deals huge damage!)'),
          isTouchDevice
            ? tr('（答えは タップで 選べるぞ）', '(Tap an answer to choose it.)')
            : tr('（答えは クリック、または 数字キー 1〜4 でも 選べるぞ）', '(Click an answer, or press the number keys 1-4.)'),
        ]
      : []),
    ...(rematch
      ? [tr('（再挑戦：報酬は 半分。負けても お金は 減らない）', "(Rematch: half rewards, and you won't lose gold if you fall.)")]
      : []),
    ...(ENEMIES[bossId].boss && !ENEMIES[bossId].hits
      ? [tr(`（${FLINCH_STREAK}れんぞく 正解で ボスが ひるみ、反撃を ふせげる！）`, `(Get ${FLINCH_STREAK} right in a row to make the boss flinch and skip its attack!)`)]
      : []),
  ])
  const after = useRef<() => void>(() => setPhase('command'))
  const [cursor, setCursor] = useState(0)
  const [q, setQ] = useState<Question | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  /** 押した 選択肢（正解なら ✓で はね、まちがいなら ゆれる。少し 見せてから 結果の 文へ） */
  const [picked, setPicked] = useState<{ i: number; ok: boolean } | null>(null)
  /** 選択肢を 押した 時刻（即答ボーナスは 押した 瞬間で 判定する） */
  const tapAt = useRef<number | null>(null)
  const touch = useInputMode() === 'touch'
  /** attack：こちらの攻撃の問題 ／ defense：ボスの攻撃の問題（正解でダメージ減） */
  const [mode, setMode] = useState<'attack' | 'defense'>('attack')
  const guardHinted = useRef(false)
  const [deadline, setDeadline] = useState(0)
  const [combo, setCombo] = useState(0)
  /** リザルト画面用：正解した 数・最高 連続正解・うけた ダメージの 合計 */
  const stats = useRef({ correct: 0, best: 0, hurt: 0 })
  const winDone = useRef(false)
  /** 負けたときの ふりかえり用：まちがえた 問題（新しい 順・同じ 問題は 1つに） */
  const missed = useRef<Missed[]>([])
  /** 力つきたら ふりかえり画面へ（閉じたら onLose） */
  const toLose = () => setPhase('lose')
  /** 本気モード（ボスの HPが 半分を 切ると 入る。チュートリアルには ない） */
  const rule = boss.boss && !boss.hits ? RAGE_RULE[boss.id] : undefined
  // 確かめ用（localhost で ?rage を つけると、本気モードから 始まる）
  const [devRage] = useState(() => !!rule && location.hostname === 'localhost' && new URLSearchParams(location.search).has('rage'))
  const raged = useRef(devRage)
  const [rage, setRage] = useState(devRage)
  /** クリア評価の ための 記録（まちがえた 数・どうぐを 使ったか・ひるませた 数） */
  const misses = useRef(0)
  const usedItem = useRef(false)
  const flinches = useRef(0)
  /** 本気モードの 選択肢の 動き（消える・入れかわる・文字化け）を 進める 時計 */
  const [tick, setTick] = useState(0)
  const [buff, setBuff] = useState<{ scroll: boolean; sand: boolean }>({ scroll: false, sand: false })
  const [hit, setHit] = useState(0)
  const [shake, setShake] = useState(0)
  /** ダメージ・回復の 数字（ポンと 飛び出して 消える） */
  const [pops, setPops] = useState<Pop[]>([])
  const popId = useRef(0)
  const pop = (on: Pop['on'], kind: Pop['kind'], text: string) => {
    const id = ++popId.current
    setPops((list) => [...list, { id, on, kind, text }])
    setTimeout(() => setPops((list) => list.filter((x) => x.id !== id)), 1300)
  }
  const startedAt = useRef(0)
  const answered = useRef(false)
  const mhp = maxHp(gs.level)
  const gear = gearStats(gs)
  /** 敵の攻撃。守備力（よろい・たて・かぶと）の分だけ軽くなる */
  const hurt = () => Math.max(1, Math.round((rand(boss.attack[0], boss.attack[1]) - Math.floor(gear.def * 0.7)) * (raged.current && rule ? rageAtk(rule) : 1)))

  /** メッセージの まとまりの 番号と 件数（窓の 下の 点・文字送りの 区切りに 使う） */
  const sayNo = useRef(0)
  const msgTotal = useRef(msgs.length)
  /** 文字送り中なら 全部 出して true を 返す（キー操作で 1回目は 送らずに 文字を 出しきる） */
  const logSkip = useRef<() => boolean>(() => false)
  const say = (list: Msg[], then: () => void) => {
    runFx(list[0])
    sayNo.current++
    msgTotal.current = list.length
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
    if (!deck.current.length) deck.current = shuffle(boss.questions.map((_, i) => i))
    const qi = deck.current.shift()!
    curKey.current = questionKey(boss.id, qi)
    const src: QuestionSrc = boss.questions[qi]
    // 自動生成の問題は、出すたびに 数値が変わる
    const nq = typeof src === 'function' ? src() : src
    setMode(m)
    setQ(nq)
    setQNo((n) => n + 1)
    answered.current = false
    tapAt.current = null
    setPicked(null)
    if (nq.type === 'choice') {
      let cs = shuffle(nq.choices)
      if (buff.scroll) {
        const wrong = cs.filter((c) => c !== nq.answer).slice(0, 2)
        cs = cs.filter((c) => !wrong.includes(c))
      }
      setChoices(cs)
    }
    setCursor(0)
    const limit = Math.round(((nq.type === 'choice' ? 20000 : 60000) + gear.time * 1000) * (raged.current && rule ? rageTime(rule, nq.type === 'formula') : 1))
    startedAt.current = Date.now()
    setDeadline(Date.now() + limit)
    setPhase('question')
  }

  // 時間切れ（バーの 動きは TimerBar が CSS で 描くので、ここでは 1回だけ 時計を かける）
  const answerRef = useRef<(ok: boolean, note?: string, mine?: string) => void>(() => {})
  useEffect(() => {
    if (phase !== 'question') return
    const t = setTimeout(() => tapAt.current === null && answerRef.current(false, tr('時間切れ！', "Time's up!")), Math.max(0, deadline - Date.now()))
    return () => clearTimeout(t)
  }, [phase, deadline])

  const correctText = (x: Question) => (x.type === 'choice' ? x.answer : x.hint)
  /** 答え合わせカードの メッセージ。text は 効果音（cue）用 */
  const verdictMsg = (ok: boolean, x: Question, o: { note?: string; mine?: string; tags?: string[]; quick?: boolean } = {}): Msg => {
    const title = ok ? tr('せいかい！', 'Correct!') : (o.note ?? tr('ざんねん……。', 'Too bad...'))
    return {
      text: title,
      // 即答の 音は 正解の 音の すぐ あとに
      fx: o.quick ? () => setTimeout(() => sfx('quick'), 260) : undefined,
      verdict: { ok, title, answer: ok ? undefined : correctText(x), mine: ok ? undefined : o.mine?.trim() || undefined, explain: x.explain, tags: o.tags },
    }
  }

  /** ボス戦：こちらの攻撃のあと、ボスが問題を出して攻撃してくる */
  const enemyTurn = (pre: Msg[]) => {
    const lines: Msg[] = [...pre, tr(`${bossName}の こうげき！`, `${bossName} attacks!`)]
    if (boss.attackText) lines.push(boss.attackText)
    if (!guardHinted.current) {
      lines.push(tr('（ボスの問題に 正解すれば、ダメージを へらせる！）', "(Answer the boss's question correctly to reduce the damage!)"))
      guardHinted.current = true
    }
    say(lines, () => nextQuestion('defense'))
  }

  /** ボスの攻撃の問題に答えた */
  const defend = (ok: boolean, note?: string, mine?: string) => {
    if (!q) return
    const full = hurt()
    const lines: Msg[] = []
    let dmg = full
    if (ok) {
      lines.push(verdictMsg(true, q))
      if (Math.random() < PERFECT_GUARD) {
        dmg = 0
        lines.push(pick(GUARD_LINES()), { text: tr(`${gs.name}は ダメージを うけなかった！`, `${gs.name} took no damage!`), fx: () => pop('me', 'guard', tr('ノーダメージ', 'No damage')) })
      } else {
        dmg = Math.max(1, Math.round(full * 0.3))
        lines.push(tr('ガード せいこう！ ダメージを おさえた！', 'Guard success! Damage reduced!'))
      }
    } else {
      sfx('wrong')
      lines.push(verdictMsg(false, q, { note, mine }))
      if (buff.sand) {
        setBuff((b) => ({ ...b, sand: false }))
        dmg = 0
        lines.push(tr('すなどけいが ひかった！', 'The hourglass glowed!'), tr('ダメージを なかったことに した！', 'The damage never happened!'))
      }
    }
    const hp = Math.max(0, gs.hp - dmg)
    if (dmg > 0)
      lines.push({
        text: tr(`${gs.name}は ${dmg}の ダメージを うけた！`, `${gs.name} took ${dmg} damage!`),
        fx: () => {
          stats.current.hurt += dmg
          setShake((s) => s + 1)
          setGs((g) => ({ ...g, hp }))
          pop('me', 'hurt', `-${dmg}`)
        },
      })
    if (hp <= 0) say([...lines, tr(`${gs.name}は ちからつきた……。`, `${gs.name} collapsed...`)], toLose)
    else say(lines, () => setPhase('command'))
  }

  const answer = (ok: boolean, note?: string, mine?: string) => {
    if (!q || answered.current) return
    answered.current = true
    const usedScroll = buff.scroll
    if (usedScroll) setBuff((b) => ({ ...b, scroll: false }))
    // まちがえた 問題は 苦手リストへ（正解したら 外す）
    if (!tutorial) markWeak(curKey.current, ok)
    if (!ok) {
      misses.current++
      missed.current = [{ q: q.q, answer: correctText(q), explain: q.explain }, ...missed.current.filter((m) => m.q !== q.q)]
    }
    if (mode === 'defense') return defend(ok, note, mine)
    // 先制の 一撃は 最初の 攻撃 1回だけ（外したら 終わり）
    const usedFirst = firstHit.current
    firstHit.current = false
    if (ok) {
      const limit = deadline - startedAt.current
      const quick = (tapAt.current ?? Date.now()) - startedAt.current <= limit * QUICK
      const c = combo + 1
      const tags: string[] = []
      const lines: Msg[] = []
      let dmg: number
      let crit = false
      if (boss.hits) {
        // チュートリアル：決まった回数の正解で倒れる
        dmg = Math.ceil(boss.hp / boss.hits)
      } else {
        // 攻撃力（ぶき）の分だけ ダメージが増える
        const base = 10 + gs.level * 2 + gear.atk + rand(-2, 3)
        dmg = base * (1 + 0.15 * (c - 1))
        if (quick) {
          dmg *= raged.current ? RAGE_QUICK : 1.25
          tags.push(tr('⚡ そくとう ボーナス', '⚡ Quick bonus'))
        }
        if (usedFirst) {
          dmg *= 1.5
          tags.push(tr('🗡 先制の 一撃', '🗡 First strike'))
        }
        if (Math.random() < CRIT + gear.crit) {
          dmg *= 1.6
          crit = true
          lines.push(tr(`一発決裁！ ${pick(CRIT_LINES())}`, `Instant Approval! ${pick(CRIT_LINES())}`))
        }
        dmg = Math.round(dmg)
        if (c >= 2) tags.push(tr(`🔥 ${c}れんぞく`, `🔥 ${c} in a row`))
      }
      lines.unshift(verdictMsg(true, q, { tags, quick }))
      const hp = Math.max(0, bossHp - dmg)
      lines.push({
        text: tr(`${bossName}に ${dmg}の ダメージ！`, `${bossName} takes ${dmg} damage!`),
        fx: () => {
          setHit((h) => h + 1)
          setBossHp(hp)
          pop('boss', crit ? 'crit' : 'dmg', String(dmg))
        },
      })
      setCombo(c)
      stats.current.correct++
      stats.current.best = Math.max(stats.current.best, c)
      // 倒したら（✨ を 見せた あと）リザルト画面へ。勝利の 音は 画面が 出た 瞬間に
      if (hp <= 0)
        return say(lines, () => {
          cue(tr(`${bossName}を やっつけた！`, `Defeated ${bossName}!`))
          setPhase('win')
        })
      // HPが 半分を 切ったら 本気モード
      if (rule && !raged.current && hp <= boss.hp / 2) {
        raged.current = true
        lines.push(
          {
            text: tr(`${bossName}の 目の 色が 変わった……！`, `${bossName}'s eyes changed color...!`),
            fx: () => {
              setRage(true)
              sfx('rumble')
              setShake((s) => s + 1)
            },
          },
          tr(`${bossName}は 本気に なった！ 攻撃が 強くなる！`, `${bossName} got serious! Its attacks grow stronger!`),
          rageRuleText(rule),
          tr('（そのかわり 即答ボーナスも 大きくなる！）', '(But the Quick Answer Bonus gets bigger too!)'),
        )
      }
      // れんぞく正解で ボスが ひるむ：反撃なしで こちらの 番
      if (boss.boss && c % FLINCH_STREAK === 0) {
        flinches.current++
        say(
          [
            ...lines,
            { text: tr(`${c}れんぞく！ ${bossName}は ひるんでいる！`, `${c} in a row! ${bossName} flinched!`), fx: () => sfx('crit') },
            tr('反撃を うけずに すんだ！', 'It could not strike back!'),
          ],
          () => setPhase('command'),
        )
      } else if (boss.boss) enemyTurn(lines)
      else say(lines, () => setPhase('command'))
    } else {
      sfx('wrong')
      setCombo(0)
      const lines: Msg[] = [verdictMsg(false, q, { note, mine })]
      // ボス戦：まちがえると 攻撃が 空振りし、そのまま ボスの攻撃へ
      if (boss.boss) {
        lines.push(tr('こうげきは 空振りに おわった……。', 'Your attack missed...'))
        if (raged.current && rule === 'heal' && bossHp < boss.hp) {
          const heal = Math.min(boss.hp - bossHp, Math.round(boss.hp * RAGE_HEAL))
          lines.push({
            text: tr(`${bossName}は 力を 取りもどした！ HPが ${heal} 回復！`, `${bossName} regained its strength! Recovered ${heal} HP!`),
            fx: () => {
              sfx('heal')
              setBossHp((h) => Math.min(boss.hp, h + heal))
              pop('boss', 'heal', `+${heal}`)
            },
          })
        }
        return enemyTurn(lines)
      }
      if (buff.sand) {
        setBuff((b) => ({ ...b, sand: false }))
        say([...lines, tr('すなどけいが ひかった！', 'The hourglass glowed!'), tr('ミスが なかったことに なった！', 'Your mistake was undone!')], () => setPhase('command'))
        return
      }
      const dmg = hurt()
      const hp = Math.max(0, gs.hp - dmg)
      lines.push(tr(`${bossName}の こうげき！`, `${bossName} attacks!`), {
        text: tr(`${gs.name}は ${dmg}の ダメージを うけた！`, `${gs.name} took ${dmg} damage!`),
        fx: () => {
          stats.current.hurt += dmg
          setShake((s) => s + 1)
          setGs((g) => ({ ...g, hp }))
          pop('me', 'hurt', `-${dmg}`)
        },
      })
      if (hp <= 0) say([...lines, tr(`${gs.name}は ちからつきた……。`, `${gs.name} collapsed...`)], toLose)
      else say(lines, () => setPhase('command'))
    }
  }
  answerRef.current = answer

  const submitFormula = (input: string) => {
    if (!q || q.type !== 'formula') return
    const r = judgeFormula(q, input)
    answer(r.ok, r.note, input)
  }

  const commands = [tr('たたかう', 'Fight'), tr('どうぐ', 'Items'), tr('にげる', 'Run')]
  const battleItems = (['herb', 'scroll', 'sandglass'] as ItemId[]).filter((id) => gs.items[id] > 0)
  const itemCount = battleItems.reduce((n, id) => n + gs.items[id], 0)

  const useItem = (id: ItemId) => {
    usedItem.current = true
    setGs((g) => ({ ...g, items: { ...g.items, [id]: g.items[id] - 1 } }))
    if (id === 'herb') {
      const heal = Math.min(30, mhp - gs.hp)
      setGs((g) => ({ ...g, hp: Math.min(mhp, g.hp + 30) }))
      pop('me', 'heal', `+${heal}`)
      say([tr(`${gs.name}は やくそうを つかった！`, `${gs.name} used a Herb!`), tr(`HPが ${heal} かいふくした！`, `Recovered ${heal} HP!`)], () => setPhase('command'))
    } else if (id === 'scroll') {
      setBuff((b) => ({ ...b, scroll: true }))
      say([tr(`${gs.name}は ヘルプのまきものを ひらいた！`, `${gs.name} opened the Scroll of Help!`), tr('つぎの問題で ヒントが 出る！', "You'll get a hint on the next question!")], () => setPhase('command'))
    } else {
      setBuff((b) => ({ ...b, sand: true }))
      say([tr(`${gs.name}は すなどけいを かかげた！`, `${gs.name} raised the Ctrl+Z Hourglass!`), tr('つぎの ミスを 1回 ふせげる！', 'Your next mistake will be undone!')], () => setPhase('command'))
    }
  }

  const choose = (i: number) => {
    if (phase === 'command') {
      if (i === 0) nextQuestion()
      else if (i === 1) {
        setCursor(0)
        setPhase('items')
      } else if (tutorial) say([tr('（ここは 逃げずに 戦ってみよう！）', "(Don't run - try fighting this one!)")], () => setPhase('command'))
      else if (boss.boss || Math.random() < 0.65) say([tr(`${gs.name}は にげだした！`, `${gs.name} ran away!`)], onFlee)
      else {
        const dmg = hurt()
        const hp = Math.max(0, gs.hp - dmg)
        say(
          [
            tr(`${gs.name}は にげだした！`, `${gs.name} tried to run!`),
            tr('しかし 行く手を ふさがれた！', 'But the way was blocked!'),
            tr(`${bossName}の こうげき！`, `${bossName} attacks!`),
            {
              text: tr(`${gs.name}は ${dmg}の ダメージを うけた！`, `${gs.name} took ${dmg} damage!`),
              fx: () => {
                stats.current.hurt += dmg
                setShake((sh) => sh + 1)
                setGs((g) => ({ ...g, hp }))
                pop('me', 'hurt', `-${dmg}`)
              },
            },
            ...(hp <= 0 ? [tr(`${gs.name}は ちからつきた……。`, `${gs.name} collapsed...`)] : []),
          ],
          hp <= 0 ? toLose : () => setPhase('command'),
        )
      }
    } else if (phase === 'items') {
      if (i >= battleItems.length) {
        setCursor(1)
        setPhase('command')
      } else useItem(battleItems[i])
    } else if (phase === 'question' && q?.type === 'choice') {
      if (tapAt.current !== null || answered.current) return
      const ok = choices[i] === q.answer
      tapAt.current = Date.now()
      setPicked({ i, ok })
      // 音と 見た目の 反応は 押した 瞬間に。結果の 文は 反応を 見せてから
      sfxNow(ok ? 'correct' : 'wrong')
      setTimeout(() => answerRef.current(ok, undefined, choices[i]), REDUCED_MOTION() ? 120 : 460)
    }
  }

  // 本気モードの 選択肢の 動き（答えを 押したら 止める）
  const choiceFx = rage && phase === 'question' && !!q && !picked && (rule === 'blink' || rule === 'garble' || (rule === 'shuffle' && q.type === 'choice'))
  const isChoice = q?.type === 'choice'
  useEffect(() => {
    if (!choiceFx) return
    setTick(0)
    const t = setInterval(() => {
      setTick((n) => n + 1)
    }, 250)
    return () => clearInterval(t)
  }, [choiceFx, qNo])
  useEffect(() => {
    if (choiceFx && isChoice && rule === 'shuffle' && tick > 0 && tick % 10 === 0) setChoices((cs) => shuffle(cs))
  }, [tick]) // eslint-disable-line react-hooks/exhaustive-deps
  /** blink：いま 消えている 選択肢（4拍の うち 3拍 消える。どれが 消えるかは 拍ごとに 変わる） */
  const blinkIdx = choiceFx && isChoice && rule === 'blink' && tick % 4 !== 3 ? (Math.floor(tick / 4) * 7 + qNo * 3) % Math.max(1, choices.length) : -1
  /** 数式の 問題では 問題文が 消える（6拍の うち 2拍） */
  const textBlink = choiceFx && !isChoice && rule === 'blink' && tick % 6 >= 4
  const garbled = choiceFx && rule === 'garble' && tick * 250 < GARBLE_MS

  const listLen = phase === 'command' ? 3 : phase === 'items' ? battleItems.length + 1 : phase === 'question' && q?.type === 'choice' ? choices.length : 0
  /** ボス戦の クリア評価（★）。勝った ときだけ */
  const clear: ClearStars | undefined = phase === 'win' && rule ? clearStars({ misses: misses.current, usedItem: usedItem.current, flinches: flinches.current }) : undefined
  const finishWin = () => {
    if (winDone.current) return
    winDone.current = true
    sfx('select')
    onWin(clear ? { stars: clear.stars } : undefined)
  }
  const retryWin = () => {
    if (winDone.current || !clear) return
    winDone.current = true
    sfx('select')
    onWin({ stars: clear.stars, retry: true })
  }
  const finishLose = () => {
    if (winDone.current) return
    winDone.current = true
    sfx('select')
    onLose()
  }
  /** ボスメダルを まだ 持っていない（今回も 取れなかった）なら、その場で もう一度 挑戦できる */
  const canRetry = !!clear && clear.stars < 3 && !(gs.medals ?? []).includes(boss.id)
  useKeys(
    (k) => {
      if (phase === 'win') {
        if (k === 'ok') finishWin()
        return
      }
      if (phase === 'lose') {
        if (k === 'ok') finishLose()
        return
      }
      if (phase === 'msg') {
        if (k === 'ok' || k === 'cancel') {
          if (logSkip.current()) return
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

  const verdict = phase === 'msg' && typeof msgs[0] === 'object' ? msgs[0].verdict : undefined

  // 即答ボーナスは こちらの攻撃のときだけ（チュートリアルは固定ダメージなので出さない）
  const showQuick = mode === 'attack' && !boss.hits

  // スマホの 数式ボタンは 画面の下いっぱいに 出す（ゲーム画面の中だと 小さすぎる）
  const touchFormula = touch && q?.type === 'formula'

  const portal = (el: ReactElement) => (touchFormula ? createPortal(el, document.body) : el)

  return (
    <div className={`battle bg-${scene} ${rage ? 'rage' : ''} ${shake % 2 ? 'shake-a' : shake ? 'shake-b' : ''}`}>
      <BattleStage scene={scene} />
      <div
        className={`win status-win bl-status ${gs.hp / mhp <= 0.25 ? 'pinch' : ''} ${pops.some((x) => x.on === 'me' && x.kind === 'hurt') ? 'is-hurt' : ''} ${pops.some((x) => x.on === 'me' && x.kind === 'heal') ? 'is-heal' : ''}`}
        aria-label={`${gs.name} Lv ${gs.level} HP ${gs.hp}/${mhp}`}
      >
        <Portrait src={PLAYER_SPEC_SRC} className="portrait bl-face" />
        <div className="hud-head">
          <span className="hud-name">{gs.name}</span>
          <span className="hud-lv">Lv {gs.level}</span>
        </div>
        <div className="st-row">
          <span className="hud-key">HP</span>
          <HpBar value={gs.hp} max={mhp} kind="me" />
          <span className="st-hp">
            <b key={gs.hp}>{gs.hp}</b>
            <small>/{mhp}</small>
          </span>
        </div>
        {pops.filter((x) => x.on === 'me').map((x) => <div key={x.id} className={`dmg-pop ${x.kind}`}>{x.text}</div>)}
        {(buff.scroll || buff.sand) && (
          <div className="buffs">
            {buff.scroll && '📜'}
            {buff.sand && '⏳'}
          </div>
        )}
      </div>
      <div className="boss-area">
        <div className={`boss-hp${boss.boss ? ' is-boss' : ''}`}>
          <div className="boss-plate">
            {boss.boss && <span className={`boss-tag ${rage ? 'enraged' : ''}`}>{rage ? tr('本気', 'RAGE') : 'BOSS'}</span>}
            <span className="boss-name">{bossName}</span>
          </div>
          <HpBar value={bossHp} max={boss.hp} kind="boss" />
        </div>
        {bossHp > 0 && <div className="foe-shadow" />}
        {bossHp <= 0 ? (
          <div className="boss-gone">✨</div>
        ) : boss.boss && hasBossArt(boss.sprite) ? (
          <BossVisual key={hit} id={boss.sprite} hit={hit} />
        ) : (
          <BossSprite key={hit} id={boss.sprite} hit={hit} />
        )}
        {pops.filter((x) => x.on === 'boss').map((x) => (
          <div key={x.id} className={`dmg-pop ${x.kind}`}>
            {x.kind === 'crit' && <small>{tr('会心！', 'CRIT!')}</small>}
            {x.text}
          </div>
        ))}
      </div>

      {phase === 'question' && q && portal(
        <div className={`win question-win ${mode} ${touchFormula ? 'touch-q' : ''}`}>
          {boss.boss && (
            <div className="q-mode">
              {mode === 'defense'
                ? tr(`🛡 ${bossName}の 攻撃！ 正解で ダメージを へらせ！`, `🛡 ${bossName} attacks! Answer correctly to reduce damage!`)
                : tr('⚔ こちらの 攻撃！', '⚔ Your attack!')}
              {rage && <span className="q-rage">{tr('🔥本気', '🔥Rage')}</span>}
            </div>
          )}
          <TimerBar key={deadline} start={startedAt.current} deadline={deadline} mode={mode} showQuick={showQuick} />
          <div className={`q-text ${textBlink ? 'blinked' : ''}`}>{garbled && !isChoice ? garble(q.q, qNo) : q.q}</div>
          {q.type === 'choice' ? (
            <div className="q-choices">
              {choices.map((c, i) => (
                <div key={c}
                  className={`opt ${i === blinkIdx ? 'blinked' : ''} ${i === cursor && !picked ? 'on' : ''} ${picked?.i === i ? (picked.ok ? 'yes' : 'no') : picked && !picked.ok && c === q.answer ? 'reveal' : picked ? 'dim' : ''}`}
                  onPointerEnter={() => !picked && setCursor(i)} onClick={() => choose(i)}>
                  <span className="num">{i + 1}</span> {garbled ? garble(c, qNo + i) : c}
                </div>
              ))}
            </div>
          ) : (
            <FormulaQuestion
              key={qNo}
              q={q}
              skills={gs.skills}
              touch={touch}
              label={mode === 'defense' ? tr('ふせぐ！', 'Guard!') : tr('こうげき！', 'Attack!')}
              showHint={buff.scroll}
              onSubmit={submitFormula}
            />
          )}
        </div>,
      )}

      {(phase === 'command' || phase === 'items') && (
        <div className={`battle-cmds ${phase}`}>
          <div className="win cmd-win" role="menu">
            {commands.map((c, i) => (
              <div key={c} role="menuitem" className={`opt cmd-${CMD_KEYS[i]} ${phase === 'command' && i === cursor ? 'on' : ''}`}
                onClick={() => phase === 'command' && choose(i)}>
                <span className="cmd-ico" aria-hidden="true">{CMD_ICONS[i]}</span>
                <span className="cmd-label">{c}</span>
                {i === 1 && itemCount > 0 && <span className="cmd-badge">{itemCount}</span>}
              </div>
            ))}
          </div>
          {phase === 'items' && (
            <div className="win item-win" role="menu">
              <div className="item-head">{tr('どうぐを つかう', 'Use an item')}</div>
              {battleItems.length === 0 && <div className="item-empty">{tr('つかえる どうぐが ない', 'No usable items')}</div>}
              {battleItems.map((id, i) => (
                <div key={id} role="menuitem" className={`opt item-opt ${i === cursor ? 'on' : ''}`} onPointerEnter={() => setCursor(i)} onClick={() => choose(i)}>
                  <span className="item-ico" aria-hidden="true">{ITEM_ICONS[id]}</span>
                  <span className="item-main">
                    <span className="item-name">{itemName(id)}</span>
                    <span className="item-desc">{itemDesc(id)}</span>
                  </span>
                  <span className="item-count">×{gs.items[id]}</span>
                </div>
              ))}
              <div role="menuitem" className={`opt item-back ${cursor === battleItems.length ? 'on' : ''}`} onClick={() => choose(battleItems.length)}>
                {tr('もどる', 'Back')}
              </div>
            </div>
          )}
          <div className="win combo-win">
            {combo >= 2 ? tr(`🔥 ${combo}れんぞく`, `🔥 ${combo} streak`) : '　'}
            {boss.boss && combo % FLINCH_STREAK === FLINCH_STREAK - 1 && <span className="flinch-next">{tr('あと1問で ひるむ！', '1 more to flinch!')}</span>}
          </div>
        </div>
      )}

      {phase === 'win' && (
        <BattleWin
          enemy={bossName}
          boss={!!boss.boss}
          exp={gs.exp}
          gainExp={winReward(ENEMIES[bossId].exp, clear, rematch)}
          gainGold={winReward(ENEMIES[bossId].gold, clear, rematch)}
          rematch={rematch}
          onRetry={canRetry ? retryWin : undefined}
          clear={clear}
          medal={!!clear && clear.stars === 3 && !(gs.medals ?? []).includes(boss.id)}
          correct={stats.current.correct}
          bestCombo={stats.current.best}
          hurt={stats.current.hurt}
          onContinue={finishWin}
        />
      )}

      {phase === 'lose' && (
        <BattleLose
          enemy={bossName}
          boss={!!boss.boss}
          enemyLeft={bossHp / boss.hp}
          correct={stats.current.correct}
          bestCombo={stats.current.best}
          missed={missed.current}
          after={tutorial ? 'tutorial' : rematch ? 'rematch' : gs.lastTown ? 'church' : 'wake'}
          goldLost={gs.gold - Math.floor(gs.gold / 2)}
          savedWeak={!tutorial}
          onContinue={finishLose}
        />
      )}

      {phase === 'msg' && verdict && <VerdictCard key={msgs.length} v={verdict} last={msgs.length <= 1} onNext={() => nextMsg()} />}

      {phase === 'msg' && !verdict && (
        <BattleLog
          key={sayNo.current}
          msgKey={`${sayNo.current}-${msgs.length}`}
          text={typeof msgs[0] === 'object' ? msgs[0].text : msgs[0]}
          me={gs.name}
          foe={bossName}
          foeLine={boss.attackText}
          index={Math.max(0, msgTotal.current - msgs.length)}
          total={msgTotal.current}
          skip={logSkip}
          onNext={() => {
            if (msgs.length > 1) sfx('blip')
            nextMsg()
          }}
        />
      )}
    </div>
  )
}

/**
 * 残り時間の バー。縮む 動きは CSS に まかせ、色が 変わる 2回だけ 描きなおす
 * （以前は 0.1秒ごとに 戦闘画面 全体を 描きなおしていた）
 */
function TimerBar({ start, deadline, mode, showQuick }: { start: number; deadline: number; mode: string; showQuick: boolean }) {
  const limit = Math.max(1, deadline - start)
  // 表示した 時点で もう 進んでいる 分（途中から 縮みはじめる）
  const [elapsed] = useState(() => Math.max(0, Date.now() - start))
  /** 0：即答ボーナスの 間　1：ふつう　2：残りわずか */
  const [stage, setStage] = useState(() => (elapsed >= limit * 0.8 ? 2 : elapsed >= limit * QUICK ? 1 : 0))
  useEffect(() => {
    const at = (ratio: number) => Math.max(0, start + limit * ratio - Date.now())
    const a = setTimeout(() => setStage((v) => Math.max(v, 1)), at(QUICK))
    const b = setTimeout(() => setStage(2), at(0.8))
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [start, limit])
  const quickZone = showQuick && stage === 0
  return (
    <div className={`timer ${quickZone ? 'quick' : stage === 2 ? 'danger' : mode === 'defense' ? 'guard' : 'normal'}`}>
      <div className="timer-fill" style={{ animationDuration: `${limit}ms`, animationDelay: `${-elapsed}ms` }} />
      {showQuick && <div className="timer-mark" style={{ left: `${(1 - QUICK) * 100}%` }} />}
      {quickZone && <span className="timer-label">{tr('即答ボーナス！', 'Quick bonus!')}</span>}
    </div>
  )
}

/** 戦闘の 状態カードの 顔（毎回 同じ ものを わたして 描きなおしを 防ぐ） */
const PLAYER_SPEC_SRC = { spec: PLAYER_SPEC }

type LogTone = 'tip' | 'foe' | 'hit' | 'hurt' | 'good' | 'sys'
const LOG_ICON: Record<LogTone, string> = { tip: '💡', foe: '💢', hit: '⚔️', hurt: '💥', good: '✨', sys: '' }

/** メッセージの 中身から 色と しるしを 決める（ヒント・敵の 行動・こちらの 攻撃・被弾・よい 知らせ） */
function logTone(raw: string, me: string, foe: string, foeLine?: string): { tone: LogTone; body: string } {
  const t = raw.trim()
  if (/^[（(]/.test(t) && /[）)]$/.test(t)) return { tone: 'tip', body: t.slice(1, -1) }
  const has = (re: RegExp) => re.test(t)
  if (t.startsWith(me) && has(/\d+の ダメージを うけた|took \d+ damage/)) return { tone: 'hurt', body: t }
  if (has(/ちからつきた|collapsed/)) return { tone: 'hurt', body: t }
  if (has(/\d+の ダメージ！|takes \d+ damage|一発決裁|やっつけた|^Defeated /)) return { tone: 'hit', body: t }
  if (has(/かいふくした|^Recovered|ひかった|glowed|undone|なかったことに|うけなかった|no damage|ガード せいこう|Guard success|ひるんで|flinched|ふせげる|ヒントが 出る|get a hint|反撃を うけずに|could not strike/))
    return { tone: 'good', body: t }
  if (t === foeLine || t.startsWith(foe)) return { tone: 'foe', body: t }
  return { tone: 'sys', body: t }
}

/** 数字（ダメージ・回復量）だけ 太く 色を 付ける */
function withNums(text: string) {
  return text.split(/(\d+)/).map((part, i) => (i % 2 ? <b key={i} className="bl-num">{part}</b> : part))
}

/**
 * 戦闘の メッセージ窓。文字を すばやく 送り（押すと 全部 出る）、
 * 内容に 合わせて 色の すじと しるし（ヒントは 札つき）、続きの 数を 点で 見せる
 */
function BattleLog(p: {
  msgKey: string
  text: string
  me: string
  foe: string
  foeLine?: string
  index: number
  total: number
  skip: { current: () => boolean }
  onNext(): void
}) {
  const { tone, body } = logTone(p.text, p.me, p.foe, p.foeLine)
  const [state, setState] = useState({ key: p.msgKey, shown: 0 })
  // メッセージが 変わったら 最初から 送りなおす（描画中に そろえて 前の 文が 一瞬 出るのを 防ぐ）
  const shown = state.key === p.msgKey ? state.shown : 0
  if (state.key !== p.msgKey) setState({ key: p.msgKey, shown: 0 })
  const typing = shown < body.length
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    if (!typing) return
    if (reduce) return setState({ key: p.msgKey, shown: body.length })
    const t = setTimeout(() => setState((v) => ({ key: p.msgKey, shown: (v.key === p.msgKey ? v.shown : 0) + 2 })), 26)
    return () => clearTimeout(t)
  }, [typing, shown, body.length, p.msgKey, reduce])
  const finish = () => {
    if (!typing) return false
    setState({ key: p.msgKey, shown: body.length })
    return true
  }
  const finishRef = useRef(finish)
  finishRef.current = finish
  useEffect(() => {
    const skip = p.skip
    skip.current = () => finishRef.current()
    return () => {
      skip.current = () => false
    }
  }, [p.skip])

  const dots = Math.min(p.total, 6)
  const at = p.total > 6 ? Math.round((p.index / (p.total - 1)) * 5) : p.index
  return (
    <div
      className={`win dialog-win bl-win tone-${tone}`}
      role="status"
      aria-live="polite"
      onClick={() => {
        if (!finish()) p.onNext()
      }}
    >
      {tone === 'tip' && <span className="bl-tag">{tr('💡 ヒント', '💡 Tip')}</span>}
      <div className="bl-row">
        {LOG_ICON[tone] && tone !== 'tip' && (
          <span key={`i-${p.msgKey}`} className="bl-ico" aria-hidden="true">
            {LOG_ICON[tone]}
          </span>
        )}
        <p key={`t-${p.msgKey}`} className="dialog-text bl-text" aria-label={body}>
          <span aria-hidden="true">{withNums(body.slice(0, shown))}</span>
          <span className="bl-rest" aria-hidden="true">{body.slice(shown)}</span>
        </p>
      </div>
      <div className="bl-foot" aria-hidden="true">
        {dots > 1 && (
          <span className="bl-dots">
            {Array.from({ length: dots }, (_, i) => (
              <i key={i} className={i < at ? 'done' : i === at ? 'now' : ''} />
            ))}
          </span>
        )}
        <span className={`bl-next ${typing ? 'wait' : ''}`}>▼</span>
      </div>
    </div>
  )
}

type Pop = { id: number; on: 'me' | 'boss'; kind: 'dmg' | 'crit' | 'hurt' | 'heal' | 'guard'; text: string }

/** HP バー：減った分は 白い「なごり」が 少し 遅れて 縮む（どれだけ 減ったか 目で 追える） */
function HpBar({ value, max, kind }: { value: number; max: number; kind: 'me' | 'boss' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const level = kind === 'me' ? (pct <= 25 ? 'low' : pct <= 50 ? 'mid' : 'ok') : ''
  return (
    <div className={`bar hpbar ${kind} ${level}`}>
      <div className="ghost" style={{ width: `${pct}%` }} />
      <div className="fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

/**
 * 答え合わせカード（Duolingo の 判定シートの ように）。正解は 緑、まちがいは 赤。
 * まちがえた ときは 正しい 答えと 自分の 答えを 並べ、解説と 大きな「つづける」を 1枚に まとめる
 */
function VerdictCard({ v, last, onNext }: { v: Verdict; last: boolean; onNext(): void }) {
  return (
    <div
      className={`win verdict-win ${v.ok ? 'ok' : 'ng'}`}
      role="status"
      aria-live="polite"
      onClick={() => {
        if (!last) sfx('blip')
        onNext()
      }}
    >
      <div className="vd-top">
        <span className="vd-badge" aria-hidden="true">
          {v.ok ? '✓' : '✕'}
        </span>
        <b className="vd-title">{v.title}</b>
      </div>
      {!!v.tags?.length && (
        <div className="vd-tags">
          {v.tags.map((t, i) => (
            <span key={t} className="vd-tag" style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
              {t}
            </span>
          ))}
        </div>
      )}
      {v.answer && (
        <div className="vd-answers">
          <div className="vd-row">
            <span className="vd-label">{tr('こたえ', 'Answer')}</span>
            <span className="vd-chip good">{v.answer}</span>
          </div>
          {v.mine && v.mine !== v.answer && (
            <div className="vd-row">
              <span className="vd-label">{tr('あなた', 'You')}</span>
              <span className="vd-chip bad">{v.mine}</span>
            </div>
          )}
        </div>
      )}
      <p className="vd-explain">
        <span aria-hidden="true">💡 </span>
        {v.explain}
      </p>
      {/* 押すと カード全体の onClick で 次へ */}
      <button className="vd-next">
        {tr('つづける', 'Continue')}
      </button>
    </div>
  )
}
