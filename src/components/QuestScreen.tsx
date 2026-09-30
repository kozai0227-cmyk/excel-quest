import { useMemo, useRef, useState } from 'react'
import { MiniExcel } from './MiniExcel'
import { makeCtx, type QuestDef } from '../data/quests'
import { SKILLS } from '../data/skills'
import { ITEMS } from '../data/items'
import type { Grid, Value } from '../game/formula'
import { questPad } from '../game/formulaTokens'
import { useInputMode } from '../game/inputMode'

interface Props {
  quest: QuestDef
  onClear(hintsUsed: number): void
  onClose(): void
}

export function QuestScreen({ quest, onClear, onClose }: Props) {
  const initial = useMemo(() => quest.grid(), [quest])
  const history = useMemo(() => quest.history?.(), [quest])
  const [hints, setHints] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [cleared, setCleared] = useState(false)
  const touch = useInputMode() === 'touch'
  const pad = useMemo(() => questPad(quest.town), [quest])
  const last = useRef<{ grid: Grid; values: Value[][]; actions: Set<string> } | null>(null)

  // 入力のたびには判定しない。「これでどうだ！」を押したときだけ判定する
  const onChange = (grid: Grid, values: Value[][], actions: Set<string>) => {
    last.current = { grid, values, actions }
    if (feedback) setFeedback(null)
  }

  const judge = () => {
    if (!last.current) return
    const { grid, values, actions } = last.current
    const res = quest.check(makeCtx(grid, values, actions))
    if (res === null) setCleared(true)
    else setFeedback(res)
  }

  const reward = quest.reward
  const puzzle = quest.kind === 'puzzle'
  return (
    <div className="quest-overlay">
      <div className="quest">
        <header className="quest-head">
          <div className="quest-title">
            <span className="tag">{quest.kind === 'puzzle' ? '謎解き' : '依頼'}</span> {quest.title}
            {quest.kind !== 'puzzle' && <span className="from">― {quest.npc}</span>}
          </div>
          <button className="btn ghost" onClick={onClose}>
            あきらめる
          </button>
        </header>
        <div className="quest-body">
          <aside className="quest-side">
            <div className="panel">
              <h3>やること</h3>
              <ol>
                {quest.task.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </div>
            {puzzle ? (
              // ボスステージの謎解きは ヒントなし
              <div className="panel">
                <p className="muted">この石版に ヒントは ない。これまでに 覚えた スキルを 思い出そう。</p>
              </div>
            ) : (
            <div className="panel">
              <h3>ヒント</h3>
              {quest.hints.slice(0, hints).map((h, i) => (
                <p key={i} className="hint">
                  💡 {h}
                </p>
              ))}
              {hints < quest.hints.length ? (
                <button className="btn" onClick={() => setHints(hints + 1)}>
                  ヒントを見る（{hints + 1}/{quest.hints.length}）
                </button>
              ) : (
                <p className="muted">ヒントは これで全部だ。</p>
              )}
            </div>
            )}
            <button className="btn primary" onClick={judge}>
              これで どうだ！（判定）
            </button>
            {feedback && <div className="feedback">{feedback}</div>}
          </aside>
          <main className="quest-main">
            <MiniExcel initial={initial} initialHistory={history} colWidths={quest.colWidths} pad={pad} onChange={onChange} />
            {!puzzle && touch && (
            <div className="cheats">
              <span>数式の途中で セルをタップ → 番地が入る</span>
              <span>ドラッグ → 範囲（A1:A6）</span>
              <span>F4 → $ の付け外し</span>
            </div>
            )}
            {!puzzle && !touch && (
            <div className="cheats">
              <span><kbd>Enter</kbd> 確定</span>
              <span><kbd>F2</kbd> 編集</span>
              <span><kbd>Esc</kbd> 取消</span>
              <span><kbd>Ctrl/⌘+C</kbd><kbd>V</kbd> コピペ</span>
              <span><kbd>Ctrl/⌘+Z</kbd> 戻す</span>
              <span><kbd>Ctrl/⌘+B</kbd> 太字</span>
              <span>右下の■をドラッグでオートフィル</span>
            </div>
            )}
          </main>
        </div>
      </div>
      {cleared && (
        <div className="clear-modal">
          <div className="win clear-win">
            <div className="clear-title">{quest.kind === 'puzzle' ? '★ 謎を 解いた！ ★' : '★ 悩みを 解決した！ ★'}</div>
            <p>{quest.kind === 'puzzle' ? `「${quest.title}」の 石版が 光った` : `${quest.npc}の「${quest.title}」`}</p>
            <p>
              けいけんち +{reward.exp}
              {reward.gold > 0 && `　／　${reward.gold} ゴールド`}
            </p>
            {reward.skill && <p className="learn">スキル「{SKILLS[reward.skill].name}」を おぼえた！</p>}
            {reward.item && <p>{ITEMS[reward.item].name}を てにいれた！</p>}
            <button className="btn primary" autoFocus onClick={() => onClear(hints)}>
              つづける
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
