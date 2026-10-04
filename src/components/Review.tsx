import { useState } from 'react'
import { useKeys } from '../game/keys'
import { sfx } from '../game/sound'
import type { GameState } from '../game/types'
import { CHAPTERS, PRACTICE_SIZE, chapterOpen, chapterProgress, percent, type ChapterDef, type Progress } from '../data/chapters'

interface Props {
  gs: GameState
  /** 章を えらんだ（null は 苦手な 問題） */
  onStart(ch: ChapterDef | null): void
  onClose(): void
}

const LABELS: [keyof Progress, string][] = [
  ['quests', '依頼'],
  ['puzzles', '謎'],
  ['bosses', 'ボス'],
  ['chests', '宝箱'],
]

/** ふくしゅうの書：章ごとの 達成率と、復習（5問）・苦手の 出し直し */
export function Review({ gs, onStart, onClose }: Props) {
  const rows = CHAPTERS.map((ch) => ({ ch, open: chapterOpen(ch, gs), p: chapterProgress(ch, gs) }))
  const weak = (gs.weak ?? []).length
  const total = percent(rows.map((r) => r.p))
  // 選べる 行：苦手（あれば）→ 開放ずみの 章 → とじる
  const opts: (ChapterDef | 'weak' | 'close')[] = [...(weak ? (['weak'] as const) : []), ...rows.filter((r) => r.open).map((r) => r.ch), 'close']
  const [cursor, setCursor] = useState(0)

  const pick = (o: (typeof opts)[number]) => {
    if (o === 'close') return onClose()
    onStart(o === 'weak' ? null : o)
  }

  useKeys((k) => {
    if (k === 'up' || k === 'down') sfx('cursor')
    if (k === 'up') setCursor((c) => (c + opts.length - 1) % opts.length)
    else if (k === 'down') setCursor((c) => (c + 1) % opts.length)
    else if (k === 'ok') {
      sfx('select')
      pick(opts[cursor])
    } else if (k === 'cancel') {
      sfx('cancel')
      onClose()
    }
  })

  const on = (o: (typeof opts)[number]) => opts[cursor] === o

  return (
    <div className="menu-layer review-layer">
      <div className="win review">
        <header className="review-head">
          <h3>ふくしゅうの書</h3>
          <div className="review-total">
            達成率 <b>{total}%</b>
            <div className="pbar">
              <span style={{ width: `${total}%` }} />
            </div>
          </div>
        </header>
        <p className="muted review-help">章を えらぶと、その章の 問題が {PRACTICE_SIZE}問 出る。まちがえても ダメージは ない。</p>
        <div className="review-list">
          {weak > 0 && (
            <div className={`opt review-weak ${on('weak') ? 'on' : ''}`} onClick={() => pick('weak')} onPointerEnter={() => setCursor(opts.indexOf('weak'))}>
              <b>🔥 苦手な 問題に 再挑戦</b>
              <span>まちがえた 問題：{weak}問（正解すると 消える）</span>
            </div>
          )}
          {rows.map(({ ch, open, p }) =>
            open ? (
              <div key={ch.no} className={`opt review-ch ${on(ch) ? 'on' : ''}`} onClick={() => pick(ch)} onPointerEnter={() => setCursor(opts.indexOf(ch))}>
                <div className="review-title">
                  <b>{ch.title}</b>
                  <span className="review-pct">{percent([p])}%</span>
                </div>
                <div className="pbar">
                  <span style={{ width: `${percent([p])}%` }} />
                </div>
                <div className="review-topic">{ch.topic}</div>
                <div className="review-counts">
                  {LABELS.map(([k, label]) => (
                    <span key={k} className={p[k][0] === p[k][1] ? 'full' : ''}>
                      {label} {p[k][0]}/{p[k][1]}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div key={ch.no} className="review-ch locked">
                <b>？？？</b>
                <span className="muted">まだ たどりついていない</span>
              </div>
            ),
          )}
          <div className={`opt review-close ${on('close') ? 'on' : ''}`} onClick={onClose} onPointerEnter={() => setCursor(opts.length - 1)}>
            とじる
          </div>
        </div>
      </div>
    </div>
  )
}
