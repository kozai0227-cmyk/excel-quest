import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useKeys } from '../game/keys'
import { TitleScene } from './TitleScene'
import { enterFullscreen, isIosBrowser, isTouchDevice, usePhoneLayout } from '../game/layout'
import { setSoundOn, sfx, useSoundOn } from '../game/sound'
import { DocView } from './DocView'
import { isNative } from '../game/native'
import { isEn, langSwitchVisible, setLang, tr } from '../game/lang'
import { EN_CHAPTERS } from '../data/en'

type TitleOpt = 'continue' | 'new' | 'study'
const TITLE_LABEL: Record<TitleOpt, () => string> = {
  continue: () => tr('つづきから', 'Continue'),
  new: () => tr('はじめから', 'New Game'),
  study: () => tr('ふくしゅう', 'Review'),
}

export function Title({ hasSave, onNew, onContinue, onStudy }: { hasSave: boolean; onNew(): void; onContinue(): void; onStudy(): void }) {
  const opts: TitleOpt[] = hasSave ? ['continue', 'new', 'study'] : ['new', 'study']
  const [cursor, setCursor] = useState(0)
  /** セーブが あるのに「はじめから」を 選んだ：上書きの 確認（0：やめる 1：はじめから） */
  const [confirm, setConfirm] = useState<number | null>(null)
  /** プライバシーポリシーを 開いているか */
  const [privacy, setPrivacy] = useState(false)
  const phone = usePhoneLayout()
  const soundOn = useSoundOn()
  const logoRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pick = (i: number) => {
    // スマホは ここで 全画面に する（ボタンを 押したときにしか 切り替えられないため）
    enterFullscreen()
    if (opts[i] === 'continue') onContinue()
    else if (opts[i] === 'study') onStudy()
    else if (hasSave) setConfirm(0)
    else onNew()
  }
  const answer = (yes: boolean) => {
    setConfirm(null)
    if (yes) onNew()
  }
  useKeys((k) => {
    if (privacy) {
      if (k === 'ok' || k === 'cancel') setPrivacy(false)
      return
    }
    if (confirm !== null) {
      if (k === 'up' || k === 'down' || k === 'left' || k === 'right') {
        sfx('cursor')
        setConfirm((c) => (c === 0 ? 1 : 0))
      } else if (k === 'ok') {
        sfx('select')
        answer(confirm === 1)
      } else if (k === 'cancel') {
        sfx('cancel')
        answer(false)
      }
      return
    }
    if (k === 'up' || k === 'down') {
      sfx('cursor')
      setCursor((c) => (c + (k === 'up' ? opts.length - 1 : 1)) % opts.length)
    } else if (k === 'ok') {
      sfx('select')
      pick(cursor)
    }
  })
  return (
    <div className="title-screen title-main">
      <TitleScene logo={logoRef} menu={menuRef} />
      <div className="title-toggles">
        {langSwitchVisible() && (
          <button className="sound-toggle" onClick={() => setLang(isEn() ? 'ja' : 'en')} aria-label="Language / 言語">
            {isEn() ? '🌐 日本語' : '🌐 English'}
          </button>
        )}
        <button className="sound-toggle" onClick={() => setSoundOn(!soundOn)} aria-label={tr('音の ON/OFF', 'Sound on/off')}>
          {soundOn ? tr('🔊 おと ON', '🔊 Sound ON') : tr('🔇 おと OFF', '🔇 Sound OFF')}
        </button>
      </div>
      <div className={`logo ${isEn() ? 'en' : ''}`} ref={logoRef}>
        <div className="logo-main" data-text={tr('イコール・クエスト', 'EQUAL QUEST')}>
          {tr('イコール・クエスト', 'EQUAL QUEST')}
        </div>
        <div className="logo-sub">{tr('〜 表計算で世界を救うRPG 〜', '~ Save the World with Spreadsheets ~')}</div>
        <i className="logo-spark s1" />
        <i className="logo-spark s2" />
        <i className="logo-spark s3" />
      </div>
      <div className="title-bottom">
        <div className="win title-menu" ref={menuRef}>
          {opts.map((o, i) => (
            <div key={o} className={`opt ${i === cursor ? 'on' : ''}`} onPointerEnter={() => setCursor(i)} onClick={() => pick(i)}>
              {TITLE_LABEL[o]()}
            </div>
          ))}
        </div>
        <div className="title-help">
          {isTouchDevice ? (
            <>
              <DpadIcon />
              {tr('十字ボタン：移動　A：決定　B：メニュー・もどる', 'D-pad: Move　A: OK　B: Menu / Back')}
            </>
          ) : (
            tr('矢印キー / WASD：移動　Shift：走る　Enter / Z：決定　Esc / X：メニュー', 'Arrows / WASD: Move　Shift: Run　Enter / Z: OK　Esc / X: Menu')
          )}
        </div>
        {phone && isIosBrowser() && (
          <div className="title-ios">{tr('共有ボタン →「ホーム画面に追加」で、全画面で 遊べます', 'Tap Share → "Add to Home Screen" to play full screen')}</div>
        )}
      </div>
      {confirm !== null && (
        <div className="win title-confirm">
          <p>
            {tr('セーブデータが あります。', 'You have saved data.')}
            <br />
            {tr('はじめから 始めると、次に 記録したとき 今の データは 上書きされます。', 'If you start a new game, it will be overwritten the next time you save.')}
          </p>
          {[tr('やめる', 'Cancel'), tr('はじめから 始める', 'Start a new game')].map((o, i) => (
            <div key={o} className={`opt ${i === confirm ? 'on' : ''}`} onPointerEnter={() => setConfirm(i)} onClick={() => answer(i === 1)}>
              {o}
            </div>
          ))}
        </div>
      )}
      <div className="title-links">
        {/* Web 版だけ：関数の 解説ページ（検索から 来た 人にも、遊んでいる 人にも） */}
        {!isNative && <a href="/learn/">{tr('関数の解説', 'Function guide')}</a>}
        <button type="button" className="title-privacy" onClick={() => setPrivacy(true)}>
          {tr('プライバシーポリシー', 'Privacy Policy')}
        </button>
      </div>
      {privacy && <DocView src={tr('/privacy.html', '/privacy.html#en')} title={tr('プライバシーポリシー', 'Privacy Policy')} onClose={() => setPrivacy(false)} />}
    </div>
  )
}

/** 操作説明の 十字ボタンの しるし */
function DpadIcon() {
  return (
    <svg className="dpad-icon" viewBox="0 0 12 12" aria-hidden>
      <path d="M4 0h4v4h4v4H8v4H4V8H0V4h4z" fill="currentColor" />
      <rect x="5" y="5" width="2" height="2" fill="#0b1430" />
    </svg>
  )
}

export function NameEntry({ onDone }: { onDone(name: string): void }) {
  // 英語は 1文字が 小さいので 8文字まで
  const max = isEn() ? 8 : 6
  const [name, setName] = useState(() => tr('サトウ', 'Sato'))
  return (
    <div className="title-screen">
      <TitleScene cast={false} />
      <form
        className="win name-win"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onDone(name.trim().slice(0, max))
        }}
      >
        <p>{tr(`主人公の なまえを いれてください（${max}文字まで）`, `Enter the hero's name (up to ${max} letters)`)}</p>
        <input autoFocus maxLength={max} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary">{tr('けってい', 'OK')}</button>
      </form>
    </div>
  )
}

const CHAPTERS: Record<number, { title: string; body: (name: string) => ReactNode; next: [string, string]; label?: string }> = {
  1: {
    title: '第1章　完',
    body: (name) => (
      <>
        <p>計算の町カルキュレに、ふたたび 笑顔が もどった。</p>
        <p>
          {name}は 気づきはじめていた。
          <br />
          「スキルは、誰かの 困りごとを 解決するために あるんだ」と。
        </p>
      </>
    ),
    next: ['第2章　鏡の町サンショウ', 'コピーすると ずれる数式。「$」の 秘密とは――？（相対参照・絶対参照 編）'],
  },
  2: {
    title: '第2章　完',
    body: (name) => (
      <>
        <p>鏡の町サンショウの 表は、もう ずれない。</p>
        <p>
          ずれていいもの と、ずれては いけないもの。
          <br />
          {name}は それを 見分ける「目」を 手に入れた。
        </p>
      </>
    ),
    next: ['第3章　条件の港町イフポート', '「もし ○○なら」――条件で 答えを 変える 魔法とは？（IF関数 編）'],
  },
  3: {
    title: '第3章　完',
    body: (name) => (
      <>
        <p>イフポートの 港に、ふたたび 船が 行き交いはじめた。</p>
        <p>
          「もしも」を 先に 決めておけば、迷う 時間は 減らせる。
          <br />
          {name}の 手には、判断を 仕組みに 変える 力が 宿っていた。
        </p>
      </>
    ),
    next: ['第4章　検索の城下町ルックアップ', '巨大な 表から、たった1つの 答えを 探し出す 魔法とは？（VLOOKUP・XLOOKUP 編）'],
  },
  4: {
    title: '第4章　完',
    body: (name) => (
      <>
        <p>ルックアップ城の 大書庫に、ふたたび 静けさが もどった。</p>
        <p>
          探しものに 追われる 時間は、もう いらない。
          <br />
          {name}は「表に 聞けば、表が 答える」ことを 知った。
        </p>
      </>
    ),
    next: ['第5章　集計の王都ピボリア', '何千行の 記録を、条件ごとに 一瞬で まとめる 魔法とは――？（SUMIFS・COUNTIFS 編）'],
  },
  5: {
    title: '第5章　完',
    body: (name) => (
      <>
        <p>ピボリアの 王宮に、1冊の 帳簿が 戻った。</p>
        <p>
          バラバラの 記録も、見出しを 決めて まとめれば 意味を 語りだす。
          <br />
          {name}は「縦と 横で 世界を 見る」目を 手に入れた。
        </p>
      </>
    ),
    next: ['第6章　文字の宿場町テキストリア', '名前を つなぎ、コードを 切り分ける――文字を 自在に 操る 魔法とは？（文字列関数 編）'],
  },
  6: {
    title: '第6章　完',
    body: (name) => (
      <>
        <p>テキストリアの 印刷機が、ふたたび 正しい 文字を 刷りはじめた。</p>
        <p>
          つなげば 意味に なり、切りとれば 必要な 分だけ 取り出せる。
          <br />
          {name}は、文字を 自在に 組みかえる 力を 手に入れた。
        </p>
      </>
    ),
    next: ['第7章　暦の里コヨミノ', '何日後？ 何曜日？ 何年たった？――時を 数える 魔法とは？（日付の 計算 編）'],
  },
  7: {
    title: '第7章　完',
    body: (name) => (
      <>
        <p>コヨミノの 時計塔に、正しい 鐘の 音が 戻った。</p>
        <p>
          日付も ただの 数。足せば 未来が、引けば 残りの 時間が わかる。
          <br />
          {name}は、時を 味方に つける 力を 手に入れた。
        </p>
      </>
    ),
    next: ['最終章　魔王レフエラーの城', 'エラーを 恐れず、読み、直す――7つの 町の 力を すべて 結集せよ！（エラー対処と 総まとめ 編）'],
  },
  8: {
    title: '最終章　完',
    body: (name) => (
      <>
        <p>魔王レフエラーは 消え、セルシア大陸に「効率化」の 光が 戻った。</p>
        <p>
          セルを 選び、数式で 計算し、$ で 固定し、IF で 判断し、
          <br />
          XLOOKUP で 探し、SUMIFS で 集計し、文字と 日付を 操り、エラーを 読んで 直す。
        </p>
        <p>
          {name}が 旅で 手に入れたのは、魔法では なく――
          <br />
          明日からの 仕事で 使える、本物の 表計算の 力だ。
        </p>
      </>
    ),
    label: 'イコール・クエスト',
    next: ['THE END', 'ここまで 遊んでくれて ありがとう！ 町の 人や 石版に もう一度 挑戦して、復習することも できるよ。'],
  },
}

/** 章の 終わりの 英語版（次章予告の 題は EN_CHAPTERS と そろえる） */
const EN_ENDINGS: typeof CHAPTERS = {
  1: {
    title: 'End of Chapter 1',
    body: (name) => (
      <>
        <p>Smiles have returned to Calcule, Town of Calculation.</p>
        <p>
          {name} was beginning to realize something:
          <br />
          "Skills exist to solve someone's problems."
        </p>
      </>
    ),
    next: [EN_CHAPTERS[2].title, 'Formulas that shift when you copy them. What is the secret of "$"? (Relative & absolute references)'],
  },
  2: {
    title: 'End of Chapter 2',
    body: (name) => (
      <>
        <p>The tables of Refton, Town of Mirrors, no longer shift.</p>
        <p>
          What may shift, and what must never shift.
          <br />
          {name} gained the eye to tell them apart.
        </p>
      </>
    ),
    next: [EN_CHAPTERS[3].title, '"If this, then that." What is the magic that changes the answer by condition? (The IF function)'],
  },
  3: {
    title: 'End of Chapter 3',
    body: (name) => (
      <>
        <p>Ships once again come and go in the harbor of Ifport.</p>
        <p>
          Decide your "what ifs" ahead of time, and you spend less time hesitating.
          <br />
          {name} now held the power to turn decisions into systems.
        </p>
      </>
    ),
    next: [EN_CHAPTERS[4].title, 'What is the magic that finds the one answer in a giant table? (VLOOKUP & XLOOKUP)'],
  },
  4: {
    title: 'End of Chapter 4',
    body: (name) => (
      <>
        <p>Quiet has returned to the Great Library of Lookup Castle.</p>
        <p>
          No more hours lost to searching.
          <br />
          {name} learned that if you ask the table, the table answers.
        </p>
      </>
    ),
    next: [EN_CHAPTERS[5].title, 'What is the magic that sums up thousands of rows by condition in an instant? (SUMIFS & COUNTIFS)'],
  },
  5: {
    title: 'End of Chapter 5',
    body: (name) => (
      <>
        <p>A single ledger has returned to the palace of Pivoria.</p>
        <p>
          Even scattered records start to speak once you choose the headings and sum them up.
          <br />
          {name} gained the eye to see the world in rows and columns.
        </p>
      </>
    ),
    next: [EN_CHAPTERS[6].title, 'Join names, split codes. What is the magic that bends text at will? (Text functions)'],
  },
  6: {
    title: 'End of Chapter 6',
    body: (name) => (
      <>
        <p>The presses of Textria are printing the right letters once again.</p>
        <p>
          Join text and it gains meaning; cut it and you take only what you need.
          <br />
          {name} gained the power to rearrange text freely.
        </p>
      </>
    ),
    next: [EN_CHAPTERS[7].title, 'How many days later? What weekday? How many years? What is the magic that counts time? (Date math)'],
  },
  7: {
    title: 'End of Chapter 7',
    body: (name) => (
      <>
        <p>The clock tower of Calendra rings true once more.</p>
        <p>
          Dates are just numbers. Add to see the future; subtract to see the time left.
          <br />
          {name} gained the power to make time an ally.
        </p>
      </>
    ),
    next: ["Final Chapter: The Castle of Demon Lord Referror", 'Do not fear errors. Read them, and fix them. Bring together the power of all seven towns! (Fixing errors & final review)'],
  },
  8: {
    title: 'End of the Final Chapter',
    body: (name) => (
      <>
        <p>Demon Lord Referror is gone, and the light of efficiency has returned to the continent of Cellsia.</p>
        <p>
          Select cells, calculate with formulas, lock with $, decide with IF,
          <br />
          search with XLOOKUP, total with SUMIFS, work with text and dates, and read and fix errors.
        </p>
        <p>
          What {name} gained on this journey wasn't magic.
          <br />
          It was real spreadsheet skill, ready for work starting tomorrow.
        </p>
      </>
    ),
    label: 'Equal Quest',
    next: ['THE END', 'Thank you so much for playing! You can talk to the townspeople or try the tablets again to review.'],
  },
}

export function Ending({ chapter, name, onDone }: { chapter: number; name: string; onDone(): void }) {
  // 連打で読み飛ばさないよう、少し待ってから入力を受け付ける
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500)
    return () => clearTimeout(t)
  }, [])
  useKeys((k) => ready && k === 'ok' && onDone())
  const ch = (isEn() ? EN_ENDINGS[chapter] : undefined) ?? CHAPTERS[chapter] ?? CHAPTERS[1]
  return (
    <div className="ending">
      <div className="ending-inner">
        <h2>{ch.title}</h2>
        {ch.body(name)}
        <div className="next-chapter">
          <div>{ch.label ?? tr('次章予告', 'Next Chapter')}</div>
          <strong>{ch.next[0]}</strong>
          <p>{ch.next[1]}</p>
        </div>
        <button className="btn primary" disabled={!ready} onClick={onDone}>
          {tr('ぼうけんを つづける', 'Continue the adventure')}
        </button>
      </div>
    </div>
  )
}

/** 十字キーの 矢印（文字の ▶ は iPhone で 絵文字に なるので 図形で 描く） */
const Arrow = () => (
  <svg className="tp-arrow" viewBox="0 0 12 12" aria-hidden>
    <path d="M6 2.2 L10.4 9 H1.6 Z" />
  </svg>
)

/** 画面下の 操作ボタン（十字キーと A・B）。押すと キー入力として ゲームに 送る */
export function TouchPad() {
  const [held, setHeld] = useState<ReadonlySet<string>>(new Set())
  const press = (key: string, down: boolean) => {
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true }))
    setHeld((h) => {
      if (h.has(key) === down) return h
      const n = new Set(h)
      if (down) n.add(key)
      else n.delete(key)
      return n
    })
  }
  const btn = (key: string, cls: string, label: string, face: ReactNode) => (
    <button
      type="button"
      aria-label={label}
      className={`tp ${cls} ${held.has(key) ? 'on' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault()
        press(key, true)
      }}
      onPointerUp={() => press(key, false)}
      onPointerLeave={() => press(key, false)}
      onPointerCancel={() => press(key, false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {face}
    </button>
  )
  return (
    <div className="touchpad">
      <div className="dpad">
        <svg className="dpad-body" viewBox="0 0 150 150" aria-hidden>
          <defs>
            <linearGradient id="dpad-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#363c4b" />
              <stop offset="1" stopColor="#1f232d" />
            </linearGradient>
          </defs>
          <path
            d="M60,0 H90 Q100,0 100,10 V50 H140 Q150,50 150,60 V90 Q150,100 140,100 H100 V140 Q100,150 90,150 H60 Q50,150 50,140 V100 H10 Q0,100 0,90 V60 Q0,50 10,50 H50 V10 Q50,0 60,0 Z"
            fill="url(#dpad-grad)"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="1.5"
          />
        </svg>
        <span className="dpad-center" aria-hidden />
        {btn('ArrowUp', 'u', tr('上', 'Up'), <Arrow />)}
        {btn('ArrowLeft', 'l', tr('左', 'Left'), <Arrow />)}
        {btn('ArrowRight', 'r', tr('右', 'Right'), <Arrow />)}
        {btn('ArrowDown', 'd', tr('下', 'Down'), <Arrow />)}
      </div>
      <div className="pad-mark" aria-hidden>
        ＝
      </div>
      <div className="ab">
        <div className="ab-btn b">
          {btn('Escape', 'round b', tr('メニュー', 'Menu'), 'B')}
          <span>{tr('メニュー', 'Menu')}</span>
        </div>
        <div className="ab-btn a">
          {btn('Enter', 'round a', tr('決定', 'OK'), 'A')}
          <span>{tr('決定', 'OK')}</span>
        </div>
      </div>
    </div>
  )
}
