import { isEn } from '../game/lang'
import type { ItemId } from '../game/types'

/**
 * 英語版の 名前・説明（日本語の データは そのままにして、ID ごとに 英語を 重ねる）。
 * 訳語は docs/english-glossary.md に そろえる
 */

/** 英語が あれば 英語、なければ 日本語 */
export const loc = (ja: string, en: string | undefined) => (isEn() && en ? en : ja)

export const EN_CHAPTERS: Record<number, { title: string; topic: string }> = {
  1: { title: 'Chapter 1: Cellno & Calcule', topic: 'Cells, AutoFill, arithmetic, SUM / AVERAGE' },
  2: { title: 'Chapter 2: Refton, Town of Mirrors', topic: 'Relative & absolute references ($), ROUND' },
  3: { title: 'Chapter 3: Ifport, Harbor of Conditions', topic: 'IF, AND / OR, COUNTIF / SUMIF' },
  4: { title: 'Chapter 4: Lookup, Castle Town of Searching', topic: 'VLOOKUP, XLOOKUP, IFERROR' },
  5: { title: 'Chapter 5: Pivoria, Royal Capital of Totals', topic: 'SUMIFS, COUNTIFS, summary tables' },
  6: { title: 'Chapter 6: Textria, Post Town of Letters', topic: '&, LEFT / MID, LEN, TRIM, FIND' },
  7: { title: 'Chapter 7: Calendra, Village of Calendars', topic: 'Date math, WEEKDAY, EDATE, DATEDIF' },
  8: { title: "Final Chapter: Fort Hope at the World's Edge", topic: 'Reading and fixing errors, final review' },
}

export const EN_ENEMIES: Record<string, string> = {
  slime: 'Messy Cellime',
  golem: 'Hand-Calc Golem',
  mirage: 'Shifty Mirage',
  captain: 'Ghost Captain Whatif',
  mitsukaranu: 'Notfoundra, Lord of the Maze Library',
  barabaran: 'Scatteron, King of Strewn Ledgers',
  mojibake: 'Mojibakera, the Garbled-Text Fiend',
  shimekiris: 'Deadlinus, Devourer of Time',
  refera: 'Demon Lord Referror',
  celime_tutorial: 'Cellime',
  celime: 'Cellime',
  frog: 'Mistoad',
  bat: 'Digitdrop Bat',
  ghost: 'Longhand Ghost',
  kagamin: 'Mirrorling',
  zuredori: 'Shiftbird',
  jelly: 'If-Jelly',
  crab: 'Branch Crab',
  nainai: 'Nada',
  shiori: 'Bookworm',
  dupli: 'Dupling',
  chirakari: 'Clutterpede',
  kuuhaku: 'Blanko',
  kirehashi: 'Snippet',
  karendaru: 'Calendrake',
  tokeidori: 'Clockbird',
  zerowarin: 'Divizero',
  nanashi: 'Nameless',
}

export const EN_ITEMS: Record<ItemId, { name: string; desc: string }> = {
  herb: { name: 'Herb', desc: 'Restores 30 HP.' },
  scroll: { name: 'Scroll of Help', desc: 'In battle: shows a hint on the next question (removes 2 choices).' },
  sandglass: { name: 'Ctrl+Z Hourglass', desc: 'In battle: undoes your next mistake, once.' },
}

/** 敵の 名前（今の 言語） */
export const enemyName = (e: { id: string; name: string }) => loc(e.name, EN_ENEMIES[e.id])

/** 町・ダンジョンの 名前（町に 入ったときの 看板など） */
export const EN_MAPS: Record<string, string> = {
  forest: 'Forest of Beginnings',
  world: 'Continent of Cellsia',
  celuno: 'Cellno, Village of Beginnings',
  cave: 'Cave of Clutter',
  calculet: 'Calcule, Town of Calculation',
  tower1: 'Tower of Calculation 1F',
  tower2: 'Tower of Calculation 2F',
  tower3: 'Tower of Calculation Roof',
  sansho: 'Refton, Town of Mirrors',
  temple1: 'Mirror Temple: Front Hall',
  temple2: 'Mirror Temple: Hall of the Great Mirror',
  ifport: 'Ifport, Harbor of Conditions',
  ship1: 'Ghost Ship: Hold',
  ship2: "Ghost Ship: Captain's Cabin",
  lookup: 'Lookup, Castle Town of Searching',
  library1: 'Lookup Castle: Great Library',
  library2: 'Lookup Castle: Forbidden Stacks',
  pivoria: 'Pivoria, Royal Capital of Totals',
  treasury1: 'Pivoria Palace: Treasury',
  treasury2: "Pivoria Palace: King's Hall",
  textria: 'Textria, Post Town of Letters',
  print1: 'Textria Print Shop',
  print2: 'Textria Print Shop: Back Room',
  koyomi: 'Calendra, Village of Calendars',
  clock1: 'Calendra Clock Tower',
  clock2: 'Calendra Clock Tower: Top Floor',
  hope: "Fort Hope, at the World's Edge",
  castle1: "Demon Lord's Castle",
  castle2: "Demon Lord's Castle: Throne Room",
}

export const EN_SLOT = { weapon: 'Weapon', armor: 'Armor', shield: 'Shield', head: 'Helm' } as const

const MORE_CRIT = 'Instant Approval comes more often.'
export const EN_EQUIP: Record<string, { name: string; desc: string }> = {
  company_pen: { name: 'Company Ballpen', desc: 'Office supplies. Writes... fine.' },
  hinoki_pen: { name: 'Cypress Pen', desc: 'A cypress-wood pen that fits your hand.' },
  copper_pencil: { name: 'Copper Pencil', desc: "A copper mechanical pencil. The lead won't snap." },
  marker_sword: { name: 'Highlighter Sword', desc: 'A sword that makes the important parts glow.' },
  iron_mouse: { name: 'Iron Mouse', desc: 'Every click lands with a heavy blow.' },
  steel_keyboard: { name: 'Steel Keyboard', desc: 'Sweeps foes away with rapid keystrokes.' },
  shortcut_sword: { name: 'Shortcut Sword', desc: 'A legendary sword holding the power of Ctrl.' },
  mirror_rapier: { name: 'Mirror Rapier', desc: 'A slender blade polished like a mirror.' },
  dollar_lance: { name: 'Dollar Lance', desc: 'A "$"-shaped spearhead. It never drifts off target.' },
  anchor_axe: { name: 'Anchor Axe', desc: "A heavy axe forged from a ship's anchor." },
  branch_trident: { name: 'Branch Trident', desc: 'Three prongs, ready for any condition.' },
  loupe_blade: { name: 'Loupe Blade', desc: 'Its blade is a lens. It never loses sight of its target.' },
  index_spear: { name: 'Index Spear', desc: 'Pierces exactly the right row of the catalog.' },
  tally_hammer: { name: 'Tally Hammer', desc: 'Hammers scattered records into one.' },
  royal_scepter: { name: 'Royal Scepter', desc: "A king's staff that rules rows and columns alike." },
  quill_saber: { name: 'Quill Saber', desc: 'Cuts typos down in a single stroke.' },
  ampersand_blade: { name: 'Ampersand Blade', desc: 'An "&"-shaped blade that joins things into one.' },
  clockhand_spear: { name: 'Clock-Hand Spear', desc: "Forged from a broken clock's minute hand." },
  calendar_axe: { name: 'Calendar Axe', desc: 'One swing sweeps away a whole year.' },
  iferror_lance: { name: 'IFERROR Lance', desc: 'Deflects any error and pierces straight through.' },
  excel_sword: { name: 'Spreadsheet Sword', desc: "A legendary sword holding the power of seven towns. It slept in the Demon Lord's vault." },
  old_suit: { name: 'Trusty Suit', desc: 'The navy suit you wore before coming to this world.' },
  coolbiz: { name: 'Cool Biz Shirt', desc: 'Sweat? No problem.' },
  business_vest: { name: 'Business Vest', desc: 'Easy to move in, with plenty of pockets.' },
  new_suit: { name: 'Brand-New Suit', desc: 'Crisp and new. You stand up straighter.' },
  order_suit: { name: 'Tailored Suit', desc: 'A perfect fit. Dressed like a pro.' },
  silver_suit: { name: 'Silver Suit', desc: 'A glossy suit woven with silver thread.' },
  captain_coat: { name: "Captain's Coat", desc: 'A thick coat that braves sea wind and storm.' },
  librarian_robe: { name: "Librarian's Robe", desc: 'Absorbs attacks with the weight of knowledge.' },
  royal_suit: { name: 'Court Attire', desc: 'Formal wear the Chancellor approves of. Unshaken in any meeting.' },
  typesetter_apron: { name: "Typesetter's Apron", desc: 'A thick apron worn by artisans who handle lead type.' },
  moonphase_robe: { name: 'Moon-Phase Robe', desc: 'Embroidered with the phases of the moon. Time is on your side.' },
  hero_suit: { name: "Hero's Suit", desc: 'Said to be worn by someone who saved this world long ago.' },
  clipboard: { name: 'Clipboard', desc: 'A board that guards your papers. Helps you think calmly.' },
  iron_binder: { name: 'Iron Binder', desc: 'A thick binder. Stops both paperwork and attacks.' },
  laptop_shield: { name: 'Laptop Shield', desc: "Open, it's a shield. Closed, it's a club." },
  mirror_shield: { name: 'Mirror Shield', desc: 'A mirror shield that reflects attacks.' },
  buoy_shield: { name: 'Life-Ring Shield', desc: "Unsinkable. Even if you slip up, you'll float back." },
  catalog_shield: { name: 'Catalog Shield', desc: 'The cover of a thick catalog. Buys time to look things up.' },
  ledger_shield: { name: 'Ledger Shield', desc: 'A shield made from the ledger where every record gathers.' },
  galley_shield: { name: 'Type-Tray Shield', desc: 'A sturdy shield forged from a typesetting tray.' },
  hourglass_shield: { name: 'Hourglass Shield', desc: 'Falling sand slows attacks and gives you more time to think.' },
  sheet_shield: { name: 'Sheet Shield', desc: 'A shield of endless grid. Plenty of time to think.' },
  hachimaki: { name: 'Headband', desc: 'Gets you fired up.' },
  bluelight: { name: 'Blue-Light Glasses', desc: `See the screen clearly. ${MORE_CRIT}` },
  headphones: { name: 'NC Headphones', desc: 'Noise-canceling. Shut out the noise and focus.' },
  loupe: { name: 'Loupe Glasses', desc: `Never misses even a tiny "$". ${MORE_CRIT}` },
  captain_hat: { name: "Captain's Hat", desc: 'Stay calm and decide, even in a "what if".' },
  bookmark_band: { name: 'Bookmark Band', desc: `Never lose an important page. ${MORE_CRIT}` },
  pivot_crown: { name: 'Pivot Crown', desc: `A crown of wisdom that swaps rows and columns. ${MORE_CRIT}` },
  proof_glasses: { name: "Proofreader's Glasses", desc: `Never misses a single typo. ${MORE_CRIT}` },
  alarm_band: { name: 'Alarm Band', desc: `Never late for any deadline. ${MORE_CRIT}` },
  focus_crown: { name: 'Crown of Focus', desc: 'A crown that clears the mind. Instant Approval comes much more often.' },
}
