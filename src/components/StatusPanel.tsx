import { useEffect, useState } from 'react'
import { PLAYER_SPEC } from '../data/maps'
import { QUESTS } from '../data/quests'
import { BOSSES } from '../data/bosses'
import { SKILLS } from '../data/skills'
import { gearStats } from '../data/equipment'
import { totalPercent } from '../data/chapters'
import { LEVEL_EXP } from '../game/progress'
import { getStreak } from '../game/streak'
import { tr } from '../game/lang'
import type { GameState } from '../game/types'
import { Portrait } from './Portrait'
import { reduceMotion, useCountUp } from './QuestClear'
import './StatusPanel.css'

/** 押すと 開く 先（スキル図鑑・そうび・たび・ふくしゅう） */
export type StatusJump = 'スキル' | 'そうび' | 'たび' | 'ふくしゅう'

/** 称号：レベル 1・4・7 で 上がる */
const TITLES: { lv: number; ico: string; name: () => string }[] = [
  { lv: 1, ico: '💼', name: () => tr('新入社員', 'New Hire') },
  { lv: 4, ico: '📋', name: () => tr('セル見習い', 'Cell Apprentice') },
  { lv: 7, ico: '🪄', name: () => tr('関数つかい', 'Function Wielder') },
]

interface Props {
  gs: GameState
  onJump(to: StatusJump): void
}

/**
 * つよさ：Duolingo の プロフィールの ように、上に 顔・名前・称号と 次の 称号までの 道のり、
 * 下に 記録の タイル（連続日数・けいけんち・悩み・スキル・ボス・攻撃力・守備力）と 達成率の 輪。
 * タイルを 押すと 関係する 画面（スキル図鑑・そうび・たび・ふくしゅう）へ 飛べる
 */
export function StatusPanel({ gs, onJump }: Props) {
  const streak = getStreak()
  const gear = gearStats(gs)
  const bossIds = Object.keys(BOSSES).filter((id) => BOSSES[id].boss)
  const bossDone = bossIds.filter((id) => gs.bosses.includes(id)).length
  const medals = (gs.medals ?? []).length
  const skillAll = Object.keys(SKILLS).length
  const skillGot = gs.skills.filter((id) => SKILLS[id]).length
  const questAll = Object.keys(QUESTS).length
  const questDone = gs.solved.filter((id) => QUESTS[id]).length
  const pct = totalPercent(gs)

  const tIdx = TITLES.reduce((n, t, i) => (gs.level >= t.lv ? i : n), 0)
  const nextTitle = TITLES[tIdx + 1]
  const base = LEVEL_EXP[gs.level] ?? 0
  const nextExp = LEVEL_EXP[gs.level + 1]
  const expRate = nextExp === undefined ? 1 : Math.min(1, Math.max(0, (gs.exp - base) / (nextExp - base)))

  // 開いた あとで バー・輪を のばす（はじめは 0 から）
  const [grown, setGrown] = useState(reduceMotion())
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 120)
    return () => clearTimeout(t)
  }, [])

  const tiles: {
    key: string
    ico: string
    tone: string
    value: number
    unit?: string
    of?: number
    label: string
    sub?: string
    hot?: boolean
    plus?: boolean
    jump?: StatusJump
  }[] = [
    {
      key: 'streak',
      ico: '🔥',
      tone: 'fire',
      value: streak.count,
      unit: tr('日', streak.count === 1 ? ' day' : ' days'),
      label: tr('れんぞく ふくしゅう', 'Review streak'),
      sub: streak.today ? tr('✓ 今日も できた', '✓ Done today') : streak.count > 0 ? tr('今日で のばそう', 'Keep it going today') : tr('ふくしゅうで はじまる', 'Start with a review'),
      hot: streak.today,
      jump: 'ふくしゅう',
    },
    { key: 'exp', ico: '⚡', tone: 'bolt', value: gs.exp, label: tr('けいけんち 合計', 'Total EXP') },
    { key: 'quest', ico: '📜', tone: 'scroll', value: questDone, of: questAll, label: tr('解決した 悩み', 'Requests solved') },
    { key: 'skill', ico: '✨', tone: 'spark', value: skillGot, of: skillAll, label: tr('おぼえた スキル', 'Skills learned'), jump: 'スキル' },
    {
      key: 'boss',
      ico: '👑',
      tone: 'crown',
      value: bossDone,
      of: bossIds.length,
      label: tr('たおした ボス', 'Bosses defeated'),
      sub: medals > 0 ? tr(`🏅 メダル ${medals}枚`, `🏅 ${medals} medal${medals === 1 ? '' : 's'}`) : undefined,
      jump: 'たび',
    },
    {
      key: 'gear',
      ico: '⚔️',
      tone: 'blade',
      value: gear.atk,
      plus: true,
      label: tr('攻撃力', 'Attack'),
      sub: tr(`🛡️ 守備 +${gear.def}`, `🛡️ Def +${gear.def}`) + (gear.time > 0 ? tr(`・⏱️ +${gear.time}秒`, ` · ⏱️ +${gear.time}s`) : ''),
      jump: 'そうび',
    },
  ]

  return (
    <div className="stp">
      <div className="stp-hero">
        <div className="stp-face">
          <Portrait src={{ spec: PLAYER_SPEC }} className="portrait stp-portrait" />
          <span className="stp-lv">Lv {gs.level}</span>
        </div>
        <div className="stp-who">
          <b className="stp-name">{gs.name}</b>
          <span className="stp-title">
            <i aria-hidden="true">{TITLES[tIdx].ico}</i>
            {TITLES[tIdx].name()}
          </span>
          <div className="stp-exp">
            <div className="stp-bar" aria-hidden="true">
              <div style={{ width: `${(grown ? expRate : 0) * 100}%` }} />
            </div>
            <small>{nextExp === undefined ? tr('レベル 最大！', 'Max level!') : tr(`次の レベルまで ${nextExp - gs.exp}`, `${nextExp - gs.exp} EXP to next level`)}</small>
          </div>
        </div>
      </div>

      <div className="stp-road" aria-label={tr('称号の 道のり', 'Title road')}>
        {TITLES.map((t, i) => (
          <div key={t.lv} className={`stp-step ${i < tIdx ? 'past' : i === tIdx ? 'now' : 'next'}`} style={{ animationDelay: `${120 + i * 70}ms` }}>
            {i > 0 && <span className="stp-link" aria-hidden="true" />}
            <span className="stp-dot" aria-hidden="true">
              {i <= tIdx ? t.ico : '🔒'}
            </span>
            <span className="stp-step-name">{t.name()}</span>
            <small>Lv {t.lv}</small>
          </div>
        ))}
      </div>
      <p className="stp-road-note">
        {nextTitle
          ? tr(`🎯 あと レベル ${nextTitle.lv - gs.level} で「${nextTitle.name()}」`, `🎯 ${nextTitle.lv - gs.level} more level${nextTitle.lv - gs.level === 1 ? '' : 's'} to "${nextTitle.name()}"`)
          : tr('🏆 いちばん 上の 称号に たどりついた！', '🏆 You reached the top title!')}
      </p>

      <div className="stp-grid">
        {tiles.map((t, i) => (
          <StatTile {...t} key={t.key} delay={200 + i * 60} onClick={t.jump ? () => onJump(t.jump!) : undefined} />
        ))}
      </div>

      <div className={`stp-done ${pct >= 100 ? 'full' : ''}`} style={{ animationDelay: `${200 + tiles.length * 60}ms` }}>
        <div className="stp-ring" style={{ ['--p' as string]: `${grown ? pct : 0}` }} aria-hidden="true">
          <span>{pct}%</span>
        </div>
        <div className="stp-done-text">
          <b>{tr('冒険の 達成率', 'Adventure progress')}</b>
          <small>{tr('依頼・謎・ボス・宝箱を すべて 数えた 割合', 'Requests, puzzles, bosses and chests combined')}</small>
        </div>
      </div>
    </div>
  )
}

function StatTile(p: {
  ico: string
  tone: string
  value: number
  unit?: string
  of?: number
  label: string
  sub?: string
  hot?: boolean
  plus?: boolean
  delay: number
  onClick?: () => void
}) {
  const v = useCountUp(p.value, p.delay + 150)
  const body = (
    <>
      <span className={`stp-ico tone-${p.tone}`} aria-hidden="true">
        {p.ico}
      </span>
      <span className="stp-val">
        <b>
          {p.plus ? '+' : ''}
          {v.toLocaleString()}
        </b>
        {p.of !== undefined && <small>/{p.of}</small>}
        {p.unit && <small>{p.unit}</small>}
      </span>
      <span className="stp-label">{p.label}</span>
      {p.sub && <span className="stp-sub">{p.sub}</span>}
      {p.onClick && (
        <span className="stp-go" aria-hidden="true">
          ›
        </span>
      )}
    </>
  )
  const cls = `stp-tile tone-${p.tone} ${p.hot ? 'hot' : ''}`
  return p.onClick ? (
    <button type="button" data-nosfx className={`${cls} tap`} style={{ animationDelay: `${p.delay}ms` }} onClick={p.onClick}>
      {body}
    </button>
  ) : (
    <div className={cls} style={{ animationDelay: `${p.delay}ms` }}>
      {body}
    </div>
  )
}
