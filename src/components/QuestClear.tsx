import { useEffect, useMemo, useState } from 'react'
import type { QuestDef } from '../data/quests'
import { SKILLS } from '../data/skills'
import { itemDesc, itemName } from '../data/items'
import { npcName } from '../data/en'
import { tr } from '../game/lang'
import { LEVEL_EXP, levelFor } from '../game/progress'

/** 依頼を 解いたときの 達成画面（スマホ・PC 共通） */
interface Props {
  quest: QuestDef
  hints: number
  /** 依頼を 始める前の 経験値（あれば 経験値バーと レベルアップを 見せる） */
  exp?: number
  onContinue(): void
}

export const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** 0 から target まで 数え上げる（delay ミリ秒 待ってから 約0.8秒） */
export function useCountUp(target: number, delay: number) {
  const [v, setV] = useState(() => (reduceMotion() ? target : 0))
  useEffect(() => {
    if (reduceMotion()) return setV(target)
    let raf = 0
    const t0 = performance.now() + delay
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / 800))
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, delay])
  return v
}

/** レベル内の 進み具合（0〜1） */
export function levelRate(exp: number) {
  const lv = levelFor(exp)
  const base = LEVEL_EXP[lv] ?? 0
  const next = LEVEL_EXP[lv + 1]
  return { lv, rate: next === undefined ? 1 : Math.min(1, Math.max(0, (exp - base) / (next - base))), next }
}

export function QuestClear({ quest, hints, exp, onContinue }: Props) {
  const puzzle = quest.kind === 'puzzle'
  const reward = quest.reward
  const expShown = useCountUp(reward.exp, 450)
  const goldShown = useCountUp(reward.gold, 600)
  const before = exp === undefined ? null : levelRate(exp)
  const after = exp === undefined ? null : levelRate(exp + reward.exp)
  const levelUp = !!before && !!after && after.lv > before.lv
  // 経験値バー：前の 値 → （レベルが 上がるなら 満タン → 0 から）新しい 値
  const [bar, setBar] = useState(() => (before ? (reduceMotion() ? after!.rate : before.rate) : 0))
  const [showLv, setShowLv] = useState(() => levelUp && reduceMotion())
  const [instant, setInstant] = useState(false)
  useEffect(() => {
    if (!before || !after || reduceMotion()) return
    const ts: number[] = []
    if (levelUp) {
      ts.push(window.setTimeout(() => setBar(1), 700))
      ts.push(
        window.setTimeout(() => {
          setInstant(true)
          setBar(0)
          setShowLv(true)
        }, 1450),
      )
      ts.push(
        window.setTimeout(() => {
          setInstant(false)
          setBar(after.rate)
        }, 1520),
      )
    } else ts.push(window.setTimeout(() => setBar(after.rate), 700))
    return () => ts.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const rays = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 30), [])
  const confetti = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: `${(i * 37 + 5) % 100}%`,
        delay: `${0.15 + (i % 7) * 0.08}s`,
        dur: `${1.5 + (i % 5) * 0.25}s`,
        color: ['#ffd76a', '#34b578', '#5ab0ff', '#ff7a8a', '#c58bff'][i % 5],
        rot: `${(i * 53) % 360}deg`,
      })),
    [],
  )
  const skill = reward.skill ? SKILLS[reward.skill] : null
  const toNext = after?.next === undefined ? null : after.next - (exp! + reward.exp)
  let delay = 0.55
  const nextDelay = () => `${(delay += 0.12).toFixed(2)}s`

  return (
    <div className="clear-modal qc-modal" role="dialog" aria-modal="true" aria-labelledby="qc-title">
      <div className="qc-confetti" aria-hidden="true">
        {confetti.map((c, i) => (
          <i key={i} style={{ left: c.left, background: c.color, animationDelay: c.delay, animationDuration: c.dur, rotate: c.rot }} />
        ))}
      </div>
      <div className="qc-card">
        <div className="qc-medal" aria-hidden="true">
          <div className="qc-rays">
            {rays.map((r) => (
              <i key={r} style={{ rotate: `${r}deg` }} />
            ))}
          </div>
          <div className="qc-badge">{puzzle ? '🔓' : '✓'}</div>
        </div>
        <h2 id="qc-title" className="qc-title">
          {puzzle ? tr('謎を 解いた！', 'Puzzle solved!') : tr('悩みを 解決した！', 'Request complete!')}
        </h2>
        <p className="qc-sub">
          {puzzle
            ? tr(`「${quest.title}」の 石版が 光った`, `The tablet "${quest.title}" began to glow`)
            : tr(`${quest.npc}の「${quest.title}」`, `"${quest.title}" for ${npcName(quest.npc)}`)}
        </p>
        {!puzzle && hints === 0 && (
          <div className="qc-nohint" style={{ animationDelay: '0.45s' }}>
            {tr('★ ヒントなしで クリア！', '★ Solved without hints!')}
          </div>
        )}

        <div className="qc-tiles">
          <div className="qc-tile exp" style={{ animationDelay: nextDelay() }}>
            <span className="qc-ico" aria-hidden="true">⭐</span>
            <span className="qc-val">+{expShown}</span>
            <span className="qc-lbl">{tr('けいけんち', 'EXP')}</span>
          </div>
          {reward.gold > 0 && (
            <div className="qc-tile gold" style={{ animationDelay: nextDelay() }}>
              <span className="qc-ico" aria-hidden="true">🪙</span>
              <span className="qc-val">+{goldShown}</span>
              <span className="qc-lbl">{tr('ゴールド', 'Gold')}</span>
            </div>
          )}
        </div>

        {before && after && (
          <div className={`qc-level${showLv && levelUp ? ' up' : ''}`} style={{ animationDelay: nextDelay() }}>
            <div className="qc-level-head">
              <span className="qc-lv">Lv {showLv ? after.lv : before.lv}</span>
              {showLv && levelUp ? (
                <span className="qc-lvup">{tr('レベルアップ！', 'LEVEL UP!')}</span>
              ) : (
                <span className="qc-next">{toNext === null ? 'EXP MAX' : tr(`次まで あと ${toNext}`, `${toNext} to next`)}</span>
              )}
            </div>
            <div className="qc-bar">
              <div style={{ width: `${bar * 100}%`, transition: instant ? 'none' : undefined }} />
            </div>
          </div>
        )}

        {skill && (
          <div className="qc-get skill" style={{ animationDelay: nextDelay() }}>
            <span className="qc-new">NEW</span>
            <span className="qc-get-ico" aria-hidden="true">📜</span>
            <span className="qc-get-body">
              <b>{tr(`スキル「${skill.name}」を おぼえた！`, `Learned "${skill.name}"!`)}</b>
              <small>{skill.desc}</small>
            </span>
          </div>
        )}
        {reward.item && (
          <div className="qc-get" style={{ animationDelay: nextDelay() }}>
            <span className="qc-get-ico" aria-hidden="true">🎁</span>
            <span className="qc-get-body">
              <b>{tr(`${itemName(reward.item)}を てにいれた！`, `Obtained ${itemName(reward.item)}!`)}</b>
              <small>{itemDesc(reward.item)}</small>
            </span>
          </div>
        )}

        <button className="qc-go" autoFocus onClick={onContinue} style={{ animationDelay: nextDelay() }}>
          {tr('つづける', 'Continue')}
        </button>
      </div>
    </div>
  )
}
