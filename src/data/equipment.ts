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
  loupe_blade: { name: 'ルーペブレード', slot: 'weapon', price: 3600, atk: 53, desc: '刀身が レンズに なっている。探す 相手を 決して 見失わない。' },
  tally_hammer: { name: '集計のハンマー', slot: 'weapon', price: 5200, atk: 65, desc: 'バラバラの 記録を 叩いて 1つに まとめる。' },
  royal_scepter: { name: '王都の笏', slot: 'weapon', price: 6200, atk: 72, desc: '縦と 横を 同時に 治める 王の 杖。' },
  quill_saber: { name: '羽ペンのサーベル', slot: 'weapon', price: 7200, atk: 79, desc: '書き損じを 一閃で 切り捨てる 細身の 剣。' },
  ampersand_blade: { name: 'アンパサンドの剣', slot: 'weapon', price: 8400, atk: 86, desc: '「&」の 形の 刀身。離れた ものを 1つに つなぐ。' },
  clockhand_spear: { name: '時計の針の槍', slot: 'weapon', price: 9600, atk: 93, desc: '狂った 時計の 長針を 打ち直した 槍。' },
  calendar_axe: { name: '暦のオノ', slot: 'weapon', price: 11000, atk: 101, desc: 'ひと振りで 1年分を なぎはらう 重い オノ。' },
  iferror_lance: { name: 'IFERRORの槍', slot: 'weapon', price: 12500, atk: 108, desc: 'どんな エラーも 受け流して 貫く 槍。' },
  excel_sword: { name: '表計算の剣', slot: 'weapon', price: 16000, atk: 120, desc: '7つの 町の 力が 宿った 伝説の 剣。魔王の 宝物庫に 眠っていた。' },
  index_spear: { name: '索引の槍', slot: 'weapon', price: 4400, atk: 59, desc: '目録の 1行を 正確に 貫く 槍。' },
  // よろい（ビジネスウェア）
  old_suit: { name: 'いつものスーツ', slot: 'armor', price: 0, def: 1, desc: '転生前から 着ている 紺のスーツ。' },
  coolbiz: { name: 'クールビズシャツ', slot: 'armor', price: 50, def: 3, desc: '汗をかいても へっちゃら。' },
  business_vest: { name: 'ビジネスベスト', slot: 'armor', price: 110, def: 5, desc: '動きやすく、ポケットも 多い。' },
  new_suit: { name: 'しんぴんのスーツ', slot: 'armor', price: 300, def: 9, desc: 'パリッとした 新品。背すじが のびる。' },
  order_suit: { name: 'オーダーメイドスーツ', slot: 'armor', price: 620, def: 13, desc: '体に ぴったり。できる大人の 装い。' },
  silver_suit: { name: 'ぎんのスーツ', slot: 'armor', price: 1100, def: 18, desc: '銀糸を 織りこんだ 光沢のある スーツ。' },
  captain_coat: { name: '船長のコート', slot: 'armor', price: 1800, def: 23, desc: '潮風にも 嵐にも 負けない 厚手の コート。' },
  typesetter_apron: { name: '植字工のエプロン', slot: 'armor', price: 4300, def: 38, desc: '鉛の 活字を 扱う 職人の 厚手の エプロン。' },
  moonphase_robe: { name: '月齢のローブ', slot: 'armor', price: 5400, def: 44, desc: '月の 満ち欠けが 刺繍された ローブ。時の 流れを 味方に つける。' },
  hero_suit: { name: '勇者のスーツ', slot: 'armor', price: 7200, def: 52, desc: 'むかし この 世界を 救った 者が 着ていたという スーツ。' },
  royal_suit: { name: '王宮の礼服', slot: 'armor', price: 3400, def: 33, desc: '宰相も 認めた 正装。どんな 会議でも 動じない。' },
  librarian_robe: { name: '司書のローブ', slot: 'armor', price: 2600, def: 28, desc: '知識の 重みで 攻撃を 受け止める ローブ。' },
  // たて（書類ばさみ・PC）
  clipboard: { name: 'クリップボード', slot: 'shield', price: 45, def: 1, time: 2, desc: '書類を守る 板。落ち着いて 考えられる。' },
  iron_binder: { name: 'てつのバインダー', slot: 'shield', price: 200, def: 3, time: 4, desc: '分厚い バインダー。資料も 攻撃も 受け止める。' },
  laptop_shield: { name: 'ノートPCのたて', slot: 'shield', price: 480, def: 5, time: 6, desc: '開けば 盾、閉じれば 鈍器。' },
  mirror_shield: { name: 'ミラーシールド', slot: 'shield', price: 950, def: 8, time: 7, desc: '攻撃を 映して はね返す 鏡の盾。' },
  buoy_shield: { name: '浮き輪のたて', slot: 'shield', price: 1500, def: 11, time: 8, desc: '沈まない 安心感。ミスしても 浮かび上がれる。' },
  galley_shield: { name: 'ゲラ箱のたて', slot: 'shield', price: 3600, def: 20, time: 11, desc: '活字を 並べる 箱を 打ち直した 頑丈な 盾。' },
  hourglass_shield: { name: '砂時計のたて', slot: 'shield', price: 4400, def: 23, time: 13, desc: '落ちる 砂が 攻撃を 遅らせる。考える 時間も 増える。' },
  sheet_shield: { name: 'シートのたて', slot: 'shield', price: 5800, def: 27, time: 15, desc: '無限に 広がる 表の 盾。考える 時間も たっぷり。' },
  ledger_shield: { name: '総勘定のたて', slot: 'shield', price: 2900, def: 17, time: 10, desc: 'すべての 記録が 集まる 帳簿の 盾。' },
  catalog_shield: { name: '目録のたて', slot: 'shield', price: 2200, def: 14, time: 9, desc: '分厚い 目録の 表紙。調べものの 時間も 稼げる。' },
  // かぶと（集中グッズ）
  hachimaki: { name: 'ねじりハチマキ', slot: 'head', price: 20, def: 1, time: 1, desc: '気合いが 入る。' },
  bluelight: { name: 'ブルーライトメガネ', slot: 'head', price: 240, def: 2, crit: 0.05, desc: '画面が よく見える。「一発決裁」が 出やすくなる。' },
  headphones: { name: 'ノイキャンヘッドホン', slot: 'head', price: 420, def: 3, time: 3, desc: '雑音を 消して 集中できる。' },
  captain_hat: { name: 'キャプテンハット', slot: 'head', price: 1400, def: 7, time: 3, desc: '「もしも」の時も 冷静に 判断できる 船長の帽子。' },
  proof_glasses: { name: '校正メガネ', slot: 'head', price: 3200, def: 13, time: 6, crit: 0.05, desc: '1文字の 誤りも 見逃さない。「一発決裁」が 出やすくなる。' },
  alarm_band: { name: '目覚ましのハチマキ', slot: 'head', price: 3900, def: 15, time: 7, crit: 0.05, desc: 'どんな 締め切りにも 遅れない。「一発決裁」が 出やすくなる。' },
  focus_crown: { name: '集中の冠', slot: 'head', price: 5200, def: 18, time: 8, crit: 0.08, desc: '雑念を 払う 冠。「一発決裁」が かなり 出やすくなる。' },
  pivot_crown: { name: 'ピボットの冠', slot: 'head', price: 2600, def: 11, time: 5, crit: 0.05, desc: '行と 列を 自在に 入れかえる 知恵の 冠。「一発決裁」が 出やすくなる。' },
  bookmark_band: { name: 'しおりのハチマキ', slot: 'head', price: 1900, def: 9, time: 4, crit: 0.05, desc: '大事な ページを 見失わない。「一発決裁」が 出やすくなる。' },
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
