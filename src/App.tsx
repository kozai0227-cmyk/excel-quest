import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Field, type FieldHandle, type Strike } from './components/Field'
import { DialogBox, type DialogReq } from './components/DialogBox'
import { ShopSheet, type ShopReq } from './components/ShopSheet'
import { InnSheet, type InnReq } from './components/InnSheet'
import { Menu } from './components/Menu'
import { Study } from './components/Study'
import { QuestScreen } from './components/QuestScreen'
import { Battle } from './components/Battle'
import { Ending, NameEntry, Title, TouchPad } from './components/Screens'
import { EPILOGUE_STEPS, Prologue } from './components/Prologue'
import { Gallery, SoundTest } from './components/Gallery'
import { Unlock } from './components/Unlock'
import { MapView } from './components/MapView'
import { FuncCard } from './components/FuncCard'
import { ChestReward, type ChestReq } from './components/ChestReward'
import { BossGate, type BossGateReq } from './components/BossGate'
import { PuzzleGate, type PuzzleGateReq } from './components/PuzzleGate'
import { TravelMap, hopeLeft, travelLock } from './components/TravelMap'
import { FieldStatus, QuestProgress, type QuestNav } from './components/FieldHud'
import { SKILLS } from './data/skills'
import type { PortraitSrc } from './components/Portrait'
import { AreaBanner, areaBannerMs, type AreaBannerReq } from './components/AreaBanner'
import { MAPS, PLAYER_SPEC, SPEAKER_LOOKS, mapName } from './data/maps'
import { QUESTS, questLines, townQuests } from './data/quests'
import { CHAPTERS } from './data/chapters'
import { ENEMIES } from './data/bosses'
import { ITEM_IDS } from './data/items'
import { EQUIP } from './data/equipment'
import { STAR_BONUS, winReward } from './game/clear'
import { clearExplore } from './game/explore'
import { enemyName, npcName } from './data/en'
import { tr, useLang } from './game/lang'
import { gainExp, loadGame, maxHp, newGame, saveGame } from './game/progress'
import type { Dir, Exit, GameState, MapDef, NpcDef, Trick } from './game/types'
import { WALKABLE } from './game/tiles'
import { isTouchDevice, usePhoneLayout } from './game/layout'
import { bgm, sfx, useBgm } from './game/sound'
import type { SongName } from './data/music'
import { isNative } from './game/native'
import { askReviewAfter, isUnlocked, openUnlock, useUnlockScreen, useUnlocked } from './game/store'

type Scene = 'title' | 'name' | 'prologue' | 'field' | 'quest' | 'battle' | 'epilogue' | 'ending' | 'study'
interface BattleReq {
  id: string
  tutorial?: boolean
  /** 倒した ボスへの 再挑戦 */
  rematch?: boolean
  /** 見える 敵に 背中から ふれた／ふれられた */
  strike?: Strike
  scene: 'boss' | 'field' | 'forest' | 'cave' | 'temple' | 'ship' | 'library' | 'treasury' | 'printing' | 'clock' | 'castle'
}

/** ダンジョン・野外の 戦闘の 背景 */
const dungeonScene = (map: MapDef): BattleReq['scene'] =>
  map.id.startsWith('temple') ? 'temple' : map.id.startsWith('ship') ? 'ship' : map.id.startsWith('library') ? 'library' : map.id.startsWith('treasury') ? 'treasury' : map.id.startsWith('print') ? 'printing' : map.id.startsWith('clock') ? 'clock' : map.id.startsWith('castle') ? 'castle' : map.kind === 'dungeon' ? 'cave' : 'field'

/** ボスと 戦う 場所（背景） */
const bossScene = (id: string): BattleReq['scene'] =>
  id === 'mirage' ? 'temple' : id === 'captain' ? 'ship' : id === 'mitsukaranu' ? 'library' : id === 'barabaran' ? 'treasury' : id === 'mojibake' ? 'printing' : id === 'shimekiris' ? 'clock' : id === 'refera' ? 'castle' : ENEMIES[id]?.boss ? 'boss' : 'forest'

const INN_PRICE = 10
/** 開発用の URL（?quest= など）は 手元の ブラウザで だけ 使える（公開中の Web 版や アプリでは 無効） */
/** 向きごとの 1歩 と 反対の 向き */
const STEP: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const BACK: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
const DEV_URL = !isNative && (import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(location.hostname))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function App() {
  const [scene, setScene] = useState<Scene>('title')
  const [gs, setGsState] = useState<GameState>(() => newGame('サトウ'))
  const gsRef = useRef(gs)
  gsRef.current = gs
  const setGs = useCallback((f: (g: GameState) => GameState) => {
    setGsState((g) => (gsRef.current = f(g)))
  }, [])

  const pos = useRef<{ x: number; y: number; dir: Dir }>({ x: gs.x, y: gs.y, dir: gs.dir })
  const [spawn, setSpawn] = useState({ x: gs.x, y: gs.y, dir: gs.dir as Dir, key: 0 })
  const [dialog, setDialog] = useState<DialogReq | null>(null)
  const [shop, setShop] = useState<ShopReq | null>(null)
  const [chest, setChest] = useState<ChestReq | null>(null)
  const [gate, setGate] = useState<BossGateReq | null>(null)
  const [puzzleGate, setPuzzleGate] = useState<PuzzleGateReq | null>(null)
  const [inn, setInn] = useState<InnReq | null>(null)
  const [menu, setMenu] = useState(false)
  const [review, setReview] = useState(false)
  /** はじめて フィールドに 出たときの「タップで 歩く」案内（数歩 歩くと 消える） */
  const [tapHint, setTapHint] = useState(() => {
    try {
      return !localStorage.getItem('excel-quest-tap-hint')
    } catch {
      return false
    }
  })
  /** 旅の地図（町を 選ぶ）を 開いているか */
  const [travel, setTravel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [questId, setQuestId] = useState<string | null>(null)
  const [battle, setBattle] = useState<BattleReq | null>(null)
  const [banner, setBanner] = useState<AreaBannerReq | null>(null)
  const [fade, setFade] = useState(false)
  const [whiteIn, setWhiteIn] = useState(false)
  const [flash, setFlash] = useState(false)
  const [chapter, setChapter] = useState(1)
  /** 教会で 見ている 関数の 解説（閉じると guideDone で 続きへ） */
  const [guide, setGuide] = useState<string | null>(null)
  const guideDone = useRef<(() => void) | null>(null)
  const showGuide = (id: string) =>
    new Promise<void>((resolve) => {
      guideDone.current = resolve
      setGuide(id)
    })
  const phone = usePhoneLayout()
  // 言語を 切りかえたら 画面 全体を 描きなおす
  useLang()
  // 全章解放：買ったら 峠の 見張りが いなくなるよう 描きなおす
  useUnlocked()
  const unlockOpen = useUnlockScreen()
  const dialogId = useRef(0)
  const fieldRef = useRef<FieldHandle>(null)

  const map = MAPS[gs.mapId] ?? MAPS.forest
  const quests = map.town ? townQuests(map.town) : []
  const solvedHere = quests.filter((q) => gs.solved.includes(q.id)).length
  const barrierOpen = quests.length > 0 && solvedHere === quests.length
  const townBoss = map.town ? MAPS[map.town].bossId : undefined

  // ---------------------------------------------------------------- スクリプト補助
  const portraitFor = (speaker?: string): PortraitSrc | undefined => {
    if (!speaker) return undefined
    if (speaker === gsRef.current.name) return { spec: PLAYER_SPEC }
    if (SPEAKER_LOOKS[speaker]) return { spec: SPEAKER_LOOKS[speaker] }
    const enemy = Object.values(ENEMIES).find((b) => b.name === speaker)
    return enemy ? { creature: enemy.sprite } : undefined
  }

  const talk = (speaker: string | undefined, pages: string[], choices?: string[], portrait?: PortraitSrc) =>
    new Promise<number>((resolve) => {
      setDialog({
        id: ++dialogId.current,
        speaker,
        pages,
        choices,
        portrait: portrait ?? portraitFor(speaker),
        resolve: (i) => {
          setDialog(null)
          resolve(i)
        },
      })
    })
  const me = (pages: string[]) => talk(gsRef.current.name, pages)

  const run = async (f: () => Promise<void>) => {
    setBusy(true)
    try {
      await f()
    } finally {
      setBusy(false)
    }
  }

  const save = () => saveGame({ ...gsRef.current, ...pos.current })

  const moveTo = (mapId: string, x: number, y: number, dir: Dir) => {
    const town = MAPS[mapId].kind === 'town' ? MAPS[mapId].town : undefined
    setGs((g) => ({ ...g, mapId, x, y, dir, lastTown: town ?? g.lastTown }))
    pos.current = { x, y, dir }
    setSpawn((s) => ({ x, y, dir, key: s.key + 1 }))
  }

  const showBanner = (id: string, first = false) => {
    if (!MAPS[id] || MAPS[id].kind === 'interior') return
    const req = { id, first, key: Date.now() }
    setBanner(req)
    setTimeout(() => setBanner((b) => (b === req ? null : b)), areaBannerMs(first))
  }

  const setFlag = (k: string) => setGs((g) => ({ ...g, flags: { ...g.flags, [k]: true } }))

  const startBattle = (req: BattleReq) => {
    sfx('encounter')
    bgm(null)
    setFlash(true)
    setTimeout(() => {
      setFlash(false)
      setBattle(req)
      setScene('battle')
    }, 450)
  }

  // ---------------------------------------------------------------- 開始
  const startGame = (g: GameState, next: Scene) => {
    setGsState(g)
    gsRef.current = g
    pos.current = { x: g.x, y: g.y, dir: g.dir }
    setSpawn((s) => ({ x: g.x, y: g.y, dir: g.dir, key: s.key + 1 }))
    setScene(next)
  }

  const continueGame = () => {
    const loaded = loadGame()
    if (!loaded) return
    // 旧バージョンのセーブ（森の導入がない）にも対応
    if (loaded.flags.intro) Object.assign(loaded.flags, { forest_intro: true, tutorial: true, visit_celuno: true })
    // マップ改修前のセーブで壁の中にいる場合は、町の入口に戻す
    if (loaded.mapId === 'world') {
      const t = MAPS[loaded.lastTown ?? 'celuno'] ?? MAPS.celuno
      Object.assign(loaded, { mapId: t.id, x: t.spawn.x, y: t.spawn.y, dir: t.spawn.dir })
    }
    const m = MAPS[loaded.mapId] ?? MAPS.forest
    const ok = WALKABLE.has(m.tiles[loaded.y]?.[loaded.x] ?? '#')
    const g = ok && MAPS[loaded.mapId] ? loaded : { ...loaded, mapId: m.id, x: m.spawn.x, y: m.spawn.y, dir: m.spawn.dir }
    startGame(g, 'field')
    showBanner(g.mapId)
  }

  // 開発用：?quest=ID / ?boss=ID（&scene=背景） / ?prologue / ?at=マップ,x,y（&first） / ?ending=章 / ?chest=どうぐ・装備ID・金額 / ?gate=ボスID（&hp=） / ?puzzle=石版ID（&solved=） / ?inn=HP,所持金
  useEffect(() => {
    if (!DEV_URL) return
    const p = new URLSearchParams(location.search)
    if (p.has('prologue')) return setScene('prologue')
    if (p.has('epilogue')) return setScene('epilogue')
    if (p.has('study')) return setScene('study')
    const test = { ...newGame(tr('サトウ', 'Sato')), level: 5, exp: 140, hp: maxHp(5), flags: { forest_intro: true, tutorial: true, visit_celuno: true, visit_world: true, intro: true } }
    const at = p.get('at')?.split(',')
    const ch = p.get('chest')
    const innHp = p.get('inn')
    if (innHp !== null) {
      // 宿屋の シートだけを 見る（?inn=HP、?inn=HP,所持金）
      const [h, gd] = innHp.split(',').map(Number)
      startGame({ ...test, mapId: 'celuno', x: 10, y: 10, hp: Number.isFinite(h) && innHp ? h : 18, gold: Number.isFinite(gd) ? gd : test.gold }, 'field')
      setTimeout(() => setInn({ title: mapName('celuno'), keeper: npcName('宿屋'), price: INN_PRICE, close: () => setInn(null) }), 300)
      return
    }
    if (ch) {
      // 宝箱の ごほうび画面だけを 見る（開けた あとの 状態に して 出す）
      const it = ITEM_IDS.find((id) => id === ch)
      const loot: { item?: (typeof ITEM_IDS)[number]; equip?: string; gold?: number } = it ? { item: it } : EQUIP[ch] ? { equip: ch } : { gold: Number(ch) || 60 }
      const g = { ...test, mapId: 'cave', x: 14, y: 21, dir: 'up' as const, gear: loot.equip ? [...test.gear, loot.equip] : test.gear, gold: test.gold + (loot.gold ?? 0), items: loot.item ? { ...test.items, [loot.item]: test.items[loot.item] + 1 } : test.items }
      startGame(g, 'field')
      setTimeout(() => setChest({ ...loot, close: () => setChest(null) }), 300)
      return
    }
    const pz = p.get('puzzle')
    if (pz && QUESTS[pz]?.kind === 'puzzle') {
      // 石版の 扉カードだけを 見る（?puzzle=クエストID、&solved=解いた扉ID,… で 進み具合も）
      const solved = (p.get('solved') ?? '').split(',').filter((id) => QUESTS[id])
      startGame({ ...test, solved, mapId: QUESTS[pz].town, x: MAPS[QUESTS[pz].town]?.spawn.x ?? 1, y: MAPS[QUESTS[pz].town]?.spawn.y ?? 1, dir: 'up' }, 'field')
      setTimeout(() => setPuzzleGate({ puzzleId: pz, close: () => setPuzzleGate(null) }), 300)
      return
    }
    const gb = p.get('gate')
    if (gb && ENEMIES[gb]) {
      // ボスの 挑戦カードだけを 見る（&hp=のこりHP で 減った ときの 見え方も）
      const hp = Number(p.get('hp')) || test.hp
      startGame({ ...test, hp, mapId: 'cave', x: 8, y: 5, dir: 'up' }, 'field')
      setTimeout(() => setGate({ bossId: gb, close: () => setGate(null) }), 300)
      return
    }
    if (at && MAPS[at[0]]) {
      startGame({ ...test, mapId: at[0], x: Number(at[1]), y: Number(at[2]), dir: 'down' }, 'field')
      // 場所カードも 出す（&first で はじめて 来たときの 形）
      setTimeout(() => showBanner(at[0], p.has('first')), 300)
      return
    }
    const end = Number(p.get('ending'))
    if (end) {
      // その章までを 解き終えた 状態で 見せる
      const done = CHAPTERS.filter((c) => c.no <= end)
      const solved = Object.values(QUESTS)
        .filter((q) => done.some((c) => c.towns.includes(q.town) || c.dungeons.includes(q.town)))
        .map((q) => q.id)
      setChapter(end)
      return startGame({ ...test, solved, bosses: done.flatMap((c) => c.bosses) }, 'ending')
    }
    const qid = p.get('quest')
    const bid = p.get('boss')
    if (qid && QUESTS[qid]) {
      startGame(test, 'quest')
      setQuestId(qid)
    } else if (bid && ENEMIES[bid]) {
      startGame(test, 'battle')
      const sc = p.get('scene') as BattleReq['scene'] | null
      const sk = p.get('strike')
      setBattle({ id: bid, scene: sc ?? (ENEMIES[bid].boss ? 'boss' : 'field'), tutorial: bid === 'celime_tutorial', strike: sk === 'first' || sk === 'ambush' ? sk : undefined })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 森で目覚める → セルイムとのチュートリアル戦
  useEffect(() => {
    if (scene !== 'field' || gs.mapId !== 'forest' || gs.flags.forest_intro) return
    setFlag('forest_intro')
    run(async () => {
      await sleep(1900)
      await me([tr('……う、うーん……。', 'Ugh... mmh...'), tr('ここは……森？ さっきまで オフィスに いたはずなのに……。', 'Where... a forest? I was in the office just a moment ago...')])
      await me([tr('（スーツのまま……。ネクタイも、ちゃんと 締めてる）', "(Still in my suit... My tie's even still on.)")])
      await talk(undefined, [tr('ガサガサッ！', 'Rustle rustle!'), tr('茂みの中から 緑色の 何かが 飛び出してきた！', 'Something green leaped out of the bushes!')])
      await talk('セルイム', [tr('ぷるるっ！ 見たことない ニンゲンだぷる！', "Wobble wobble! A human I've never seen before, wob!"), tr('セルの 基本も 知らないやつは、この森を 通さないぷる〜！', 'Nobody gets through this forest without knowing the basics of cells, wob!')])
      await me([tr('な、なんだこいつ！？ 四角い……ゼリー……？', 'Wh-what is this thing?! A... square... jelly...?')])
      startBattle({ id: 'celime_tutorial', tutorial: true, scene: 'forest' })
    })
  }, [scene, gs.mapId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- フィールドのイベント
  const interact = (npc: NpcDef) =>
    run(async () => {
      const g = gsRef.current
      const face: PortraitSrc | undefined = npc.look ? { spec: npc.look } : npc.creature ? { creature: npc.creature } : undefined
      const say = (pages: string[], choices?: string[]) => talk(npc.name, pages, choices, face)
      switch (npc.kind) {
        case 'talk':
        case 'guard': {
          await say(npc.linesAfter?.when(g) ? npc.linesAfter.lines : (npc.lines ?? []))
          break
        }
        case 'unlock': {
          await say(npc.lines ?? [])
          await offerUnlock()
          break
        }
        case 'quest': {
          const q = QUESTS[npc.questId!]
          // 町の 代表は、ほかの 悩みが 残っているか どうかで 話し方が 変わる
          const lines = questLines(q, g.solved)
          if (g.solved.includes(q.id)) {
            await say(lines.thanks)
            break
          }
          const i = await say(lines.intro, [tr('たすける', 'Help'), tr('またこんど', 'Maybe later')])
          if (i === 0) {
            setQuestId(q.id)
            setScene('quest')
          } else await say([tr('そっか……。気が向いたら また 声をかけてね。', "I see... Talk to me again if you change your mind.")])
          break
        }
        case 'inn': {
          // 宿屋は 回復量と 料金が 先に 見える シートで 泊まる（会話の「はい／いいえ」では HP が どれだけ 戻るか わからなかった）
          await new Promise<void>((resolve) =>
            setInn({
              title: mapName(MAPS[g.mapId]?.town ?? g.mapId) || mapName(g.mapId),
              keeper: npcName(npc.name),
              portrait: face,
              price: INN_PRICE,
              close: () => {
                setInn(null)
                resolve()
              },
            }),
          )
          break
        }
        case 'shop':
        case 'gear': {
          // お店は 絵と 値段つきの カードの シートで 買う（会話の 選択肢では 何に 効くか わからなかった）
          const isGear = npc.kind === 'gear'
          const greet = isGear && npc.lines?.length ? npc.lines.join(' ') : tr('へい、らっしゃい！ 何に しやしょう？', 'Hey, welcome! What can I get you?')
          await new Promise<void>((resolve) =>
            setShop({
              kind: isGear ? 'gear' : 'item',
              title: mapName(g.mapId) || npcName(npc.name),
              keeper: npcName(npc.name),
              portrait: face,
              greet,
              stock: isGear ? (npc.stock ?? []) : ITEM_IDS,
              close: () => {
                setShop(null)
                resolve()
              },
            }),
          )
          await say([isGear ? tr('また 来てくれよな！', 'Come back anytime!') : tr('まいど！ また きてくれよ。', 'Thanks! Come again.')])
          break
        }
        case 'chest': {
          // 宝箱は 箱が 開いて 中身の カードが 出る ごほうび画面で 見せる（装備は その場で そうびできる）
          const loot = npc.loot ?? {}
          setFlag(`chest_${npc.id}`)
          let dupGold: number | undefined
          if (loot.item) {
            const id = loot.item
            setGs((g) => ({ ...g, items: { ...g.items, [id]: g.items[id] + 1 } }))
          }
          if (loot.gold) {
            const n = loot.gold
            setGs((g) => ({ ...g, gold: g.gold + n }))
          }
          if (loot.equip) {
            const id = loot.equip
            if (g.gear.includes(id)) {
              const n = Math.floor(EQUIP[id].price / 2)
              dupGold = n
              setGs((s2) => ({ ...s2, gold: s2.gold + n }))
            } else setGs((s2) => ({ ...s2, gear: [...s2.gear, id] }))
          }
          await new Promise<void>((resolve) =>
            setChest({
              ...loot,
              dupGold,
              close: () => {
                setChest(null)
                resolve()
              },
            }),
          )
          save()
          break
        }
        case 'ferry': {
          // 町と 町の 行き来は 旅の地図で（どの 町へも 行ける）
          await say(npc.lines ?? [tr('どこへでも 連れていくぜ。', "I'll take you anywhere.")])
          setTravel(true)
          break
        }
        case 'heal': {
          setGs((s2) => ({ ...s2, hp: maxHp(s2.level) }))
          await talk(undefined, [
            tr('ふしぎな 泉が、青白く 光っている。', 'A mysterious spring glows a pale blue.'),
            tr('泉の光が からだを つつみこんだ……。', 'The light of the spring wraps around you...'),
            tr('HPが まんたんに なった！', 'HP was fully restored!'),
          ])
          save()
          break
        }
        case 'church': {
          // 関数の 相談：その町で 学ぶ 関数・技を 選ぶと 解説を 見せる
          const town = MAPS[gsRef.current.mapId]?.town
          const townName = town ? MAPS[town].name : ''
          const ids = Object.keys(SKILLS).filter((id) => townName.endsWith(SKILLS[id].town))
          let first = true
          for (;;) {
            const i = await say(
              [
                first
                  ? tr('ようこそ、迷える 旅人よ。何か 困っている ことは ありますか？', 'Welcome, wandering traveler. Is something troubling you?')
                  : tr('ほかにも 困っている ことは ありますか？', 'Is anything else troubling you?'),
              ],
              [...ids.map((id) => SKILLS[id].name), tr('いいえ、だいじょうぶです', "No, I'm fine")],
            )
            first = false
            if (i < 0 || i >= ids.length) {
              await say([tr('あなたの 旅に 光が ありますように。', 'May light shine upon your journey.')])
              break
            }
            await showGuide(ids[i])
          }
          break
        }
        case 'boss': {
          const b = ENEMIES[npc.bossId!]
          if (b.intro.length) await say(b.intro)
          // 挑む 前に 挑戦カード（何回 正解で 勝てるか・何回 耐えられるか・出る 問題）で 決める
          const fight = await new Promise<boolean>((resolve) =>
            setGate({
              bossId: b.id,
              creature: npc.creature,
              close: (f) => {
                setGate(null)
                resolve(f)
              },
            }),
          )
          if (fight)
            startBattle({
              id: b.id,
              scene: bossScene(b.id),
              tutorial: b.id === 'celime_tutorial',
            })
          break
        }
      }
    })

  const onWarp = (ex: Exit) => {
    // ワールドマップは なくした。町の 外へ 出ようとしたら、1歩 もどして 旅の地図を 開く
    if (ex.to === 'world') {
      const p = pos.current
      const [dx, dy] = STEP[p.dir]
      moveTo(gsRef.current.mapId, p.x - dx, p.y - dy, BACK[p.dir])
      setTravel(true)
      return
    }
    const firstVisit = !gsRef.current.flags[`visit_${ex.to}`]
    // 建物・ダンジョンの 出入りは 扉の 音（町の 外へ 歩いて 出るときは 鳴らさない）
    const inside = (id: string) => MAPS[id]?.kind === 'interior' || MAPS[id]?.kind === 'dungeon'
    if (inside(ex.to) || inside(gsRef.current.mapId)) sfx('door')
    moveTo(ex.to, ex.tx, ex.ty, ex.dir)
    setFlag(`visit_${ex.to}`)
    const dest = MAPS[ex.to]
    showBanner(dest.id, firstVisit)
    // カルキュレの東門から はじめて 出たとき（第2章の はじまり）
    if (ex.to === 'world' && ex.tx === 37 && !gsRef.current.flags.visit_east) {
      setFlag('visit_east')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('東門を 出ると、完成したばかりの 橋が 海峡に かかっていた。', 'Outside the east gate, a newly finished bridge spanned the strait.'), tr('海の 向こうの 大地は、鏡のような 水たまりが 空を 映して きらきらと 光っている……。', 'Across the sea, puddles like mirrors reflected the sky and sparkled...')])
        await me([tr('（あの先に 鏡の町 サンショウが あるのか）', '(So Refton, the Town of Mirrors, is out there.)')])
      })
    }
    if (!firstVisit) return
    if (ex.to === 'world')
      run(async () => {
        await sleep(1000)
        await talk(undefined, [tr('森を 抜けると、見渡すかぎりの 大地が 広がっていた。', 'Past the forest, wide-open land stretched as far as the eye could see.'), tr('（北の方に 村が 見える。あそこを 目指そう）', "(I can see a village to the north. Let's head there.)"), isTouchDevice ? tr('（外では モンスターが 出る。気をつけて 進もう）', '(Monsters appear outside towns. Be careful.)') : tr('（外では モンスターが 出る。Shiftキーを 押しながら 移動すると 走れるぞ）', '(Monsters appear outside towns. Hold Shift while moving to run.)')])
      })
    if (ex.to === 'celuno')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        f?.emote('player', 'bang', 1200)
        await talk('長老', [tr('おーい！ おーい、旅の人ーっ！', 'Hey! Hey there, traveler!')])
        if (f) {
          // 長老が 家から 走ってくる
          f.spawn({ id: 'elder_event', x: 5, y: 8, name: '長老', look: SPEAKER_LOOKS['長老'], kind: 'talk', dir: 'down' })
          await f.walkTo('elder_event', ex.tx - 1, ex.ty, 120)
          f.face('elder_event', 'right')
          f.face('player', 'left')
          f.emote('elder_event', 'sweat', 2600)
        }
        await talk('長老', [tr('ぜぇ、ぜぇ……。年寄りに 全力疾走は こたえるわい……。', "Huff, huff... An old man shouldn't be sprinting like that...")])
        await talk('長老', [
          tr('おお、旅の人！ まさか 南の森から 来たのか？ セルイムに 襲われなかったかの？', "Ah, traveler! Did you really come from the southern forest? Weren't you attacked by a Cellime?"),
          tr('……なんと、問題に 答えて 退けたとな！ おぬし、「表の理（ことわり）」が 見える目を 持っておるのじゃな。', '...What?! You drove it off by answering its question? Then you have the eyes to see the "Law of the Sheet."'),
          tr('わしは この はじまりの村 セルノの 長老じゃ。', 'I am the Elder of Cellno, the Village of Beginnings.'),
          tr('いま この セルシア大陸は、魔王レフエラーの 呪いに おかされておる。', 'The continent of Cellsia now suffers under the curse of Demon Lord Referror.'),
          tr('魔王は 人々の「効率化」を 邪魔しておるのじゃ。表は 壊れ、数式は 消え、みな 手作業に 追われて……。', 'The Demon Lord stands in the way of efficiency. Tables break, formulas vanish, and everyone is buried in work done by hand...'),
          tr('一日が 雑用で 終わり、本当に やりたいことが 何もできん。', 'Whole days end in busywork, with no time left for what truly matters.'),
          tr('魔王の 狙いは、人々から「時間」を 奪うことなのじゃ。', "The Demon Lord's true aim is to steal people's time."),
        ])
        await me([tr('（時間を 奪う……）', '(Steal their time...)'), tr('（「お前の時間が、もったいない」……先輩の言葉が、頭をよぎった）', '("Your time is too valuable to waste." Kanzaki\'s words came back to me.)')])
        await talk('長老', [
          tr('どうか 村の者たちの 悩みを 聞いてやってくれんか。', "Would you please listen to the villagers' troubles?"),
          tr('頭の上に「！」が 出ている者が 困っておる。家の中に いる者も おるぞ。', 'Anyone with a "!" over their head needs help. Some of them are inside their houses, too.'),
          tr('全員を 助ければ、北のどうくつの 結界も とけるはずじゃ。', 'Help them all, and the barrier on the northern cave should lift.'),
          tr('村には 武器屋と 防具屋も ある。旅の支度を ととのえるとよいぞ。', 'The village also has a weapon shop and an armor shop. Get yourself ready for the journey.'),
          tr('わしは 自分の家に 戻っておる。困ったら いつでも 来なされ。では、たのんだぞ！', "I'll be back at my house. Come see me anytime you need help. I'm counting on you!"),
        ])
        if (f) {
          // 話し終わったら 家へ 帰っていく
          void f.walkTo('elder_event', 5, 8, 200).then(() => f.remove('elder_event'))
          await sleep(1400)
        }
        await talk(undefined, [tr('（建物の ドアから 中に 入れる。宿屋で 休んだり、教会で 関数の ことを 相談したり できるぞ。セーブは メニューから）', '(You can enter buildings through their doors. Rest at the inn, or ask about functions at the church. Save from the menu.)'), isTouchDevice ? tr('（行きたい 場所を タップすると 歩く。人や 看板を タップすると 話しかける。メニューは 右下の ボタン）', '(Tap where you want to go to walk there. Tap a person or sign to talk. The menu button is at the bottom right.)') : tr('（Enter / Z：話す・決定　Esc / X：メニュー　Shift：走る）', '(Enter / Z: Talk / OK　Esc / X: Menu　Shift: Run)')])
        save()
      })
    if (ex.to === 'cave')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('ひんやりとした 空気が ただよっている……。', 'A chilly breeze drifts through the air...'), tr('洞窟の奥から、ぷるぷると 何かが ふるえる音が 聞こえる。', 'From deep in the cave comes the sound of something wobbling.')])
        await me([tr('（奥へ進むには、石版の扉の 謎を 解かないと いけないみたいだ）', '(Looks like I have to solve the stone tablet doors to go deeper.)')])
        await talk(undefined, [isTouchDevice ? tr('（石版の扉を タップすると 謎解きが 始まる。洞窟の中でも モンスターが 出るぞ）', '(Tap a stone door to start its puzzle. Monsters appear in caves, too.)') : tr('（扉の前で 話すボタンを押すと 謎解きが 始まる。洞窟の中でも モンスターが 出るぞ）', '(Press the talk button in front of a door to start its puzzle. Monsters appear in caves, too.)')])
      })
    if (ex.to === 'tower1')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('石造りの 塔の中は、筆算の 書き損じが 床いっぱいに 散らばっている……。', 'Inside the stone tower, scraps of botched longhand math cover the floor...')])
        await me([tr('（扉の 計算の謎を 解きながら、最上階を 目指そう）', "(Let's solve the doors' math puzzles and head for the top floor.)")])
      })
    if (ex.to === 'tower3')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('塔の 屋上に 出た。冷たい 夜風が 吹きつける……。', 'You came out on the tower roof. A cold night wind blows...'), tr('石の扉の 向こうから、ゴリゴリと 筆算を する音が 聞こえる。', 'Beyond the stone door, you hear the scratch-scratch of someone doing longhand math.')])
      })
    if (ex.to === 'ship1')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('ぎしぎしと きしむ 船倉。潮の においに まじって、古い インクの においが する……。', 'The hold creaks and groans. Mixed with the smell of the sea is the smell of old ink...'), tr('床には「もしも」「もしも」と 書きなぐられた 紙が 散らばっている。', 'Papers scrawled with "What if? What if?" are scattered across the floor.')])
        await me([tr('（扉の 謎を 解きながら、船長室を 目指そう）', "(Let's solve the door puzzles and head for the captain's cabin.)")])
      })
    if (ex.to === 'ship2')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('船長室に 入ると、ランプの 青白い 光が ゆれた。', "As you enter the captain's cabin, the pale blue light of a lamp flickers."), tr('奥の 舵輪の 前に、ぼんやりと 光る 人影が 立っている……。', "In front of the ship's wheel at the back stands a faintly glowing figure...")])
      })
    if (ex.to === 'ifport')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, [tr('ここは 条件の港町 イフポート。', 'This is Ifport, the Harbor of Conditions.'), tr('潮風が 気持ちいい……が、桟橋には ぼろぼろの 帆を 張った 不気味な 船が 停まっている。', 'The sea breeze feels nice... but an eerie ship with tattered sails is moored at the pier.')])
        await talk(undefined, [tr('町の人々は、書類を 前に「うーん……」と 頭を かかえて 立ちつくしている。', 'The townspeople stand frozen over their paperwork, groaning and clutching their heads.')])
        f?.emote('player', 'bang', 1200)
        await talk('港長ミナト', [tr('そこの 旅の方！ 少し いいかな！', 'You there, traveler! Do you have a moment?')])
        if (f) {
          // 港長が 事務所から 走ってくる
          f.spawn({ id: 'minato_event', x: 4, y: 5, name: '港長ミナト', look: SPEAKER_LOOKS['港長ミナト'], kind: 'talk', dir: 'down' })
          await f.walkTo('minato_event', ex.tx, ex.ty + 1, 120)
          f.face('minato_event', 'up')
          f.face('player', 'down')
          f.emote('minato_event', 'sweat', 2600)
        }
        await talk('港長ミナト', [
          tr('ふぅ……。私は この港の 港長、ミナトだ。', "Phew... I'm Minato, the harbormaster here."),
          tr('サンショウの 鏡の霧を 晴らした 旅人……君の ことだね？ 港でも うわさに なっている。', "The traveler who cleared Refton's mirror fog... that's you, isn't it? The whole harbor is talking about it."),
          tr('見ての とおり、桟橋に 幽霊船が 居すわって しまってね。船長の 名は「モシナラバ」。', 'As you can see, a ghost ship has settled in at our pier. Its captain is called "Whatif."'),
          tr('あの船が 来てから、町の 者は みんな「もしも ○○だったら？」と 1件ずつ 悩み続けて、何も 決められなく なった。', 'Ever since that ship arrived, everyone in town agonizes over each case, "What if this? What if that?", and nobody can decide anything.'),
          tr('ルールを 決めて 自動で 判断する……そんな 当たり前の ことが、呪いで できなく なっているんだ。', 'Setting a rule and letting it decide automatically... the curse has taken away something that simple.'),
        ])
        await me([tr('（1件ずつ 目で 見て 判断……。会社でも、条件ごとに 手で 色を 塗ったり していたっけ）', '(Checking each case by eye... At the office, I used to color cells by hand for each condition, too.)'), tr('（「もし ○○なら △△」……表計算の IF関数 だ！）', '("If this, then that"... That\'s the IF function!)')])
        await talk('港長ミナト', [
          tr('町の 者たちの 悩みを 聞いてやって ほしい。', "Please listen to the townspeople's troubles."),
          tr('すべて 解決すれば、桟橋の 結界も とけるはずだ。', 'Solve them all, and the barrier on the pier should lift.'),
          tr('私は 事務所に いる。入港記録の 件で、あとで 相談させてくれ。', "I'll be in my office. I'd like to talk to you later about the arrival records."),
        ])
        if (f) {
          void f.walkTo('minato_event', 4, 5, 200).then(() => f.remove('minato_event'))
          await sleep(1400)
        }
        await talk(undefined, [tr('（IF の 答えに 文字を 使うときは " で 囲む。「以上」は >=、「以下」は <= と 書くぞ）', '(When IF returns text, wrap it in ". Write "at least" as >= and "at most" as <=.)')])
        save()
      })
    if (ex.to === 'clock1')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('チクタク、チクタク……塔の 中に 無数の 時計の 音が 響いている。', 'Tick-tock, tick-tock... Countless clocks echo through the tower.'), tr('どの 時計も、ばらばらの 時刻を 指している……。', 'Every clock shows a different time...')])
        await me([tr('（扉の 謎を 解きながら、時計塔の 最上階を 目指そう）', "(Let's solve the door puzzles and head for the top of the clock tower.)")])
      })
    if (ex.to === 'clock2')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('最上階。巨大な 歯車が 軋みながら 回っている。', 'The top floor. Giant gears grind as they turn.'), tr('歯車の 中心の 文字盤が ぎょろりと 動き、針の 腕が 伸びてきた……。', 'The clock face at the center of the gears rolls its eyes, and arms like clock hands reach out...')])
      })
    if (ex.to === 'castle1')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('黒い 石で 組まれた 城の 中は、赤い「#」の 文字が 壁一面に 浮かんでは 消えている。', 'Inside the castle of black stone, red "#" symbols flicker on and off across every wall.'), tr('#DIV/0!、#VALUE!、#NAME?、#REF!……どこかで 見た エラーの 文字ばかりだ。', "#DIV/0!, #VALUE!, #NAME?, #REF!... Errors you've seen somewhere before.")])
        await me([tr('（これまでの 町で 覚えた 力を 全部 使う時だ。扉の 謎を 解いて、玉座の間を 目指そう）', "(Time to use everything I've learned in every town. Let's solve the door puzzles and head for the throne room.)")])
      })
    if (ex.to === 'castle2')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('玉座の間。割れた ステンドグラスから、赤黒い 光が 差しこんでいる。', 'The throne room. Dark red light pours through the shattered stained glass.'), tr('玉座の 上の 影が、ゆっくりと 立ち上がった……。', 'The shadow on the throne slowly rises...')])
        await me([tr('（……いよいよだ）', '(...This is it.)')])
      })
    if (ex.to === 'hope')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, [tr('ここは 最果ての砦 ホープ。', "This is Fort Hope, at the World's Edge."), tr('北の 山の 向こうに、黒い 城が 見える……あれが 魔王レフエラーの 城だ。', "Beyond the northern mountains, you can see a black castle... Demon Lord Referror's castle.")])
        await talk(undefined, [tr('砦の 兵士たちは、赤い「#」の 文字が 浮かんだ 帳面を 前に 立ちすくんでいる……。', 'The fort\'s soldiers stand frozen in front of ledgers covered in red "#" symbols...')])
        f?.emote('player', 'bang', 1200)
        await talk('砦の長ガンバル', [tr('おお、来たか！ 待っていたぞ、旅の者！', "Oh, you've come! I've been waiting for you, traveler!")])
        if (f) {
          // 砦の長が 本営から 走ってくる
          f.spawn({ id: 'ganbaru_event', x: 4, y: 11, name: '砦の長ガンバル', look: SPEAKER_LOOKS['砦の長ガンバル'], kind: 'talk', dir: 'down' })
          await f.walkTo('ganbaru_event', ex.tx - 1, ex.ty, 120)
          f.face('ganbaru_event', 'right')
          f.face('player', 'left')
          f.emote('ganbaru_event', 'sweat', 2600)
        }
        await talk('砦の長ガンバル', [
          tr('ふう……。俺は この 砦を 預かる、ガンバルだ。', "Phew... I'm Ganbaru, commander of this fort."),
          tr('セルノから コヨミノまで、7つの 町を 救った 旅人……お前の 噂は 大陸じゅうに 届いている。', 'The traveler who saved seven towns, from Cellno to Calendra... Word of you has spread across the continent.'),
          tr('この 砦は 魔王城を 見張る 最後の 守り。だが 魔王レフエラーの 呪いで、帳面が エラーだらけに なってしまった。', "This fort is the last line of defense watching the Demon Lord's castle. But Demon Lord Referror's curse has filled our ledgers with errors."),
          tr('「#DIV/0!」「#VALUE!」「#NAME?」「#REF!」……赤い 文字が 出るたび、兵たちは 怖がって 表を 丸ごと 捨てて しまうんだ。', '"#DIV/0!", "#VALUE!", "#NAME?", "#REF!"... Every time red text appears, my soldiers panic and throw the whole table away.'),
          tr('そして 一から 手で 作り直す。……それこそが、魔王の 狙いなのさ。', "Then they rebuild it from scratch by hand. ...And that's exactly what the Demon Lord wants."),
        ])
        await me([tr('（エラーが 出たら、怖くて 全部 消して やり直す……。入社した ころの 自分も そうだった）', '(Getting scared of an error and deleting everything to start over... I used to do that when I first joined the company.)'), tr('（でも エラーは「ここが おかしいよ」という メッセージ。読めば、直し方が わかるんだ！）', '(But an error is a message saying "something\'s wrong here." Read it, and you\'ll know how to fix it!)')])
        await talk('砦の長ガンバル', [
          tr('どうか 砦の 者たちの 悩みを 聞いてやって くれ。', "Please listen to my soldiers' troubles."),
          tr('すべて 解決すれば、魔王城の 結界も とけるはずだ。', "Solve them all, and the barrier around the Demon Lord's castle should lift."),
          tr('俺は 本営に いる。出陣の 号令の 件で、あとで 相談させて くれ。', "I'll be at headquarters. I'd like to talk to you later about the call to march."),
        ])
        if (f) {
          void f.walkTo('ganbaru_event', 4, 11, 200).then(() => f.remove('ganbaru_event'))
          await sleep(1400)
        }
        await talk(undefined, [tr('（エラーは 種類で 原因が わかる。#DIV/0! は 0で 割った、#NAME? は 名前の 間違い、#REF! は 消えた セルを 参照。馬車で いつでも コヨミノに 戻れるぞ）', '(The type of error tells you the cause. #DIV/0! means you divided by 0, #NAME? means a misspelled name, #REF! means a reference to a deleted cell. You can take the carriage back to Calendra anytime.)')])
        save()
      })
    if (ex.to === 'koyomi')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, [tr('ここは 暦の里 コヨミノ。', 'This is Calendra, the Village of Calendars.'), tr('里の 真ん中に そびえる 時計塔が、300年 時を 刻み続けてきた 静かな 里だ。', 'A quiet village where the clock tower at its center has kept time for 300 years.')])
        await talk(undefined, [tr('しかし 時計塔の 針は ぐるぐると 逆回りし、里の 人々は 指を 折って 日付を 数えている……。', "But the clock tower's hands spin backward, and the villagers are counting dates on their fingers...")])
        f?.emote('player', 'bang', 1200)
        await talk('村長トキワ', [tr('おお……旅の 方、待って くだされ！', 'Oh... traveler, please wait!')])
        if (f) {
          // 村長が 家から 走ってくる
          f.spawn({ id: 'tokiwa_event', x: 4, y: 11, name: '村長トキワ', look: SPEAKER_LOOKS['村長トキワ'], kind: 'talk', dir: 'down' })
          await f.walkTo('tokiwa_event', ex.tx - 1, ex.ty, 140)
          f.face('tokiwa_event', 'right')
          f.face('player', 'left')
          f.emote('tokiwa_event', 'sweat', 2600)
        }
        await talk('村長トキワ', [
          tr('ぜぇ……ぜぇ……。わしは この 里の 村長、トキワじゃ。', 'Huff... huff... I am Tokiwa, chief of this village.'),
          tr('テキストリアの 文字を 取り戻した 旅人……あんたの ことじゃな？ 宿場長の 手紙が、ちゃんと 読める 文字で 届いたわい。', "You're the traveler who restored Textria's letters, aren't you? The warden's letter reached me in perfectly readable writing."),
          tr('実は 時計塔に「シメキリス」という 魔物が 棲みつき、里の 暦を 喰らって しまったのじゃ。', 'A monster called "Deadlinus" has made its nest in the clock tower and devoured our calendar.'),
          tr('「10日後は 何日か」「締め切りまで あと 何日か」「今日は 何曜日か」……誰も 数えられん。', '"What\'s the date 10 days from now?" "How many days until the deadline?" "What day of the week is it?" ...Nobody can count them anymore.'),
          tr('約束は 破られ、締め切りは 過ぎ、里は 大混乱じゃ……。', 'Promises are broken, deadlines are missed, and the village is in chaos...'),
        ])
        await me([tr('（日付の 計算……会社でも、納期や 締め切りを カレンダーで 指折り 数えてたっけ）', '(Date math... At the office, I used to count due dates and deadlines on my fingers with a calendar, too.)'), tr('（……表計算の 日付は ただの 数。足して 引けば いいんだ！）', '(...But in a spreadsheet, a date is just a number. You can add and subtract them!)')])
        await talk('村長トキワ', [
          tr('どうか 里の 者たちの 悩みを 聞いてやって くれんか。', "Won't you please listen to the villagers' troubles?"),
          tr('すべて 解決すれば、時計塔の 結界も とけるはずじゃ。', 'Solve them all, and the barrier around the clock tower should lift.'),
          tr('わしは 家に おる。村人の 表彰の 件で、あとで 相談させて くれ。', "I'll be at home. I'd like to talk to you later about honoring the villagers."),
        ])
        if (f) {
          void f.walkTo('tokiwa_event', 4, 11, 220).then(() => f.remove('tokiwa_event'))
          await sleep(1400)
        }
        await talk(undefined, [tr('（表計算の 日付は「1日 ＝ 1」の 数。足せば 何日後、引けば 何日間。馬車で いつでも テキストリアに 戻れるぞ）', '(In a spreadsheet, a date is a number where 1 day = 1. Add to get days later, subtract to get days between. You can take the carriage back to Textria anytime.)')])
        save()
      })
    if (ex.to === 'print1')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('インクの においが 立ちこめる 印刷所。', 'A print shop thick with the smell of ink.'), tr('床に 散らばった 紙には「縺薙ｓ縺ｫ縺｡縺ｯ」のような 読めない 文字が びっしり 刷られている……。', 'The papers scattered on the floor are covered in unreadable gibberish like "縺薙ｓ縺ｫ縺｡縺ｯ"...')])
        await me([tr('（扉の 謎を 解きながら、印刷所の 奥を 目指そう）', "(Let's solve the door puzzles and head for the back of the print shop.)")])
      })
    if (ex.to === 'print2')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('奥の間。巨大な 印刷機の 上で、文字の 渦が ぐるぐると 回っている。', 'The back room. A whirlpool of letters spins above a giant printing press.'), tr('渦が ゆっくりと 人の 形を とり、2つの ちぐはぐな 目が 光った……。', 'The whirlpool slowly takes a human shape, and two mismatched eyes light up...')])
      })
    if (ex.to === 'textria')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, [tr('ここは 文字の宿場町 テキストリア。', 'This is Textria, the Post Town of Letters.'), tr('旅人の 手紙や 看板、書物を 一手に 引き受ける、文字の 町だ。', "A town of letters that handles all of the travelers' mail, signs and books.")])
        await talk(undefined, [tr('しかし 看板も 張り紙も、文字が ぐちゃぐちゃに 化けて 読めない……。', 'But the letters on every sign and poster are garbled beyond reading...')])
        f?.emote('player', 'bang', 1200)
        await talk('宿場長カキコ', [tr('あら、旅の方！ ちょうど よかった、お待ちになって！', 'Oh, a traveler! What perfect timing. Please wait!')])
        if (f) {
          // 宿場長が 屋敷から 走ってくる
          f.spawn({ id: 'kakiko_event', x: 4, y: 11, name: '宿場長カキコ', look: SPEAKER_LOOKS['宿場長カキコ'], kind: 'talk', dir: 'down' })
          await f.walkTo('kakiko_event', ex.tx - 1, ex.ty, 120)
          f.face('kakiko_event', 'right')
          f.face('player', 'left')
          f.emote('kakiko_event', 'sweat', 2600)
        }
        await talk('宿場長カキコ', [
          tr('はぁ……はぁ……。わたくし、この 宿場の 宿場長、カキコと 申します。', "Huff... huff... I'm Kakiko, the warden of this post town."),
          tr('王都の 帳簿を 取り戻した 旅の方……あなたの ことね？ 宰相さまから 手紙が 届いて……届いた けれど、文字が 化けて 半分 読めなかったわ。', "You're the traveler who recovered the capital's ledger, aren't you? The chancellor sent me a letter... It arrived, but half of it was garbled and unreadable."),
          tr('北の 活版印刷所に「モジバケーラ」という 魔物が 住みついてから、町の 文字が みんな 化けて しまったの。', 'Ever since a monster called "Mojibakera" moved into the print shop to the north, every letter in town has gone garbled.'),
          tr('名前を つなげば 化け、コードを 切り分ければ 化け……。みんな 1文字ずつ 手で 書き写しては、また 間違えて。', 'Join names, and they garble. Split codes, and they garble... Everyone copies them out by hand, letter by letter, and makes mistakes all over again.'),
        ])
        await me([tr('（1文字ずつ 書き写す……会社でも、姓と 名を つなげたり、コードを 分けたりするのに 何時間も かけてたな）', '(Copying letter by letter... At the office, I used to spend hours joining first and last names or splitting codes, too.)'), tr('（……文字列関数だ。& で つなぎ、LEFT や MID で 切り取る 魔法！）', '(...Text functions! The magic of joining with & and cutting with LEFT and MID!)')])
        await talk('宿場長カキコ', [
          tr('どうか 宿場の 者たちの 悩みを 聞いてやって。', "Please listen to the townspeople's troubles."),
          tr('すべて 解決すれば、印刷所の 結界も とけるはず……。', 'Solve them all, and the barrier around the print shop should lift...'),
          tr('わたくしは 屋敷に いるわ。伝書鳩の あて先の 件で、あとで 相談させて ちょうだい。', "I'll be at my residence. I'd like to talk to you later about the carrier pigeons' addresses."),
        ])
        if (f) {
          void f.walkTo('kakiko_event', 4, 11, 200).then(() => f.remove('kakiko_event'))
          await sleep(1400)
        }
        await talk(undefined, [tr('（文字と 文字は「&」で つなぐ。文字を 数式に 書くときは " で 囲もう。馬車で いつでも ピボリアに 戻れるぞ）', '(Join text with "&". When you write text in a formula, wrap it in ". You can take the carriage back to Pivoria anytime.)')])
        save()
      })
    if (ex.to === 'treasury1')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('金銀の 財宝の あいだに、伝票の 紙切れが 吹雪のように 舞っている。', 'Among the gold and silver treasure, scraps of receipts swirl like a blizzard.'), tr('床から 天井まで、バラバラの 記録が 散らかり放題だ……。', 'From floor to ceiling, scattered records are strewn everywhere...')])
        await me([tr('（扉の 謎を 解きながら、宝物庫の 奥を 目指そう）', "(Let's solve the door puzzles and head for the back of the treasury.)")])
      })
    if (ex.to === 'treasury2')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('王の間。玉座の 前に、伝票の 山が うずたかく 積み上がっている。', "The King's Hall. A towering mountain of receipts is piled in front of the throne."), tr('紙の 山が ざわりと うごめき、赤い 目が 2つ 開いた……。', 'The mountain of paper rustles and stirs, and two red eyes open...')])
      })
    if (ex.to === 'pivoria')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, [tr('ここは 集計の王都 ピボリア。', 'This is Pivoria, the Royal Capital of Totals.'), tr('国じゅうの 記録が 集まり、王宮で 1つに まとめられる……はずの 都だ。', "The capital where records from across the kingdom are gathered and combined at the palace... or at least they're supposed to be.")])
        await talk(undefined, [tr('しかし 役所の 窓からは、伝票の 山に 埋もれた 役人たちの うめき声が 聞こえてくる……。', 'But from the government office windows come the groans of clerks buried under mountains of receipts...')])
        f?.emote('player', 'bang', 1200)
        await talk('宰相ヒョウマ', [tr('そこの 旅の方！ お待ちを！', 'You there, traveler! Please wait!')])
        if (f) {
          // 宰相が 館から 走ってくる
          f.spawn({ id: 'hyouma_event', x: 4, y: 11, name: '宰相ヒョウマ', look: SPEAKER_LOOKS['宰相ヒョウマ'], kind: 'talk', dir: 'down' })
          await f.walkTo('hyouma_event', ex.tx - 1, ex.ty, 120)
          f.face('hyouma_event', 'right')
          f.face('player', 'left')
          f.emote('hyouma_event', 'sweat', 2600)
        }
        await talk('宰相ヒョウマ', [
          tr('はぁ、はぁ……。失礼。わたくし、この 国の 宰相、ヒョウマと 申します。', 'Huff, huff... Pardon me. I am Hyoma, chancellor of this kingdom.'),
          tr('ルックアップの 大書庫を 救った 旅の方……あなたの ことですな？ 大臣サガスから 早馬で 知らせが 届いております。', "You're the traveler who saved the Great Library of Lookup, are you not? Minister Sagasu sent word by fast horse."),
          tr('実は 王宮の 宝物庫に「バラバラン」という 魔物が 居座り、王国の 記録を すべて バラバラに 散らかして しまったのです。', 'A monster called "Scatteron" has taken over the palace treasury and scattered every record in the kingdom.'),
          tr('「北の 地区の、夜の 分だけ」「東店の、パンの 分だけ」……条件が 2つに なった とたん、誰も 数えられず、足せず……。', '"Only the north district, only at night." "Only the east shop, only bread." ...The moment there are two conditions, no one can count or add anything.'),
          tr('陛下への 報告書は、もう ひと月も 止まった ままなのです。', 'The report to His Majesty has been stalled for a whole month.'),
        ])
        await me([tr('（条件が 2つ……会社でも「支店別・商品別の 売上」を 出すのに、毎月 徹夜してたな……）', '(Two conditions... At the office, I used to pull all-nighters every month to get "sales by branch and by product"...)'), tr('（……SUMIFS と COUNTIFS だ。条件を いくつでも 並べられる、集計の 魔法！）', '(...SUMIFS and COUNTIFS! The magic of totals that lets you line up as many conditions as you want!)')])
        await talk('宰相ヒョウマ', [
          tr('どうか 王都の 者たちの 悩みを 聞いてやって くだされ。', "Please listen to the troubles of the capital's people."),
          tr('すべて 解決すれば、王宮の 結界も とけるはず……。', 'Solve them all, and the barrier around the palace should lift...'),
          tr('わたくしは 館に おります。陛下に お見せする 収穫表の 件で、あとで ご相談させて くだされ。', "I'll be at my manor. I'd like to talk to you later about the harvest table for His Majesty."),
        ])
        if (f) {
          void f.walkTo('hyouma_event', 4, 11, 200).then(() => f.remove('hyouma_event'))
          await sleep(1400)
        }
        await talk(undefined, [tr('（SUMIF・COUNTIF の 最後に S が つくと、条件を いくつも 並べられる。馬車で いつでも ルックアップに 戻れるぞ）', '(Add an S to the end of SUMIF or COUNTIF, and you can line up as many conditions as you like. You can take the carriage back to Lookup anytime.)')])
        save()
      })
    if (ex.to === 'library1')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('天井まで 届く 書架が、迷路のように 並んでいる。', 'Bookshelves reaching the ceiling stand in rows like a maze.'), tr('床には「#N/A」と 書かれた 紙切れが、枯れ葉のように 散らばっている……。', 'Scraps of paper marked "#N/A" are scattered on the floor like dead leaves...')])
        await me([tr('（扉の 謎を 解きながら、書庫の 奥を 目指そう）', "(Let's solve the door puzzles and head for the back of the library.)")])
      })
    if (ex.to === 'library2')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('鎖で 閉ざされた 禁書の間。', 'The Forbidden Stacks, sealed with chains.'), tr('部屋の 奥で、巨大な 本が ゆっくりと 目を 開いた……。', 'At the back of the room, a giant book slowly opens its eyes...')])
      })
    if (ex.to === 'lookup')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, [tr('ここは 検索の城下町 ルックアップ。', 'This is Lookup, the Castle Town of Searching.'), tr('丘の 上の 城には、国じゅうの 記録を 集めた「大書庫」が あるという。', 'They say the castle on the hill holds a "Great Library" of records from across the kingdom.')])
        await talk(undefined, [tr('しかし 町の人々は、分厚い 帳簿を 1行ずつ 指で たどりながら「ない……ない……」と つぶやいている。', 'But the townspeople trace thick ledgers line by line with their fingers, muttering, "Not here... not here..."')])
        f?.emote('player', 'bang', 1200)
        await talk('大臣サガス', [tr('おお……！ そこの お方、お待ちくだされ！', 'Oh...! You there, please wait!')])
        if (f) {
          // 大臣が 館から 走ってくる
          f.spawn({ id: 'sagasu_event', x: 4, y: 11, name: '大臣サガス', look: SPEAKER_LOOKS['大臣サガス'], kind: 'talk', dir: 'down' })
          await f.walkTo('sagasu_event', ex.tx - 1, ex.ty, 120)
          f.face('sagasu_event', 'right')
          f.face('player', 'left')
          f.emote('sagasu_event', 'sweat', 2600)
        }
        await talk('大臣サガス', [
          tr('ふう、ふう……。わたくし、この 国の 大臣を 務めております、サガスと 申します。', 'Phew, phew... I am Sagasu, a minister of this kingdom.'),
          tr('イフポートの 幽霊船を 鎮めた 旅の方……あなたの ことですな？ 港の 船乗りから 聞いております。', "You're the traveler who calmed the ghost ship of Ifport, are you not? I heard it from the sailors at the harbor."),
          tr('実は この 城の 大書庫に「ミツカラーヌ」という 魔物が 巣くって しまいましてな。', 'You see, a monster called "Notfoundra" has made its nest in this castle\'s Great Library.'),
          tr('それ以来、帳簿や 目録から 何を 探しても 見つからず、「#N/A」という 不吉な 文字ばかり……。', 'Since then, whatever we search for in the ledgers and catalogs, we find nothing but the ominous words "#N/A"...'),
          tr('皆、1行ずつ 目で 探しては 見落とし、探しては 見落とし……。一日じゅう 探しものに 追われて おるのです。', 'Everyone searches line by line by eye and misses things, searches and misses again... We spend all day just looking for things.'),
        ])
        await me([tr('（1行ずつ 目で 探す……会社でも、取引先コードから 名前を 探すのに 何十分も かかってたっけ）', "(Searching line by line by eye... At the office, it used to take me ages to find a client's name from their code, too.)"), tr('（……VLOOKUP だ。番号を 渡せば、表の 中から 探し出してくれる 魔法！）', '(...VLOOKUP! The magic that finds things in a table when you give it a number!)')])
        await talk('大臣サガス', [
          tr('どうか 城下の 者たちの 悩みを 聞いてやって くだされ。', "Please listen to the townspeople's troubles."),
          tr('すべて 解決すれば、城門の 結界も とけるはず……。', 'Solve them all, and the barrier at the castle gate should lift...'),
          tr('わたくしは 館に おります。晩餐会の 在庫の 件で、あとで ご相談させて くだされ。', "I'll be at my manor. I'd like to talk to you later about the banquet stock."),
        ])
        if (f) {
          void f.walkTo('sagasu_event', 4, 11, 200).then(() => f.remove('sagasu_event'))
          await sleep(1400)
        }
        await talk(undefined, [tr('（VLOOKUP の 最後に 書く FALSE は「ぴったり 同じ 値を 探す」という 意味だ。定期船で いつでも イフポートに 戻れるぞ）', '(The FALSE at the end of VLOOKUP means "find an exact match." You can take the ferry back to Ifport anytime.)')])
        save()
      })
    if (ex.to === 'temple1')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('神殿の 中は、床も 壁も 鏡のように 磨きあげられている。', 'Inside the temple, the floor and walls are polished like mirrors.'), tr('自分の 姿が いくつも 映って、どちらが 本物か わからなくなりそうだ……。', "So many reflections of yourself... it's hard to tell which one is real...")])
        await me([tr('（扉の 謎を 解きながら、奥の 大鏡を 目指そう）', "(Let's solve the door puzzles and head for the great mirror inside.)")])
      })
    if (ex.to === 'temple2')
      run(async () => {
        await sleep(900)
        await talk(undefined, [tr('天井まで 届く 巨大な 鏡が、部屋の 奥に そびえている。', 'A giant mirror reaching the ceiling towers at the back of the room.'), tr('鏡の 表面が、水面のように ゆらゆらと 揺れている……。', 'Its surface ripples like water...')])
      })
    if (ex.to === 'sansho')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, [tr('ここは 鏡の町 サンショウ。', 'This is Refton, the Town of Mirrors.'), tr('町の 真ん中を 境に、建物が 左右 そっくりに 並んでいる。まるで 鏡に 映したようだ。', 'The buildings on either side of the main street match perfectly, like reflections in a mirror.')])
        await talk(undefined, [tr('しかし 町の人々は、書類の 束を 抱えて 困りはてた 顔を している……。', 'But the townspeople are clutching stacks of papers, looking completely at a loss...')])
        f?.emote('player', 'bang', 1200)
        await talk('町長カガミ', [tr('あら……？ そこの方！ 少し お待ちになって！', 'Oh...? You there! Please wait a moment!')])
        if (f) {
          // 町長が 館から 走ってくる
          f.spawn({ id: 'kagami_event', x: 4, y: 10, name: '町長カガミ', look: SPEAKER_LOOKS['町長カガミ'], kind: 'talk', dir: 'down' })
          await f.walkTo('kagami_event', ex.tx + 1, ex.ty, 125)
          f.face('kagami_event', 'left')
          f.face('player', 'right')
          f.emote('kagami_event', 'sweat', 2600)
        }
        await talk('町長カガミ', [
          tr('はぁ、はぁ……。ごめんなさい、走るのは 苦手で……。', "Huff, huff... Forgive me, I'm not much of a runner..."),
          tr('わたくし、この町の 町長の カガミと 申します。', 'I am Kagami, the mayor of this town.'),
          tr('カルキュレの ゴーレムを 正気に 戻した 旅人さん……ですよね？ うわさは 届いています。', "You're the traveler who brought the golem in Calcule back to its senses, aren't you? Word travels fast."),
          tr('実は この町も、魔王の 手下「ズレズレ・ミラージュ」の 呪いに かかっているのです。', "You see, our town is under a curse too, cast by the Demon Lord's minion, the Shifty Mirage."),
          tr('数式を 1つ 作って コピーすると、参照が 勝手に ずれて、答えが めちゃくちゃに なってしまう……。', 'Whenever we write a formula and copy it, the references shift on their own and the answers come out all wrong...'),
          tr('みんな 結局、1マスずつ 手で 直していて……手計算の 時代に 逆もどりです。', "So everyone ends up fixing every cell by hand... We're right back in the age of hand calculation."),
        ])
        await me([tr('（参照が ずれる……？ 数式を コピーしたら、ずれるのは 当たり前じゃ……？）', "(References shift...? Don't they always shift when you copy a formula...?)"), tr('（……いや。ずれて ほしくない 所まで ずれる、ってことか）', "(...Oh. They shift even where they shouldn't.)")])
        await talk('町長カガミ', [
          tr('町の者たちの 悩みを 聞いてあげて ください。', "Please listen to the townspeople's troubles."),
          tr('すべて 解決すれば、北の 鏡の神殿の 結界も とけるはず……。', 'If you solve them all, the barrier on the Mirror Temple to the north should lift...'),
          tr('わたくしは 館に おります。予算表の件で、あとで ご相談させて くださいね。', "I'll be at my manor. I'd like to consult you about our budget sheet later."),
        ])
        if (f) {
          void f.walkTo('kagami_event', 4, 10, 200).then(() => f.remove('kagami_event'))
          await sleep(1400)
        }
        await talk(undefined, [isTouchDevice ? tr('（この町では、数式を 作るとき「F4 ($)」ボタンで「$」を 付け外しできる）', '(In this town, the "F4 ($)" button adds or removes "$" while you build a formula.)') : tr('（この町では、数式の 入力中に F4キーで「$」を 付け外しできる。Mac は fn+F4）', '(In this town, press F4 while typing a formula to add or remove "$". On a Mac, use fn+F4.)')])
        save()
      })
    if (ex.to === 'calculet')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, [tr('ここは 計算の町 カルキュレ。', 'This is Calcule, the Town of Calculation.'), tr('町の人は みんな 紙と そろばんで 手計算に追われ、つかれきっているようだ……。', 'Everyone here is worn out from doing math by hand with paper and abacus...')])
        f?.emote('player', 'bang', 1200)
        await talk('町長カルク', [tr('むむっ！ そこの 旅人ー！ 待つので あーる！', 'Hmm?! You there, traveler! Wait right there, harrumph!')])
        if (f) {
          // 町長が 役場から 走ってくる
          f.spawn({ id: 'calk_event', x: 28, y: 10, name: '町長カルク', look: SPEAKER_LOOKS['町長カルク'], kind: 'talk', dir: 'down' })
          await f.walkTo('calk_event', ex.tx + 1, ex.ty, 125)
          f.face('calk_event', 'left')
          f.face('player', 'right')
          f.emote('calk_event', 'sweat', 2600)
        }
        await talk('町長カルク', [
          tr('ぜぇ、ぜぇ……。ワガハイが この町の 町長、カルクで あーる。', 'Huff, huff... I am Kalk, mayor of this fine town, harrumph!'),
          tr('セルノの 長老から 聞いておる。「表の理」が 見える 旅人とは、そなたのことで あるな？', 'The Elder of Cellno told me about a traveler who can see the "Law of the Sheet." That would be you, yes?'),
          tr('この町は 魔王の呪いで 数式が 消え、みな 手計算に 追われて 仕事が 終わらぬので あーる。', "The Demon Lord's curse has erased our formulas, and everyone is so busy calculating by hand that no work ever gets done, harrumph!"),
          tr('町の者の 悩みを 解決すれば、北の塔の 結界も とけるはず。どうか 力を 貸してほしいので あーる！', "Solve the townspeople's troubles, and the barrier on the northern tower should lift. Please lend us your strength, harrumph!"),
          tr('ワガハイは 役場に おる。月報の件で 相談が あるので、あとで 寄るので あーる！', "I'll be at the town hall. I need your advice on my monthly report, so do stop by, harrumph!"),
        ])
        if (f) {
          void f.walkTo('calk_event', 28, 10, 200).then(() => f.remove('calk_event'))
          await sleep(1400)
        }
        save()
      })
  }

  /** 閉じた石版の扉を調べた */
  /** ダンジョンの 仕掛け：正しく 選ぶと 進み、罠を 選ぶと 魔物に 不意を つかれる */
  const onTrick = (lines: string[], t: Trick) =>
    run(async () => {
      const f = gsRef.current.flags
      const partKey = `trick_${t.group}_${t.part ?? 0}`
      if (f[`trick_${t.group}`] || (t.parts && f[partKey])) {
        await talk(undefined, t.doneLines ?? lines)
        return
      }
      const i = await talk(undefined, lines, t.choices)
      if (t.correct.includes(i)) {
        sfx('correct')
        const g2 = { ...gsRef.current.flags, [partKey]: true }
        const solved = !t.parts || Array.from({ length: t.parts }, (_, k) => g2[`trick_${t.group}_${k}`]).every(Boolean)
        if (solved) g2[`trick_${t.group}`] = true
        setGs((g) => ({ ...g, flags: { ...g.flags, ...g2 } }))
        await talk(undefined, t.okLines ?? [tr('うまく いった！', 'It worked!')])
        if (solved) {
          sfx('chest')
          await talk(undefined, [tr('カチッ……！ どこかで 隠し宝箱が 現れる 音が した！', 'Click...! You hear a hidden treasure chest appear somewhere!')])
        } else if (t.parts) {
          const left = Array.from({ length: t.parts }, (_, k) => !g2[`trick_${t.group}_${k}`]).filter(Boolean).length
          await talk(undefined, [tr(`（のこり ${left}つ）`, `(${left} left)`)])
        }
        save()
      } else if (t.trap?.includes(i)) {
        sfx('wrong')
        await talk(undefined, [tr('ちがう……！ 物かげから 魔物が 飛び出してきた！', 'Wrong...! A monster leaps out from the shadows!')])
        const m = MAPS[gsRef.current.mapId]
        const p = fieldRef.current?.player()
        const table = (p && m.encounter?.(p.x, p.y)) || null
        if (table) startBattle({ id: table[Math.floor(Math.random() * table.length)], scene: dungeonScene(m), strike: 'ambush' })
      }
    })

  /** ダンジョンの フロアを くまなく 歩いた：踏破ボーナス（1フロア 1回） */
  const onExplored = (mapId: string) => {
    if (gsRef.current.flags[`explored_${mapId}`]) return
    const m = MAPS[mapId]
    let table: string[] | null = null
    for (let y = 0; y < m.tiles.length && !table; y++) for (let x = 0; x < m.tiles[y].length && !table; x++) table = m.encounter?.(x, y) ?? null
    const avg = table ? table.reduce((n, id) => n + (ENEMIES[id]?.gold ?? 0), 0) / table.length : 10
    const gold = Math.max(30, Math.round(avg * 3))
    setGs((g) => ({ ...g, gold: g.gold + gold, items: { ...g.items, herb: g.items.herb + 1 }, flags: { ...g.flags, [`explored_${mapId}`]: true } }))
    sfx('chest')
    run(async () => {
      await talk(undefined, [
        tr('フロアを くまなく 探索した！', 'You explored every corner of this floor!'),
        tr(`踏破ボーナス：${gold}ゴールドと やくそうを てにいれた！`, `Exploration bonus: got ${gold} gold and an Herb!`),
      ])
      save()
    })
  }

  const onGate = (puzzle: string) =>
    run(async () => {
      const q = QUESTS[puzzle]
      // 扉の 石版・やること・何枚目か を カードで 見せてから 決める
      const go = await new Promise<boolean>((resolve) =>
        setPuzzleGate({
          puzzleId: q.id,
          close: (g) => {
            setPuzzleGate(null)
            resolve(g)
          },
        }),
      )
      if (go) {
        setQuestId(q.id)
        setScene('quest')
      }
    })

  // ---------------------------------------------------------------- クエスト・戦闘の結果
  const onQuestClear = () => {
    const q = QUESTS[questId!]
    if (q.kind === 'puzzle') {
      const { gs: g1, msgs: lv } = gainExp(gsRef.current, q.reward.exp)
      setGs(() => ({ ...g1, solved: [...g1.solved, q.id] }))
      setQuestId(null)
      setScene('field')
      run(async () => {
        await talk(undefined, [...q.thanks, tr('ゴゴゴゴゴ……！', 'Rumble rumble...!'), tr('石の扉が ゆっくりと 開いた！', 'The stone door slowly opened!'), ...lv])
        save()
      })
      return
    }
    const { gs: g1, msgs: lv } = gainExp(gsRef.current, q.reward.exp)
    const items = { ...g1.items }
    if (q.reward.item) items[q.reward.item] += 1
    const g2: GameState = {
      ...g1,
      gold: g1.gold + q.reward.gold,
      items,
      skills: !q.reward.skill || g1.skills.includes(q.reward.skill) ? g1.skills : [...g1.skills, q.reward.skill],
      solved: [...g1.solved, q.id],
    }
    setGs(() => g2)
    setQuestId(null)
    setScene('field')
    const allDone = townQuests(q.town).every((x) => g2.solved.includes(x.id))
    run(async () => {
      await talk(q.npc, questLines(q, g2.solved).thanks)
      if (lv.length) await talk(undefined, lv)
      if (allDone)
        await talk(undefined, [
          tr(`${MAPS[q.town].name}の 悩みを すべて 解決した！`, `You solved every request in ${mapName(q.town).split(',')[0]}!`),
          tr('どこか遠くで、結界が とける音が した……！', 'Somewhere far away, you heard the sound of a barrier lifting...!'),
          q.town === 'celuno'
            ? tr('（北のどうくつに 入れるように なった。奥には 散らかりセルイムが いるらしい）', '(You can now enter the northern cave. Messy Cellime is said to lurk deep inside.)')
            : q.town === 'calculet'
              ? tr('（北の塔に 入れるように なった。最上階に 手計算ゴーレムが いるらしい）', '(You can now enter the northern tower. The Hand-Calc Golem is said to be on the top floor.)')
              : q.town === 'sansho'
                ? tr('（北の 鏡の神殿に 入れるように なった。最奥に ズレズレ・ミラージュが いるらしい）', '(You can now enter the Mirror Temple to the north. The Shifty Mirage is said to wait in its deepest hall.)')
                : q.town === 'lookup'
                  ? tr('（城門の 結界が とけ、大書庫に 入れるように なった。最奥に ミツカラーヌが いるらしい）', '(The barrier at the castle gate has lifted, and you can enter the Great Library. Notfoundra is said to wait in its depths.)')
                  : q.town === 'pivoria'
                    ? tr('（王宮の 結界が とけ、宝物庫に 入れるように なった。最奥に バラバランが いるらしい）', '(The barrier around the palace has lifted, and you can enter the treasury. Scatteron is said to wait in its depths.)')
                    : q.town === 'textria'
                      ? tr('（印刷所の 結界が とけ、中に 入れるように なった。奥の間に モジバケーラが いるらしい）', '(The barrier around the print shop has lifted, and you can go inside. Mojibakera is said to wait in the back room.)')
                      : q.town === 'koyomi'
                        ? tr('（時計塔の 結界が とけ、中に 入れるように なった。最上階に シメキリスが いるらしい）', '(The barrier around the clock tower has lifted, and you can go inside. Deadlinus is said to wait on the top floor.)')
                      : q.town === 'hope'
                        ? tr('（城門の 結界が とけ、魔王城に 入れるように なった。玉座の間に 魔王レフエラーが いるらしい）', "(The castle gate's barrier has lifted, and you can enter the Demon Lord's castle. Demon Lord Referror is said to wait in the throne room.)")
                  : tr('（桟橋の 結界が とけ、幽霊船に 乗りこめるように なった。船長室に モシナラバが いるらしい）', "(The barrier on the pier has lifted, and you can board the ghost ship. Captain Whatif is said to wait in the captain's cabin.)"),
        ])
      save()
    })
  }

  const onQuestClose = () => {
    const q = QUESTS[questId!]
    setQuestId(null)
    setScene('field')
    if (q.kind === 'puzzle') return
    run(async () => {
      await talk(q.npc, [tr('そっか……。また 気が向いたら たのむよ。', 'I see... Please help me if you change your mind.')])
    })
  }

  /** 倒した ボスに もう一度 挑む（HPは 満タンから。旅の地図・リザルト画面から） */
  const startRematch = (id: string) => {
    setTravel(false)
    setGs((g) => ({ ...g, hp: maxHp(g.level) }))
    startBattle({ id, scene: bossScene(id), rematch: true })
  }

  const onWin = (r?: { stars: number; retry?: boolean }) => {
    const req = battle!
    const b = ENEMIES[req.id]
    // ボス戦は クリア評価の ★で 報酬が 増える（再挑戦は 半分）。★3つなら 初回だけ ボスメダル
    const st = r ? { mult: 1 + STAR_BONUS * r.stars } : undefined
    const exp = winReward(b.exp, st, req.rematch)
    const gold = winReward(b.gold, st, req.rematch)
    const medal = r?.stars === 3 && !(gsRef.current.medals ?? []).includes(b.id)
    // 経験値・ゴールド・★・メダルは 戦闘の リザルト画面（BattleWin）で 見せた
    const { gs: g1 } = gainExp(gsRef.current, exp)
    setGs(() => ({
      ...g1,
      gold: g1.gold + gold,
      bosses: b.boss && !g1.bosses.includes(b.id) ? [...g1.bosses, b.id] : g1.bosses,
      ...(medal ? { medals: [...(g1.medals ?? []), b.id], items: { ...g1.items, sandglass: g1.items.sandglass + 1 } } : {}),
    }))
    setBattle(null)
    setScene('field')
    // 再挑戦：上がった けいけんちは そのままで、すぐ もう一度
    if (r?.retry) {
      setTimeout(() => {
        save()
        startRematch(b.id)
      }, 0)
      return
    }
    // 再挑戦の 勝利は お話（正気に もどる・外へ 出る など）を くり返さない
    if (req.rematch) {
      setTimeout(save, 0)
      return
    }
    run(async () => {
      if (req.tutorial) {
        setFlag('tutorial')
        await talk(undefined, [tr('セルイムは ぷるぷると ふるえながら、森の奥へ 逃げていった……。', 'The Cellime wobbled and fled deeper into the forest...')])
        await me([tr('はぁ、はぁ……。答えが わかると……攻撃できる……？', 'Huff, huff... Knowing the answer... lets me attack...?'), tr('どうなってるんだ、この世界は……。', 'What is going on with this world...?')])
        await me([tr('（とにかく、人のいる所を 探そう。道は 東に続いている）', "(Anyway, let's find some people. The path continues east.)")])
        save()
        return
      }
      if (!b.boss) return
      await talk(undefined, [tr(`${b.name}は 正気を とりもどした！`, `${enemyName(b)} came back to its senses!`), ...(b.defeatText ?? [])])
      // ダンジョンのボスを倒したら、自動で外へ出る
      const out = MAPS[gsRef.current.mapId]?.bossExit
      if (out) {
        const id = gsRef.current.mapId
        const place = id.startsWith('tower') ? '塔' : id.startsWith('temple') ? '神殿' : id.startsWith('ship') ? '船' : id.startsWith('library') ? '書庫' : id.startsWith('treasury') ? '宝物庫' : id.startsWith('print') ? '印刷所' : id.startsWith('clock') ? '時計塔' : id.startsWith('castle') ? '魔王城' : '洞窟'
        await talk(undefined, [
          tr(`ゴゴゴゴ……！ ${place}が ゆれはじめた！`, 'Rumble rumble...! Everything began to shake!'),
          tr(`${gsRef.current.name}は 急いで 外へ 飛び出した！`, `${gsRef.current.name} rushed outside!`),
        ])
        sfx('door')
        setFade(true)
        await sleep(600)
        moveTo(out.map, out.x, out.y, out.dir)
        showBanner(out.map)
        await sleep(700)
        setFade(false)
        await me([tr('はぁ、はぁ……なんとか 外に 出られた……。', 'Huff, huff... Made it out somehow...')])
      }
      if (b.id === 'slime') await talk(undefined, [tr('村の 人たちが 喜んでいる！', 'The villagers are overjoyed!')])
      if (b.id === 'golem')
        await talk(undefined, [tr('ゴーレムが 独り占めしていた 石材が、海峡の 工事現場へ 運ばれていった！', 'The stone the golem had hoarded was carried off to the construction site at the strait!')])
      if (b.id === 'mirage')
        await talk(undefined, [tr('大鏡が 割れた 瞬間、南の 峠を おおっていた「鏡の霧」が 晴れていく……！', 'The moment the great mirror shattered, the "mirror fog" covering the southern pass began to clear...!')])
      if (b.id === 'captain')
        await talk(undefined, [
          tr('幽霊船の 帆が 朝日を 浴びて、ただの 古い 帆船に もどっていく……。', "Bathed in the morning sun, the ghost ship's sails turn back into those of an ordinary old sailing ship..."),
          tr('港の あちこちから、船の 汽笛と 人々の 歓声が 聞こえてきた！', 'Ship whistles and cheers ring out all over the harbor!'),
        ])
      if (b.id === 'mitsukaranu')
        await talk(undefined, [
          tr('大書庫の 本たちが ひとりでに 棚へ 戻り、目録が 淡く 光りはじめた……。', "The Great Library's books return to their shelves on their own, and the catalogs begin to glow softly..."),
          tr('城下の あちこちで「あった！」「見つかった！」という 声が 上がっている！', 'All over town, people are shouting "Here it is!" and "Found it!"'),
        ])
      if (b.id === 'barabaran')
        await talk(undefined, [
          tr('散らばっていた 伝票が 1枚 残らず 綴じられ、宝物庫の 奥に 巨大な 帳簿が 現れた……。', 'Every last scattered receipt is bound together, and a giant ledger appears at the back of the treasury...'),
          tr('王都の 鐘が 鳴り響き、役所の あちこちから「集計 終わり！」という 歓声が 聞こえてきた！', 'The capital\'s bells ring out, and cheers of "Totals done!" come from every corner of the government office!'),
        ])
      if (b.id === 'mojibake')
        await talk(undefined, [
          tr('化けていた 活字が 1つずつ 元の 形に 戻り、印刷機が ふたたび 動き出した……。', 'One by one, the garbled type returns to its true shape, and the printing press starts up again...'),
          tr('宿場の あちこちで、手紙を 読み上げる 声と 笑い声が 聞こえてきた！', 'All over the post town, you hear people reading letters aloud and laughing!'),
        ])
      if (b.id === 'shimekiris')
        await talk(undefined, [
          tr('時計塔の 鐘が ゴーン……ゴーン……と 正しい 時を 打ちはじめた。', 'The clock tower bell begins to toll the correct time... Bong... bong...'),
          tr('里の あちこちで、カレンダーを めくる 音と「今日は 何日！」という 明るい 声が 響いている！', "All over the village, you hear calendar pages turning and cheerful voices calling out today's date!"),
        ])
      // つぎの 行き先の 案内（どの 町からでも 進める）
      if (b.id !== 'refera') {
        const left = hopeLeft(gsRef.current)
        await talk(undefined, [
          left > 0
            ? tr('（メニューの「たび」や 町の 出口から、旅の地図で 好きな 町へ 行ける）', '(Use "Travel" in the menu, or a town exit, to pick any town on the Travel Map.)')
            : tr('（すべての 町を 救った！ 旅の地図から「最果ての砦 ホープ」へ 行けるように なった）', '(You saved every town! You can now go to Hope, the Fort at the Edge, from the Travel Map.)'),
        ])
      }
      save()
      if (b.id === 'golem') {
        setChapter(1)
        setScene('ending')
      }
      if (b.id === 'mirage') {
        setChapter(2)
        setScene('ending')
      }
      if (b.id === 'captain') {
        setChapter(3)
        setScene('ending')
      }
      if (b.id === 'mitsukaranu') {
        setChapter(4)
        setScene('ending')
      }
      if (b.id === 'barabaran') {
        setChapter(5)
        setScene('ending')
      }
      if (b.id === 'mojibake') {
        setChapter(6)
        setScene('ending')
      }
      if (b.id === 'shimekiris') {
        setChapter(7)
        setScene('ending')
      }
      if (b.id === 'refera') {
        await talk(undefined, [tr('魔王城が 崩れ落ちる 轟音の 中、空が まっ白に 光った……。', "Amid the roar of the Demon Lord's castle crumbling, the sky flashes pure white...")])
        setScene('epilogue')
      }
    })
  }

  /** 旅の地図で 町を 選んだ */
  const travelTo = (id: string) =>
    run(async () => {
      const lock = travelLock(id, gsRef.current)
      if (lock === 'paid') {
        setTravel(false)
        return offerUnlock()
      }
      if (lock === 'hope') {
        await talk(undefined, [
          tr('最果ての砦は、魔王の 結界に 閉ざされている……。', 'The fort at the edge of the world is sealed by the Demon Lord\'s barrier...'),
          tr(`ほかの 町を 救って、ボスを あと ${hopeLeft(gsRef.current)}体 倒そう。`, `Save the other towns and defeat ${hopeLeft(gsRef.current)} more boss${hopeLeft(gsRef.current) > 1 ? 'es' : ''}.`),
        ])
        return
      }
      setTravel(false)
      const here = MAPS[gsRef.current.mapId]?.town ?? gsRef.current.mapId
      if (id === here && MAPS[gsRef.current.mapId]?.kind === 'town') return
      const m = MAPS[id]
      sfx('door')
      setFade(true)
      await sleep(600)
      onWarp({ x: 0, y: 0, to: id, tx: m.spawn.x, ty: m.spawn.y, dir: m.spawn.dir })
      await sleep(700)
      setFade(false)
    })

  /** 第3章から 先を 遊ぶには 全章解放が 要る、と 伝えて 購入画面へ */
  const offerUnlock = async () => {
    const i = await talk(
      undefined,
      [
        tr('無料で 遊べるのは 第2章（セルノ・カルキュレ・サンショウ）まで です。', 'The free part of the game covers Chapters 1–2 (Cellno, Calcule and Refton).'),
        isNative
          ? tr(
              '「全章解放」を 購入すると、第3章から 最終章までの 冒険と、ふくしゅうの書の すべての 章が 遊べます。',
              'Buy "Unlock All Chapters" to play Chapter 3 through the Final Chapter, plus every chapter of the Book of Review.',
            )
          : tr('この 先の 冒険（第3章〜最終章）は、iPhone アプリ版で 遊べます。', 'The rest of the adventure (Chapter 3 to the Final Chapter) is available in the iPhone app.'),
      ],
      [tr('くわしく 見る', 'Learn more'), tr('あとで', 'Later')],
    )
    if (i === 0) openUnlock()
  }

  const onLose = () => {
    const req = battle!
    setBattle(null)
    setScene('field')
    // 再挑戦で 負けても 罰なし（HPを もどして その場に）
    if (req.rematch) {
      setGs((g) => ({ ...g, hp: maxHp(g.level) }))
      run(async () => {
        await talk(undefined, [tr('……ボスの 前から 押し戻されてしまった。', '...You were pushed back from the boss.'), tr('（再挑戦なので、お金は 減らなかった）', "(It was a rematch, so you didn't lose any gold.)")])
        save()
      })
      return
    }
    if (req.tutorial) {
      setGs((g) => ({ ...g, hp: maxHp(g.level) }))
      run(async () => {
        await talk(undefined, [tr('……気がつくと、セルイムは まだ 目の前に いた。', '...When you came to, the Cellime was still right in front of you.')])
        await me([tr('（もう一度だ。落ち着いて 答えれば きっと 勝てる）', '(One more time. If I stay calm and answer, I can win.)')])
        startBattle({ id: 'celime_tutorial', tutorial: true, scene: 'forest' })
      })
      return
    }
    const town = gsRef.current.lastTown
    const r = town ? MAPS[town].respawn : undefined
    setGs((g) => ({ ...g, hp: maxHp(g.level), gold: Math.floor(g.gold / 2) }))
    if (r) moveTo(r.map, r.x, r.y, 'up')
    else moveTo('forest', MAPS.forest.spawn.x, MAPS.forest.spawn.y, 'right')
    run(async () => {
      await talk(r ? '神父' : undefined, [
        tr('……気が ついたようですね。ここは 町の 教会です。', "...Ah, you're awake. This is the town church."),
        tr('無理は いけません。学びに 近道は ありませんから。', "Don't push yourself. There are no shortcuts to learning."),
        tr('（所持金が 半分に なった）', '(You lost half your gold.)'),
        tr('関数で 迷ったら、わたしに 相談なさい。宿屋で 休んでから、また いどむのも よいでしょう。', 'If functions confuse you, come talk to me. You might also rest at the inn before trying again.'),
      ])
      save()
    })
  }

  const onFlee = () => {
    setBattle(null)
    setScene('field')
  }

  const doorHint = (ex: Exit) => {
    const dest = MAPS[ex.to]
    return dest?.kind === 'interior' && dest.npcs.some((n) => n.kind === 'quest' && !gsRef.current.solved.includes(n.questId!))
  }

  // 次に 話す 依頼人：この マップに いれば その人、家の 中なら いちばん 近い「！」の ドア
  const unsolvedNpc = (n: NpcDef) => n.kind === 'quest' && !!n.questId && !gs.solved.includes(n.questId) && !n.hideIf?.(gs)
  const navKey = scene === 'field' && quests.length && !barrierOpen ? `${map.id}|${gs.solved.join(',')}|${spawn.key}` : ''
  const questNav = useMemo<QuestNav | undefined>(() => {
    if (!navKey) return undefined
    const here = fieldRef.current?.player() ?? pos.current ?? { x: gs.x, y: gs.y }
    const dist = (x: number, y: number) => Math.abs(x - here.x) + Math.abs(y - here.y)
    const near = <T extends { x: number; y: number }>(list: T[]) => list.sort((a, b) => dist(a.x, a.y) - dist(b.x, b.y))[0]
    const npc = near(map.npcs.filter(unsolvedNpc))
    const door = npc ? undefined : near(map.exits.filter((ex) => MAPS[ex.to]?.kind === 'interior' && MAPS[ex.to].npcs.some(unsolvedNpc)))
    const who = npc ?? (door && MAPS[door.to].npcs.find(unsolvedNpc))
    if (!who) return undefined
    const target = () => (npc ? (fieldRef.current?.pos(npc.id) ?? npc) : door!)
    return {
      name: npcName(who.name),
      inside: !npc,
      where() {
        const p = fieldRef.current?.player()
        if (!p) return null
        const t = target()
        return { px: p.x, py: p.y, tx: t.x, ty: t.y }
      },
      onGo() {
        if (pausedRef.current) return
        sfx('select')
        const t = target()
        fieldRef.current?.goTo(t.x, t.y)
      },
    }
  }, [navKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- 描画
  const inWorld = scene === 'field' || scene === 'quest' || scene === 'battle'

  // BGM（戦闘と プロローグは その画面の中で 切りかえる）
  const music: SongName | null | undefined =
    scene === 'title' || scene === 'name'
      ? 'title'
      : scene === 'study' || review
        ? 'quest'
      : scene === 'ending'
        ? 'ending'
        : scene === 'quest'
          ? 'quest'
          : scene === 'battle' || scene === 'prologue' || scene === 'epilogue'
            ? undefined
            : map.kind === 'town' || map.kind === 'interior'
              ? 'town'
              : map.id.startsWith('castle')
                ? 'castle'
                : map.kind === 'dungeon'
                ? 'dungeon'
                : 'field'
  useBgm(/gallery|soundtest|mapview/.test(location.search) ? null : music)
  const paused = scene !== 'field' || !!dialog || menu || review || travel || busy || flash || unlockOpen || !!guide
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  if (DEV_URL && location.search.includes('gallery')) return <Gallery />
  if (DEV_URL && location.search.includes('soundtest')) return <SoundTest />
  const mapview = DEV_URL ? new URLSearchParams(location.search).get('mapview') : null
  if (mapview) return <MapView id={mapview} plain={location.search.includes('plain')} />

  return (
    <div className={`app ${phone ? 'phone' : ''}`}>
      <div className="screen">
        {scene === 'title' && <Title save={loadGame()} onNew={() => setScene('name')} onContinue={continueGame} onStudy={() => setScene('study')} />}
        {scene === 'study' && <Study gs={loadGame()} fromTitle onClose={() => setScene('title')} />}
        {scene === 'name' && (
          <NameEntry
            onDone={(name) => {
              clearExplore()
              startGame(newGame(name), 'prologue')
            }}
          />
        )}
        {scene === 'prologue' && (
          <Prologue
            name={gs.name}
            onDone={() => {
              setScene('field')
              setWhiteIn(true)
              setTimeout(() => setWhiteIn(false), 2000)
              setTimeout(() => showBanner(gsRef.current.mapId, true), 900)
            }}
          />
        )}
        {scene === 'epilogue' && (
          <Prologue
            name={gs.name}
            steps={EPILOGUE_STEPS}
            onDone={() => {
              setChapter(8)
              setScene('ending')
            }}
          />
        )}
        {scene === 'ending' && (
          <Ending
            chapter={chapter}
            gs={gs}
            onDone={() => {
              setScene('field')
              // 無料で 遊べるのは 第2章まで。続きの 案内を 出す
              if (chapter === 2 && !isUnlocked())
                run(async () => {
                  await sleep(700)
                  await offerUnlock()
                })
              // 区切りの いい 章では、フィールドに 戻って ひと息 ついてから 評価を お願いする
              else setTimeout(() => askReviewAfter(chapter), 1500)
            }}
          />
        )}

        {inWorld && (
          <>
            <Field
              ref={fieldRef}
              map={map}
              spawn={spawn}
              paused={paused}
              gs={gs}
              barrierOpen={barrierOpen}
              onInteract={interact}
              onSign={(lines, sign) => (sign.trick ? onTrick(sign.lines, sign.trick) : run(async () => void (await talk(undefined, lines))))}
              onWarp={onWarp}
              onMove={(x, y, dir) => {
                pos.current = { x, y, dir }
                if (tapHint) {
                  setTapHint(false)
                  try {
                    localStorage.setItem('excel-quest-tap-hint', '1')
                  } catch {
                    /* 保存できなくても 動く */
                  }
                }
              }}
              onMenu={() => {
                sfx('select')
                setMenu(true)
              }}
              onEncounter={(id, strike) =>
                startBattle({
                  id,
                  strike,
                  scene: dungeonScene(map),
                })
              }
              onGate={onGate}
              onExplored={onExplored}
              doorHint={doorHint}
            />
            {scene === 'field' && !menu && !review && (
              <>
                <FieldStatus
                  gs={gs}
                  onOpen={() => {
                    if (paused) return
                    sfx('select')
                    setMenu(true)
                  }}
                />
                {quests.length > 0 &&
                  (townBoss && gs.bosses.includes(townBoss) ? (
                    <div className="hud-quest hq-note peace">{tr('★ この町は 平和になった', '★ Peace has returned')}</div>
                  ) : barrierOpen ? (
                    <div className="hud-quest hq-note open">{tr('⚔ 北の結界が とけた！', '⚔ The barrier is gone!')}</div>
                  ) : (
                    <QuestProgress town={map.town ?? map.id} solved={solvedHere} total={quests.length} nav={questNav} />
                  ))}
              </>
            )}
            {banner && scene === 'field' && <AreaBanner key={banner.key} req={banner} gs={gs} />}
            {fade && <div className="fade" />}
            {flash && <div className="encounter-flash" />}
            {whiteIn && <div className="white-in" />}
            {menu && (
              <Menu
                gs={gs}
                setGs={setGs}
                onSave={save}
                onClose={() => setMenu(false)}
                onReview={() => {
                  setMenu(false)
                  setReview(true)
                }}
                onTravel={() => {
                  setMenu(false)
                  setTravel(true)
                }}
                onTitle={() => {
                  setMenu(false)
                  setReview(false)
                  setScene('title')
                }}
              />
            )}
            {isTouchDevice && scene === 'field' && !menu && !review && !travel && !dialog && (
              <button
                type="button"
                className="field-menu-btn"
                aria-label={tr('メニュー', 'Menu')}
                onClick={() => {
                  if (paused) return
                  sfx('select')
                  setMenu(true)
                }}
              >
                <span className="fm-bars" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                {tr('メニュー', 'Menu')}
              </button>
            )}
            {isTouchDevice && scene === 'field' && tapHint && !paused && (
              <div className="tap-hint" aria-hidden>
                {tr('👆 行きたい 場所や 人を タップ', '👆 Tap a place or person to go there')}
              </div>
            )}
            {review && scene === 'field' && <Study gs={gs} onClose={() => setReview(false)} />}
            {shop && scene === 'field' && <ShopSheet req={shop} gs={gs} setGs={setGs} />}
            {chest && scene === 'field' && <ChestReward req={chest} gs={gs} setGs={setGs} />}
            {gate && scene === 'field' && <BossGate req={gate} gs={gs} />}
            {puzzleGate && scene === 'field' && <PuzzleGate req={puzzleGate} gs={gs} />}
            {inn && scene === 'field' && <InnSheet req={inn} gs={gs} setGs={setGs} />}
            {travel && scene === 'field' && !busy && <TravelMap gs={gs} onPick={travelTo} onRematch={startRematch} onClose={() => setTravel(false)} />}
            {scene === 'battle' && battle && (
              <Battle
                key={`${battle.id}-${spawn.key}`}
                bossId={battle.id}
                tutorial={battle.tutorial}
                rematch={battle.rematch}
                strike={battle.strike}
                scene={battle.scene}
                gs={gs}
                setGs={setGs}
                onWin={onWin}
                onLose={onLose}
                onFlee={onFlee}
              />
            )}
          </>
        )}
        {dialog && scene !== 'prologue' && scene !== 'epilogue' && <DialogBox key={dialog.id} req={dialog} />}
        {guide && (
          <FuncCard
            id={guide}
            learned={gs.skills.includes(guide)}
            onClose={() => {
              setGuide(null)
              guideDone.current?.()
            }}
          />
        )}
        {unlockOpen && <Unlock />}
      </div>
      {/* スマホの 縦画面では、戦闘中は ボタンを しまって 画面を 広く使う（コマンドは タップで 選べる） */}
      {/* フィールドは 画面を タップして 歩く（十字キーは 出さない）。タブレットの 戦闘だけ ボタンを 残す */}
      {isTouchDevice && scene === 'battle' && !phone && <TouchPad />}
      {scene === 'quest' && questId && <QuestScreen quest={QUESTS[questId]} exp={gs.exp} onClear={onQuestClear} onClose={onQuestClose} />}
    </div>
  )
}
