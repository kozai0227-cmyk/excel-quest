import { useState } from 'react'
import type { Question } from '../data/bosses'
import { colName, parseAddr, toggleAbsAt } from '../game/formula'
import { battlePad, learnedFuncs, pickRef, toggleLastRef } from '../game/formulaTokens'
import { tableSize } from '../game/judge'
import { FormulaPad } from './FormulaPad'
import { useCellPick } from './useCellPick'

interface Props {
  q: Extract<Question, { type: 'formula' }>
  /** おぼえた スキル（ボタンの 関数の ひっかけに 使う） */
  skills: string[]
  /** ボタンで 入力する（スマホ） */
  touch: boolean
  /** 決定ボタンの 文字 */
  label: string
  /** ヘルプのまきもの：数式の 形を 見せる */
  showHint?: boolean
  /** 入力した 数式（= から） */
  onSubmit(input: string): void
}

/** 数式の 問題：表を 見て、答えの セルに 入れる 数式を 作る（問題ごとに key を 変えて 使う） */
export function FormulaQuestion({ q, skills, touch, label, showHint, onSubmit }: Props) {
  const [formula, setFormula] = useState('=')
  /** スマホ：押した ボタン（= は 最初から 入っている） */
  const [chips, setChips] = useState<string[]>([])
  const target = parseAddr(q.target)
  const copyCells = (q.copies ?? []).map((cp) => parseAddr(cp.at))
  const { rows, cols } = tableSize(q)
  /** スマホ：この問題で 選べる 数式ボタン */
  const [pad] = useState(() => battlePad(q.hint, rows, cols, q.target, learnedFuncs(skills)))

  // 表を タップ・ドラッグして セル・範囲を 数式に 入れる（直前が 参照なら 置きかえ）
  const cellPick = useCellPick((ref) => {
    if (ref === q.target) return
    if (touch) setChips((c) => pickRef(c, ref))
    else setFormula((f) => f.replace(/\$?[A-Z]{1,3}\$?\d+(:\$?[A-Z]{1,3}\$?\d+)?$/, '') + ref)
  })

  return (
    <div className="q-formula">
      <table ref={cellPick.ref} className="mini-table picking" {...cellPick.handlers}>
        <thead>
          <tr>
            <th />
            {Array.from({ length: cols }, (_, c) => (
              <th key={c}>{colName(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              <th>{r + 1}</th>
              {Array.from({ length: cols }, (_, c) => {
                const isT = r === target.r && c === target.c
                const isCopy = copyCells.some((p) => p.r === r && p.c === c)
                const a = `${colName(c)}${r + 1}`
                return (
                  <td key={c} data-a={a} className={`${isT ? 'target' : isCopy ? 'copy' : ''} ${cellPick.selecting.has(a) ? 'selecting' : ''}`}>
                    {isT ? '？' : isCopy ? '⇩' : (q.table[r]?.[c] ?? '')}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(touch ? '=' + chips.join('') : formula)
        }}
      >
        {touch ? (
          <>
            <div className="fpad-formula">
              <span className="fpad-target">{q.target}</span>
              <span className="fpad-text">
                ={chips.join('')}
                {!chips.length && <span className="fpad-ph">ボタンか、表を タップ（長押しで 範囲）</span>}
              </span>
            </div>
            <FormulaPad
              groups={pad}
              onChip={(t) => setChips((c) => [...c, t])}
              actions={[
                { label: 'F4 ($)', onClick: () => setChips(toggleLastRef) },
                { label: '⌫', onClick: () => setChips((c) => c.slice(0, -1)) },
                { label: 'クリア', onClick: () => setChips([]) },
              ]}
            />
          </>
        ) : (
          <label>
            {q.target} ＝{' '}
            <input
              autoFocus
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'F4') return
                // F4 で カーソル位置の参照に「$」を付け外し
                e.preventDefault()
                const el = e.currentTarget
                const t = toggleAbsAt(el.value, el.selectionStart ?? el.value.length)
                if (t) {
                  el.value = t.text
                  el.setSelectionRange(t.caret, t.caret)
                  setFormula(t.text)
                  requestAnimationFrame(() => el.setSelectionRange(t.caret, t.caret))
                }
              }}
              spellCheck={false}
              autoComplete="off"
            />
          </label>
        )}
        <button className="btn primary" data-nosfx>
          {label}
        </button>
        {q.copies && <div className="copy-note">⇩ の セルにも この数式を コピーして 確かめるぞ！（F4 で $ 切替）</div>}
        {showHint && <div className="hint">📜 ヒント：{q.hint.replace(/\(.*\)/, '(…)')}</div>}
      </form>
    </div>
  )
}
