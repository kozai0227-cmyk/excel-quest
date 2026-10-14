import type { ItemId } from '../game/types'
import { EN_ITEMS, loc } from './en'

export const ITEMS: Record<ItemId, { name: string; price: number; desc: string }> = {
  herb: { name: 'やくそう', price: 10, desc: 'HPを 30 かいふくする。' },
  scroll: { name: 'ヘルプのまきもの', price: 30, desc: '戦闘中：次の問題で ヒントが出る（選択肢が2つ減る）。' },
  sandglass: { name: 'Ctrl+Zのすなどけい', price: 50, desc: '戦闘中：次のミスを 1回だけ なかったことにする。' },
}

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[]

/** どうぐの 名前・説明（今の 言語） */
export const itemName = (id: ItemId) => loc(ITEMS[id].name, EN_ITEMS[id].name)
export const itemDesc = (id: ItemId) => loc(ITEMS[id].desc, EN_ITEMS[id].desc)
