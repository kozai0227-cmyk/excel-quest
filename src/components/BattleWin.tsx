import { useEffect, useMemo, useState } from 'react'
import { tr } from '../game/lang'
import { maxHp } from '../game/progress'
import { jingle, sfx } from '../game/sound'
import { levelRate, reduceMotion, useCountUp } from './QuestClear'
import type { ClearStars } from '../game/clear'
import { MEDAL_ATK } from '../data/equipment'
import './BattleWin.css'

/** 戦闘に 勝ったときの リザルト画面（スマホ・PC 共通） */
interface Props {
  enemy: string
  boss: boolean
  /** 戦う前の 経験値（経験値バーと レベルアップを 見せる） */
  exp: number
  gainExp: number
  gainGold: number
  /** この 戦闘で 正解した 数・最高 連続正解・うけた ダメージ */
  correct: number
  bestCombo: number
  hurt: number
  /** ボス戦の クリア評価（★の 数で 報酬の 倍率が 変わる。gainExp・gainGold は 倍率 込み） */
  clear?: ClearStars
  /** ★3つで 初めて ボスメダルを もらう */
  medal?: boolean
  onContinue(): void
}

export function BattleWin({ enemy, boss, exp, gainExp, gainGold, correct, bestCombo, hurt, clear, medal, onContinue }: Props) {
  // ざこ戦は テンポ よく（ボスは 少し ためて 見せる）
  const t0 = boss ? 0.45 : 0.25
  const expShown = useCountUp(gainExp, t0 * 1000 + 150)
  const goldShown = useCountUp(gainGold, t0 * 1000 + 300)
  const before = levelRate(exp)
  const after = levelRate(exp + gainExp)
  const levelUp = after.lv > before.lv
  const hpGain = maxHp(after.lv) - maxHp(before.lv)
  const [bar, setBar] = useState(() => (reduceMotion() ? after.rate : before.rate))
  const [showLv, setShowLv] = useState(() => levelUp && reduceMotion())
  const [instant, setInstant] = useState(false)

  useEffect(() => {
    const ts: number[] = []
    const at = (ms: number, f: () => void) => ts.push(window.setTimeout(f, ms))
    if (gainGold > 0) at(t0 * 1000 + 450, () => sfx('coin'))
    if (clear) for (let i = 0; i < clear.stars; i++) at(t0 * 1000 + 250 + i * 300, () => sfx('blip'))
    if (medal) at(t0 * 1000 + 1300, () => sfx('chest'))
    if (reduceMotion()) {
      if (levelUp) at(200, () => jingle('levelup'))
      return () => ts.forEach(clearTimeout)
    }
    const bar0 = t0 * 1000 + 450
    if (levelUp) {
      at(bar0, () => setBar(1))
      at(bar0 + 750, () => {
        setInstant(true)
        setBar(0)
        setShowLv(true)
        jingle('levelup')
      })
      at(bar0 + 820, () => {
        setInstant(false)
        setBar(after.rate)
      })
    } else at(bar0, () => setBar(after.rate))
    return () => ts.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const rays = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 30), [])
  // 紙ふぶきは ボスを 倒したときと レベルが 上がったときだけ（ざこ戦で 毎回は うるさい）
  const party = boss || levelUp
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
  const toNext = after.next === undefined ? null : after.next - (exp + gainExp)
  let delay = t0
  const nextDelay = () => `${(delay += boss ? 0.12 : 0.08).toFixed(2)}s`

  const chips: { key: string; cls: string; text: string }[] = []
  if (hurt === 0 && correct > 0) chips.push({ key: 'guard', cls: 'gold', text: tr('🛡 ノーダメージ！', '🛡 No damage!') })
  chips.push({ key: 'ok', cls: '', text: tr(`✓ 正解 ${correct}問`, `✓ ${correct} correct`) })
  if (bestCombo >= 2) chips.push({ key: 'combo', cls: 'fire', text: tr(`🔥 最高 ${bestCombo}連続`, `🔥 Best streak ${bestCombo}`) })

  return (
    <div className={`clear-modal qc-modal bw-modal${boss ? ' is-boss' : ''}`} role="dialog" aria-modal="true" aria-labelledby="bw-title" onClick={(e) => e.stopPropagation()}>
      {party && (
        <div className="qc-confetti" aria-hidden="true">
          {confetti.map((c, i) => (
            <i key={i} style={{ left: c.left, background: c.color, animationDelay: c.delay, animationDuration: c.dur, rotate: c.rot }} />
          ))}
        </div>
      )}
      <div className="qc-card bw-card">
        <div className="qc-medal bw-medal" aria-hidden="true">
          <div className="qc-rays">
            {rays.map((r) => (
              <i key={r} style={{ rotate: `${r}deg` }} />
            ))}
          </div>
          <div className="qc-badge bw-badge">{boss ? '👑' : '⚔️'}</div>
        </div>
        <div className="bw-ribbon" aria-hidden="true">
          {boss ? 'BOSS CLEAR' : 'VICTORY'}
        </div>
        <h2 id="bw-title" className="qc-title bw-title">
          {tr('勝利！', 'Victory!')}
        </h2>
        <p className="qc-sub">{tr(`${enemy}を やっつけた！`, `Defeated ${enemy}!`)}</p>

        <div className="bw-chips">
          {chips.map((c, i) => (
            <span key={c.key} className={`bw-chip ${c.cls}`} style={{ animationDelay: `${(t0 + 0.05 + i * 0.07).toFixed(2)}s` }}>
              {c.text}
            </span>
          ))}
        </div>

        {clear && (
          <div className="bw-rate" style={{ animationDelay: nextDelay() }}>
            <div className="bw-stars" aria-label={tr(`評価 ★${clear.stars}/3`, `Rating ${clear.stars}/3 stars`)}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < clear.stars ? 'on' : ''} style={{ animationDelay: `${(t0 + 0.25 + i * 0.3).toFixed(2)}s` }}>
                  ★
                </span>
              ))}
            </div>
            <ul className="bw-goals">
              {[
                { ok: clear.noMiss, label: tr('ノーミス', 'No mistakes') },
                { ok: clear.noItem, label: tr('どうぐを 使わない', 'No items used') },
                { ok: clear.flinched, label: tr('ボスを ひるませる', 'Made the boss flinch') },
              ].map((g) => (
                <li key={g.label} className={g.ok ? 'ok' : ''}>
                  <span aria-hidden="true">{g.ok ? '★' : '☆'}</span> {g.label}
                </li>
              ))}
            </ul>
            <div className="bw-mult">{tr(`報酬 ×${clear.mult}`, `Rewards ×${clear.mult}`)}</div>
            {medal ? (
              <div className="bw-medal-get">
                {tr('🏅 ボスメダル 獲得！', '🏅 Boss Medal earned!')}
                <small>{tr(`攻撃力 +${MEDAL_ATK}・すなどけい つき`, `ATK +${MEDAL_ATK} plus an Hourglass`)}</small>
              </div>
            ) : (
              clear.stars < 3 && <div className="bw-rate-tip">{tr('★3つで ボスメダルが もらえる', 'Get all 3 stars to earn a Boss Medal')}</div>
            )}
          </div>
        )}

        <div className="qc-tiles">
          <div className="qc-tile exp" style={{ animationDelay: nextDelay() }}>
            <span className="qc-ico" aria-hidden="true">⭐</span>
            <span className="qc-val">+{expShown}</span>
            <span className="qc-lbl">{tr('けいけんち', 'EXP')}</span>
          </div>
          <div className="qc-tile gold" style={{ animationDelay: nextDelay() }}>
            <span className="qc-ico" aria-hidden="true">🪙</span>
            <span className="qc-val">+{goldShown}</span>
            <span className="qc-lbl">{tr('ゴールド', 'Gold')}</span>
          </div>
        </div>

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

        {showLv && levelUp && (
          <div className="qc-get skill bw-lvget">
            <span className="qc-new">UP</span>
            <span className="qc-get-ico" aria-hidden="true">💪</span>
            <span className="qc-get-body">
              <b>{tr(`レベル ${after.lv}に あがった！`, `Reached level ${after.lv}!`)}</b>
              <small>{tr(`さいだいHPが ${hpGain} あがった（${maxHp(before.lv)} → ${maxHp(after.lv)}）`, `Max HP +${hpGain} (${maxHp(before.lv)} → ${maxHp(after.lv)})`)}</small>
            </span>
          </div>
        )}

        <button className="qc-go" onClick={onContinue} style={{ animationDelay: nextDelay() }}>
          {tr('つづける', 'Continue')}
        </button>
      </div>
    </div>
  )
}
