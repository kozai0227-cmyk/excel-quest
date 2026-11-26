import { useEffect, useState } from 'react'
import { tr } from '../game/lang'
import { reduceMotion } from './QuestClear'
import './BattleLose.css'

/** まちがえた 問題（ふりかえり用） */
export interface Missed {
  q: string
  answer: string
  explain: string
}

/**
 * 戦闘で 力つきたときの ふりかえり画面（スマホ・PC 共通）。
 * 「あと どれだけで 倒せたか」と「まちがえた 問題の 正しい 答え」を 見せて、
 * 負けても 学びが 残り、もう一度 挑みたく なるように する。
 */
interface Props {
  enemy: string
  boss: boolean
  /** 敵の 残りHP（0〜1） */
  enemyLeft: number
  correct: number
  bestCombo: number
  /** この 戦闘で まちがえた 問題（新しい 順） */
  missed: Missed[]
  /** このあと どうなるか */
  after: 'church' | 'wake' | 'rematch' | 'tutorial'
  /** 教会に 運ばれて 失う お金 */
  goldLost: number
  /** 苦手として ふくしゅうの書に 残したか */
  savedWeak: boolean
  onContinue(): void
}

const SHOW = 2

export function BattleLose({ enemy, boss, enemyLeft, correct, bestCombo, missed, after, goldLost, savedWeak, onContinue }: Props) {
  const pct = Math.max(1, Math.round(enemyLeft * 100))
  // 敵の HPバーは 満タンから 残りまで 減らして 見せる（「ここまで 削れた」が 伝わる）
  const [bar, setBar] = useState(() => (reduceMotion() ? enemyLeft : 1))
  useEffect(() => {
    if (reduceMotion()) return
    const t = window.setTimeout(() => setBar(enemyLeft), 550)
    return () => clearTimeout(t)
  }, [enemyLeft])

  const close = pct <= 35
  const head = close
    ? tr(`あと ${pct}% で 倒せた！`, `Just ${pct}% left to win!`)
    : correct > 0
      ? tr(`${enemy}を ${100 - pct}% まで けずった`, `You wore ${enemy} down by ${100 - pct}%`)
      : tr('つぎは 1問ずつ 落ち着いて', 'Next time, take it one question at a time')

  const list = missed.slice(0, SHOW)
  const go =
    after === 'tutorial'
      ? tr('もう一度 たたかう', 'Fight again')
      : after !== 'church'
        ? tr('つづける', 'Continue')
        : tr('教会で 目を さます', 'Wake up at the church')

  let delay = 0.3
  const nextDelay = () => `${(delay += 0.08).toFixed(2)}s`

  return (
    <div className="clear-modal qc-modal bl-modal" role="dialog" aria-modal="true" aria-labelledby="bl-title" onClick={(e) => e.stopPropagation()}>
      <div className="qc-card bl-card">
        <div className="qc-medal bl-medal" aria-hidden="true">
          <div className="qc-badge bl-badge">💫</div>
        </div>
        <div className="bl-ribbon" aria-hidden="true">
          {boss ? 'BOSS BATTLE' : 'BATTLE'}
        </div>
        <h2 id="bl-title" className="qc-title bl-title">
          {tr('ちからつきた……', 'You collapsed...')}
        </h2>
        <p className="qc-sub">{tr('まちがいは 成長の たね。答えを 見て おこう！', 'Mistakes help you grow. Check the answers!')}</p>

        <div className={`bl-foe${close ? ' close' : ''}`} style={{ animationDelay: nextDelay() }}>
          <div className="bl-foe-head">
            <b>{head}</b>
            <span>{tr(`残りHP ${pct}%`, `${pct}% HP left`)}</span>
          </div>
          <div className="bl-foe-bar" role="img" aria-label={tr(`${enemy}の 残りHP ${pct}%`, `${enemy} HP left: ${pct}%`)}>
            <div style={{ width: `${bar * 100}%` }} />
          </div>
        </div>

        <div className="bw-chips bl-chips">
          <span className="bw-chip" style={{ animationDelay: nextDelay() }}>
            {tr(`✓ 正解 ${correct}問`, `✓ ${correct} correct`)}
          </span>
          {bestCombo >= 2 && (
            <span className="bw-chip fire" style={{ animationDelay: nextDelay() }}>
              {tr(`🔥 最高 ${bestCombo}連続`, `🔥 Best streak ${bestCombo}`)}
            </span>
          )}
          {missed.length > 0 && (
            <span className="bw-chip miss" style={{ animationDelay: nextDelay() }}>
              {tr(`✗ ミス ${missed.length}問`, `✗ ${missed.length} missed`)}
            </span>
          )}
        </div>

        {list.length > 0 && (
          <section className="bl-review" style={{ animationDelay: nextDelay() }} aria-label={tr('まちがえた 問題', 'Questions you missed')}>
            <h3>{tr('📝 正しい 答えを おさらい', '📝 Review the right answers')}</h3>
            <ul>
              {list.map((m, i) => (
                <li key={i}>
                  <p className="bl-q">{m.q}</p>
                  <p className="bl-a">
                    <span aria-hidden="true">✓</span>
                    <code>{m.answer}</code>
                  </p>
                  <p className="bl-ex">{m.explain}</p>
                </li>
              ))}
            </ul>
            {missed.length > SHOW && <p className="bl-more">{tr(`ほか ${missed.length - SHOW}問`, `+${missed.length - SHOW} more`)}</p>}
          </section>
        )}

        <ul className="bl-notes" style={{ animationDelay: nextDelay() }}>
          {savedWeak && missed.length > 0 && (
            <li>
              <span aria-hidden="true">📖</span>
              {tr('まちがえた 問題は ふくしゅうの書の「苦手」に 入れたよ', 'Missed questions were added to Weak Spots in the Book of Review')}
            </li>
          )}
          {after === 'church' && (
            <li>
              <span aria-hidden="true">⛪</span>
              {goldLost > 0
                ? tr(`町の 教会で 目を さます（所持金 −${goldLost}G）`, `You'll wake up at the town church (−${goldLost} G)`)
                : tr('町の 教会で 目を さます', "You'll wake up at the town church")}
            </li>
          )}
          {after === 'wake' && goldLost > 0 && (
            <li>
              <span aria-hidden="true">🪙</span>
              {tr(`所持金が 半分に なる（−${goldLost}G）`, `You'll lose half your gold (−${goldLost} G)`)}
            </li>
          )}
          {after === 'rematch' && (
            <li>
              <span aria-hidden="true">🛡</span>
              {tr('再挑戦なので お金は 減らない', "It's a rematch, so you keep your gold")}
            </li>
          )}
          {after !== 'tutorial' && missed.length <= SHOW && (
            <li>
              <span aria-hidden="true">💡</span>
              {boss
                ? tr('宿屋で 休んで、やくそうを 買ってから 挑もう', 'Rest at the inn and stock up on Herbs before trying again')
                : tr('レベルを 上げると HPが 増えて 負けにくく なる', 'Leveling up raises your HP so you last longer')}
            </li>
          )}
        </ul>

        <button className="qc-go bl-go" onClick={onContinue} style={{ animationDelay: nextDelay() }}>
          {go}
        </button>
      </div>
    </div>
  )
}
