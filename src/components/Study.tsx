import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Question } from '../data/bosses'
import { useKeys } from '../game/keys'
import { jingle, sfx } from '../game/sound'
import type { GameState } from '../game/types'
import { useInputMode } from '../game/inputMode'
import { judgeFormula } from '../game/judge'
import { getWeak, markWeak } from '../game/weak'
import { getStreak, recordStudy, type StreakInfo } from '../game/streak'
import { getBests, recordBest } from '../game/studyBest'
import { chapterAllowed, openUnlock, useUnlockScreen, useUnlocked } from '../game/store'
import { FormulaQuestion } from './FormulaQuestion'
import { isNative } from '../game/native'
import { tr } from '../game/lang'
import {
  CHAPTERS,
  allCourse,
  chapterCourse,
  chapterOfKey,
  chapterOpen,
  chapterProgress,
  chapterShort,
  chapterTag as tagOf,
  chapterTitle,
  chapterTopic,
  percent,
  weakCourse,
  type ChapterDef,
  type PracticeItem,
  type Progress,
} from '../data/chapters'

interface Props {
  /** 冒険の きろく（タイトルから で セーブが なければ null） */
  gs: GameState | null
  /** タイトル画面から 開いた（すべての 章を 選べる） */
  fromTitle?: boolean
  onClose(): void
}

interface Course {
  /** 自己ベストを 記録する コース（類題などの その場の コースは なし） */
  id?: string
  title: string
  /** 同じ コースを もう一度（新しい 問題で） */
  make(): PracticeItem[]
}

interface Result {
  item: PracticeItem
  q: Question
  ok: boolean
}

const LABELS: [keyof Progress, () => string][] = [
  ['quests', () => tr('依頼', 'Requests')],
  ['puzzles', () => tr('謎', 'Puzzles')],
  ['bosses', () => tr('ボス', 'Bosses')],
  ['chests', () => tr('宝箱', 'Chests')],
]

const chapterTag = (ch?: ChapterDef) => (ch ? tagOf(ch) : '')

/** ふくしゅうの書：章ごと・全章まとめ・苦手克服の コースで、時間制限なしに 問題を 解く */
export function Study({ gs, fromTitle, onClose }: Props) {
  const [view, setView] = useState<'menu' | 'quiz' | 'result'>('menu')
  const [course, setCourse] = useState<Course | null>(null)
  const [items, setItems] = useState<PracticeItem[]>([])
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [weak, setWeakState] = useState(getWeak)
  /** コースを はじめた 回数（問題画面を 作り直す 目印） */
  const [run, setRun] = useState(0)
  /** コースを はじめた 時刻と、かかった 時間（けっか画面の タイム） */
  const startAt = useRef(0)
  const [elapsed, setElapsed] = useState(0)
  /** コースを 終えて 連続日数が どうなったか（けっか画面の バナー） */
  const [streak, setStreak] = useState<(StreakInfo & { grew: boolean }) | null>(null)

  const start = (c: Course, list = c.make()) => {
    if (!list.length) return
    sfx('select')
    setCourse(c)
    setItems(list)
    setIdx(0)
    setResults([])
    setRun((n) => n + 1)
    startAt.current = Date.now()
    setView('quiz')
  }

  const finish = (res: Result[]) => {
    setResults(res)
    setWeakState(getWeak())
    setElapsed(Date.now() - startAt.current)
    setStreak(recordStudy())
    if (course?.id) recordBest(course.id, res.filter((r) => r.ok).length, res.length)
    setView('result')
    if (res.every((r) => r.ok)) jingle('clear')
  }

  // 画面が 切りかわったら いちばん上から（けっか画面の スクロール位置を 持ちこさない）
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    root.current?.scrollTo(0, 0)
  }, [view])

  return (
    <div className="study" ref={root}>
      {view === 'menu' && (
        <CourseMenu
          gs={gs}
          fromTitle={!!fromTitle}
          weak={weak}
          onStart={start}
          onClose={onClose}
        />
      )}
      {view === 'quiz' && course && (
        <Quiz
          key={`${run}-${idx}`}
          title={course.title}
          items={items}
          idx={idx}
          combo={results.length - 1 - results.map((r) => r.ok).lastIndexOf(false)}
          skills={gs?.skills ?? []}
          onAnswer={(r) => {
            const res = [...results, r]
            setResults(res)
            if (idx + 1 < items.length) setIdx(idx + 1)
            else finish(res)
          }}
          onQuit={() => {
            setWeakState(getWeak())
            setView('menu')
          }}
        />
      )}
      {view === 'result' && course && (
        <ResultView
          title={course.title}
          results={results}
          elapsed={elapsed}
          streak={streak}
          onRetry={() => start(course)}
          onSimilar={() => {
            const wrong = results.filter((r) => !r.ok).map((r) => r.item.key)
            start({ title: tr('まちがえた 問題の 類題', 'Similar questions to the ones you missed'), make: () => weakCourse(wrong, Math.min(10, Math.max(5, wrong.length * 2))) })
          }}
          onMenu={() => setView('menu')}
          onClose={onClose}
        />
      )}
    </div>
  )
}

// ================================================================ コースを 選ぶ
/** 章ごとの 色（丸い 番号札と 進み具合の 輪） */
const CH_HUES = [140, 200, 190, 265, 40, 320, 25, 0]

function CourseMenu({
  gs,
  fromTitle,
  weak,
  onStart,
  onClose,
}: {
  gs: GameState | null
  fromTitle: boolean
  weak: string[]
  onStart(c: Course): void
  onClose(): void
}) {
  useUnlocked()
  const unlockOpen = useUnlockScreen()
  // locked：たどりついているが、全章解放の 前（第3章から 先）
  const rows = CHAPTERS.map((ch) => ({
    ch,
    open: fromTitle || !gs || chapterOpen(ch, gs),
    locked: !chapterAllowed(ch.no),
    p: gs ? chapterProgress(ch, gs) : null,
  }))
  const openChs = rows.filter((r) => r.open && !r.locked).map((r) => r.ch)
  const total = gs ? percent(rows.map((r) => r.p!)) : null
  const streakInfo = useMemo(() => getStreak(), [])
  const bests = useMemo(() => getBests(), [])

  type Opt = { id: string; course?: Course; disabled?: boolean; unlock?: boolean }
  const opts: Opt[] = [
    { id: 'weak', course: { title: tr('苦手克服コース', 'Weak Spot Course'), make: () => weakCourse(getWeak()) }, disabled: !weak.length },
    { id: 'all', course: { id: 'all', title: tr('全章まとめコース', 'All-Chapter Course'), make: () => allCourse(openChs) } },
    ...rows
      .filter((r) => r.open)
      .map((r) =>
        r.locked
          ? { id: `ch${r.ch.no}`, unlock: true }
          : { id: `ch${r.ch.no}`, course: { id: `ch${r.ch.no}`, title: chapterTitle(r.ch), make: () => chapterCourse(r.ch) } },
      ),
    { id: 'close' },
  ]
  const live = opts.filter((o) => !o.disabled)
  const [cursor, setCursor] = useState(live[0].id)
  /** キー操作で 動かした ときだけ カーソル枠を 出す（指や マウスでは 出さない） */
  const [keyNav, setKeyNav] = useState(false)
  /** 押した カード（沈んで 光ってから 始める） */
  const [pressed, setPressed] = useState<string | null>(null)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  const pick = (o: Opt) => {
    if (o.disabled || pressed) return
    if (o.unlock) {
      sfx('select')
      return openUnlock()
    }
    if (!o.course) {
      sfx('cancel')
      return onClose()
    }
    const c = o.course
    setPressed(o.id)
    sfx('cursor')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    timer.current = window.setTimeout(() => onStart(c), reduce ? 0 : 200)
  }

  useKeys((k) => {
    const i = live.findIndex((o) => o.id === cursor)
    if (k === 'up' || k === 'down' || k === 'left' || k === 'right') {
      sfx('cursor')
      setKeyNav(true)
      const back = k === 'up' || k === 'left'
      setCursor(live[(i + (back ? live.length - 1 : 1)) % live.length].id)
    } else if (k === 'ok') pick(live[i])
    else if (k === 'cancel') {
      sfx('cancel')
      onClose()
    }
  }, !unlockOpen && !pressed)

  // 選んだ カードが 見えるように（上の 見出しに 隠れない）
  useEffect(() => {
    if (keyNav) document.querySelector('.study .sc-card.on')?.scrollIntoView({ block: 'nearest' })
  }, [cursor, keyNav])

  const props = (o: Opt, cls: string, i: number) => ({
    type: 'button' as const,
    className: `sc-card ${cls} ${cursor === o.id ? 'on' : ''} ${pressed === o.id ? 'press' : ''}`,
    style: { '--i': i } as CSSProperties,
    disabled: o.disabled,
    onPointerDown: () => setKeyNav(false),
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === 'mouse' && !o.disabled && setCursor(o.id),
    onClick: () => pick(o),
  })

  const bestPill = (id: string) => {
    const b = bests[id]
    if (!b) return <span className="sc-best none">{tr('未挑戦', 'New')}</span>
    const perfect = b.score === b.total
    return (
      <span className={`sc-best ${perfect ? 'perfect' : ''}`} title={tr('自己ベスト', 'Personal best')}>
        {perfect ? '👑' : '★'} {b.score}/{b.total}
      </span>
    )
  }

  let n = 0
  return (
    <div className={`study-page sc-page ${keyNav ? 'keynav' : ''}`}>
      <header className="sc-top">
        <button type="button" className="quiz-quit sc-x" onClick={() => (sfx('cancel'), onClose())} aria-label={tr('とじる', 'Close')}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <h2>📖 {tr('ふくしゅうの書', 'Book of Review')}</h2>
        {total !== null && (
          <div className="sc-total" aria-label={tr(`冒険の 達成率 ${total}%`, `Adventure completion ${total}%`)}>
            <i style={{ '--p': total } as CSSProperties} />
            <b>{total}%</b>
          </div>
        )}
      </header>
      <StreakCard info={streakInfo} />

      <div className="sc-feature">
        <button key={opts[0].id} {...props(opts[0], 'feat weak', n++)}>
          <span className="sc-icon">🎯</span>
          <span className="sc-body">
            <b>{tr('苦手克服', 'Weak Spots')}</b>
            <small>
              {weak.length
                ? tr(`まちがえた ${weak.length}問と 類題で 10問`, `${weak.length} missed + similar, 10 Qs`)
                : tr('まちがえた 問題は まだ ない', 'No missed questions yet')}
            </small>
          </span>
          {weak.length > 0 && <span className="sc-count">{weak.length}</span>}
        </button>
        <button key={opts[1].id} {...props(opts[1], 'feat all', n++)}>
          <span className="sc-icon">📚</span>
          <span className="sc-body">
            <b>{tr('全章まとめ', 'All Chapters')}</b>
            <small>
              {openChs.length > 1
                ? tr(`${chapterTag(openChs[0])}〜${chapterTag(openChs[openChs.length - 1])}から 10問`, `10 Qs from ${chapterTag(openChs[0])}–${openChs[openChs.length - 1].no}`)
                : tr('第1章から 10問', '10 Qs from Chapter 1')}
            </small>
          </span>
          {bestPill('all')}
        </button>
      </div>
      <p className="study-help">
        {tr(
          '時間制限は ない。まちがえた 問題は「苦手」に 記録され、正解すると 消える。',
          'No time limit. Missed questions are saved as weak spots and cleared when you get them right.',
        )}
      </p>

      <h3 className="sc-sep">
        {tr('章を えらんで 復習', 'Review by chapter')}
        <small>{tr('各5問', '5 Qs each')}</small>
      </h3>
      <div className="sc-list">
        {rows.map(({ ch, open, locked, p }) => {
          const style = { '--h': CH_HUES[ch.no - 1], '--i': n } as CSSProperties
          const badge = ch.no === 8 ? '⚑' : ch.no
          if (!open)
            return (
              <div key={ch.no} className="sc-card ch unknown" style={style} aria-disabled="true">
                <span className="sc-badge">？</span>
                <span className="sc-body">
                  <b>
                    {chapterTag(ch)}
                    {tr('　？？？', ': ???')}
                  </b>
                  <small>{tr('まだ たどりついていない', "You haven't reached this yet")}</small>
                </span>
              </div>
            )
          const o = opts.find((x) => x.id === `ch${ch.no}`)!
          if (locked)
            return (
              <button key={o.id} {...props(o, 'ch paywall', n++)} style={style}>
                <span className="sc-badge">🔒</span>
                <span className="sc-body">
                  <b>
                    {chapterTag(ch)}
                    {tr('　', ': ')}
                    {chapterShort(ch)}
                  </b>
                  <small>{chapterTopic(ch)}</small>
                  <span className="sc-unlock">
                    {isNative ? tr('全章解放で 遊べる', 'Play with Unlock All Chapters') : tr('iPhone アプリ版で 遊べる', 'Play in the iPhone app')}
                  </span>
                </span>
              </button>
            )
          const pct = p ? percent([p]) : null
          return (
            <button key={o.id} {...props(o, `ch ${pct === 100 ? 'done' : ''}`, n++)} style={style}>
              <span className="sc-badge" style={pct !== null ? ({ '--p': pct } as CSSProperties) : undefined}>
                <em>{badge}</em>
              </span>
              <span className="sc-body">
                <b>
                  {chapterTag(ch)}
                  {tr('　', ': ')}
                  {chapterShort(ch)}
                </b>
                <small>{chapterTopic(ch)}</small>
                {p && (
                  <span className="sc-counts">
                    {LABELS.map(([k, label]) => (
                      <span key={k} className={p[k][0] === p[k][1] ? 'full' : ''}>
                        {label()} {p[k][0]}/{p[k][1]}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <span className="sc-side">
                {bestPill(o.id)}
                {pct !== null && <span className="sc-pct">{pct}%</span>}
              </span>
            </button>
          )
        })}
      </div>
      <button key={opts[opts.length - 1].id} {...props(opts[opts.length - 1], 'close', n++)}>{fromTitle ? tr('タイトルに もどる', 'Back to title') : tr('とじる', 'Close')}</button>
    </div>
  )
}

// ================================================================ 問題を 解く
function Quiz({
  title,
  items,
  idx,
  combo,
  skills,
  onAnswer,
  onQuit,
}: {
  title: string
  items: PracticeItem[]
  idx: number
  /** ここまでの 連続正解数 */
  combo: number
  skills: string[]
  onAnswer(r: Result): void
  onQuit(): void
}) {
  const item = items[idx]
  // 自動生成の 問題は ここで 作る（毎回 数値が 変わる）
  const q = useMemo(() => (typeof item.src === 'function' ? item.src() : item.src), [item])
  const choices = useMemo(() => (q.type === 'choice' ? [...q.choices].sort(() => Math.random() - 0.5) : []), [q])
  const [cursor, setCursor] = useState(0)
  const [fb, setFb] = useState<{ ok: boolean; note?: string } | null>(null)
  /** キー操作で カーソルを 動かした ときだけ 枠を 出す（指で 押すときは 出さない） */
  const [keyNav, setKeyNav] = useState(false)
  const touch = useInputMode() === 'touch'
  const run = fb?.ok ? combo + 1 : 0
  const ch = chapterOfKey(item.key)

  const answer = (ok: boolean, note?: string) => {
    if (fb) return
    sfx(ok ? 'correct' : 'wrong')
    markWeak(item.key, ok)
    setFb({ ok, note })
  }
  const next = () => {
    sfx('select')
    onAnswer({ item, q, ok: !!fb?.ok })
  }

  useKeys((k) => {
    if (fb) {
      if (k === 'ok') next()
      return
    }
    if (k === 'cancel') return onQuit()
    if (q.type !== 'choice') return
    const n = choices.length
    setKeyNav(true)
    if (k === 'up' || k === 'left') {
      sfx('cursor')
      setCursor((c) => (c + n - 1) % n)
    } else if (k === 'down' || k === 'right') {
      sfx('cursor')
      setCursor((c) => (c + 1) % n)
    } else if (k === 'ok') answer(choices[cursor] === q.answer)
  })
  // 数字キー（1〜4）でも 答えられる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!fb && q.type === 'choice' && /^[1-4]$/.test(e.key) && Number(e.key) <= choices.length) answer(choices[Number(e.key) - 1] === q.answer)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // 次の 問題に なったら 上まで もどす
  const page = useRef<HTMLDivElement>(null)
  useEffect(() => {
    page.current?.closest('.study')?.scrollTo({ top: 0 })
  }, [])
  const filled = idx + (fb ? 1 : 0)
  const last = idx + 1 >= items.length
  return (
    <div ref={page} className={`study-page quiz ${fb ? 'answered' : ''}`}>
      <header className="quiz-head">
        <button type="button" className="quiz-quit" onClick={onQuit} aria-label={tr('やめる', 'Quit')}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <div
          className="quiz-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={filled}
          aria-label={tr(`${items.length}問中 ${filled}問`, `${filled} of ${items.length}`)}
        >
          <span style={{ width: `${(filled / items.length) * 100}%` }} />
        </div>
        <div className="quiz-count">
          {idx + 1}
          <small>/{items.length}</small>
        </div>
      </header>
      <div className="quiz-sub">
        <span className="quiz-title">{title}</span>
        {combo >= 2 && !fb && (
          <span className="quiz-combo" aria-label={tr(`${combo}問 連続 正解中`, `${combo} correct in a row`)}>
            🔥 {combo}
          </span>
        )}
      </div>
      <div className="quiz-body">
        <div className="quiz-tags">
          {ch && <span className="tag">{chapterTag(ch)}</span>}
          {item.similar && <span className="tag similar">{tr('類題', 'Similar')}</span>}
          <span className="tag kind">{q.type === 'choice' ? tr('えらぶ', 'Choose') : tr('数式を 作る', 'Write a formula')}</span>
        </div>
        <div className="quiz-q">{q.q}</div>
        {q.type === 'choice' ? (
          <div className="quiz-choices">
            {choices.map((c, i) => (
              <button
                key={c}
                type="button"
                data-nosfx
                disabled={!!fb}
                style={{ '--i': i } as CSSProperties}
                className={`quiz-choice ${i === cursor && !fb && (keyNav || !touch) ? 'on' : ''} ${fb && c === q.answer ? (fb.ok ? 'right' : 'reveal') : ''} ${fb && !fb.ok && i === cursor ? 'miss' : ''} ${fb && c !== q.answer && !(i === cursor && !fb.ok) ? 'dim' : ''}`}
                onPointerEnter={(e) => {
                  if (fb || e.pointerType !== 'mouse') return
                  setKeyNav(false)
                  setCursor(i)
                }}
                onClick={() => {
                  if (fb) return
                  setCursor(i)
                  answer(c === q.answer)
                }}
              >
                <span className="num">{i + 1}</span>
                <span className="txt">{c}</span>
              </button>
            ))}
          </div>
        ) : (
          !fb && (
            <FormulaQuestion
              q={q}
              skills={skills}
              touch={touch}
              label={tr('こたえる', 'Answer')}
              onSubmit={(input) => {
                const r = judgeFormula(q, input)
                answer(r.ok, r.note)
              }}
            />
          )
        )}
      </div>
      {fb && (
        <div className={`quiz-fb ${fb.ok ? 'ok' : 'ng'}`} role="status">
          <div className="fb-top">
            <span className="fb-badge" aria-hidden="true">
              {fb.ok ? '✓' : '✕'}
            </span>
            <div className="fb-mark">{fb.ok ? tr('せいかい！', 'Correct!') : tr('ざんねん……', 'Not quite...')}</div>
            {run >= 2 && (
              <span className="fb-combo">{tr(`🔥 ${run}問 連続！`, `🔥 ${run} in a row!`)}</span>
            )}
          </div>
          <div className="fb-body">
            {fb.note && <p className="fb-note">{fb.note}</p>}
            {(!fb.ok || q.type !== 'choice') && (
              <p className="fb-answer">
                {tr('こたえ：', 'Answer: ')}
                <b>{q.type === 'choice' ? q.answer : q.hint}</b>
              </p>
            )}
            <p className="fb-explain">{q.explain}</p>
          </div>
          <button type="button" className="fb-next" autoFocus data-nosfx onClick={next}>
            {last ? tr('けっかを 見る', 'See results') : tr('つづける', 'Continue')}
          </button>
        </div>
      )}
    </div>
  )
}

// ================================================================ けっか
function ResultView({
  title,
  results,
  elapsed,
  streak,
  onRetry,
  onSimilar,
  onMenu,
  onClose,
}: {
  title: string
  results: Result[]
  elapsed: number
  streak: (StreakInfo & { grew: boolean }) | null
  onRetry(): void
  onSimilar(): void
  onMenu(): void
  onClose(): void
}) {
  const correct = results.filter((r) => r.ok).length
  const wrong = results.length - correct
  const rate = correct / results.length
  const pct = Math.round(rate * 100)
  // 連続正解の 最高記録
  const best = results.reduce((a, r) => (r.ok ? { run: a.run + 1, max: Math.max(a.max, a.run + 1) } : { run: 0, max: a.max }), { run: 0, max: 0 }).max
  const sec = Math.max(1, Math.round(elapsed / 1000))
  const time = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  const headline =
    rate === 1 ? tr('パーフェクト！', 'Perfect!') : rate >= 0.8 ? tr('すばらしい！', 'Awesome!') : rate >= 0.5 ? tr('コース クリア！', 'Course complete!') : tr('おつかれさま！', 'Nice effort!')
  const tier = rate === 1 ? 'perfect' : rate >= 0.8 ? 'great' : rate >= 0.5 ? 'good' : 'try'
  // 正答率を 0 から 数え上げる（動きを 減らす 設定では すぐ 最終値）
  const shown = useCountUp(pct)
  const confetti = useMemo(
    () =>
      rate >= 0.8
        ? Array.from({ length: 28 }, (_, i) => ({
            left: `${(i * 37) % 100}%`,
            delay: `${(i % 7) * 0.09}s`,
            dur: `${1.6 + (i % 5) * 0.25}s`,
            color: ['#ffd76a', '#34b578', '#5ab0ff', '#ff7a8a', '#c58bff'][i % 5],
            rot: `${(i * 53) % 360}deg`,
          }))
        : [],
    [rate],
  )
  const comment =
    rate === 1
      ? tr('完璧に 身についている！ この調子！', "You've totally got this! Keep it up!")
      : rate >= 0.8
        ? tr('あと少しで 完璧だ。', 'So close to perfect.')
        : rate >= 0.5
          ? tr('いい調子！ まちがえた 所を 復習しよう。', "Nice going! Let's review the ones you missed.")
          : tr('まずは 解説を 読んで、類題で もう一度！', 'Read the explanations first, then try similar questions!')
  const btns = [
    ...(wrong ? [{ label: tr(`🔥 まちがえた ${wrong}問の 類題を 解く`, `🔥 Try questions like the ${wrong} you missed`), run: onSimilar }] : []),
    { label: tr('🔁 同じコースを もう一度（新しい 問題）', '🔁 Same course again (new questions)'), run: onRetry },
    { label: tr('📖 コースを 選びなおす', '📖 Choose another course'), run: onMenu },
    { label: tr('おわる', 'Finish'), run: onClose },
  ]
  const [cursor, setCursor] = useState(0)
  useKeys((k) => {
    if (k === 'up' || k === 'down') {
      sfx('cursor')
      setCursor((c) => (c + (k === 'up' ? btns.length - 1 : 1)) % btns.length)
    } else if (k === 'ok') btns[cursor].run()
    else if (k === 'cancel') onMenu()
  })

  return (
    <div className={`study-page result ${tier}`}>
      {confetti.length > 0 && (
        <div className="rs-confetti" aria-hidden="true">
          {confetti.map((c, i) => (
            <i key={i} style={{ left: c.left, background: c.color, animationDelay: c.delay, animationDuration: c.dur, rotate: c.rot }} />
          ))}
        </div>
      )}
      <header className="study-head">
        <h2>{tr('けっか', 'Results')}</h2>
        <div className="quiz-title">{title}</div>
      </header>
      <div className="rs-hero">
        <div className="rs-ring" style={{ '--p': shown } as CSSProperties} role="img" aria-label={tr(`正答率 ${pct}%`, `Accuracy ${pct}%`)}>
          <div className="rs-ring-in">
            <b>
              {shown}
              <small>%</small>
            </b>
            <span>{tr('正答率', 'Accuracy')}</span>
          </div>
        </div>
        <div className="rs-title">{headline}</div>
        <p className="result-comment">{comment}</p>
      </div>
      <div className="rs-stats">
        <div className="rs-stat ok">
          <span className="rs-ico">✅</span>
          <b>
            {correct}
            <small> / {results.length}</small>
          </b>
          <span>{tr('正解', 'Correct')}</span>
        </div>
        <div className="rs-stat streak">
          <span className="rs-ico">🔥</span>
          <b>{best}</b>
          <span>{tr('最高 連続正解', 'Best run')}</span>
        </div>
        <div className="rs-stat time">
          <span className="rs-ico">⏱️</span>
          <b>{time}</b>
          <span>{tr('タイム', 'Time')}</span>
        </div>
      </div>
      {streak?.grew && (
        <div className="rs-streak" role="status">
          <span className="rs-streak-fire" aria-hidden="true">
            🔥
          </span>
          <div>
            <b>{tr(`${streak.count}日 連続！`, `${streak.count}-day streak!`)}</b>
            <span>
              {streak.count === 1
                ? tr('連続記録 スタート。あしたも 1コースで のびる！', 'Streak started. One course tomorrow keeps it going!')
                : streak.count >= streak.best
                  ? tr('自己ベスト 更新中！ あしたも 待ってるぞ。', "That's your best yet! See you tomorrow.")
                  : tr(`自己ベストは ${streak.best}日。あしたも 続けよう！`, `Your best is ${streak.best} days. Keep it up tomorrow!`)}
            </span>
          </div>
        </div>
      )}
      <h3 className="rs-sub">{tr('ふりかえり', 'Review')}</h3>
      <ol className="result-list">
        {results.map((r, i) => (
          <li key={i} className={r.ok ? 'ok' : 'ng'}>
            <span className="mark">{r.ok ? '⭕' : '❌'}</span>
            <span className="rq">{r.q.q}</span>
            {!r.ok && (
              <span className="ra">
                {tr('こたえ：', 'Answer: ')}
                {r.q.type === 'choice' ? r.q.answer : r.q.hint}
              </span>
            )}
          </li>
        ))}
      </ol>
      <div className="result-btns">
        {btns.map((b, i) => (
          <button key={b.label} className={`btn ${i === 0 ? 'primary' : ''} ${i === cursor ? 'on' : ''}`} onPointerEnter={() => setCursor(i)} onClick={b.run}>
            {b.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ================================================================ 連続日数
const WEEKDAYS = () => tr('日月火水木金土', 'SMTWTFS').split('')

/** コース選びの 上：連続日数と 直近 7日の しるし（Duolingo の 連続記録の ような もの） */
function StreakCard({ info }: { info: StreakInfo }) {
  const wd = WEEKDAYS()
  const { count, today, best } = info
  const msg = today
    ? tr('今日の ふくしゅうは 完了！ また あした。', "Today's review is done! See you tomorrow.")
    : count > 0
      ? tr(`今日 1コース 終えると ${count + 1}日 連続に！`, `Finish 1 course today to reach ${count + 1} days!`)
      : tr('1日 1コースで 連続記録を のばそう', 'Do 1 course a day to build a streak')
  return (
    <section className={`streak-card ${today ? 'done' : count > 0 ? 'risk' : 'zero'}`} aria-label={tr(`連続 ${count}日`, `${count}-day streak`)}>
      <div className="streak-main">
        <span className="streak-fire" aria-hidden="true">
          🔥
        </span>
        <div className="streak-num">
          <b>{count}</b>
          <span>{tr('日 連続', 'day streak')}</span>
        </div>
        <div className="streak-msg">
          <span>{msg}</span>
          {best > 1 && <small>{tr(`自己ベスト ${best}日`, `Best: ${best} days`)}</small>}
        </div>
      </div>
      <ol className="streak-week">
        {info.week.map((d) => (
          <li key={d.date.getTime()} className={`${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''}`}>
            <span>{wd[d.date.getDay()]}</span>
            <i aria-label={d.done ? tr('達成', 'done') : tr('未', 'not yet')}>{d.done ? '✓' : ''}</i>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** 0 から target まで 数え上げる（約0.9秒・動きを 減らす 設定では すぐ target） */
function useCountUp(target: number) {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [v, setV] = useState(reduce ? target : 0)
  useEffect(() => {
    if (reduce) return setV(target)
    let raf = 0
    const t0 = performance.now() + 250
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / 900))
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, reduce])
  return v
}
