import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Question } from '../data/bosses'
import { useKeys } from '../game/keys'
import { jingle, sfx } from '../game/sound'
import type { GameState } from '../game/types'
import { useInputMode } from '../game/inputMode'
import { judgeFormula } from '../game/judge'
import { getWeak, markWeak } from '../game/weak'
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

  const start = (c: Course, list = c.make()) => {
    if (!list.length) return
    sfx('select')
    setCourse(c)
    setItems(list)
    setIdx(0)
    setResults([])
    setRun((n) => n + 1)
    setView('quiz')
  }

  const finish = (res: Result[]) => {
    setResults(res)
    setWeakState(getWeak())
    setView('result')
    if (res.every((r) => r.ok)) jingle('clear')
  }

  return (
    <div className="study">
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

  type Opt = { id: string; course?: Course; disabled?: boolean; unlock?: boolean }
  const opts: Opt[] = [
    { id: 'weak', course: { title: tr('苦手克服コース', 'Weak Spot Course'), make: () => weakCourse(getWeak()) }, disabled: !weak.length },
    { id: 'all', course: { title: tr('全章まとめコース', 'All-Chapter Course'), make: () => allCourse(openChs) } },
    ...rows
      .filter((r) => r.open)
      .map((r) => (r.locked ? { id: `ch${r.ch.no}`, unlock: true } : { id: `ch${r.ch.no}`, course: { title: chapterTitle(r.ch), make: () => chapterCourse(r.ch) } })),
    { id: 'close' },
  ]
  const live = opts.filter((o) => !o.disabled)
  const [cursor, setCursor] = useState(live[0].id)
  const pick = (o: Opt) => {
    if (o.disabled) return
    if (o.unlock) {
      sfx('select')
      return openUnlock()
    }
    if (!o.course) return onClose()
    onStart(o.course)
  }

  useKeys((k) => {
    const i = live.findIndex((o) => o.id === cursor)
    if (k === 'up' || k === 'down') {
      sfx('cursor')
      setCursor(live[(i + (k === 'up' ? live.length - 1 : 1)) % live.length].id)
    } else if (k === 'ok') pick(live[i])
    else if (k === 'cancel') {
      sfx('cancel')
      onClose()
    }
  }, !unlockOpen)

  // 選んだ 行が 見えるように
  useEffect(() => {
    document.querySelector('.study .course.on')?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const row = (o: Opt, body: ReactNode, cls = '') => (
    <div
      key={o.id}
      className={`course ${cls} ${cursor === o.id ? 'on' : ''} ${o.disabled ? 'disabled' : ''}`}
      onPointerEnter={() => !o.disabled && setCursor(o.id)}
      onClick={() => pick(o)}
    >
      {body}
    </div>
  )

  return (
    <div className="study-page">
      <header className="study-head">
        <h2>📖 {tr('ふくしゅうの書', 'Book of Review')}</h2>
        {total !== null && (
          <div className="study-total">
            {tr('冒険の 達成率', 'Adventure completion')} <b>{total}%</b>
            <div className="pbar">
              <span style={{ width: `${total}%` }} />
            </div>
          </div>
        )}
      </header>
      <p className="study-help">
        {tr(
          '時間制限は ない。じっくり 考えて 答えよう。まちがえた 問題は「苦手」に 記録され、正解すると 消える。',
          'No time limit here, so take your time. Questions you miss are saved as weak spots and cleared when you get them right.',
        )}
      </p>
      <div className="course-list">
        {row(
          opts[0],
          <>
            <b>🔥 {tr('苦手克服コース', 'Weak Spot Course')}</b>
            <span>
              {weak.length
                ? tr(`まちがえた 問題（${weak.length}問）と その類題を 中心に 10問`, `10 questions focused on the ${weak.length} you missed and similar ones`)
                : tr('まだ まちがえた 問題は ない', "You haven't missed any questions yet")}
            </span>
          </>,
          'weak',
        )}
        {row(
          opts[1],
          <>
            <b>📚 {tr('全章まとめコース', 'All-Chapter Course')}</b>
            <span>
              {openChs.length > 1
                ? tr(
                    `${chapterTag(openChs[0])}〜${chapterTag(openChs[openChs.length - 1])}から まんべんなく 10問`,
                    `10 questions spread across ${chapterTag(openChs[0])} to ${chapterTag(openChs[openChs.length - 1])}`,
                  )
                : tr('第1章から 10問', '10 questions from Chapter 1')}
            </span>
          </>,
          'all',
        )}
        <div className="course-sep">{tr('章を えらんで 復習（5問）', 'Review by chapter (5 questions)')}</div>
        {rows.map(({ ch, open, locked, p }) => {
          if (!open)
            return (
              <div key={ch.no} className="course locked">
                <b>
                  {chapterTag(ch)}
                  {tr('　？？？', ': ???')}
                </b>
                <span>{tr('まだ たどりついていない', "You haven't reached this yet")}</span>
              </div>
            )
          const o = opts.find((x) => x.id === `ch${ch.no}`)!
          if (locked)
            return row(
              o,
              <>
                <b>
                  🔒 {chapterTag(ch)}
                  {tr('　', ': ')}
                  {chapterShort(ch)}
                </b>
                <span className="course-topic">{chapterTopic(ch)}</span>
                <span className="course-unlock">
                  {isNative ? tr('全章解放で 遊べる', 'Play with Unlock All Chapters') : tr('iPhone アプリ版で 遊べる', 'Play in the iPhone app')}
                </span>
              </>,
              'chapter paywall',
            )
          return row(
            o,
            <>
              <div className="course-title">
                <b>
                  {chapterTag(ch)}
                  {tr('　', ': ')}
                  {chapterShort(ch)}
                </b>
                {p && <span className="course-pct">{percent([p])}%</span>}
              </div>
              <span className="course-topic">{chapterTopic(ch)}</span>
              {p && (
                <>
                  <div className="pbar">
                    <span style={{ width: `${percent([p])}%` }} />
                  </div>
                  <div className="course-counts">
                    {LABELS.map(([k, label]) => (
                      <span key={k} className={p[k][0] === p[k][1] ? 'full' : ''}>
                        {label()} {p[k][0]}/{p[k][1]}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </>,
            'chapter',
          )
        })}
        {row(opts[opts.length - 1], <b>{fromTitle ? tr('タイトルに もどる', 'Back to title') : tr('とじる', 'Close')}</b>, 'close')}
      </div>
    </div>
  )
}

// ================================================================ 問題を 解く
function Quiz({
  title,
  items,
  idx,
  skills,
  onAnswer,
  onQuit,
}: {
  title: string
  items: PracticeItem[]
  idx: number
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
  const touch = useInputMode() === 'touch'
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

  return (
    <div className="study-page quiz">
      <header className="quiz-head">
        <div className="quiz-title">{title}</div>
        <div className="quiz-count">
          {idx + 1} / {items.length}
        </div>
        <button className="btn ghost" onClick={onQuit}>
          {tr('やめる', 'Quit')}
        </button>
      </header>
      <div className="quiz-progress">
        {items.map((_, i) => (
          <span key={i} className={i < idx ? 'done' : i === idx ? 'now' : ''} />
        ))}
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
                className={`quiz-choice ${i === cursor && !fb ? 'on' : ''} ${fb && c === q.answer ? 'right' : ''} ${fb && !fb.ok && i === cursor ? 'miss' : ''}`}
                onPointerEnter={() => !fb && setCursor(i)}
                onClick={() => {
                  if (fb) return
                  setCursor(i)
                  answer(c === q.answer)
                }}
              >
                <span className="num">{i + 1}</span> {c}
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
        {fb && (
          <div className={`quiz-fb ${fb.ok ? 'ok' : 'ng'}`}>
            <div className="fb-mark">{fb.ok ? tr('⭕ せいかい！', '⭕ Correct!') : tr('❌ ざんねん……', '❌ Not quite...')}</div>
            {fb.note && <p>{fb.note}</p>}
            <p>
              {tr('こたえ：', 'Answer: ')}
              <b>{q.type === 'choice' ? q.answer : q.hint}</b>
            </p>
            <p className="fb-explain">{q.explain}</p>
            <button className="btn primary" autoFocus data-nosfx onClick={next}>
              {idx + 1 < items.length ? tr('つぎへ ▶', 'Next ▶') : tr('けっかを 見る', 'See results')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================================ けっか
function ResultView({
  title,
  results,
  onRetry,
  onSimilar,
  onMenu,
  onClose,
}: {
  title: string
  results: Result[]
  onRetry(): void
  onSimilar(): void
  onMenu(): void
  onClose(): void
}) {
  const correct = results.filter((r) => r.ok).length
  const wrong = results.length - correct
  const rate = correct / results.length
  const comment =
    rate === 1
      ? tr('パーフェクト！ 完璧に 身についている！', "Perfect! You've totally got this!")
      : rate >= 0.8
        ? tr('すばらしい！ あと少しで 完璧だ。', 'Great job! Almost perfect.')
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
    <div className="study-page result">
      <header className="study-head">
        <h2>{tr('けっか', 'Results')}</h2>
        <div className="quiz-title">{title}</div>
      </header>
      <div className="result-score">
        <b>{correct}</b> / {results.length} {tr('問 正解', 'correct')}
      </div>
      <p className="result-comment">{comment}</p>
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
