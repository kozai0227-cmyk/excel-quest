import { tr } from './lang'

/**
 * ボスの「本気モード」：HPが 半分を 切ると 1度だけ 入る。
 * どの ボスも 攻撃が 強くなり（即答ボーナスも 大きくなる）、さらに ボスごとの 特殊ルールが 加わる。
 * - heal：まちがえると ボスが 回復する
 * - heavy：攻撃が さらに 重くなる
 * - blink：選択肢（数式の 問題では 問題文）が ときどき 消える
 * - haste：制限時間が 短くなる
 * - shuffle：選択肢が ときどき 入れかわる（数式の 問題は 制限時間が 少し 短くなる）
 * - garble：選択肢（数式の 問題では 問題文）が 最初 文字化けしていて、少したつと 読める
 * - final：制限時間が 短く、攻撃も 重い
 */
export type RageRule = 'heal' | 'heavy' | 'blink' | 'haste' | 'shuffle' | 'garble' | 'final'

export const RAGE_RULE: Record<string, RageRule> = {
  slime: 'heal',
  golem: 'heavy',
  mirage: 'shuffle',
  captain: 'haste',
  mitsukaranu: 'blink',
  barabaran: 'heavy',
  mojibake: 'garble',
  shimekiris: 'haste',
  refera: 'final',
}

/** 本気モードの 敵の 攻撃の 倍率 */
export const rageAtk = (r: RageRule) => (r === 'heavy' || r === 'final' ? 1.5 : 1.2)
/** 本気モードの 制限時間の 倍率 */
export const rageTime = (r: RageRule, formula: boolean) => (r === 'haste' || r === 'final' ? 0.6 : r === 'shuffle' && formula ? 0.8 : 1)
/** heal：まちがえたとき ボスが 回復する 割合（最大HPに 対して） */
export const RAGE_HEAL = 0.08
/** garble：選択肢が 読めるように なるまでの 時間 */
export const GARBLE_MS = 2200
/** 本気モードの 即答ボーナス（ふだんは 1.25倍） */
export const RAGE_QUICK = 1.5
/** この 回数 続けて 正解すると ボスが ひるむ（反撃なし） */
export const FLINCH_STREAK = 3

/** 特殊ルールの 説明（本気モードに 入ったときに 出す） */
export const rageRuleText = (r: RageRule) =>
  ({
    heal: tr('まちがえると、ボスが 回復する！ 1問も 落とせない！', 'Answer wrong and the boss heals! Every question counts!'),
    heavy: tr('ボスの 攻撃が ずっしり 重くなった！ 守りの 問題は 外せない！', "The boss's attacks got much heavier! Don't miss the guard questions!"),
    blink: tr('選択肢や 問題文が ときどき 消える！ よく 見て 答えよう！', 'Choices and questions flicker out of sight! Watch closely!'),
    haste: tr('制限時間が 短くなった！ 急いで 答えよう！', 'The time limit got shorter! Answer fast!'),
    shuffle: tr('選択肢が ときどき 入れかわる！ 数式の 問題は 時間も 短い！', 'The choices keep switching places, and formula questions get less time!'),
    garble: tr('選択肢や 問題文が 文字化けする！ 少し 待てば 読めるが、時間は 進む！', 'Choices and questions get garbled! Wait a moment to read them, but the clock keeps ticking!'),
    final: tr('制限時間が 短くなり、攻撃も 重くなった！ 最後の 力を ふりしぼれ！', 'Shorter time limit and heavier attacks! Give it everything you have!'),
  })[r]

const NOISE = '縺繧ｮ髢譁蟄怜喧縺代ｓ繝ｼ'
/** 文字化け（記号・数字・空白は 少し 残す） */
export const garble = (s: string, seed: number) =>
  [...s]
    .map((ch, i) => (ch === ' ' || ((i * 7 + seed) % 5 === 0 && /[0-9A-Za-z=()]/.test(ch)) ? ch : NOISE[(ch.charCodeAt(0) + i * 3 + seed) % NOISE.length]))
    .join('')
