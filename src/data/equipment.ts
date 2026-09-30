import type { GameState } from '../game/types'

export type Slot = 'weapon' | 'armor' | 'shield' | 'head'

export interface EquipDef {
  name: string
  slot: Slot
  price: number
  desc: string
  /** 攻撃力（正解したときのダメージが増える） */
  atk?: number
  /** 守備力（まちがえたときの被ダメージが減る） */
  def?: number
  /** 回答時間ボーナス（秒） */
  time?: number
  /** 一発決裁（大ダメージ）が出やすくなる */
  crit?: number
}

export const SLOT_NAME: Record<Slot, string> = { weapon: 'ぶき', armor: 'よろい', shield: 'たて', head: 'かぶと' }
export const SLOTS: Slot[] = ['weapon', 'armor', 'shield', 'head']

export const EQUIP: Record<string, EquipDef> = {
  // ぶき（筆記用具・PC周辺機器）
  company_pen: { name: 'かいしゃのボールペン', slot: 'weapon', price: 0, atk: 1, desc: '会社の備品。書き味は ふつう。' },
  hinoki_pen: { name: 'ひのきのボールペン', slot: 'weapon', price: 30, atk: 3, desc: 'ひのきの軸が 手になじむ。' },
  copper_pencil: { name: 'どうのシャーペン', slot: 'weapon', price: 90, atk: 6, desc: '芯が折れにくい 銅製の シャーペン。' },
  marker_sword: { name: 'けいこうペンのつるぎ', slot: 'weapon', price: 180, atk: 9, desc: '大事な所を 光らせる 剣。' },
  iron_mouse: { name: 'てつのマウス', slot: 'weapon', price: 320, atk: 13, desc: 'クリックの 一撃が 重い。' },
  steel_keyboard: { name: 'はがねのキーボード', slot: 'weapon', price: 560, atk: 18, desc: '打鍵の 連打で 敵を なぎはらう。' },
  shortcut_sword: { name: 'ショートカットソード', slot: 'weapon', price: 950, atk: 25, desc: 'Ctrl の力を 宿した 伝説の剣。' },
  mirror_rapier: { name: '鏡のレイピア', slot: 'weapon', price: 1300, atk: 31, desc: '鏡のように 研ぎすまされた 細身の剣。' },
  dollar_lance: { name: 'ドルマークの槍', slot: 'weapon', price: 1900, atk: 38, desc: '「$」の形の 穂先。狙った所から ずれない。' },
  anchor_axe: { name: 'いかりのオノ', slot: 'weapon', price: 2300, atk: 42, desc: '船の いかりを 打ち直した 重たい オノ。' },
  branch_trident: { name: '分岐のトライデント', slot: 'weapon', price: 2900, atk: 47, desc: '3つに 分かれた 穂先。どんな 条件にも 対応できる。' },
  // よろい（ビジネスウェア）
  old_suit: { name: 'いつものスーツ', slot: 'armor', price: 0, def: 1, desc: '転生前から 着ている 紺のスーツ。' },
  coolbiz: { name: 'クールビズシャツ', slot: 'armor', price: 50, def: 3, desc: '汗をかいても へっちゃら。' },
  business_vest: { name: 'ビジネスベスト', slot: 'armor', price: 110, def: 5, desc: '動きやすく、ポケットも 多い。' },
  new_suit: { name: 'しんぴんのスーツ', slot: 'armor', price: 300, def: 9, desc: 'パリッとした 新品。背すじが のびる。' },
  order_suit: { name: 'オーダーメイドスーツ', slot: 'armor', price: 620, def: 13, desc: '体に ぴったり。できる大人の 装い。' },
  silver_suit: { name: 'ぎんのスーツ', slot: 'armor', price: 1100, def: 18, desc: '銀糸を 織りこんだ 光沢のある スーツ。' },
  captain_coat: { name: '船長のコート', slot: 'armor', price: 1800, def: 23, desc: '潮風にも 嵐にも 負けない 厚手の コート。' },
  // たて（書類ばさみ・PC）
  clipboard: { name: 'クリップボード', slot: 'shield', price: 45, def: 1, time: 2, desc: '書類を守る 板。落ち着いて 考えられる。' },
  iron_binder: { name: 'てつのバインダー', slot: 'shield', price: 200, def: 3, time: 4, desc: '分厚い バインダー。資料も 攻撃も 受け止める。' },
  laptop_shield: { name: 'ノートPCのたて', slot: 'shield', price: 480, def: 5, time: 6, desc: '開けば 盾、閉じれば 鈍器。' },
  mirror_shield: { name: 'ミラーシールド', slot: 'shield', price: 950, def: 8, time: 7, desc: '攻撃を 映して はね返す 鏡の盾。' },
  buoy_shield: { name: '浮き輪のたて', slot: 'shield', price: 1500, def: 11, time: 8, desc: '沈まない 安心感。ミスしても 浮かび上がれる。' },
  // かぶと（集中グッズ）
  hachimaki: { name: 'ねじりハチマキ', slot: 'head', price: 20, def: 1, time: 1, desc: '気合いが 入る。' },
  bluelight: { name: 'ブルーライトメガネ', slot: 'head', price: 240, def: 2, crit: 0.05, desc: '画面が よく見える。「一発決裁」が 出やすくなる。' },
  headphones: { name: 'ノイキャンヘッドホン', slot: 'head', price: 420, def: 3, time: 3, desc: '雑音を 消して 集中できる。' },
  captain_hat: { name: 'キャプテンハット', slot: 'head', price: 1400, def: 7, time: 3, desc: '「もしも」の時も 冷静に 判断できる 船長の帽子。' },
  loupe: { name: 'ルーペめがね', slot: 'head', price: 880, def: 5, time: 2, crit: 0.05, desc: '細かい「$」も 見逃さない。「一発決裁」が 出やすくなる。' },
}

export function effectText(e: EquipDef) {
  const parts: string[] = []
  if (e.atk) parts.push(`攻+${e.atk}`)
  if (e.def) parts.push(`守+${e.def}`)
  if (e.time) parts.push(`時間+${e.time}秒`)
  if (e.crit) parts.push('一発決裁↑')
  return parts.join(' ')
}

/** 装備の合計値 */
export function gearStats(gs: GameState) {
  const s = { atk: 0, def: 0, time: 0, crit: 0 }
  for (const id of Object.values(gs.equip ?? {})) {
    const e = id ? EQUIP[id] : undefined
    if (!e) continue
    s.atk += e.atk ?? 0
    s.def += e.def ?? 0
    s.time += e.time ?? 0
    s.crit += e.crit ?? 0
  }
  return s
}
