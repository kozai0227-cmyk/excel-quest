import { useEffect, useRef, useState } from 'react'
import { EQUIP, SLOTS, SLOT_ICONS, effectText, equipDesc, equipName, gearStats, slotName, type EquipDef, type Slot } from '../data/equipment'
import { tr } from '../game/lang'
import type { GameState } from '../game/types'

type Stat = 'atk' | 'def' | 'time'
const STATS: Stat[] = ['atk', 'def', 'time']
const STAT_ICON: Record<Stat, string> = { atk: '⚔️', def: '🛡️', time: '⏱️' }
const statName = (s: Stat) => (s === 'atk' ? tr('攻撃力', 'ATK') : s === 'def' ? tr('守備力', 'DEF') : tr('回答時間', 'Time'))
const statUnit = (s: Stat) => (s === 'time' ? tr('秒', 's') : '')
const shortName = (s: Stat) => (s === 'atk' ? tr('攻', 'ATK') : s === 'def' ? tr('守', 'DEF') : tr('時間', 'Time'))

/** a が b より 確実に 強い（どの 値も 下回らず、どれかが 上回る） */
function beats(a: EquipDef, b: EquipDef | undefined) {
  const v = (e: EquipDef | undefined, k: Stat | 'crit') => e?.[k] ?? 0
  const keys = [...STATS, 'crit'] as const
  return keys.every((k) => v(a, k) >= v(b, k)) && keys.some((k) => v(a, k) > v(b, k))
}

/** いまの 装備との ちがい（攻撃・守備・時間）。どちらにも 無い 値は 出さない */
function diffs(next: EquipDef | undefined, cur: EquipDef | undefined) {
  return STATS.filter((s) => next?.[s] || cur?.[s]).map((s) => ({ s, d: (next?.[s] ?? 0) - (cur?.[s] ?? 0) }))
}

/** 部位で 選べる もの（持っている 装備。何か 着けている ときは 最後に「はずす」） */
export function slotChoices(gs: GameState, slot: Slot): (string | null)[] {
  const mine = gs.gear.filter((id) => EQUIP[id]?.slot === slot)
  return gs.equip[slot] ? [...mine, null] : mine
}

interface Props {
  gs: GameState
  /** 部位を 選んでいる ときは その 部位（候補の 一覧を 出す） */
  slot: Slot | null
  /** カーソル（部位の 一覧なら 部位の 番号、候補なら 候補の 番号） */
  cur: number
  /** キー操作の ときだけ 金色の 枠 */
  ring: boolean
  /** 最後に そうびを 変えた 部位（その カードを ポンと はねさせる） */
  last: { slot: Slot; n: number } | null
  onSlot(i: number): void
  onEquip(slot: Slot, id: string | null): void
  onBack(): void
}

/**
 * そうび：上に 合計の 札（攻撃力・守備力・回答時間）、下に 部位の カード。
 * 部位を 押すと 持っている 装備を いまとの ちがい（▲▼）つきの カードで 並べ、押すと その場で そうびする
 */
export function EquipPanel({ gs, slot, cur, ring, last, onSlot, onEquip, onBack }: Props) {
  const gear = gearStats(gs)
  // 合計が 変わったら 札を 弾ませて「+2」を 浮かべる
  const prev = useRef(gear)
  const [bump, setBump] = useState<{ d: Partial<Record<Stat, number>>; n: number } | null>(null)
  useEffect(() => {
    const d: Partial<Record<Stat, number>> = {}
    for (const s of STATS) if (gear[s] !== prev.current[s]) d[s] = gear[s] - prev.current[s]
    prev.current = gear
    if (Object.keys(d).length) setBump({ d, n: Date.now() })
  }, [gear.atk, gear.def, gear.time]) // eslint-disable-line react-hooks/exhaustive-deps

  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ring) return
    listRef.current?.querySelector<HTMLElement>(`[data-i="${cur}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [cur, slot, ring])

  const owned = (s: Slot) => gs.gear.filter((id) => EQUIP[id]?.slot === s)

  return (
    <div className={`eqp ${ring ? 'ring' : ''}`}>
      <div className="eqp-stats" aria-label={tr('そうびの 合計', 'Gear totals')}>
        {STATS.map((s) => {
          const d = bump?.d[s]
          return (
            <span key={s} className={`eqp-stat s-${s} ${d ? (d > 0 ? 'up' : 'down') : ''}`}>
              <i aria-hidden="true">{STAT_ICON[s]}</i>
              <small>{statName(s)}</small>
              <b key={d ? bump!.n : 0}>
                +{gear[s]}
                {statUnit(s)}
              </b>
              {d ? (
                <em className="eqp-float" key={`f${bump!.n}`}>
                  {d > 0 ? `+${d}` : d}
                </em>
              ) : null}
            </span>
          )
        })}
        {gear.crit > 0 && <span className="eqp-crit">💥 {tr('一発決裁↑', 'Crit↑')}</span>}
      </div>

      {slot ? (
        <>
          <div className="eqp-head">
            <button type="button" className="eqp-back" data-nosfx aria-label={tr('もどる', 'Back')} onClick={onBack}>
              ‹
            </button>
            <span className="eqp-head-ico" aria-hidden="true">
              {SLOT_ICONS[slot]}
            </span>
            <b>{tr(`${slotName(slot)}を えらぶ`, `Choose a ${slotName(slot).toLowerCase()}`)}</b>
            <small>{tr(`もっている ${owned(slot).length}こ`, `${owned(slot).length} owned`)}</small>
          </div>
          <div className="eqp-list" ref={listRef} role="listbox">
            {slotChoices(gs, slot).map((id, i) => {
              const e = id ? EQUIP[id] : undefined
              const wearingId = gs.equip[slot]
              const ce = wearingId ? EQUIP[wearingId] : undefined
              const on = !!id && wearingId === id
              const ds = on ? [] : diffs(e, ce)
              return (
                <button
                  key={id ?? 'none'}
                  type="button"
                  data-i={i}
                  data-nosfx
                  role="option"
                  aria-selected={i === cur}
                  className={`eqp-card ${i === cur ? 'on' : ''} ${on ? 'wearing' : ''} ${id ? '' : 'remove'}`}
                  style={{ '--i': i } as React.CSSProperties}
                  onClick={() => onEquip(slot, id)}
                >
                  <span className="eqp-ico" aria-hidden="true">
                    {id ? SLOT_ICONS[slot] : '✕'}
                  </span>
                  <span className="eqp-main">
                    <span className="eqp-name">
                      {id ? equipName(id) : tr('はずす', 'Remove')}
                      {on && <span className="eqp-tag on">{tr('そうび中', 'Equipped')}</span>}
                      {!on && e && beats(e, ce) && <span className="eqp-tag up">{tr('つよい', 'Better')}</span>}
                    </span>
                    {(e || ds.length > 0) && (
                      <span className="eqp-fx">
                        {e && <span className="eqp-eff">{effectText(e)}</span>}
                        {ds.map(({ s, d }) => (
                          <span key={s} className={`eqp-diff ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>
                            {shortName(s)}
                            {d > 0 ? ` ▲${d}` : d < 0 ? ` ▼${-d}` : ' ±0'}
                          </span>
                        ))}
                      </span>
                    )}
                    {id && <span className="eqp-desc">{equipDesc(id)}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="eqp-slots" ref={listRef} role="listbox">
          {SLOTS.map((s, i) => {
            const id = gs.equip[s]
            const e = id ? EQUIP[id] : undefined
            const mine = owned(s)
            const better = mine.some((o) => o !== id && beats(EQUIP[o], e))
            return (
              <button
                key={s}
                type="button"
                data-i={i}
                data-nosfx
                role="option"
                aria-selected={i === cur}
                className={`eqp-card slot ${i === cur ? 'on' : ''} ${id ? '' : 'empty'} ${last?.slot === s ? `pop-${last.n % 2}` : ''}`}
                style={{ '--i': i } as React.CSSProperties}
                onClick={() => onSlot(i)}
              >
                <span className="eqp-ico" aria-hidden="true">
                  {SLOT_ICONS[s]}
                </span>
                <span className="eqp-main">
                  <small className="eqp-slot">{slotName(s)}</small>
                  <span className="eqp-name">{id ? equipName(id) : <span className="eqp-none">{tr('なし', 'None')}</span>}</span>
                  {(e || better) && (
                    <span className="eqp-fx">
                      {e && <span className="eqp-eff">{effectText(e)}</span>}
                      {better && <span className="eqp-tag up">▲ {tr('つよい そうびが ある', 'Better gear owned')}</span>}
                    </span>
                  )}
                </span>
                <span className="eqp-side" aria-hidden="true">
                  {mine.length > 1 && <small>{tr(`${mine.length}こ`, `${mine.length}`)}</small>}
                  <i>›</i>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
