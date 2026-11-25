import { useEffect, useRef } from 'react'
import { ITEM_IDS, itemDesc, itemName } from '../data/items'
import { maxHp } from '../game/progress'
import { tr } from '../game/lang'
import type { GameState, ItemId } from '../game/types'
import './ItemPanel.css'

export const ITEM_ICONS: Record<ItemId, string> = { herb: '🌿', scroll: '📜', sandglass: '⏳' }

/** 使った ときの 手ごたえ（回復した 量・使えなかった 理由） */
export interface ItemFx {
  id: ItemId
  kind: 'heal' | 'full' | 'battle' | 'none'
  heal?: number
  n: number
}

interface Props {
  gs: GameState
  cur: number
  /** キー操作の ときだけ 金色の 枠 */
  ring: boolean
  fx: ItemFx | null
  onUse(i: number): void
}

/**
 * どうぐ：上に HP カード（やくそうを 使うと バーが のびて「+30」が 浮かぶ）、
 * 下に どうぐの カード（絵・名前・持ち数・説明・どこで 使えるか）。
 * フィールドで 使える ものは 右の「つかう」で その場で 使い、戦闘用は 案内だけ 出す
 */
export function ItemPanel({ gs, cur, ring, fx, onUse }: Props) {
  const hpMax = maxHp(gs.level)
  const rate = Math.min(1, gs.hp / hpMax)
  const full = gs.hp >= hpMax
  const healed = fx?.kind === 'heal'
  const total = ITEM_IDS.reduce((n, id) => n + gs.items[id], 0)

  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ring) return
    listRef.current?.querySelector<HTMLElement>(`[data-i="${cur}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [cur, ring])

  return (
    <div className={`itp ${ring ? 'ring' : ''}`}>
      <div className={`itp-hp ${healed ? `glow-${fx!.n % 2}` : ''} ${rate <= 0.3 ? 'low' : ''}`} aria-label={tr('いまの HP', 'Current HP')}>
        <span className="itp-hp-ico" aria-hidden="true">
          ❤️
        </span>
        <div className="itp-hp-main">
          <div className="itp-hp-top">
            <small>HP</small>
            <b key={healed ? fx!.n : 0} className={healed ? 'bump' : ''}>
              {gs.hp}
              <span>/{hpMax}</span>
            </b>
          </div>
          <div className="itp-bar">
            <div style={{ width: `${rate * 100}%` }} />
          </div>
          <small className="itp-hp-note">
            {full ? tr('✓ まんたん', '✓ Full') : tr(`あと ${hpMax - gs.hp} で まんたん`, `${hpMax - gs.hp} to full`)}
          </small>
        </div>
        {healed && (
          <em className="itp-float" key={`f${fx!.n}`}>
            +{fx!.heal}
          </em>
        )}
      </div>

      <div className="itp-head">
        <b>🎒 {tr('もちもの', 'Your bag')}</b>
        <small>{tr(`ぜんぶで ${total}こ`, `${total} total`)}</small>
      </div>

      <div className="itp-list" ref={listRef} role="listbox">
        {ITEM_IDS.map((id, i) => {
          const n = gs.items[id]
          const field = id === 'herb'
          const mine = fx?.id === id ? fx : null
          const canUse = field && n > 0 && !full
          return (
            <div
              key={id}
              data-i={i}
              role="option"
              aria-selected={i === cur}
              className={`itp-card ${i === cur ? 'on' : ''} ${n ? '' : 'empty'} ${mine ? (mine.kind === 'heal' ? `pop-${mine.n % 2}` : `shake-${mine.n % 2}`) : ''}`}
              style={{ '--i': i } as React.CSSProperties}
              onClick={() => onUse(i)}
            >
              <span className="itp-ico" aria-hidden="true">
                {ITEM_ICONS[id]}
                {mine?.kind === 'heal' && <i className="itp-minus" key={mine.n}>-1</i>}
              </span>
              <span className="itp-main">
                <span className="itp-name">
                  {itemName(id)}
                  <span className={`itp-count ${n ? '' : 'zero'}`} key={mine?.kind === 'heal' ? mine.n : 0}>
                    ×{n}
                  </span>
                </span>
                <span className="itp-desc">{itemDesc(id)}</span>
                <span className="itp-tags">
                  {field ? <span className="itp-tag t-field">🗺️ {tr('いま つかえる', 'Use now')}</span> : <span className="itp-tag t-battle">⚔️ {tr('戦闘で つかう', 'Battle only')}</span>}
                  {!n && <span className="itp-tag t-shop">🏪 {tr('道具屋で 買える', 'Sold at item shops')}</span>}
                </span>
              </span>
              {field && n > 0 && (
                <button
                  type="button"
                  data-nosfx
                  className={`itp-use ${canUse ? '' : 'off'}`}
                  aria-label={tr(`${itemName(id)}を つかう`, `Use ${itemName(id)}`)}
                  onClick={(e) => {
                    e.stopPropagation()
                    onUse(i)
                  }}
                >
                  {full ? tr('まんたん', 'Full') : tr('つかう', 'Use')}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
