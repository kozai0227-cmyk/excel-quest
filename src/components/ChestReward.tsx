import { useEffect, useRef, useState } from 'react'
import { ITEM_IDS, itemDesc, itemName } from '../data/items'
import { EQUIP, SLOT_ICONS, effectText, equipDesc, equipName, slotName } from '../data/equipment'
import { useKeys } from '../game/keys'
import { useInputMode } from '../game/inputMode'
import { jingle, sfx } from '../game/sound'
import { tr } from '../game/lang'
import type { GameState, ItemId } from '../game/types'
import { SpriteView } from './SpriteView'
import { ITEM_ICONS } from './ItemPanel'
import { beats } from './EquipPanel'
import './ChestReward.css'

/** 宝箱の 中身（App が 開けた あとに 渡す） */
export interface ChestReq {
  item?: ItemId
  gold?: number
  equip?: string
  /** すでに 持っていた 装備を お金に かえた ときの 額 */
  dupGold?: number
  close(): void
}

const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** 0 から 数え上がる 数字 */
function useCountUp(to: number, start: boolean) {
  const [v, setV] = useState(start && calm() ? to : 0)
  useEffect(() => {
    if (!start) return
    if (calm()) return setV(to)
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700)
      setV(Math.round(to * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, start])
  return v
}

/**
 * 宝箱の ごほうび：箱が ゆれて ぱかっと 開き、光の すじの 中から 中身の カードが 出てくる。
 * どうぐは 持ち数、ゴールドは 数え上がる 額と 所持金、装備は 効果と「いま そうびする」ボタン
 */
export function ChestReward({ req, gs, setGs }: { req: ChestReq; gs: GameState; setGs: (f: (g: GameState) => GameState) => void }) {
  const [open, setOpen] = useState(calm())
  const [equipped, setEquipped] = useState(false)
  const keyboard = useInputMode() === 'keyboard'
  const [focus, setFocus] = useState(0)
  const closed = useRef(false)

  useEffect(() => {
    sfx('chest')
    const t = setTimeout(() => setOpen(true), calm() ? 0 : 650)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (open) jingle('item')
  }, [open])

  const eq = req.equip && !req.dupGold ? EQUIP[req.equip] : undefined
  const cur = eq ? gs.equip[eq.slot] : undefined
  const curDef = cur ? EQUIP[cur] : undefined
  // 何も 着けていないか、いまより 確実に 強い ときだけ「いま そうびする」を すすめる
  const canEquip = !!eq && !equipped && cur !== req.equip && (!curDef || beats(eq, curDef))
  const goldTotal = (req.gold ?? 0) + (req.dupGold ?? 0)
  const gold = useCountUp(goldTotal, open)

  const close = () => {
    if (closed.current) return
    closed.current = true
    sfx('cursor')
    req.close()
  }
  const doEquip = () => {
    if (!eq || !req.equip) return
    const id = req.equip
    setGs((g) => ({ ...g, equip: { ...g.equip, [eq.slot]: id } }))
    sfx('guard')
    setEquipped(true)
    setFocus(0)
  }
  const buttons = canEquip ? [doEquip, close] : [close]

  useKeys((k) => {
    if (!open) return
    if (k === 'left' || k === 'up') setFocus(0)
    else if ((k === 'right' || k === 'down') && buttons.length > 1) setFocus(1)
    else if (k === 'ok') buttons[Math.min(focus, buttons.length - 1)]()
    else if (k === 'cancel') close()
  })

  const cards: { key: string; ico: string; name: string; desc: string; tags: string[]; badge?: string; tone: string }[] = []
  if (req.item)
    cards.push({
      key: 'item',
      ico: ITEM_ICONS[req.item],
      name: itemName(req.item),
      desc: itemDesc(req.item),
      tags: [tr(`もちもの ×${gs.items[req.item]}`, `In bag ×${gs.items[req.item]}`)],
      badge: '+1',
      tone: 'item',
    })
  if (req.equip) {
    const e = EQUIP[req.equip]
    cards.push({
      key: 'equip',
      ico: SLOT_ICONS[e.slot],
      name: equipName(req.equip),
      desc: req.dupGold
        ? tr(`もう 持っていたので ${req.dupGold}ゴールドに かえた`, `You already had one, so you traded it for ${req.dupGold} gold`)
        : equipDesc(req.equip),
      tags: [slotName(e.slot), ...effectText(e).split(' ').filter(Boolean)],
      badge: req.dupGold ? undefined : 'NEW',
      tone: req.dupGold ? 'dup' : 'equip',
    })
  }
  const bagTotal = ITEM_IDS.reduce((n, id) => n + gs.items[id], 0)

  return (
    <div className={`chr-layer ${open ? 'open' : ''}`} role="dialog" aria-label={tr('宝箱', 'Treasure chest')} onClick={(e) => e.target === e.currentTarget && open && close()}>
      <div className="chr-card">
        <div className="chr-stage" aria-hidden="true">
          <div className="chr-rays" />
          <div className="chr-glow" />
          <div className="chr-box">
            <SpriteView creature={open ? 'chestOpen' : 'chest'} />
          </div>
          {open && (
            <span className="chr-pop">
              {req.item ? ITEM_ICONS[req.item] : req.equip && !req.dupGold ? SLOT_ICONS[EQUIP[req.equip].slot] : '💰'}
            </span>
          )}
          {open && (
            <div className="chr-sparks">
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} style={{ ['--a' as string]: `${i * 36}deg`, ['--d' as string]: `${(i % 3) * 0.06}s` }} />
              ))}
            </div>
          )}
        </div>

        <div className="chr-body">
          <span className="chr-tag">✦ {tr('たからばこ', 'TREASURE')}</span>
          <h3>{open ? tr(`${gs.name}は 宝箱を 開けた！`, `${gs.name} opened the chest!`) : tr('……ガタガタッ！', '...Rattle rattle!')}</h3>

          {open && (
            <div className="chr-list">
              {cards.map((c, i) => (
                <div key={c.key} className={`chr-item ${c.tone} ${c.key === 'equip' && equipped ? 'done' : ''}`} style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
                  <span className="chr-ico">{c.ico}</span>
                  <div className="chr-main">
                    <b>{c.name}</b>
                    <small>{c.desc}</small>
                    <div className="chr-tags">
                      {c.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                      {c.key === 'equip' && equipped && <span className="on">✓ {tr('そうび中', 'Equipped')}</span>}
                    </div>
                  </div>
                  {c.badge && <em className="chr-badge">{c.badge}</em>}
                </div>
              ))}
              {goldTotal > 0 && (
                <div className="chr-item gold" style={{ animationDelay: `${0.1 + cards.length * 0.12}s` }}>
                  <span className="chr-ico">💰</span>
                  <div className="chr-main">
                    <b className="chr-gold">
                      +{gold}
                      <span>G</span>
                    </b>
                    <small>{tr(`所持金 ${gs.gold}G`, `Gold: ${gs.gold}G`)}</small>
                  </div>
                </div>
              )}
              {req.item && <p className="chr-note">🎒 {tr(`メニューの「どうぐ」で 使える（ぜんぶで ${bagTotal}こ）`, `Use it from "Items" in the menu (${bagTotal} total)`)}</p>}
              {eq && !canEquip && !equipped && <p className="chr-note">🛡️ {tr('メニューの「そうび」で 着けかえられる', 'Change gear from "Equip" in the menu')}</p>}
              {canEquip && curDef && (
                <p className="chr-note up">▲ {tr(`いまの ${equipName(cur!)} より つよい！`, `Stronger than your ${equipName(cur!)}!`)}</p>
              )}
            </div>
          )}

          <div className={`chr-btns ${open ? '' : 'wait'} ${keyboard ? 'ring' : ''}`}>
            {canEquip ? (
              <>
                <button className={`chr-btn main ${focus === 0 ? 'f' : ''}`} onClick={doEquip} disabled={!open}>
                  {tr('いま そうびする', 'Equip now')}
                </button>
                <button className={`chr-btn sub ${focus === 1 ? 'f' : ''}`} onClick={close} disabled={!open}>
                  {tr('あとで', 'Later')}
                </button>
              </>
            ) : (
              <button className="chr-btn main f" onClick={close} disabled={!open}>
                {equipped ? tr('つづける', 'Continue') : tr('やった！', 'Nice!')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
