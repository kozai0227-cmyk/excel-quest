import { useCallback, useEffect, useRef, useState } from 'react'
import { Field, type FieldHandle } from './components/Field'
import { DialogBox, type DialogReq } from './components/DialogBox'
import { Menu } from './components/Menu'
import { QuestScreen } from './components/QuestScreen'
import { Battle } from './components/Battle'
import { Ending, NameEntry, Title, TouchPad } from './components/Screens'
import { Prologue } from './components/Prologue'
import { Gallery, SoundTest } from './components/Gallery'
import type { PortraitSrc } from './components/Portrait'
import { MAPS, PLAYER_SPEC, SPEAKER_LOOKS } from './data/maps'
import { QUESTS, townQuests } from './data/quests'
import { ENEMIES } from './data/bosses'
import { ITEMS, ITEM_IDS } from './data/items'
import { EQUIP, SLOT_NAME, effectText } from './data/equipment'
import { gainExp, loadGame, maxHp, newGame, saveGame } from './game/progress'
import type { Dir, Exit, GameState, NpcDef } from './game/types'
import { WALKABLE } from './game/tiles'
import { isTouchDevice, usePhoneLayout } from './game/layout'
import { bgm, jingle, sfx, useBgm } from './game/sound'
import type { SongName } from './data/music'

type Scene = 'title' | 'name' | 'prologue' | 'field' | 'quest' | 'battle' | 'ending'
interface BattleReq {
  id: string
  tutorial?: boolean
  scene: 'boss' | 'field' | 'forest' | 'cave' | 'temple' | 'ship' | 'library'
}

const INN_PRICE = 10
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
  const [menu, setMenu] = useState(false)
  const [busy, setBusy] = useState(false)
  const [questId, setQuestId] = useState<string | null>(null)
  const [battle, setBattle] = useState<BattleReq | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [fade, setFade] = useState(false)
  const [whiteIn, setWhiteIn] = useState(false)
  const [flash, setFlash] = useState(false)
  const [chapter, setChapter] = useState(1)
  const phone = usePhoneLayout()
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

  const showBanner = (name: string) => {
    setBanner(name)
    setTimeout(() => setBanner((b) => (b === name ? null : b)), 2200)
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
    const m = MAPS[loaded.mapId] ?? MAPS.forest
    const ok = WALKABLE.has(m.tiles[loaded.y]?.[loaded.x] ?? '#')
    const g = ok && MAPS[loaded.mapId] ? loaded : { ...loaded, mapId: m.id, x: m.spawn.x, y: m.spawn.y, dir: m.spawn.dir }
    startGame(g, 'field')
    showBanner(MAPS[g.mapId].name)
  }

  // 開発用：?quest=ID / ?boss=ID / ?prologue / ?at=マップ,x,y / ?ending=章
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    if (p.has('prologue')) return setScene('prologue')
    const test = { ...newGame('テスト'), level: 5, exp: 140, hp: maxHp(5), flags: { forest_intro: true, tutorial: true, visit_celuno: true, visit_world: true, intro: true } }
    const at = p.get('at')?.split(',')
    if (at && MAPS[at[0]]) return startGame({ ...test, mapId: at[0], x: Number(at[1]), y: Number(at[2]), dir: 'down' }, 'field')
    const end = Number(p.get('ending'))
    if (end) {
      setChapter(end)
      return startGame(test, 'ending')
    }
    const qid = p.get('quest')
    const bid = p.get('boss')
    if (qid && QUESTS[qid]) {
      startGame(test, 'quest')
      setQuestId(qid)
    } else if (bid && ENEMIES[bid]) {
      startGame(test, 'battle')
      setBattle({ id: bid, scene: ENEMIES[bid].boss ? 'boss' : 'field', tutorial: bid === 'celime_tutorial' })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 森で目覚める → セルイムとのチュートリアル戦
  useEffect(() => {
    if (scene !== 'field' || gs.mapId !== 'forest' || gs.flags.forest_intro) return
    setFlag('forest_intro')
    run(async () => {
      await sleep(1900)
      await me(['……う、うーん……。', 'ここは……森？ さっきまで オフィスに いたはずなのに……。'])
      await me(['（スーツのまま……。ネクタイも、ちゃんと 締めてる）'])
      await talk(undefined, ['ガサガサッ！', '茂みの中から 緑色の 何かが 飛び出してきた！'])
      await talk('セルイム', ['ぷるるっ！ 見たことない ニンゲンだぷる！', 'セルの 基本も 知らないやつは、この森を 通さないぷる〜！'])
      await me(['な、なんだこいつ！？ ゼリー……いや、スライム……？'])
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
        case 'quest': {
          const q = QUESTS[npc.questId!]
          if (g.solved.includes(q.id)) {
            await say(q.thanks)
            break
          }
          const i = await say(q.intro, ['たすける', 'またこんど'])
          if (i === 0) {
            setQuestId(q.id)
            setScene('quest')
          } else await say(['そっか……。気が向いたら また 声をかけてね。'])
          break
        }
        case 'inn': {
          const i = await say([`旅人の宿屋へ ようこそ。ひとばん ${INN_PRICE}ゴールドですが、おとまりに なりますか？`], ['はい', 'いいえ'])
          if (i !== 0) {
            await say(['またの おこしを おまちしております。'])
            break
          }
          if (g.gold < INN_PRICE) {
            await say(['おや、ゴールドが 足りないようですね……。'])
            break
          }
          setGs((s) => ({ ...s, gold: s.gold - INN_PRICE, hp: maxHp(s.level) }))
          jingle('inn')
          setFade(true)
          await sleep(1200)
          setFade(false)
          await say(['おはようございます。ゆうべは よく おやすみでしたね。', 'HPが まんたんに なった！'])
          break
        }
        case 'shop': {
          let first = true
          for (;;) {
            const cur = gsRef.current
            const opts = [...ITEM_IDS.map((id) => `${ITEMS[id].name}　${ITEMS[id].price}G`), 'やめる']
            const i = await say([`${first ? 'いらっしゃい！ ' : ''}なにを かっていくかい？（所持金 ${cur.gold}G）`], opts)
            first = false
            if (i < 0 || i >= ITEM_IDS.length) {
              await say(['まいど！ また きてくれよ。'])
              break
            }
            const id = ITEM_IDS[i]
            if (cur.gold < ITEMS[id].price) {
              await say(['おっと、ゴールドが 足りないみたいだ。'])
              continue
            }
            setGs((s) => ({ ...s, gold: s.gold - ITEMS[id].price, items: { ...s.items, [id]: s.items[id] + 1 } }))
            await say([`${ITEMS[id].name}だね。まいど あり！`, `（${ITEMS[id].desc}）`])
          }
          break
        }
        case 'gear': {
          let first = true
          for (;;) {
            const cur = gsRef.current
            const stock = npc.stock ?? []
            const opts = [...stock.map((id) => `${EQUIP[id].name}　${EQUIP[id].price}G`), 'やめる']
            const greet = first ? [...(npc.lines ?? [])] : []
            const i = await say([...greet, `どれに するかね？（所持金 ${cur.gold}G）`], opts)
            first = false
            if (i < 0 || i >= stock.length) {
              await say(['また 来てくれよな！'])
              break
            }
            const id = stock[i]
            const e = EQUIP[id]
            const nowId = cur.equip[e.slot]
            const now = nowId ? `${EQUIP[nowId].name}（${effectText(EQUIP[nowId])}）` : 'なし'
            const j = await say([`${e.name}：${e.desc}`, `効果：${effectText(e)}　／　いまの${SLOT_NAME[e.slot]}：${now}`, `${e.price}ゴールドだが、かうかい？`], ['はい', 'いいえ'])
            if (j !== 0) continue
            if (cur.gear.includes(id)) {
              await say(['おや、それは もう 持っているようだね。'])
              continue
            }
            if (cur.gold < e.price) {
              await say(['おっと、ゴールドが 足りないみたいだ。'])
              continue
            }
            setGs((g) => ({ ...g, gold: g.gold - e.price, gear: [...g.gear, id] }))
            const k = await say([`まいど あり！ ${e.name}を てにいれた！`, 'いま ここで そうびして いくかい？'], ['はい', 'いいえ'])
            if (k === 0) {
              setGs((g) => ({ ...g, equip: { ...g.equip, [e.slot]: id } }))
              await talk(undefined, [`${gsRef.current.name}は ${e.name}を そうびした！`])
            } else await say(['メニューの「そうび」から いつでも 装備できるぜ。'])
          }
          break
        }
        case 'chest': {
          const loot = npc.loot ?? {}
          setFlag(`chest_${npc.id}`)
          const got: string[] = []
          if (loot.item) {
            const id = loot.item
            setGs((g) => ({ ...g, items: { ...g.items, [id]: g.items[id] + 1 } }))
            got.push(`${ITEMS[id].name}を てにいれた！`)
          }
          if (loot.gold) {
            const n = loot.gold
            setGs((g) => ({ ...g, gold: g.gold + n }))
            got.push(`${n}ゴールドを てにいれた！`)
          }
          if (loot.equip) {
            const id = loot.equip
            if (g.gear.includes(id)) {
              setGs((s2) => ({ ...s2, gold: s2.gold + Math.floor(EQUIP[id].price / 2) }))
              got.push(`${EQUIP[id].name}は もう 持っていたので、${Math.floor(EQUIP[id].price / 2)}ゴールドに かえた。`)
            } else {
              setGs((s2) => ({ ...s2, gear: [...s2.gear, id] }))
              got.push(`${EQUIP[id].name}を てにいれた！`, '（メニューの「そうび」で 装備できる）')
            }
          }
          await talk(undefined, [`${g.name}は たからばこを あけた！`, ...got])
          break
        }
        case 'ferry': {
          const f = npc.ferry!
          await say(npc.lines ?? [])
          const i = await say([`${f.place}へ 渡るかい？`], ['乗る', 'やめる'])
          if (i !== 0) break
          sfx('door')
          setFade(true)
          await sleep(600)
          onWarp({ x: npc.x, y: npc.y, to: f.to, tx: f.x, ty: f.y, dir: f.dir })
          await sleep(700)
          setFade(false)
          break
        }
        case 'heal': {
          setGs((s2) => ({ ...s2, hp: maxHp(s2.level) }))
          await talk(undefined, ['ふしぎな 泉が、青白く 光っている。', '泉の光が からだを つつみこんだ……。', 'HPが まんたんに なった！'])
          save()
          break
        }
        case 'church': {
          const i = await say(['迷える旅人よ。きょうは どんな ご用ですか？'], ['セーブする', 'やめる'])
          if (i === 0) {
            save()
            await say(['あなたの ぼうけんを きろくしました。', 'まだ 旅を つづけますか？ では、気をつけて。'])
          }
          break
        }
        case 'boss': {
          const b = ENEMIES[npc.bossId!]
          if (b.intro.length) await say(b.intro)
          const i = await talk(undefined, [`${b.name}と たたかいますか？`], ['たたかう', 'やめておく'])
          if (i === 0)
            startBattle({
              id: b.id,
              scene: b.id === 'mirage' ? 'temple' : b.id === 'captain' ? 'ship' : b.id === 'mitsukaranu' ? 'library' : b.boss ? 'boss' : 'forest',
              tutorial: b.id === 'celime_tutorial',
            })
          break
        }
      }
    })

  const onWarp = (ex: Exit) => {
    const firstVisit = !gsRef.current.flags[`visit_${ex.to}`]
    // 建物・ダンジョンの 出入りは 扉の 音（町の 外へ 歩いて 出るときは 鳴らさない）
    const inside = (id: string) => MAPS[id]?.kind === 'interior' || MAPS[id]?.kind === 'dungeon'
    if (inside(ex.to) || inside(gsRef.current.mapId)) sfx('door')
    moveTo(ex.to, ex.tx, ex.ty, ex.dir)
    setFlag(`visit_${ex.to}`)
    const dest = MAPS[ex.to]
    if (dest.kind !== 'interior') showBanner(dest.name)
    // カルキュレの東門から はじめて 出たとき（第2章の はじまり）
    if (ex.to === 'world' && ex.tx === 37 && !gsRef.current.flags.visit_east) {
      setFlag('visit_east')
      run(async () => {
        await sleep(900)
        await talk(undefined, ['東門を 出ると、完成したばかりの 橋が 海峡に かかっていた。', '海の 向こうの 大地は、鏡のような 水たまりが 空を 映して きらきらと 光っている……。'])
        await me(['（あの先に 鏡の町 サンショウが あるのか）'])
      })
    }
    if (!firstVisit) return
    if (ex.to === 'world')
      run(async () => {
        await sleep(1000)
        await talk(undefined, ['森を 抜けると、見渡すかぎりの 大地が 広がっていた。', '（北の方に 村が 見える。あそこを 目指そう）', '（外では モンスターが 出る。Shiftキーを 押しながら 移動すると 走れるぞ）'])
      })
    if (ex.to === 'celuno')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        f?.emote('player', 'bang', 1200)
        await talk('長老', ['おーい！ おーい、旅の人ーっ！'])
        if (f) {
          // 長老が 家から 走ってくる
          f.spawn({ id: 'elder_event', x: 5, y: 8, name: '長老', look: SPEAKER_LOOKS['長老'], kind: 'talk', dir: 'down' })
          await f.walkTo('elder_event', ex.tx - 1, ex.ty, 120)
          f.face('elder_event', 'right')
          f.face('player', 'left')
          f.emote('elder_event', 'sweat', 2600)
        }
        await talk('長老', ['ぜぇ、ぜぇ……。年寄りに 全力疾走は こたえるわい……。'])
        await talk('長老', [
          'おお、旅の人！ まさか 南の森から 来たのか？ セルイムに 襲われなかったかの？',
          '……なんと、問題に 答えて 退けたとな！ おぬし、「表の理（ことわり）」が 見える目を 持っておるのじゃな。',
          'わしは この はじまりの村 セルノの 長老じゃ。',
          'いま この セルシア大陸は、魔王レフエラーの 呪いに おかされておる。',
          '魔王は 人々の「効率化」を 邪魔しておるのじゃ。表は 壊れ、数式は 消え、みな 手作業に 追われて……。',
          '一日が 雑用で 終わり、本当に やりたいことが 何もできん。',
          '魔王の 狙いは、人々から「時間」を 奪うことなのじゃ。',
        ])
        await me(['（時間を 奪う……）', '（「お前の時間が、もったいない」……先輩の言葉が、頭をよぎった）'])
        await talk('長老', [
          'どうか 村の者たちの 悩みを 聞いてやってくれんか。',
          '頭の上に「！」が 出ている者が 困っておる。家の中に いる者も おるぞ。',
          '全員を 助ければ、北のどうくつの 結界も とけるはずじゃ。',
          '村には 武器屋と 防具屋も ある。旅の支度を ととのえるとよいぞ。',
          'わしは 自分の家に 戻っておる。困ったら いつでも 来なされ。では、たのんだぞ！',
        ])
        if (f) {
          // 話し終わったら 家へ 帰っていく
          void f.walkTo('elder_event', 5, 8, 200).then(() => f.remove('elder_event'))
          await sleep(1400)
        }
        await talk(undefined, ['（建物の ドアから 中に 入れる。宿屋で 休んだり、教会で セーブもできるぞ）', '（Enter / Z：話す・決定　Esc / X：メニュー　Shift：走る）'])
        save()
      })
    if (ex.to === 'cave')
      run(async () => {
        await sleep(900)
        await talk(undefined, ['ひんやりとした 空気が ただよっている……。', '洞窟の奥から、ぷるぷると 何かが ふるえる音が 聞こえる。'])
        await me(['（奥へ進むには、石版の扉の 謎を 解かないと いけないみたいだ）'])
        await talk(undefined, ['（扉の前で 話すボタンを押すと 謎解きが 始まる。洞窟の中でも モンスターが 出るぞ）'])
      })
    if (ex.to === 'tower1')
      run(async () => {
        await sleep(900)
        await talk(undefined, ['石造りの 塔の中は、筆算の 書き損じが 床いっぱいに 散らばっている……。'])
        await me(['（扉の 計算の謎を 解きながら、最上階を 目指そう）'])
      })
    if (ex.to === 'tower3')
      run(async () => {
        await sleep(900)
        await talk(undefined, ['塔の 屋上に 出た。冷たい 夜風が 吹きつける……。', '石の扉の 向こうから、ゴリゴリと 筆算を する音が 聞こえる。'])
      })
    if (ex.to === 'ship1')
      run(async () => {
        await sleep(900)
        await talk(undefined, ['ぎしぎしと きしむ 船倉。潮の においに まじって、古い インクの においが する……。', '床には「もしも」「もしも」と 書きなぐられた 紙が 散らばっている。'])
        await me(['（扉の 謎を 解きながら、船長室を 目指そう）'])
      })
    if (ex.to === 'ship2')
      run(async () => {
        await sleep(900)
        await talk(undefined, ['船長室に 入ると、ランプの 青白い 光が ゆれた。', '奥の 舵輪の 前に、ぼんやりと 光る 人影が 立っている……。'])
      })
    if (ex.to === 'ifport')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, ['ここは 条件の港町 イフポート。', '潮風が 気持ちいい……が、桟橋には ぼろぼろの 帆を 張った 不気味な 船が 停まっている。'])
        await talk(undefined, ['町の人々は、書類を 前に「うーん……」と 頭を かかえて 立ちつくしている。'])
        f?.emote('player', 'bang', 1200)
        await talk('港長ミナト', ['そこの 旅の方！ 少し いいかな！'])
        if (f) {
          // 港長が 事務所から 走ってくる
          f.spawn({ id: 'minato_event', x: 4, y: 5, name: '港長ミナト', look: SPEAKER_LOOKS['港長ミナト'], kind: 'talk', dir: 'down' })
          await f.walkTo('minato_event', ex.tx, ex.ty + 1, 120)
          f.face('minato_event', 'up')
          f.face('player', 'down')
          f.emote('minato_event', 'sweat', 2600)
        }
        await talk('港長ミナト', [
          'ふぅ……。私は この港の 港長、ミナトだ。',
          'サンショウの 鏡の霧を 晴らした 旅人……君の ことだね？ 港でも うわさに なっている。',
          '見ての とおり、桟橋に 幽霊船が 居すわって しまってね。船長の 名は「モシナラバ」。',
          'あの船が 来てから、町の 者は みんな「もしも ○○だったら？」と 1件ずつ 悩み続けて、何も 決められなく なった。',
          'ルールを 決めて 自動で 判断する……そんな 当たり前の ことが、呪いで できなく なっているんだ。',
        ])
        await me(['（1件ずつ 目で 見て 判断……。会社でも、条件ごとに 手で 色を 塗ったり していたっけ）', '（「もし ○○なら △△」……Excel の IF関数 だ！）'])
        await talk('港長ミナト', [
          '町の 者たちの 悩みを 聞いてやって ほしい。',
          'すべて 解決すれば、桟橋の 結界も とけるはずだ。',
          '私は 事務所に いる。入港記録の 件で、あとで 相談させてくれ。',
        ])
        if (f) {
          void f.walkTo('minato_event', 4, 5, 200).then(() => f.remove('minato_event'))
          await sleep(1400)
        }
        await talk(undefined, ['（IF の 答えに 文字を 使うときは " で 囲む。「以上」は >=、「以下」は <= と 書くぞ）'])
        save()
      })
    if (ex.to === 'library1')
      run(async () => {
        await sleep(900)
        await talk(undefined, ['天井まで 届く 書架が、迷路のように 並んでいる。', '床には「#N/A」と 書かれた 紙切れが、枯れ葉のように 散らばっている……。'])
        await me(['（扉の 謎を 解きながら、書庫の 奥を 目指そう）'])
      })
    if (ex.to === 'library2')
      run(async () => {
        await sleep(900)
        await talk(undefined, ['鎖で 閉ざされた 禁書の間。', '部屋の 奥で、巨大な 本が ゆっくりと 目を 開いた……。'])
      })
    if (ex.to === 'lookup')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, ['ここは 検索の城下町 ルックアップ。', '丘の 上の 城には、国じゅうの 記録を 集めた「大書庫」が あるという。'])
        await talk(undefined, ['しかし 町の人々は、分厚い 帳簿を 1行ずつ 指で たどりながら「ない……ない……」と つぶやいている。'])
        f?.emote('player', 'bang', 1200)
        await talk('大臣サガス', ['おお……！ そこの お方、お待ちくだされ！'])
        if (f) {
          // 大臣が 館から 走ってくる
          f.spawn({ id: 'sagasu_event', x: 4, y: 11, name: '大臣サガス', look: SPEAKER_LOOKS['大臣サガス'], kind: 'talk', dir: 'down' })
          await f.walkTo('sagasu_event', ex.tx - 1, ex.ty, 120)
          f.face('sagasu_event', 'right')
          f.face('player', 'left')
          f.emote('sagasu_event', 'sweat', 2600)
        }
        await talk('大臣サガス', [
          'ふう、ふう……。わたくし、この 国の 大臣を 務めております、サガスと 申します。',
          'イフポートの 幽霊船を 鎮めた 旅の方……あなたの ことですな？ 港の 船乗りから 聞いております。',
          '実は この 城の 大書庫に「ミツカラーヌ」という 魔物が 巣くって しまいましてな。',
          'それ以来、帳簿や 目録から 何を 探しても 見つからず、「#N/A」という 不吉な 文字ばかり……。',
          '皆、1行ずつ 目で 探しては 見落とし、探しては 見落とし……。一日じゅう 探しものに 追われて おるのです。',
        ])
        await me(['（1行ずつ 目で 探す……会社でも、取引先コードから 名前を 探すのに 何十分も かかってたっけ）', '（……VLOOKUP だ。番号を 渡せば、表の 中から 探し出してくれる 魔法！）'])
        await talk('大臣サガス', [
          'どうか 城下の 者たちの 悩みを 聞いてやって くだされ。',
          'すべて 解決すれば、城門の 結界も とけるはず……。',
          'わたくしは 館に おります。晩餐会の 在庫の 件で、あとで ご相談させて くだされ。',
        ])
        if (f) {
          void f.walkTo('sagasu_event', 4, 11, 200).then(() => f.remove('sagasu_event'))
          await sleep(1400)
        }
        await talk(undefined, ['（VLOOKUP の 最後に 書く FALSE は「ぴったり 同じ 値を 探す」という 意味だ。定期船で いつでも イフポートに 戻れるぞ）'])
        save()
      })
    if (ex.to === 'temple1')
      run(async () => {
        await sleep(900)
        await talk(undefined, ['神殿の 中は、床も 壁も 鏡のように 磨きあげられている。', '自分の 姿が いくつも 映って、どちらが 本物か わからなくなりそうだ……。'])
        await me(['（扉の 謎を 解きながら、奥の 大鏡を 目指そう）'])
      })
    if (ex.to === 'temple2')
      run(async () => {
        await sleep(900)
        await talk(undefined, ['天井まで 届く 巨大な 鏡が、部屋の 奥に そびえている。', '鏡の 表面が、水面のように ゆらゆらと 揺れている……。'])
      })
    if (ex.to === 'sansho')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, ['ここは 鏡の町 サンショウ。', '町の 真ん中を 境に、建物が 左右 そっくりに 並んでいる。まるで 鏡に 映したようだ。'])
        await talk(undefined, ['しかし 町の人々は、書類の 束を 抱えて 困りはてた 顔を している……。'])
        f?.emote('player', 'bang', 1200)
        await talk('町長カガミ', ['あら……？ そこの方！ 少し お待ちになって！'])
        if (f) {
          // 町長が 館から 走ってくる
          f.spawn({ id: 'kagami_event', x: 4, y: 10, name: '町長カガミ', look: SPEAKER_LOOKS['町長カガミ'], kind: 'talk', dir: 'down' })
          await f.walkTo('kagami_event', ex.tx + 1, ex.ty, 125)
          f.face('kagami_event', 'left')
          f.face('player', 'right')
          f.emote('kagami_event', 'sweat', 2600)
        }
        await talk('町長カガミ', [
          'はぁ、はぁ……。ごめんなさい、走るのは 苦手で……。',
          'わたくし、この町の 町長の カガミと 申します。',
          'カルキュレの ゴーレムを 正気に 戻した 旅人さん……ですよね？ うわさは 届いています。',
          '実は この町も、魔王の 手下「ズレズレ・ミラージュ」の 呪いに かかっているのです。',
          '数式を 1つ 作って コピーすると、参照が 勝手に ずれて、答えが めちゃくちゃに なってしまう……。',
          'みんな 結局、1マスずつ 手で 直していて……手計算の 時代に 逆もどりです。',
        ])
        await me(['（参照が ずれる……？ 数式を コピーしたら、ずれるのは 当たり前じゃ……？）', '（……いや。ずれて ほしくない 所まで ずれる、ってことか）'])
        await talk('町長カガミ', [
          '町の者たちの 悩みを 聞いてあげて ください。',
          'すべて 解決すれば、北の 鏡の神殿の 結界も とけるはず……。',
          'わたくしは 館に おります。予算表の件で、あとで ご相談させて くださいね。',
        ])
        if (f) {
          void f.walkTo('kagami_event', 4, 10, 200).then(() => f.remove('kagami_event'))
          await sleep(1400)
        }
        await talk(undefined, ['（この町では、数式の 入力中に F4キーで「$」を 付け外しできる。Mac は fn+F4）'])
        save()
      })
    if (ex.to === 'calculet')
      run(async () => {
        await sleep(1100)
        const f = fieldRef.current
        await talk(undefined, ['ここは 計算の町 カルキュレ。', '町の人は みんな 紙と そろばんで 手計算に追われ、つかれきっているようだ……。'])
        f?.emote('player', 'bang', 1200)
        await talk('町長カルク', ['むむっ！ そこの 旅人ー！ 待つので あーる！'])
        if (f) {
          // 町長が 役場から 走ってくる
          f.spawn({ id: 'calk_event', x: 28, y: 10, name: '町長カルク', look: SPEAKER_LOOKS['町長カルク'], kind: 'talk', dir: 'down' })
          await f.walkTo('calk_event', ex.tx + 1, ex.ty, 125)
          f.face('calk_event', 'left')
          f.face('player', 'right')
          f.emote('calk_event', 'sweat', 2600)
        }
        await talk('町長カルク', [
          'ぜぇ、ぜぇ……。ワガハイが この町の 町長、カルクで あーる。',
          'セルノの 長老から 聞いておる。「表の理」が 見える 旅人とは、そなたのことで あるな？',
          'この町は 魔王の呪いで 数式が 消え、みな 手計算に 追われて 仕事が 終わらぬので あーる。',
          '町の者の 悩みを 解決すれば、北の塔の 結界も とけるはず。どうか 力を 貸してほしいので あーる！',
          'ワガハイは 役場に おる。月報の件で 相談が あるので、あとで 寄るので あーる！',
        ])
        if (f) {
          void f.walkTo('calk_event', 28, 10, 200).then(() => f.remove('calk_event'))
          await sleep(1400)
        }
        save()
      })
  }

  /** 閉じた石版の扉を調べた */
  const onGate = (puzzle: string) =>
    run(async () => {
      const q = QUESTS[puzzle]
      const i = await talk(undefined, q.intro, ['謎を とく', 'やめておく'])
      if (i === 0) {
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
        await talk(undefined, [...q.thanks, 'ゴゴゴゴゴ……！', '石の扉が ゆっくりと 開いた！', ...lv])
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
      await talk(q.npc, q.thanks)
      if (lv.length) await talk(undefined, lv)
      if (allDone)
        await talk(undefined, [
          `${MAPS[q.town].name}の 悩みを すべて 解決した！`,
          'どこか遠くで、結界が とける音が した……！',
          q.town === 'celuno'
            ? '（北のどうくつに 入れるように なった。奥には 散らかりセルイムが いるらしい）'
            : q.town === 'calculet'
              ? '（北の塔に 入れるように なった。最上階に 手計算ゴーレムが いるらしい）'
              : q.town === 'sansho'
                ? '（北の 鏡の神殿に 入れるように なった。最奥に ズレズレ・ミラージュが いるらしい）'
                : q.town === 'lookup'
                  ? '（城門の 結界が とけ、大書庫に 入れるように なった。最奥に ミツカラーヌが いるらしい）'
                  : '（桟橋の 結界が とけ、幽霊船に 乗りこめるように なった。船長室に モシナラバが いるらしい）',
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
      await talk(q.npc, ['そっか……。また 気が向いたら たのむよ。'])
    })
  }

  const onWin = () => {
    const req = battle!
    const b = ENEMIES[req.id]
    const { gs: g1, msgs: lv } = gainExp(gsRef.current, b.exp)
    setGs(() => ({ ...g1, gold: g1.gold + b.gold, bosses: b.boss ? [...g1.bosses, b.id] : g1.bosses }))
    setBattle(null)
    setScene('field')
    run(async () => {
      await talk(undefined, [`${b.exp}ポイントの けいけんちを かくとく！`, `${b.gold}ゴールドを てにいれた！`, ...lv])
      if (req.tutorial) {
        setFlag('tutorial')
        await talk(undefined, ['セルイムは ぷるぷると ふるえながら、森の奥へ 逃げていった……。'])
        await me(['はぁ、はぁ……。答えが わかると……攻撃できる……？', 'どうなってるんだ、この世界は……。'])
        await me(['（とにかく、人のいる所を 探そう。道は 東に続いている）'])
        save()
        return
      }
      if (!b.boss) return
      await talk(undefined, [`${b.name}は 正気を とりもどした！`, ...(b.defeatText ?? [])])
      // ダンジョンのボスを倒したら、自動で外へ出る
      const out = MAPS[gsRef.current.mapId]?.bossExit
      if (out) {
        const id = gsRef.current.mapId
        const place = id.startsWith('tower') ? '塔' : id.startsWith('temple') ? '神殿' : id.startsWith('ship') ? '船' : id.startsWith('library') ? '書庫' : '洞窟'
        await talk(undefined, [`ゴゴゴゴ……！ ${place}が ゆれはじめた！`, `${gsRef.current.name}は 急いで 外へ 飛び出した！`])
        sfx('door')
        setFade(true)
        await sleep(600)
        moveTo(out.map, out.x, out.y, out.dir)
        showBanner(MAPS[out.map].name)
        await sleep(700)
        setFade(false)
        await me(['はぁ、はぁ……なんとか 外に 出られた……。'])
      }
      if (b.id === 'slime') await talk(undefined, ['東の橋の 見張りに 知らせが 届いた！', '（ワールドマップの 東の橋を 渡って、計算の町 カルキュレへ 行けるように なった）'])
      if (b.id === 'golem')
        await talk(undefined, ['ゴーレムが 独り占めしていた 石材が、海峡の 工事現場へ 運ばれていった！', '（カルキュレの 東から、鏡の町 サンショウへ 行けるように なった）'])
      if (b.id === 'mirage')
        await talk(undefined, ['大鏡が 割れた 瞬間、南の 峠を おおっていた「鏡の霧」が 晴れていく……！', '（サンショウの 南の 峠を 越えて、港町 イフポートへ 行けるように なった）'])
      if (b.id === 'captain')
        await talk(undefined, [
          '幽霊船の 帆が 朝日を 浴びて、ただの 古い 帆船に もどっていく……。',
          '港の あちこちから、船の 汽笛と 人々の 歓声が 聞こえてきた！',
          '（止まっていた 南の 海の 定期船が 動き出した。桟橋の 船乗りに 話せば、海の 向こうへ 渡れるらしい）',
        ])
      if (b.id === 'mitsukaranu')
        await talk(undefined, [
          '大書庫の 本たちが ひとりでに 棚へ 戻り、目録が 淡く 光りはじめた……。',
          '城下の あちこちで「あった！」「見つかった！」という 声が 上がっている！',
        ])
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
    })
  }

  const onLose = () => {
    const req = battle!
    setBattle(null)
    setScene('field')
    if (req.tutorial) {
      setGs((g) => ({ ...g, hp: maxHp(g.level) }))
      run(async () => {
        await talk(undefined, ['……気がつくと、セルイムは まだ 目の前に いた。'])
        await me(['（もう一度だ。落ち着いて 答えれば きっと 勝てる）'])
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
        'おお 迷える旅人よ。まだ 学ぶべきことが あるようですね。',
        '（所持金が 半分に なった）',
        'メニューの「スキル」で 復習するか、宿屋で 休んでから また いどみなさい。',
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

  // ---------------------------------------------------------------- 描画
  const inWorld = scene === 'field' || scene === 'quest' || scene === 'battle'

  // BGM（戦闘と プロローグは その画面の中で 切りかえる）
  const music: SongName | null | undefined =
    scene === 'title' || scene === 'name'
      ? 'title'
      : scene === 'ending'
        ? 'ending'
        : scene === 'quest'
          ? 'quest'
          : scene === 'battle' || scene === 'prologue'
            ? undefined
            : map.kind === 'town' || map.kind === 'interior'
              ? 'town'
              : map.kind === 'dungeon'
                ? 'dungeon'
                : 'field'
  useBgm(/gallery|soundtest/.test(location.search) ? null : music)
  const paused = scene !== 'field' || !!dialog || menu || busy || flash

  if (location.search.includes('gallery')) return <Gallery />
  if (location.search.includes('soundtest')) return <SoundTest />

  return (
    <div className={`app ${phone ? 'phone' : ''}`}>
      <div className="screen">
        {scene === 'title' && <Title hasSave={!!loadGame()} onNew={() => setScene('name')} onContinue={continueGame} />}
        {scene === 'name' && <NameEntry onDone={(name) => startGame(newGame(name), 'prologue')} />}
        {scene === 'prologue' && (
          <Prologue
            name={gs.name}
            onDone={() => {
              setScene('field')
              setWhiteIn(true)
              setTimeout(() => setWhiteIn(false), 2000)
              setTimeout(() => showBanner(MAPS[gsRef.current.mapId].name), 900)
            }}
          />
        )}
        {scene === 'ending' && <Ending chapter={chapter} name={gs.name} onDone={() => setScene('field')} />}

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
              onSign={(lines) => run(async () => void (await talk(undefined, lines)))}
              onWarp={onWarp}
              onMove={(x, y, dir) => (pos.current = { x, y, dir })}
              onMenu={() => {
                sfx('select')
                setMenu(true)
              }}
              onEncounter={(id) =>
                startBattle({
                  id,
                  scene: map.id.startsWith('temple') ? 'temple' : map.id.startsWith('ship') ? 'ship' : map.id.startsWith('library') ? 'library' : map.kind === 'dungeon' ? 'cave' : 'field',
                })
              }
              onGate={onGate}
              doorHint={doorHint}
            />
            {scene === 'field' && !menu && (
              <>
                <div className="win hud">
                  <div className="hud-name">{gs.name}</div>
                  <div>H {gs.hp}/{maxHp(gs.level)}</div>
                  <div>Lv {gs.level}</div>
                  <div>G {gs.gold}</div>
                </div>
                {quests.length > 0 && (
                  <div className="win hud-quest">
                    {townBoss && gs.bosses.includes(townBoss)
                      ? '★ この町は 平和になった'
                      : barrierOpen
                        ? '⚔ 北の結界が とけた！'
                        : `悩み解決 ${solvedHere}/${quests.length}`}
                  </div>
                )}
              </>
            )}
            {banner && scene === 'field' && <div className="banner">{banner}</div>}
            {fade && <div className="fade" />}
            {flash && <div className="encounter-flash" />}
            {whiteIn && <div className="white-in" />}
            {menu && <Menu gs={gs} setGs={setGs} onSave={save} onClose={() => setMenu(false)} />}
            {scene === 'battle' && battle && (
              <Battle
                key={`${battle.id}-${spawn.key}`}
                bossId={battle.id}
                tutorial={battle.tutorial}
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
        {dialog && scene !== 'prologue' && <DialogBox key={dialog.id} req={dialog} />}
      </div>
      {/* スマホの 縦画面では、戦闘中は ボタンを しまって 画面を 広く使う（コマンドは タップで 選べる） */}
      {isTouchDevice && inWorld && scene !== 'quest' && !(phone && scene === 'battle') && <TouchPad />}
      {scene === 'quest' && questId && <QuestScreen quest={QUESTS[questId]} onClear={onQuestClear} onClose={onQuestClose} />}
    </div>
  )
}
