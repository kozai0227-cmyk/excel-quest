import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Question } from '../data/bosses'
import { useKeys } from '../game/keys'
import { jingle, sfx } from '../game/sound'
import type { GameState } from '../game/types'
import { useInputMode } from '../game/inputMode'
import { judgeFormula } from '../game/judge'
import { getWeak, markWeak } from '../game/weak'
import { FormulaQuestion } from './FormulaQuestion'
import {
  CHAPTERS,
  allCourse,
  chapterCourse,
  chapterOfKey,
  chapterOpen,
  chapterProgress,
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

const LABELS: [keyof Progress, string][] = [
  ['quests', '依頼'],
  ['puzzles', '謎'],
  ['bosses', 'ボス'],
  ['chests', '宝箱'],
]

const short = (t: string) => t.replace(/^(第\d章|最終章)　/, '')
const chapterTag = (ch?: ChapterDef) => (ch ? ch.title.split('　')[0] : '')

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
            start({ title: 'まちがえた 問題の 類題', make: () => weakCourse(wrong, Math.min(10, Math.max(5, wrong.length * 2))) })
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
  const rows = CHAPTERS.map((ch) => ({ ch, open: fromTitle || !gs || chapterOpen(ch, gs), p: gs ? chapterProgress(ch, gs) : null }))
  const openChs = rows.filter((r) => r.open).map((r) => r.ch)
  const total = gs ? percent(rows.map((r) => r.p!)) : null

  type Opt = { id: string; course?: Course; disabled?: boolean }
  const opts: Opt[] = [
    { id: 'weak', course: { title: '苦手克服コース', make: () => weakCourse(getWeak()) }, disabled: !weak.length },
    { id: 'all', course: { title: '全章まとめコース', make: () => allCourse(openChs) } },
    ...rows.filter((r) => r.open).map((r) => ({ id: `ch${r.ch.no}`, course: { title: r.ch.title, make: () => chapterCourse(r.ch) } })),
    { id: 'close' },
  ]
  const live = opts.filter((o) => !o.disabled)
  const [cursor, setCursor] = useState(live[0].id)
  const pick = (o: Opt) => {
    if (o.disabled) return
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
  })

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
        <h2>📖 ふくしゅうの書</h2>
        {total !== null && (
          <div className="study-total">
            冒険の 達成率 <b>{total}%</b>
            <div className="pbar">
              <span style={{ width: `${total}%` }} />
            </div>
          </div>
        )}
      </header>
      <p className="study-help">時間制限は ない。じっくり 考えて 答えよう。まちがえた 問題は「苦手」に 記録され、正解すると 消える。</p>
      <div className="course-list">
        {row(
          opts[0],
          <>
            <b>🔥 苦手克服コース</b>
            <span>{weak.length ? `まちがえた 問題（${weak.length}問）と その類題を 中心に 10問` : 'まだ まちがえた 問題は ない'}</span>
          </>,
          'weak',
        )}
        {row(
          opts[1],
          <>
            <b>📚 全章まとめコース</b>
            <span>{openChs.length > 1 ? `${chapterTag(openChs[0])}〜${chapterTag(openChs[openChs.length - 1])}から まんべんなく 10問` : '第1章から 10問'}</span>
          </>,
          'all',
        )}
        <div className="course-sep">章を えらんで 復習（5問）</div>
        {rows.map(({ ch, open, p }) => {
          if (!open)
            return (
              <div key={ch.no} className="course locked">
                <b>{chapterTag(ch)}　？？？</b>
                <span>まだ たどりついていない</span>
              </div>
            )
          const o = opts.find((x) => x.id === `ch${ch.no}`)!
          return row(
            o,
            <>
              <div className="course-title">
                <b>
                  {chapterTag(ch)}　{short(ch.title)}
                </b>
                {p && <span className="course-pct">{percent([p])}%</span>}
              </div>
              <span className="course-topic">{ch.topic}</span>
              {p && (
                <>
                  <div className="pbar">
                    <span style={{ width: `${percent([p])}%` }} />
                  </div>
                  <div className="course-counts">
                    {LABELS.map(([k, label]) => (
                      <span key={k} className={p[k][0] === p[k][1] ? 'full' : ''}>
                        {label} {p[k][0]}/{p[k][1]}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </>,
            'chapter',
          )
        })}
        {row(opts[opts.length - 1], <b>{fromTitle ? 'タイトルに もどる' : 'とじる'}</b>, 'close')}
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
          やめる
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
          {item.similar && <span className="tag similar">類題</span>}
          <span className="tag kind">{q.type === 'choice' ? 'えらぶ' : '数式を 作る'}</span>
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
              label="こたえる"
              onSubmit={(input) => {
                const r = judgeFormula(q, input)
                answer(r.ok, r.note)
              }}
            />
          )
        )}
        {fb && (
          <div className={`quiz-fb ${fb.ok ? 'ok' : 'ng'}`}>
            <div className="fb-mark">{fb.ok ? '⭕ せいかい！' : '❌ ざんねん……'}</div>
            {fb.note && <p>{fb.note}</p>}
            <p>
              こたえ：<b>{q.type === 'choice' ? q.answer : q.hint}</b>
            </p>
            <p className="fb-explain">{q.explain}</p>
            <button className="btn primary" autoFocus data-nosfx onClick={next}>
              {idx + 1 < items.length ? 'つぎへ ▶' : 'けっかを 見る'}
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
    rate === 1 ? 'パーフェクト！ 完璧に 身についている！' : rate >= 0.8 ? 'すばらしい！ あと少しで 完璧だ。' : rate >= 0.5 ? 'いい調子！ まちがえた 所を 復習しよう。' : 'まずは 解説を 読んで、類題で もう一度！'
  const btns = [
    ...(wrong ? [{ label: `🔥 まちがえた ${wrong}問の 類題を 解く`, run: onSimilar }] : []),
    { label: '🔁 同じコースを もう一度（新しい 問題）', run: onRetry },
    { label: '📖 コースを 選びなおす', run: onMenu },
    { label: 'おわる', run: onClose },
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
        <h2>けっか</h2>
        <div className="quiz-title">{title}</div>
      </header>
      <div className="result-score">
        <b>{correct}</b> / {results.length} 問 正解
      </div>
      <p className="result-comment">{comment}</p>
      <ol className="result-list">
        {results.map((r, i) => (
          <li key={i} className={r.ok ? 'ok' : 'ng'}>
            <span className="mark">{r.ok ? '⭕' : '❌'}</span>
            <span className="rq">{r.q.q}</span>
            {!r.ok && <span className="ra">こたえ：{r.q.type === 'choice' ? r.q.answer : r.q.hint}</span>}
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
