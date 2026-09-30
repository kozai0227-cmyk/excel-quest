import type { GameState } from './types'

export const LEVEL_EXP = [0, 0, 20, 50, 90, 140, 200, 280, 380, 500, 650, 850, 1100, 1400, 1750, 2150, 2600, 3100, 3650, 4250, 4900, 5600, 6350, 7150, 8000, 8900]

export function levelFor(exp: number): number {
  let lv = 1
  while (lv + 1 < LEVEL_EXP.length && exp >= LEVEL_EXP[lv + 1]) lv++
  return lv
}

export const maxHp = (level: number) => 20 + level * 10

export function expToNext(gs: GameState): number | null {
  const next = LEVEL_EXP[gs.level + 1]
  return next === undefined ? null : next - gs.exp
}

/** 経験値を加算し、レベルアップ時のメッセージを返す */
export function gainExp(gs: GameState, exp: number): { gs: GameState; msgs: string[] } {
  const total = gs.exp + exp
  const lv = levelFor(total)
  const msgs: string[] = []
  let hp = gs.hp
  if (lv > gs.level) {
    const gain = maxHp(lv) - maxHp(gs.level)
    hp = Math.min(maxHp(lv), hp + gain)
    msgs.push(`${gs.name}の レベルが ${lv}に あがった！`, `さいだいHPが ${gain} あがった！`)
  }
  return { gs: { ...gs, exp: total, level: lv, hp }, msgs }
}

export function newGame(name: string): GameState {
  return {
    name,
    level: 1,
    exp: 0,
    hp: maxHp(1),
    gold: 30,
    items: { herb: 2, scroll: 1, sandglass: 0 },
    skills: [],
    solved: [],
    bosses: [],
    party: [],
    mapId: 'forest',
    x: 5,
    y: 9,
    dir: 'right',
    flags: {},
    equip: { weapon: 'company_pen', armor: 'old_suit' },
    gear: ['company_pen', 'old_suit'],
  }
}

const KEY = 'excel-quest-save-v1'

export function saveGame(gs: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(gs))
  } catch {
    /* 保存できない環境では何もしない */
  }
}

export function loadGame(): GameState | null {
  try {
    const s = localStorage.getItem(KEY)
    if (!s) return null
    const g = JSON.parse(s) as GameState
    // 装備の仕組みがなかった頃のセーブにも対応
    g.equip ??= { weapon: 'company_pen', armor: 'old_suit' }
    g.gear ??= ['company_pen', 'old_suit']
    return g
  } catch {
    return null
  }
}
