import { useEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { ENEMIES, type BossDef, type Question, type QuestionSrc } from '../data/bosses'
import { itemName } from '../data/items'
import { enemyName } from '../data/en'
import { tr } from '../game/lang'
import { useKeys } from '../game/keys'
import { drawRows } from '../game/sprites'
import { CREATURES } from '../game/spriteParts'
import { maxHp } from '../game/progress'
import { gearStats } from '../data/equipment'
import type { GameState, ItemId } from '../game/types'
import { useInputMode } from '../game/inputMode'
import { isTouchDevice } from '../game/layout'
import { FormulaQuestion } from './FormulaQuestion'
import { judgeFormula } from '../game/judge'
import { markWeak, questionKey } from '../game/weak'
import { BossVisual } from './BossVisual'
import { hasBossArt } from '../game/bossArt'
import { cue, sfx, useBgm } from '../game/sound'

interface Props {
  bossId: string
  /** 最初の戦闘（操作説明つき・逃げられない） */
  tutorial?: boolean
  /** 背景（森・草原・ボス） */
  scene?: 'boss' | 'field' | 'forest' | 'cave' | 'temple' | 'ship' | 'library' | 'treasury' | 'printing' | 'clock' | 'castle'
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

export function Battle({ bossId, tutorial, scene = 'boss', gs, setGs, onWin, onLose, onFlee }: Props) {
  const boss = ENEMIES[bossId]
  const bossName = enemyName(boss)
  useBgm(boss.id === 'refera' ? 'lastboss' : boss.boss ? 'boss' : 'battle')
  /** 山札（boss.questions の 番号） */
  const deck = useRef<number[]>([])
  /** 出題中の 問題の 出どころ（苦手リスト用） */
  const curKey = useRef('')
  /** 問題ごとに 入力欄を 作り直す */
  const [qNo, setQNo] = useState(0)
  const [bossHp, setBossHp] = useState(boss.hp)
  const [phase, setPhase] = useState<Phase>('msg')
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    tr(`${bossName}が あらわれた！`, `${bossName} appeared!`),
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
  ])
  const after = useRef<() => void>(() => setPhase('command'))
  const [cursor, setCursor] = useState(0)
  const [q, setQ] = useState<Question | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const touch = useInputMode() === 'touch'
  /** attack：こちらの攻撃の問題 ／ defense：ボスの攻撃の問題（正解でダメージ減） */
  const [mode, setMode] = useState<'attack' | 'defense'>('attack')
  const guardHinted = useRef(false)
  const [deadline, setDeadline] = useState(0)
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
    if (nq.type === 'choice') {
      let cs = shuffle(nq.choices)
      if (buff.scroll) {
        const wrong = cs.filter((c) => c !== nq.answer).slice(0, 2)
        cs = cs.filter((c) => !wrong.includes(c))
      }
      setChoices(cs)
    }
    setCursor(0)
    const limit = (nq.type === 'choice' ? 20000 : 60000) + gear.time * 1000
    startedAt.current = Date.now()
    setDeadline(Date.now() + limit)
    setPhase('question')
  }

  // 時間切れ（バーの 動きは TimerBar が CSS で 描くので、ここでは 1回だけ 時計を かける）
  const answerRef = useRef<(ok: boolean, note?: string) => void>(() => {})
  useEffect(() => {
    if (phase !== 'question') return
    const t = setTimeout(() => answerRef.current(false, tr('時間切れ！', "Time's up!")), Math.max(0, deadline - Date.now()))
    return () => clearTimeout(t)
  }, [phase, deadline])

  const correctText = (x: Question) => (x.type === 'choice' ? x.answer : x.hint)

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
  const defend = (ok: boolean, note?: string) => {
    if (!q) return
    const full = hurt()
    const lines: Msg[] = []
    let dmg = full
    if (ok) {
      lines.push(tr('せいかい！', 'Correct!'))
      if (Math.random() < PERFECT_GUARD) {
        dmg = 0
        lines.push(pick(GUARD_LINES()), tr(`${gs.name}は ダメージを うけなかった！`, `${gs.name} took no damage!`))
      } else {
        dmg = Math.max(1, Math.round(full * 0.3))
        lines.push(tr('ガード せいこう！ ダメージを おさえた！', 'Guard success! Damage reduced!'))
      }
    } else {
      sfx('wrong')
      lines.push(note ?? tr('ざんねん……。', 'Too bad...'), tr(`こたえ：${correctText(q)}`, `Answer: ${correctText(q)}`), `（${q.explain}）`)
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
          setShake((s) => s + 1)
          setGs((g) => ({ ...g, hp }))
        },
      })
    if (hp <= 0) say([...lines, tr(`${gs.name}は ちからつきた……。`, `${gs.name} collapsed...`)], onLose)
    else say(lines, () => setPhase('command'))
  }

  const answer = (ok: boolean, note?: string) => {
    if (!q || answered.current) return
    answered.current = true
    const usedScroll = buff.scroll
    if (usedScroll) setBuff((b) => ({ ...b, scroll: false }))
    // まちがえた 問題は 苦手リストへ（正解したら 外す）
    if (!tutorial) markWeak(curKey.current, ok)
    if (mode === 'defense') return defend(ok, note)
    if (ok) {
      const limit = deadline - startedAt.current
      const quick = Date.now() - startedAt.current <= limit * QUICK
      const c = combo + 1
      const lines: Msg[] = [tr('せいかい！', 'Correct!')]
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
          lines.push(tr('そくとう ボーナス！', 'Quick answer bonus!'))
        }
        if (Math.random() < CRIT + gear.crit) {
          dmg *= 1.6
          lines.push(tr(`一発決裁！ ${pick(CRIT_LINES())}`, `Instant Approval! ${pick(CRIT_LINES())}`))
        }
        dmg = Math.round(dmg)
        if (c >= 2) lines.push(tr(`${c}れんぞく せいかい！`, `${c} correct in a row!`))
      }
      const hp = Math.max(0, bossHp - dmg)
      lines.push({
        text: tr(`${bossName}に ${dmg}の ダメージ！`, `${bossName} takes ${dmg} damage!`),
        fx: () => {
          setHit((h) => h + 1)
          setBossHp(hp)
        },
      })
      setCombo(c)
      if (hp <= 0) say([...lines, tr(`${bossName}を やっつけた！`, `Defeated ${bossName}!`)], onWin)
      else if (boss.boss) enemyTurn(lines)
      else say(lines, () => setPhase('command'))
    } else {
      sfx('wrong')
      setCombo(0)
      const lines: Msg[] = [note ?? tr('ざんねん……。', 'Too bad...'), tr(`こたえ：${correctText(q)}`, `Answer: ${correctText(q)}`), `（${q.explain}）`]
      // ボス戦：まちがえると 攻撃が 空振りし、そのまま ボスの攻撃へ
      if (boss.boss) return enemyTurn([...lines, tr('こうげきは 空振りに おわった……。', 'Your attack missed...')])
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
          setShake((s) => s + 1)
          setGs((g) => ({ ...g, hp }))
        },
      })
      if (hp <= 0) say([...lines, tr(`${gs.name}は ちからつきた……。`, `${gs.name} collapsed...`)], onLose)
      else say(lines, () => setPhase('command'))
    }
  }
  answerRef.current = answer

  const submitFormula = (input: string) => {
    if (!q || q.type !== 'formula') return
    const r = judgeFormula(q, input)
    answer(r.ok, r.note)
  }

  const commands = [tr('たたかう', 'Fight'), tr('どうぐ', 'Items'), tr('にげる', 'Run')]
  const battleItems = (['herb', 'scroll', 'sandglass'] as ItemId[]).filter((id) => gs.items[id] > 0)

  const useItem = (id: ItemId) => {
    setGs((g) => ({ ...g, items: { ...g.items, [id]: g.items[id] - 1 } }))
    if (id === 'herb') {
      const heal = Math.min(30, mhp - gs.hp)
      setGs((g) => ({ ...g, hp: Math.min(mhp, g.hp + 30) }))
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
                setShake((sh) => sh + 1)
                setGs((g) => ({ ...g, hp }))
              },
            },
            ...(hp <= 0 ? [tr(`${gs.name}は ちからつきた……。`, `${gs.name} collapsed...`)] : []),
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

  // 即答ボーナスは こちらの攻撃のときだけ（チュートリアルは固定ダメージなので出さない）
  const showQuick = mode === 'attack' && !boss.hits

  // スマホの 数式ボタンは 画面の下いっぱいに 出す（ゲーム画面の中だと 小さすぎる）
  const touchFormula = touch && q?.type === 'formula'

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
          <span>{bossName}</span>
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
            <div className="q-mode">
              {mode === 'defense'
                ? tr(`🛡 ${bossName}の 攻撃！ 正解で ダメージを へらせ！`, `🛡 ${bossName} attacks! Answer correctly to reduce damage!`)
                : tr('⚔ こちらの 攻撃！', '⚔ Your attack!')}
            </div>
          )}
          <TimerBar key={deadline} start={startedAt.current} deadline={deadline} mode={mode} showQuick={showQuick} />
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
                  {itemName(id)} ×{gs.items[id]}
                </div>
              ))}
              <div className={`opt ${cursor === battleItems.length ? 'on' : ''}`} onClick={() => choose(battleItems.length)}>
                {tr('もどる', 'Back')}
              </div>
            </div>
          )}
          <div className="win combo-win">{combo >= 2 ? tr(`🔥 ${combo}れんぞく`, `🔥 ${combo} streak`) : '　'}</div>
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
