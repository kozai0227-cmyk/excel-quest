import { useMemo, useRef, useState } from 'react'
import { MiniExcel } from './MiniExcel'
import { makeCtx, type QuestDef } from '../data/quests'
import { tr } from '../game/lang'
import { npcName } from '../data/en'
import { parseAddr, type Grid, type Value } from '../game/formula'
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
  /** まちがえた 回数（判定ボタンの ゆれ・知らせの 出直しに 使う） */
  const [tries, setTries] = useState(0)
  /** 知らせに 出てくる セル（表の 中で 赤い 枠で 示す） */
  const [spot, setSpot] = useState<{ r: number; c: number; n: number } | null>(null)
  const [cleared, setCleared] = useState(false)
  // 依頼の 途中で 画面を 回しても 表が 消えないよう、レイアウトは 開いたときに 決める
  const [phone] = useState(isPhoneLayout)
  const puzzle = quest.kind === 'puzzle'
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
      setTries(tries + 1)
      // 知らせの 最初の セル番地（B3 など）へ 案内する
      const m = /(?<![A-Za-z])([A-Z]{1,2}\d{1,3})(?![\d:A-Za-z])/.exec(res)
      if (m) {
        const { r, c } = parseAddr(m[1])
        setSpot({ r, c, n: tries + 1 })
      } else setSpot(null)
    }
  }
  const showHint = () => {
    sfx('blip')
    setHints(hints + 1)
  }
  const spotName = spot && /(?<![A-Za-z])([A-Z]{1,2}\d{1,3})(?![\d:A-Za-z])/.exec(feedback ?? '')?.[1]
  const canHint = !puzzle && hints < quest.hints.length
  /** まちがいの 知らせ（まちがえる たびに ポンと 出直す。2回 まちがえたら ヒントを すすめる） */
  const fbCard = feedback && (
    <div key={tries} className="qs-fb" role="alert">
      <span className="qs-fb-badge" aria-hidden="true">✕</span>
      <div className="qs-fb-body">
        <b className="qs-fb-title">{tries >= 3 ? tr('あきらめないで！', "Don't give up!") : tries === 2 ? tr('もう一息！', 'Almost there!') : tr('おしい！', 'Not quite!')}</b>
        <p>{feedback}</p>
        {spotName && <span className="qs-fb-cell">📍 {tr(`${spotName} を 見てみよう`, `Take a look at ${spotName}`)}</span>}
        {tries >= 2 && canHint && (
          <button className="qs-fb-hint" onClick={showHint}>
            💡 {tr('ヒントを 見てみる？', 'Want a hint?')}
          </button>
        )}
      </div>
    </div>
  )

  const excel = <MiniExcel initial={initial} initialHistory={history} colWidths={quest.colWidths} onChange={onChange} spot={spot} />
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
          {fbCard}
          {excel}
          <div className="quest-actions">
            {!puzzle && (
              <button className="btn" disabled={hints >= quest.hints.length} onClick={showHint}>
                {hints < quest.hints.length ? tr(`💡 ヒント ${hints + 1}/${quest.hints.length}`, `💡 Hint ${hints + 1}/${quest.hints.length}`) : tr('ヒントは 全部', 'No more hints')}
              </button>
            )}
            <button key={`j${tries}`} className={`btn primary qs-judge${tries ? ' shake' : ''}`} data-nosfx onClick={judge}>
              {tr('これで どうだ！', 'How about this!')}
            </button>
          </div>
        </div>
        {clearModal}
      </div>
    )

  return (
    <div className="quest-overlay qs-desk">
      <div className="quest">
        <header className="quest-head">
          <div className="quest-title">
            <span className={`tag${puzzle ? ' puzzle' : ''}`}>{puzzle ? tr('🔓 謎解き', '🔓 Puzzle') : tr('📜 依頼', '📜 Request')}</span>
            <span className="qs-name">{quest.title}</span>
            {!puzzle && <span className="from">{tr(`${quest.npc}より`, `from ${npcName(quest.npc)}`)}</span>}
          </div>
          <button className="qs-giveup" onClick={onClose}>
            {tr('あきらめる', 'Give up')}
          </button>
        </header>
        <div className="quest-body">
          <aside className="quest-side">
            <section className="qs-card">
              <h3>
                <span aria-hidden="true">🎯</span> {tr('やること', 'Task')}
              </h3>
              <ol className="qs-task">
                {quest.task.map((t, i) => (
                  <li key={t} style={{ animationDelay: `${0.08 + i * 0.07}s` }}>
                    <span className="qs-num" aria-hidden="true">{i + 1}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </section>
            {puzzle ? (
              // ボスステージの謎解きは ヒントなし
              <section className="qs-card qs-nohints">
                <p className="muted">🗿 {tr('この石版に ヒントは ない。これまでに 覚えた スキルを 思い出そう。', 'This tablet offers no hints. Remember the skills you have learned so far.')}</p>
              </section>
            ) : (
              <section className="qs-card">
                <h3>
                  <span aria-hidden="true">💡</span> {tr('ヒント', 'Hints')}
                  <span className="qs-dots" aria-label={tr(`${hints}/${quest.hints.length} 使用`, `${hints}/${quest.hints.length} used`)}>
                    {quest.hints.map((_, i) => (
                      <i key={i} className={i < hints ? 'on' : ''} />
                    ))}
                  </span>
                </h3>
                {quest.hints.slice(0, hints).map((h, i) => (
                  <p key={i} className="qs-hint">
                    <span className="qs-hint-no">{i + 1}</span>
                    {h}
                  </p>
                ))}
                {hints === 0 && <p className="qs-star">★ {tr('ヒントなしで クリアを めざそう', 'Try to clear it without hints')}</p>}
                {canHint ? (
                  <button className="qs-hint-btn" onClick={showHint}>
                    {hints === 0 ? tr('ヒントを 見る', 'Show a hint') : tr('つぎの ヒント', 'Next hint')}
                    <span className="qs-hint-left">
                      {hints + 1}/{quest.hints.length}
                    </span>
                  </button>
                ) : (
                  <p className="muted">{tr('ヒントは これで全部だ。', "That's all the hints.")}</p>
                )}
              </section>
            )}
            <div className="qs-actions">
              {fbCard}
              <button key={`j${tries}`} className={`qs-judge${tries ? ' shake' : ''}`} data-nosfx onClick={judge}>
                {tr('これで どうだ！', 'How about this!')}
                <small>{tr('表を 判定する', 'Check the sheet')}</small>
              </button>
            </div>
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
