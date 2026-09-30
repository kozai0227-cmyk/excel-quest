import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { makeCtx, type QuestDef } from '../data/quests'
import { SKILLS } from '../data/skills'
import { ITEMS } from '../data/items'
import { addr, colName, evaluate, formatValue, parseAddr, type Grid, type Value } from '../game/formula'
import { guideChips, rangeCells, stepCells, toggleLastRef, tryFormula, type GuideStep, type TryResult } from '../game/guide'
import { FormulaPad } from './FormulaPad'

interface Props {
  quest: QuestDef
  steps: GuideStep[]
  onClear(hintsUsed: number): void
  onClose(): void
}

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)

/** 2つの 表で 中身が 変わった セル */
function diffCells(a: Grid, b: Grid): string[] {
  const out: string[] = []
  b.forEach((row, r) => row.forEach((cell, c) => (a[r]?.[c]?.raw !== cell.raw || !!a[r]?.[c]?.bold !== !!cell.bold) && out.push(addr(r, c))))
  return out
}

/**
 * スマホ用の 依頼画面（ステップ式）。
 * 表は 見るだけ（タップで 数式を のぞける）。答えは 選択肢か、数式ボタンで 組み立てる。
 */
export function GuidedQuest({ quest, steps, onClear, onClose }: Props) {
  const history = useMemo(() => quest.history?.() ?? [], [quest])
  const [grid, setGrid] = useState<Grid>(() => quest.grid())
  const actions = useRef(new Set<string>())
  const [i, setI] = useState(0)
  const step = steps[i]
  const puzzle = quest.kind === 'puzzle'
  const last = i === steps.length - 1

  const [solved, setSolved] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [trial, setTrial] = useState<TryResult | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [hintOpen, setHintOpen] = useState(false)
  const [hints, setHints] = useState(0)
  // やることは ステップの 問題文で 伝わるので、最初は 閉じて 表を 広く 見せる
  const [brief, setBrief] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const [changed, setChanged] = useState<{ cells: string[]; key: number }>({ cells: [], key: 0 })
  const [cleared, setCleared] = useState(false)

  const focusOf = (s: GuideStep) => (s.kind === 'formula' ? s.target : s.focus?.split(':')[0]) ?? null
  const [inspect, setInspect] = useState<string | null>(() => focusOf(steps[0]))

  const order = useMemo(() => (step.kind === 'choice' ? shuffle([step.answer, ...step.wrong]) : []), [step])
  const groups = useMemo(
    () => (step.kind === 'formula' ? guideChips(step, grid.length, grid[0].length, quest.town) : []),
    [step], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const shown = trial?.grid ?? grid
  const values = useMemo(() => trial?.values ?? evaluate(shown), [shown, trial])

  const markChanged = (cells: string[]) => setChanged((c) => ({ cells, key: c.key + 1 }))

  const choose = (c: string) => {
    if (step.kind !== 'choice' || solved || picked.includes(c)) return
    if (c !== step.answer) {
      setPicked([...picked, c])
      setMsg(puzzle ? '……石版は 反応しない。' : 'ちがうようだ……。もう一度 考えてみよう。')
      return
    }
    const next = step.apply ? step.apply(grid, history) : grid
    markChanged(diffCells(grid, next))
    setGrid(next)
    step.actions?.forEach((a) => actions.current.add(a))
    setSolved(true)
    setMsg(null)
  }

  const editChips = (next: string[]) => {
    setChips(next)
    setTrial(null)
    setMsg(null)
  }

  const submit = () => {
    if (step.kind !== 'formula' || !chips.length) return
    const r = tryFormula(grid, step, chips.join(''), puzzle)
    if (r.msg) {
      setTrial(r)
      setMsg(r.msg)
      if (r.wrong[0]) setInspect(r.wrong[0])
      return
    }
    setGrid(r.grid)
    setTrial(null)
    markChanged(stepCells(step))
    if (step.fill) actions.current.add('fill')
    setInspect(step.target)
    setSolved(true)
    setMsg(null)
  }

  const next = () => {
    if (last) {
      // 念のため 元の 依頼の 判定でも 確かめる
      const res = quest.check(makeCtx(grid, evaluate(grid), actions.current))
      if (res === null) setCleared(true)
      else setMsg(res)
      return
    }
    const s = steps[i + 1]
    setI(i + 1)
    setSolved(false)
    setPicked([])
    setChips([])
    setTrial(null)
    setMsg(null)
    setHintOpen(false)
    setInspect(focusOf(s))
    card.current?.scrollTo({ top: 0 })
  }

  // 表の 目立たせる 場所
  const focus = new Set(step.kind === 'formula' ? [step.target] : step.focus ? rangeCells(step.focus) : [])
  const fillArea = new Set(step.kind === 'formula' && step.fill ? rangeCells(step.fill) : [])
  const wrong = new Set(trial?.wrong ?? [])

  const reward = quest.reward
  const fillEnd = step.kind === 'formula' && step.fill ? step.fill.split(':')[1] : null

  return (
    <div className="quest-overlay guided">
      <div className="quest">
        <header className="quest-head">
          <div className="quest-title">
            <span className="tag">{puzzle ? '謎解き' : '依頼'}</span> {quest.title}
          </div>
          <button className="btn ghost" onClick={onClose}>
            あきらめる
          </button>
        </header>
        <div className="quest-brief">
          <button className="brief-toggle" onClick={() => setBrief(!brief)}>
            <span>{puzzle ? '石版の 謎' : `${quest.npc}の 依頼`}</span>
            <span className="muted">{brief ? '▲ とじる' : '▼ やることを 見る'}</span>
          </button>
          {brief && (
            <ol>
              {quest.task.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          )}
        </div>

        <Sheet
          grid={shown}
          values={values}
          colWidths={quest.colWidths}
          focus={focus}
          fillArea={fillArea}
          wrong={wrong}
          changed={changed}
          inspect={inspect}
          onInspect={setInspect}
        />

        <div ref={card} className={`guide-card ${solved ? 'solved' : ''}`}>
          <div className="guide-head">
            <span className="guide-no">
              {puzzle ? '謎' : 'ステップ'} {i + 1} / {steps.length}
            </span>
            {!puzzle && step.hint && !solved && (
              <button
                className="guide-hint-btn"
                onClick={() => {
                  if (!hintOpen) setHints((h) => h + 1)
                  setHintOpen(!hintOpen)
                }}
              >
                💡 ヒント
              </button>
            )}
          </div>
          <p className="guide-q">{step.q}</p>
          {hintOpen && !solved && <p className="hint">💡 {step.hint}</p>}
          {msg && <div className="feedback">{msg}</div>}

          {step.kind === 'choice' ? (
            <div className="guide-choices">
              {order.map((c) => (
                <button
                  key={c}
                  className={`guide-choice ${picked.includes(c) ? 'no' : ''} ${solved && c === step.answer ? 'yes' : ''}`}
                  disabled={solved || picked.includes(c)}
                  onClick={() => choose(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="fpad-formula">
                <span className="fpad-target">{step.target}</span>
                <span className={`fpad-text ${chips.length ? '' : 'empty'}`}>{chips.length ? chips.join('') : 'ボタンで 数式を 組み立てよう'}</span>
              </div>
              {!solved && (
                <>
                  <FormulaPad
                    groups={groups}
                    onChip={(t) => editChips([...chips, t])}
                    actions={[
                      { label: 'F4 ($)', onClick: () => editChips(toggleLastRef(chips)) },
                      { label: '⌫', onClick: () => editChips(chips.slice(0, -1)) },
                      { label: 'クリア', onClick: () => editChips([]) },
                    ]}
                  />
                  <button className="btn primary guide-go" disabled={!chips.length || !!trial} onClick={submit}>
                    {fillEnd ? `${step.target} に 入れて、${fillEnd} まで オートフィル` : `${step.target} に 入れる`}
                  </button>
                </>
              )}
            </>
          )}

          {solved && (
            <>
              <div className="guide-explain">⭕ {step.explain}</div>
              <button className="btn primary guide-go" onClick={next}>
                {last ? 'これで どうだ！' : 'つぎへ ▶'}
              </button>
            </>
          )}
        </div>
      </div>

      {cleared && (
        <div className="clear-modal">
          <div className="win clear-win">
            <div className="clear-title">{puzzle ? '★ 謎を 解いた！ ★' : '★ 悩みを 解決した！ ★'}</div>
            <p>{puzzle ? `「${quest.title}」の 石版が 光った` : `${quest.npc}の「${quest.title}」`}</p>
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

// ---------------------------------------------------------------- 表（見るだけ。タップで 数式を のぞける）
interface SheetProps {
  grid: Grid
  values: Value[][]
  colWidths?: number[]
  focus: Set<string>
  fillArea: Set<string>
  wrong: Set<string>
  changed: { cells: string[]; key: number }
  inspect: string | null
  onInspect(a: string): void
}

function Sheet({ grid, values, colWidths, focus, fillArea, wrong, changed, inspect, onInspect }: SheetProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const cols = grid[0].length
  const widths = Array.from({ length: cols }, (_, c) => Math.round((colWidths?.[c] ?? 80) * 0.9))
  const flash = new Set(changed.cells)

  // 目立たせる セルが 見えるように スクロール
  const target = [...focus][0] ?? inspect
  useEffect(() => {
    if (!target) return
    scroller.current?.querySelector(`[data-a="${target}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [target])

  const raw = inspect ? (() => {
    const { r, c } = parseAddr(inspect)
    return grid[r]?.[c]?.raw ?? ''
  })() : ''
  let bar: ReactNode = raw
  if (raw.startsWith('=')) bar = <span className="gs-formula">{raw}</span>

  return (
    <div className="gsheet">
      <div className="gs-bar">
        <span className="gs-name">{inspect ?? ''}</span>
        <span className="gs-fx">fx</span>
        <span className="gs-raw">{bar}</span>
      </div>
      <div className="gs-scroll" ref={scroller}>
        <table className="gs-table" style={{ width: 30 + widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>
            <col style={{ width: 30 }} />
            {widths.map((w, c) => (
              <col key={c} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th />
              {widths.map((_, c) => (
                <th key={c}>{colName(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, r) => (
              <tr key={r}>
                <th>{r + 1}</th>
                {row.map((cell, c) => {
                  const a = addr(r, c)
                  const v = values[r]?.[c] ?? null
                  const cls = [
                    typeof v === 'number' ? 'num' : '',
                    typeof v === 'object' && v !== null ? 'err' : '',
                    cell.bold ? 'bold' : '',
                    focus.has(a) ? 'focus' : fillArea.has(a) ? 'area' : '',
                    wrong.has(a) ? 'wrong' : '',
                    a === inspect ? 'inspect' : '',
                  ].join(' ')
                  return (
                    <td key={flash.has(a) ? `${c}-${changed.key}` : c} data-a={a} className={`${cls} ${flash.has(a) ? 'gs-new' : ''}`} onClick={() => onInspect(a)}>
                      {formatValue(v)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
