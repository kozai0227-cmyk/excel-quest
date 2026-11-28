import { useEffect, useMemo, useRef, useState } from 'react'
import { QUESTS } from '../data/quests'
import { useKeys } from '../game/keys'
import { useInputMode } from '../game/inputMode'
import { tr } from '../game/lang'
import { sfx } from '../game/sound'
import type { GameState } from '../game/types'
import './PuzzleGate.css'

/** 石版の 扉を 調べた ときの 確認（App が 出し、謎を とくか どうかを 受け取る） */
export interface PuzzleGateReq {
  puzzleId: string
  close(go: boolean): void
}

/** 石版に 見せる 升目の 大きさ（それより 大きい 表は 左上だけ） */
const ROWS = 4
const COLS = 5

/**
 * 石版の 扉カード：扉の 石版（実際の 表の 左上）・この ダンジョンで 何枚目の 扉か・刻まれた 言葉・
 * やること・ごほうびを 並べ、「謎を とく」か「あとで」を 選ぶ。
 * 文字だけの「謎を とく／やめておく」では、何を させられるのか・あと 何枚 あるのかが わからなかった
 */
export function PuzzleGate({ req, gs }: { req: PuzzleGateReq; gs: GameState }) {
  const q = QUESTS[req.puzzleId]
  // 同じ ダンジョンの 石版（並びは 定義順＝奥へ 進む 順）
  const doors = useMemo(() => Object.values(QUESTS).filter((x) => x.kind === 'puzzle' && x.town === q.town), [q.town])
  const index = doors.findIndex((d) => d.id === q.id)
  const solvedCount = doors.filter((d) => gs.solved.includes(d.id)).length

  // 石版に 刻む 升目（実際の 問題の 表の 左上）
  const tablet = useMemo(() => {
    const g = q.grid()
    const rows = Math.min(ROWS, g.length)
    const cols = Math.min(COLS, g[0]?.length ?? 0)
    return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => g[r][c]?.raw ?? ''))
  }, [q])
  const cols = tablet[0]?.length ?? 1

  // ※ で 始まる 行は 決まりごと（ヒント）として 分ける
  const isNote = (t: string) => /^\s*[※*]/.test(t)
  const steps = q.task.filter((t) => !isNote(t))
  const notes = q.task.filter(isNote).map((t) => t.replace(/^\s*[※*]\s*/, ''))

  const keyboard = useInputMode() === 'keyboard'
  const [focus, setFocus] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const done = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    sfx('magic')
    return () => clearTimeout(timer.current)
  }, [])

  const pick = (go: boolean) => {
    if (done.current) return
    done.current = true
    sfx(go ? 'select' : 'cancel')
    setPicked(go ? 0 : 1)
    // 押した ボタンが 沈み、石版が 光るのを 見せてから
    timer.current = setTimeout(() => req.close(go), go ? 380 : 120)
  }

  useKeys((k) => {
    if (done.current) return
    if (k === 'left' || k === 'up') {
      if (focus !== 0) sfx('cursor')
      setFocus(0)
    } else if (k === 'right' || k === 'down') {
      if (focus !== 1) sfx('cursor')
      setFocus(1)
    } else if (k === 'ok') pick(focus === 0)
    else if (k === 'cancel') pick(false)
  })

  return (
    <div className={`pg-layer ${picked === 0 ? 'go' : ''}`} role="dialog" aria-label={q.title} onClick={(e) => e.target === e.currentTarget && pick(false)}>
      <div className="pg-card">
        <div className="pg-stage" aria-hidden="true">
          <div className="pg-glow" />
          <div className="pg-door">
            <div className="pg-tablet" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {tablet.flatMap((row, r) =>
                row.map((v, c) => (
                  <span key={`${r}-${c}`} className={v ? 'on' : ''} style={{ animationDelay: `${0.25 + (r * cols + c) * 0.03}s` }}>
                    {v}
                  </span>
                )),
              )}
            </div>
          </div>
          <i className="pg-dust d1" />
          <i className="pg-dust d2" />
          <i className="pg-dust d3" />
        </div>

        <div className="pg-body">
          <div className="pg-tags">
            <span className="pg-tag kind">🧩 {tr('石版の謎', 'Tablet Puzzle')}</span>
            {doors.length > 1 && (
              <span className="pg-tag doors" aria-label={tr(`扉 ${index + 1} / ${doors.length}`, `Door ${index + 1} of ${doors.length}`)}>
                {doors.map((d, i) => (
                  <i key={d.id} className={`${gs.solved.includes(d.id) ? 'ok' : ''} ${i === index ? 'now' : ''}`} />
                ))}
                <span>
                  {tr(`扉 ${index + 1}/${doors.length}`, `Door ${index + 1}/${doors.length}`)}
                </span>
              </span>
            )}
          </div>
          <h3>{q.title}</h3>

          <blockquote className="pg-words" style={{ animationDelay: '0.1s' }}>
            {q.intro.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </blockquote>

          <div className="pg-task" style={{ animationDelay: '0.18s' }}>
            <span className="pg-label">🎯 {tr('やること', 'Your task')}</span>
            <ol>
              {steps.map((t, i) => (
                <li key={i}>
                  <b>{i + 1}</b>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            {notes.map((t, i) => (
              <p key={i} className="pg-note">
                <span>💡</span>
                {t}
              </p>
            ))}
          </div>

          <div className="pg-reward" style={{ animationDelay: '0.26s' }}>
            <span className="pg-chip exp">✨ +{q.reward.exp} EXP</span>
            <span className="pg-chip open">🔓 {tr('扉が ひらく', 'Opens the door')}</span>
            <span className="pg-chip prog">
              {tr(`解いた 扉 ${solvedCount}/${doors.length}`, `Solved ${solvedCount}/${doors.length}`)}
            </span>
          </div>

          <p className="pg-tip" style={{ animationDelay: '0.32s' }}>
            {tr('石版に ヒントは ない。これまでに 覚えた スキルで 挑もう', 'Tablets give no hints. Use the skills you have learned so far')}
          </p>

          <div className={`pg-btns ${keyboard ? 'ring' : ''}`}>
            <button type="button" className={`pg-btn main ${focus === 0 ? 'f' : ''} ${picked === 0 ? 'picked' : ''}`} onClick={() => pick(true)}>
              🔓 {tr('謎を とく', 'Solve it')}
            </button>
            <button type="button" className={`pg-btn sub ${focus === 1 ? 'f' : ''} ${picked === 1 ? 'picked' : ''}`} onClick={() => pick(false)}>
              {tr('あとで', 'Later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
