import { useEffect, useRef, useState } from 'react'
import { useKeys } from '../game/keys'
import { jingle, sfx } from '../game/sound'
import { tr } from '../game/lang'
import { maxHp } from '../game/progress'
import type { GameState } from '../game/types'
import { Portrait, type PortraitSrc } from './Portrait'
import { reduceMotion } from './QuestClear'
import './InnSheet.css'

/** 宿屋を 開く ときの 中身（App が 用意する） */
export interface InnReq {
  /** 町の 名前（見出し） */
  title: string
  keeper: string
  portrait?: PortraitSrc
  price: number
  close(): void
}

/** 数字を 前の 値から なめらかに 動かす */
function useTween(value: number, ms = 420) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (t: number) => {
      const k = ms <= 0 ? 1 : Math.min(1, (t - start) / ms)
      const v = Math.round(a + (value - a) * (1 - (1 - k) ** 3))
      from.current = v
      setShown(v)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

/**
 * 宿屋：泊まると どれだけ 回復して、いくら 払うのかを 先に 見せる シート。
 * 「泊まる」を 押すと 窓の 外が 夜から 朝に かわり、HP バーが 満タンまで のびる
 */
export function InnSheet({ req, gs, setGs }: { req: InnReq; gs: GameState; setGs: (f: (g: GameState) => GameState) => void }) {
  const max = maxHp(gs.level)
  // 泊まる 前の 値（演出の あいだ 前後を 見せる）
  const [before] = useState(() => ({ hp: gs.hp, gold: gs.gold }))
  const [phase, setPhase] = useState<'ask' | 'night' | 'morning'>('ask')
  const [shake, setShake] = useState(0)
  const quick = reduceMotion()
  const full = before.hp >= max
  const short = Math.max(0, req.price - gs.gold)
  const [say, setSay] = useState(() =>
    full
      ? tr('いらっしゃいませ！ もう 元気いっぱいですね。それでも ひと休み していかれます？', "Welcome! You look full of energy already. Care to rest anyway?")
      : tr(`いらっしゃいませ！ ふかふかの ベッドで ひと晩 休めば、すっかり 元気に なりますよ。`, 'Welcome! One night in a fluffy bed and you’ll be good as new.'),
  )
  const [sayKey, setSayKey] = useState(0)
  const talk = (s: string) => {
    setSay(s)
    setSayKey((k) => k + 1)
  }
  const closing = useRef(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // HP バー：朝に なったら 満タンまで ゆっくり のばす
  const hpShown = useTween(phase === 'morning' ? max : before.hp, quick ? 0 : 900)
  const gold = useTween(gs.gold)

  const close = () => {
    if (closing.current || phase === 'night') return
    closing.current = true
    sfx(phase === 'morning' ? 'select' : 'cancel')
    req.close()
  }

  const stay = () => {
    if (phase === 'morning') return close()
    if (phase !== 'ask') return
    if (short > 0) {
      sfx('cancel')
      setShake((n) => n + 1)
      return talk(tr(`おや、ゴールドが ${short}G 足りないようですね……。`, `Oh dear, you’re ${short}G short...`))
    }
    sfx('coin')
    setGs((s) => ({ ...s, gold: s.gold - req.price, hp: maxHp(s.level) }))
    setPhase('night')
    talk(tr('ごゆっくり おやすみなさいませ……。', 'Sleep well...'))
    jingle('inn')
    timers.current.push(
      window.setTimeout(
        () => {
          setPhase('morning')
          talk(tr('おはようございます！ 体が 軽く なりましたね。いってらっしゃいませ！', 'Good morning! You look refreshed. Have a safe journey!'))
        },
        quick ? 300 : 1700,
      ),
    )
  }

  useKeys((k) => {
    if (k === 'ok') stay()
    else if (k === 'cancel') close()
  })

  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`
  const heal = max - before.hp
  const low = before.hp / max <= 0.3

  const btn =
    phase === 'morning'
      ? { cls: 'go', label: tr('出発する', 'Head out') }
      : phase === 'night'
        ? { cls: 'done', label: tr('おやすみ中…', 'Sleeping...') }
        : short > 0
          ? { cls: 'short', label: tr(`ゴールドが たりない（あと ${short}G）`, `Not enough gold (${short}G short)`) }
          : { cls: 'buy', label: tr(`${req.price}G で 泊まる`, `Stay for ${req.price}G`) }

  return (
    <div className="shop-layer" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className={`win shop inn ${phase}`} role="dialog" aria-label={tr(`宿屋 ${req.title}`, `Inn: ${req.title}`)}>
        <div className="shop-top">
          <h3 className="shop-title">
            <span aria-hidden="true">🛏️ </span>
            {tr('宿屋', 'Inn')}
            <small className="inn-town">{req.title}</small>
          </h3>
          <span className={`shop-gold ${phase !== 'ask' ? 'spent' : ''}`} aria-label={tr(`所持金 ${gs.gold}ゴールド`, `Gold: ${gs.gold}`)}>
            <i aria-hidden="true">G</i>
            {gold}
            {phase === 'night' && <b className="shop-minus">-{req.price}</b>}
          </span>
          <button type="button" className="shop-x" aria-label={tr('とじる', 'Close')} onClick={close} disabled={phase === 'night'}>
            ×
          </button>
        </div>

        <div className="shop-keeper">
          {req.portrait && <Portrait src={req.portrait} className="portrait shop-face" />}
          <div className="shop-say" key={sayKey} aria-live="polite">
            <span className="shop-keeper-name">{req.keeper}</span>
            {say}
          </div>
        </div>

        {/* 窓の 外の 空：夕方 → 夜 → 朝 */}
        <div className="inn-room" aria-hidden="true">
          <div className="inn-sky">
            <span className="inn-sun" />
            <span className="inn-moon" />
            <span className="inn-stars" />
            <span className="inn-hill" />
          </div>
          <div className="inn-bed">
            <span className="inn-pillow" />
            <span className="inn-blanket" />
            {phase === 'night' && (
              <span className="inn-zzz">
                <b>Z</b>
                <b>z</b>
                <b>z</b>
              </span>
            )}
          </div>
        </div>

        {/* 泊まると どう なるか：HP と 所持金の 前 → 後 */}
        <div className="inn-card">
          <div className="inn-row">
            <span className="inn-label">HP</span>
            <span className={`inn-bar ${low && phase === 'ask' ? 'low' : ''}`}>
              {phase === 'ask' && !full && <i className="inn-ghost" style={{ left: pct(before.hp), width: pct(heal) }} />}
              <i className="inn-fill" style={{ width: pct(hpShown) }} />
            </span>
            <span className="inn-num">
              {phase === 'morning' ? (
                <>
                  <b>{hpShown}</b>/{max}
                </>
              ) : (
                <>
                  {before.hp}
                  {!full && (
                    <>
                      <em> → </em>
                      <b>{max}</b>
                    </>
                  )}
                  {full && <>/{max}</>}
                </>
              )}
            </span>
            {phase === 'morning' && heal > 0 && <b className="inn-plus">+{heal}</b>}
          </div>
          <div className="inn-note">
            {phase === 'morning' ? (
              <span className="inn-ok">✓ {tr('HPが まんたんに なった！', 'HP fully restored!')}</span>
            ) : short > 0 ? (
              <span className="inn-short">{tr(`1泊 ${req.price}G ・ あと ${short}G 足りません`, `${req.price}G a night ・ you’re ${short}G short`)}</span>
            ) : full ? (
              <span>{tr('HPは もう まんたんです', 'Your HP is already full')}</span>
            ) : (
              <span>
                {tr('ひと晩で ', 'One night restores ')}
                <b className="inn-heal">+{heal} HP</b>
                {tr(' 回復', '')}
                <span className="inn-dot"> ・ </span>
                {tr(`所持金 ${before.gold}G → ${Math.max(0, before.gold - req.price)}G`, `Gold ${before.gold}G → ${Math.max(0, before.gold - req.price)}G`)}
              </span>
            )}
          </div>
        </div>

        <div className="shop-actions">
          {phase === 'ask' && (
            <button type="button" className="shop-leave" onClick={close}>
              {tr('やめる', 'Not now')}
            </button>
          )}
          <button
            type="button"
            key={`${btn.cls}-${shake}`}
            className={`shop-act inn-act ${btn.cls} ${shake && btn.cls === 'short' ? 'shake' : ''}`}
            aria-disabled={btn.cls === 'short' || btn.cls === 'done'}
            onClick={stay}
          >
            {btn.label}
          </button>
        </div>
      </div>
    </div>
  )
}
