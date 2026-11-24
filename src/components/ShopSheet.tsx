import { useEffect, useRef, useState } from 'react'
import { ITEMS, itemDesc, itemName } from '../data/items'
import { EQUIP, SLOT_ICONS, effectText, equipDesc, equipName, slotName } from '../data/equipment'
import { useKeys } from '../game/keys'
import { useInputMode } from '../game/inputMode'
import { jingle, sfx } from '../game/sound'
import { tr } from '../game/lang'
import type { GameState, ItemId } from '../game/types'
import { Portrait, type PortraitSrc } from './Portrait'

/** お店を 開く ときの 中身（App が 用意する） */
export interface ShopReq {
  kind: 'item' | 'gear'
  /** お店の 名前（見出し） */
  title: string
  /** 店主の 名前・顔 */
  keeper: string
  portrait?: PortraitSrc
  /** 最初の ひとこと */
  greet: string
  /** 売っている もの（どうぐ ID か 装備 ID） */
  stock: string[]
  close(): void
}

const ITEM_ICONS: Record<ItemId, string> = { herb: '🌿', scroll: '📜', sandglass: '⏳' }

/** 所持金の 表示：変わったら 前の 値から 数え上げ（下げ）る */
function useTween(value: number) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 420)
      const v = Math.round(a + (value - a) * (1 - (1 - k) ** 3))
      from.current = v
      setShown(v)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return shown
}

/**
 * お店：売り物を 絵・説明・効果・値段つきの カードで 並べ、下の 決まった 位置の ボタンで 買う。
 * 装備は いまの 装備との ちがい（↑↓）と「持っている／そうび中」を 見せ、買ったら その場で そうびできる
 */
export function ShopSheet({ req, gs, setGs }: { req: ShopReq; gs: GameState; setGs: (f: (g: GameState) => GameState) => void }) {
  const ids = req.stock
  const [cursor, setCursor] = useState(0)
  // キーボード・十字ボタンで 動かした ときだけ カーソル枠を 出す（指で 押す ときは じゃまに なる）
  const keyboard = useInputMode() === 'keyboard'
  const [keyed, setKeyed] = useState(false)
  const ring = keyboard || keyed
  const [say, setSay] = useState(req.greet)
  const [sayKey, setSayKey] = useState(0)
  // 買った カード（ポンと はねて「+1」）・足りない ときの ゆれ
  const [pop, setPop] = useState<{ i: number; n: number } | null>(null)
  const [shake, setShake] = useState(0)
  const [spent, setSpent] = useState<{ v: number; n: number } | null>(null)
  const gold = useTween(gs.gold)
  const listRef = useRef<HTMLDivElement>(null)
  const closing = useRef(false)

  const talk = (s: string) => {
    setSay(s)
    setSayKey((k) => k + 1)
  }

  useEffect(() => {
    if (!keyed && !keyboard) return
    listRef.current?.querySelector<HTMLElement>(`[data-i="${cursor}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [cursor]) // eslint-disable-line react-hooks/exhaustive-deps

  const id = ids[cursor]
  const price = req.kind === 'item' ? ITEMS[id as ItemId].price : EQUIP[id].price
  const slot = req.kind === 'gear' ? EQUIP[id].slot : undefined
  const owned = req.kind === 'gear' && gs.gear.includes(id)
  const wearing = slot ? gs.equip[slot] === id : false
  const short = Math.max(0, price - gs.gold)

  const close = () => {
    if (closing.current) return
    closing.current = true
    sfx('cancel')
    req.close()
  }

  const select = (i: number) => {
    if (i === cursor) return
    sfx('cursor')
    setCursor(i)
  }

  /** 下の ボタン：買う／そうびする */
  const act = () => {
    if (wearing) {
      sfx('cancel')
      return talk(tr('それは もう 身に つけているね。', "You've already got that one on."))
    }
    if (owned && slot) {
      sfx('select')
      setGs((g) => ({ ...g, equip: { ...g.equip, [slot]: id } }))
      setPop({ i: cursor, n: Date.now() })
      return talk(tr(`${equipName(id)}を そうびした！ よく にあってるよ。`, `Equipped the ${equipName(id)}! Looks good on you.`))
    }
    if (short > 0) {
      sfx('cancel')
      setShake((n) => n + 1)
      return talk(tr(`おっと、ゴールドが ${short}G 足りないみたいだ。`, `Whoops, you're ${short}G short.`))
    }
    sfx('coin')
    setSpent({ v: price, n: Date.now() })
    setPop({ i: cursor, n: Date.now() })
    if (req.kind === 'item') {
      const it = id as ItemId
      setGs((g) => ({ ...g, gold: g.gold - price, items: { ...g.items, [it]: g.items[it] + 1 } }))
      talk(tr(`${itemName(it)}だね。まいど あり！`, `One ${itemName(it)}. Thank you kindly!`))
    } else {
      setGs((g) => ({ ...g, gold: g.gold - price, gear: [...g.gear, id] }))
      jingle('item')
      talk(tr('まいど あり！ せっかくだ、いま 身に つけて いくかい？', 'Thank you kindly! Why not put it on right now?'))
    }
  }

  useKeys((k) => {
    if (k === 'up' || k === 'down') {
      sfx('cursor')
      setKeyed(true)
      const n = ids.length
      setCursor((c) => (c + (k === 'up' ? n - 1 : 1)) % n)
    } else if (k === 'ok') act()
    else if (k === 'cancel') close()
  })

  // 下の ボタンの 文と 見た目
  const btn = wearing
    ? { cls: 'done', label: tr('そうび中', 'Equipped') }
    : owned
      ? { cls: 'equip', label: tr('いま そうびする', 'Equip now') }
      : short > 0
        ? { cls: 'short', label: tr(`ゴールドが たりない（あと ${short}G）`, `Not enough gold (${short}G short)`) }
        : { cls: 'buy', label: tr(`${price}G で かう`, `Buy for ${price}G`) }

  return (
    <div className="shop-layer" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className={`win shop ${ring ? 'ring' : ''}`} role="dialog" aria-label={req.title}>
        <div className="shop-top">
          <h3 className="shop-title">{req.title}</h3>
          <span className={`shop-gold ${spent ? 'spent' : ''}`} key={spent?.n ?? 0} aria-label={tr(`所持金 ${gs.gold}ゴールド`, `Gold: ${gs.gold}`)}>
            <i aria-hidden="true">G</i>
            {gold}
            {spent && <b className="shop-minus">-{spent.v}</b>}
          </span>
          <button type="button" className="shop-x" aria-label={tr('とじる', 'Close')} onClick={close}>
            ×
          </button>
        </div>

        <div className="shop-keeper">
          {req.portrait && <Portrait src={req.portrait} className="portrait shop-face" />}
          <div className="shop-say" key={sayKey}>
            <span className="shop-keeper-name">{req.keeper}</span>
            {say}
          </div>
        </div>

        <div className="shop-list" ref={listRef} role="listbox">
          {ids.map((sid, i) => {
            const isItem = req.kind === 'item'
            const e = isItem ? undefined : EQUIP[sid]
            const p = isItem ? ITEMS[sid as ItemId].price : e!.price
            const has = !isItem && gs.gear.includes(sid)
            const on = e ? gs.equip[e.slot] === sid : false
            const cur = e ? gs.equip[e.slot] : undefined
            const ce = cur ? EQUIP[cur] : undefined
            // いまの 装備との ちがい（攻撃・守備）
            const diffs = e
              ? (['atk', 'def'] as const)
                  .filter((s) => e[s] || ce?.[s])
                  .map((s) => ({ s, d: (e[s] ?? 0) - (ce?.[s] ?? 0) }))
              : []
            const cls = ['shop-card', i === cursor ? 'on' : '', p > gs.gold && !has ? 'cant' : '', has ? 'has' : ''].join(' ')
            return (
              <div
                key={sid}
                data-i={i}
                role="option"
                aria-selected={i === cursor}
                className={cls}
                style={{ '--i': i } as React.CSSProperties}
                onClick={() => select(i)}
              >
                <span className="shop-ico" aria-hidden="true">
                  {isItem ? ITEM_ICONS[sid as ItemId] : SLOT_ICONS[e!.slot]}
                  {pop?.i === i && (
                    <b className="shop-plus" key={pop.n}>
                      {isItem || !on ? '+1' : '✓'}
                    </b>
                  )}
                </span>
                <span className="shop-main">
                  <span className="shop-name">
                    {isItem ? itemName(sid as ItemId) : equipName(sid)}
                    {e && <span className="shop-slot">{slotName(e.slot)}</span>}
                  </span>
                  <span className="shop-desc">{isItem ? itemDesc(sid as ItemId) : equipDesc(sid)}</span>
                  {e && (
                    <span className="shop-fx">
                      <span className="shop-eff">{effectText(e)}</span>
                      {!on &&
                        diffs.map(({ s, d }) => (
                          <span key={s} className={`shop-diff ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>
                            {s === 'atk' ? tr('攻', 'ATK') : tr('守', 'DEF')}
                            {d > 0 ? ` ▲${d}` : d < 0 ? ` ▼${-d}` : ' ±0'}
                          </span>
                        ))}
                    </span>
                  )}
                </span>
                <span className="shop-side">
                  {on ? (
                    <span className="shop-tag on">{tr('そうび中', 'Equipped')}</span>
                  ) : has ? (
                    <span className="shop-tag">{tr('持っている', 'Owned')}</span>
                  ) : (
                    <span className="shop-price">{p}G</span>
                  )}
                  {isItem && <span className="shop-own">{tr(`持ち ${gs.items[sid as ItemId]}`, `Have ${gs.items[sid as ItemId]}`)}</span>}
                </span>
              </div>
            )
          })}
        </div>

        <div className="shop-actions">
          <button type="button" className="shop-leave" onClick={close}>
            {tr('とじる', 'Close')}
          </button>
          <button
            type="button"
            key={`${btn.cls}-${shake}`}
            className={`shop-act ${btn.cls} ${shake && btn.cls === 'short' ? 'shake' : ''}`}
            aria-disabled={btn.cls === 'short' || btn.cls === 'done'}
            onClick={act}
          >
            {btn.label}
          </button>
        </div>
      </div>
    </div>
  )
}
