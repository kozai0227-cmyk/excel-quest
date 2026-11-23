import { useMemo, useRef, useState } from 'react'
import { MiniExcel } from './MiniExcel'
import { makeCtx, type QuestDef } from '../data/quests'
import { tr } from '../game/lang'
import { npcName } from '../data/en'
import type { Grid, Value } from '../game/formula'
import { getInputMode } from '../game/inputMode'
import { isPhoneLayout } from '../game/layout'
import { GUIDES } from '../data/guides'
import { GuidedQuest } from './GuidedQuest'
import { jingle, sfx } from '../game/sound'
import { QuestClear } from './QuestClear'

interface Props {
  quest: QuestDef
  onClear(hintsUsed: number): void
  onClose(): void
  /** 依頼を 始める前の 経験値（クリア画面の 経験値バー用） */
  exp?: number
}

export function QuestScreen({ quest, onClear, onClose, exp }: Props) {
  const initial = useMemo(() => quest.grid(), [quest])
  const history = useMemo(() => quest.history?.(), [quest])
  const [hints, setHints] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [cleared, setCleared] = useState(false)
  // 依頼の 途中で 画面を 回しても 表が 消えないよう、レイアウトは 開いたときに 決める
  const [phone] = useState(isPhoneLayout)
  // ボタン入力（スマホ）は、知識を 1つずつ 答える ステップ式に する
  const [guided] = useState(() => getInputMode() === 'touch' && !!GUIDES[quest.id])
  /** スマホ：「やること」を 開いておくか（閉じると 表が 広く見える） */
  const [brief, setBrief] = useState(true)
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
    if (res === null) {
      jingle('clear')
      setCleared(true)
    } else {
      sfx('wrong')
      setFeedback(res)
    }
  }

  const puzzle = quest.kind === 'puzzle'
  const excel = <MiniExcel initial={initial} initialHistory={history} colWidths={quest.colWidths} onChange={onChange} />
  const clearModal = cleared && <QuestClear quest={quest} hints={hints} exp={exp} onContinue={() => onClear(hints)} />

  if (guided) return <GuidedQuest quest={quest} steps={GUIDES[quest.id]} onClear={onClear} onClose={onClose} exp={exp} />

  // スマホの 縦画面：上に「やること」、まん中に 表、下に 判定ボタン。画面の 高さに ぴったり おさめる
  if (phone)
    return (
      <div className="quest-overlay phone-quest">
        <div className="quest">
          <header className="quest-head">
            <div className="quest-title">
              <span className="tag">{puzzle ? tr('謎解き', 'Puzzle') : tr('依頼', 'Request')}</span> {quest.title}
            </div>
            <button className="btn ghost" onClick={onClose}>
              {tr('あきらめる', 'Give up')}
            </button>
          </header>
          <div className="quest-brief">
            <button className="brief-toggle" onClick={() => setBrief(!brief)}>
              <span>{puzzle ? tr('石版の 謎', 'Tablet Puzzle') : tr(`${quest.npc}の 依頼`, `Request from ${npcName(quest.npc)}`)}</span>
              <span className="muted">{brief ? tr('▲ とじる', '▲ Hide') : tr('▼ やることを 見る', '▼ Show the task')}</span>
            </button>
            {brief && (
              <ol>
                {quest.task.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            )}
            {brief && puzzle && <p className="muted">{tr('この石版に ヒントは ない。これまでに 覚えた スキルを 思い出そう。', 'This tablet offers no hints. Remember the skills you have learned so far.')}</p>}
            {quest.hints.slice(0, hints).map((h, i) => (
              <p key={i} className="hint">
                💡 {h}
              </p>
            ))}
          </div>
          {feedback && <div className="feedback">{feedback}</div>}
          {excel}
          <div className="quest-actions">
            {!puzzle && (
              <button className="btn" disabled={hints >= quest.hints.length} onClick={() => setHints(hints + 1)}>
                {hints < quest.hints.length ? tr(`💡 ヒント ${hints + 1}/${quest.hints.length}`, `💡 Hint ${hints + 1}/${quest.hints.length}`) : tr('ヒントは 全部', 'No more hints')}
              </button>
            )}
            <button className="btn primary" data-nosfx onClick={judge}>
              {tr('これで どうだ！', 'How about this!')}
            </button>
          </div>
        </div>
        {clearModal}
      </div>
    )

  return (
    <div className="quest-overlay">
      <div className="quest">
        <header className="quest-head">
          <div className="quest-title">
            <span className="tag">{quest.kind === 'puzzle' ? tr('謎解き', 'Puzzle') : tr('依頼', 'Request')}</span> {quest.title}
            {quest.kind !== 'puzzle' && <span className="from">― {npcName(quest.npc)}</span>}
          </div>
          <button className="btn ghost" onClick={onClose}>
            {tr('あきらめる', 'Give up')}
          </button>
        </header>
        <div className="quest-body">
          <aside className="quest-side">
            <div className="panel">
              <h3>{tr('やること', 'Task')}</h3>
              <ol>
                {quest.task.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </div>
            {puzzle ? (
              // ボスステージの謎解きは ヒントなし
              <div className="panel">
                <p className="muted">{tr('この石版に ヒントは ない。これまでに 覚えた スキルを 思い出そう。', 'This tablet offers no hints. Remember the skills you have learned so far.')}</p>
              </div>
            ) : (
            <div className="panel">
              <h3>{tr('ヒント', 'Hints')}</h3>
              {quest.hints.slice(0, hints).map((h, i) => (
                <p key={i} className="hint">
                  💡 {h}
                </p>
              ))}
              {hints < quest.hints.length ? (
                <button className="btn" onClick={() => setHints(hints + 1)}>
                  {tr(`ヒントを見る（${hints + 1}/${quest.hints.length}）`, `Show a hint (${hints + 1}/${quest.hints.length})`)}
                </button>
              ) : (
                <p className="muted">{tr('ヒントは これで全部だ。', "That's all the hints.")}</p>
              )}
            </div>
            )}
            <button className="btn primary" data-nosfx onClick={judge}>
              {tr('これで どうだ！（判定）', 'How about this! (Check)')}
            </button>
            {feedback && <div className="feedback">{feedback}</div>}
          </aside>
          <main className="quest-main">
            {excel}
            {!puzzle && (
            <div className="cheats">
              <span><kbd>Enter</kbd> {tr('確定', 'Confirm')}</span>
              <span><kbd>F2</kbd> {tr('編集', 'Edit')}</span>
              <span><kbd>Esc</kbd> {tr('取消', 'Cancel')}</span>
              <span><kbd>Ctrl/⌘+C</kbd><kbd>V</kbd> {tr('コピペ', 'Copy/Paste')}</span>
              <span><kbd>Ctrl/⌘+Z</kbd> {tr('戻す', 'Undo')}</span>
              <span><kbd>Ctrl/⌘+B</kbd> {tr('太字', 'Bold')}</span>
              <span>{tr('右下の■をドラッグでオートフィル', 'Drag the ■ at the bottom right to AutoFill')}</span>
            </div>
            )}
          </main>
        </div>
      </div>
      {clearModal}
    </div>
  )
}
