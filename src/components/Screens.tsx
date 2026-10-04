import { useEffect, useState, type ReactNode } from 'react'
import { useKeys } from '../game/keys'
import { SpriteView } from './SpriteView'
import { PLAYER_SPEC } from '../data/maps'
import { enterFullscreen, isIosBrowser, isTouchDevice, usePhoneLayout } from '../game/layout'
import { setSoundOn, sfx, useSoundOn } from '../game/sound'

export function Title({ hasSave, onNew, onContinue, onStudy }: { hasSave: boolean; onNew(): void; onContinue(): void; onStudy(): void }) {
  const opts = hasSave ? ['つづきから', 'はじめから', 'ふくしゅう'] : ['はじめから', 'ふくしゅう']
  const [cursor, setCursor] = useState(0)
  const phone = usePhoneLayout()
  const soundOn = useSoundOn()
  const pick = (i: number) => {
    // スマホは ここで 全画面に する（ボタンを 押したときにしか 切り替えられないため）
    enterFullscreen()
    if (opts[i] === 'つづきから') onContinue()
    else if (opts[i] === 'ふくしゅう') onStudy()
    else onNew()
  }
  useKeys((k) => {
    if (k === 'up' || k === 'down') {
      sfx('cursor')
      setCursor((c) => (c + (k === 'up' ? opts.length - 1 : 1)) % opts.length)
    } else if (k === 'ok') {
      sfx('select')
      pick(cursor)
    }
  })
  return (
    <div className="title-screen">
      <button className="sound-toggle" onClick={() => setSoundOn(!soundOn)} aria-label="音の ON/OFF">
        {soundOn ? '🔊 おと ON' : '🔇 おと OFF'}
      </button>
      <div className="logo">
        <div className="logo-main">イコール・クエスト</div>
        <div className="logo-sub">〜 表計算で世界を救うRPG 〜</div>
        <div className="logo-grid">
          {'=SUM(勇気)'.split('').map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
      </div>
      <div className="title-cast">
        <SpriteView spec={PLAYER_SPEC} />
        <SpriteView creature="slime" />
      </div>
      <div className="win title-menu">
        {opts.map((o, i) => (
          <div key={o} className={`opt ${i === cursor ? 'on' : ''}`} onPointerEnter={() => setCursor(i)} onClick={() => pick(i)}>
            {o}
          </div>
        ))}
      </div>
      <div className="title-help">
        {isTouchDevice ? '十字ボタン：移動　A：話す・決定　B：メニュー・もどる' : '矢印キー / WASD：移動　Shift：走る　Enter / Z：決定　Esc / X：メニュー'}
      </div>
      {phone && isIosBrowser() && <div className="title-ios">共有ボタン →「ホーム画面に追加」で、全画面で 遊べます</div>}
    </div>
  )
}

export function NameEntry({ onDone }: { onDone(name: string): void }) {
  const [name, setName] = useState('サトウ')
  return (
    <div className="title-screen">
      <form
        className="win name-win"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onDone(name.trim().slice(0, 6))
        }}
      >
        <p>主人公の なまえを いれてください（6文字まで）</p>
        <input autoFocus maxLength={6} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary">けってい</button>
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
          明日からの 仕事で 使える、本物の Excel の 力だ。
        </p>
      </>
    ),
    label: 'イコール・クエスト',
    next: ['THE END', 'ここまで 遊んでくれて ありがとう！ 町の 人や 石版に もう一度 挑戦して、復習することも できるよ。'],
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
  const ch = CHAPTERS[chapter] ?? CHAPTERS[1]
  return (
    <div className="ending">
      <div className="ending-inner">
        <h2>{ch.title}</h2>
        {ch.body(name)}
        <div className="next-chapter">
          <div>{ch.label ?? '次章予告'}</div>
          <strong>{ch.next[0]}</strong>
          <p>{ch.next[1]}</p>
        </div>
        <button className="btn primary" disabled={!ready} onClick={onDone}>
          ぼうけんを つづける
        </button>
      </div>
    </div>
  )
}

export function TouchPad() {
  const send = (type: 'keydown' | 'keyup', key: string, code = '') =>
    window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true }))
  const btn = (label: string, key: string, cls: string) => (
    <button
      className={`tp ${cls}`}
      onPointerDown={(e) => {
        e.preventDefault()
        send('keydown', key)
      }}
      onPointerUp={() => send('keyup', key)}
      onPointerLeave={() => send('keyup', key)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
  return (
    <div className="touchpad">
      <div className="dpad">
        {btn('▲', 'ArrowUp', 'u')}
        {btn('◀', 'ArrowLeft', 'l')}
        {btn('▶', 'ArrowRight', 'r')}
        {btn('▼', 'ArrowDown', 'd')}
      </div>
      <div className="ab">
        <div className="ab-btn">
          {btn('B', 'Escape', 'b')}
          <span>メニュー</span>
        </div>
        <div className="ab-btn">
          {btn('A', 'Enter', 'a')}
          <span>決定</span>
        </div>
      </div>
    </div>
  )
}
