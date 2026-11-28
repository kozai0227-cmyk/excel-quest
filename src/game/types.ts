import type { ThemeName } from './tiles'
import type { CharSpec, Creature } from './sprites'

export type Dir = 'up' | 'down' | 'left' | 'right'
export type ItemId = 'herb' | 'scroll' | 'sandglass'

export interface GameState {
  name: string
  level: number
  exp: number
  hp: number
  gold: number
  items: Record<ItemId, number>
  skills: string[]
  solved: string[]
  bosses: string[]
  party: string[]
  mapId: string
  /** 最後に訪れた町（全滅時に戻る） */
  lastTown?: string
  x: number
  y: number
  dir: Dir
  flags: Record<string, boolean>
  /** 装備中のもの（部位 → 装備ID） */
  equip: Partial<Record<'weapon' | 'armor' | 'shield' | 'head', string>>
  /** 持っている装備 */
  gear: string[]
  /** ★3つで 倒した ボス（ボスメダル。1枚ごとに 攻撃力 +2） */
  medals?: string[]
}

export interface NpcDef {
  id: string
  x: number
  y: number
  name: string
  look?: CharSpec
  creature?: Creature
  /** 時々出る吹き出し（note / heart / sweat / dots / question / bang） */
  emote?: string
  dir?: Dir
  kind: 'talk' | 'quest' | 'inn' | 'shop' | 'church' | 'boss' | 'guard' | 'gear' | 'chest' | 'heal' | 'ferry' | 'unlock'
  /** 船乗り：乗ると 別の 港へ 渡る */
  ferry?: {
    to: string
    x: number
    y: number
    dir: Dir
    place: string
    /** 「渡る」以外の 言い方（馬車なら「向かう」） */
    verb?: string
    /** まだ 出せない（ボスを 倒す 前）。そのあいだは closedLines を 話す */
    closed?: (s: GameState) => boolean
    closedLines?: string[]
  }
  /** 宝箱の中身 */
  loot?: { item?: ItemId; gold?: number; equip?: string }
  /** 武器屋・防具屋の品ぞろえ（装備ID） */
  stock?: string[]
  questId?: string
  bossId?: string
  lines?: string[]
  /** 解決後など、状況で変わるセリフ */
  linesAfter?: { when: (s: GameState) => boolean; lines: string[] }
  wander?: boolean
  hideIf?: (s: GameState) => boolean
}

export interface Exit {
  x: number
  y: number
  to: string
  tx: number
  ty: number
  dir: Dir
  /** 歩いてきた 向きで 着く 場所を 変える（地図の 町：南から 来たら 南の 入口へ） */
  from?: Partial<Record<Dir, { tx: number; ty: number; dir: Dir }>>
}

export interface SignDef {
  x: number
  y: number
  lines: string[]
  /** マスの 上に 小さく 出す 札（棚の 記号・荷物の 重さ など） */
  label?: string
  /** ダンジョンの 仕掛け：関数の 考え方で 答える。正解で 進み、罠を 選ぶと 魔物に 不意を つかれる */
  trick?: Trick
}

export interface Trick {
  /** 仕掛けの 名前（全部 解くと flags[`trick_${group}`]） */
  group: string
  /** いくつかの 札を 全部 正しく すると 解ける（part：この 札の 番号、parts：札の 数） */
  part?: number
  parts?: number
  choices: string[]
  /** 正しい 選択（choices の 番号） */
  correct: number[]
  /** 罠（選ぶと 魔物の 不意打ち） */
  trap?: number[]
  /** 正しく できたとき・解いたあとに 調べたとき の ことば */
  okLines?: string[]
  doneLines?: string[]
}

export interface MapDef {
  id: string
  name: string
  kind: 'town' | 'interior' | 'world' | 'field' | 'dungeon'
  /** 町の 見た目（地面・屋根・壁・木 など） */
  theme?: ThemeName
  /** 所属する町（室内は親の町） */
  town?: string
  bossId?: string
  tiles: string[]
  exits: Exit[]
  npcs: NpcDef[]
  signs: SignDef[]
  spawn: { x: number; y: number; dir: Dir }
  /** ダンジョンでも暗くしない（塔の屋上など） */
  light?: boolean
  /** ボスを倒したあと、自動で移動する先（ダンジョンの外） */
  bossExit?: { map: string; x: number; y: number; dir: Dir }
  /** 謎解きで開く扉（puzzle を解くと通れる） */
  gates?: { x: number; y: number; puzzle: string }[]
  /** 全滅したときに戻る場所（町の教会の中） */
  respawn?: { map: string; x: number; y: number }
  /** 1歩あたりの敵の出現率（指定がなければ 地形ごとの標準値） */
  encounterRate?: number
  /** ランダムエンカウントする敵の候補（ワールドマップ用） */
  encounter?: (x: number, y: number) => string[] | null
}
