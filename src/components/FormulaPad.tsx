import type { ReactNode } from 'react'
import type { ChipGroup } from '../game/formulaTokens'

export interface PadAction {
  label: ReactNode
  onClick(): void
  kind?: 'main' | 'sub'
  disabled?: boolean
}

interface Props {
  groups: ChipGroup[]
  onChip(t: string): void
  actions: PadAction[]
}

/** スマホ用：数式を ボタンで 組み立てる パッド */
export function FormulaPad({ groups, onChip, actions }: Props) {
  // タップしても 入力欄の フォーカスを うばわない
  const keep = (e: React.PointerEvent) => e.preventDefault()
  return (
    <div className="fpad">
      <div className="fpad-groups">
        {groups.map((g) => (
          <div key={g.label} className={`fpad-group ${g.keypad ? 'keypad' : ''}`}>
            <span className="fpad-label">{g.label}</span>
            <div className="fpad-chips">
              {g.chips.map((t) => (
                <button key={t} type="button" className="chip" onPointerDown={keep} onClick={() => onChip(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="fpad-actions">
        {actions.map((a, i) => (
          <button key={i} type="button" className={`chip act ${a.kind ?? ''}`} disabled={a.disabled} onPointerDown={keep} onClick={a.onClick}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
