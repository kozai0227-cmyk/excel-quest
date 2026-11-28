import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FUNC_GUIDES } from '../data/funcGuides'
import { SKILLS } from '../data/skills'
import { useKeys } from '../game/keys'
import { sfx } from '../game/sound'
import { tr } from '../game/lang'
import './FuncCard.css'

/** 文の 中の 数式（= で 始まる 部分）を 目立たせる。カッコと " の 中の 空白では 切らない */
const withCode = (text: string) => {
  const out: ReactNode[] = []
  let last = 0
  for (let i = text.indexOf('='); i >= 0; i = text.indexOf('=', i + 1)) {
    let j = i + 1
    let depth = 0
    let quote = false
    for (; j < text.length; j++) {
      const ch = text[j]
      if (ch === '"') quote = !quote
      else if (quote) continue
      else if (ch === '(') depth++
      else if (ch === ')' && depth > 0) depth--
      else if (depth === 0 && /[\s　「」（）)]/.test(ch)) break
    }
    if (j - i < 2) continue
    out.push(text.slice(last, i), <code key={i}>{text.slice(i, j)}</code>)
    last = j
    i = j - 1
  }
  out.push(text.slice(last))
  return out
}

/** 例の 1行：「　→」の 左が 数式や 操作、右が 結果の 説明 */
function Example({ line }: { line: string }) {
  const [left, right] = line.split('　→')
  return (
    <li>
      <span className="fc-ex-l">{withCode(left)}</span>
      {right !== undefined && (
        <>
          <span className="fc-ex-arrow" aria-hidden>
            →
          </span>
          <span className="fc-ex-r">{right.trim()}</span>
        </>
      )}
    </li>
  )
}

export interface FuncCardProps {
  /** この 町で 相談できる 関数・技（並び順の まま タブに なる） */
  ids: string[]
  /** 覚えた 技の ID */
  learned: string[]
  /** 教会の 名前（見出しの 下に 小さく） */
  place?: string
  onClose(): void
}

/**
 * 教会の「関数の 相談」：その 町で 学べる 関数・技を タブで 切りかえて 読む 解説カード。
 * 以前は 会話の 選択肢で 1つ 選ぶ → 文字だけの 窓 → とじて また 選ぶ、の くり返しで、
 * どれを もう 覚えたのかも わからなかった
 */
export function FuncCard({ ids, learned, place, onClose }: FuncCardProps) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState<'next' | 'prev' | 'none'>('none')
  const [closing, setClosing] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const id = ids[index]
  const skill = SKILLS[id]
  const g = FUNC_GUIDES[id]
  const learnedCount = ids.filter((x) => learned.includes(x)).length
  const isLearned = learned.includes(id)

  const go = (to: number) => {
    if (to < 0 || to >= ids.length || to === index) return
    sfx('cursor')
    setDir(to > index ? 'next' : 'prev')
    setIndex(to)
  }
  const close = () => {
    if (closing) return
    sfx('cancel')
    setClosing(true)
    setTimeout(onClose, 160)
  }

  // えらんだ タブが 見えるように 横へ スクロールし、本文は 先頭へ もどす
  useEffect(() => {
    const tab = tabsRef.current?.children[index] as HTMLElement | undefined
    tab?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    bodyRef.current?.scrollTo?.({ top: 0 })
  }, [index])

  useKeys((k) => {
    if (k === 'left' || k === 'up') go(index - 1)
    else if (k === 'right' || k === 'down') go(index + 1)
    else if (k === 'ok' || k === 'cancel') close()
  })

  // 横に なぞって 前後の 関数へ
  const touch = useRef<{ x: number; y: number } | null>(null)

  if (!skill || !g) return null
  return (
    <div
      className={`fc-layer ${closing ? 'out' : ''}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="fc-sheet" role="dialog" aria-label={tr('関数の 相談', 'Function Help')}>
        <header className="fc-top">
          <span className="fc-icon" aria-hidden>
            📖
          </span>
          <div className="fc-titles">
            <h3>{tr('関数の 相談', 'Function Help')}</h3>
            {place && <span className="fc-place">{place}</span>}
          </div>
          <div className="fc-progress" aria-label={tr(`習得 ${learnedCount}/${ids.length}`, `Learned ${learnedCount}/${ids.length}`)}>
            <span className="fc-progress-n">
              ✓ {learnedCount}/{ids.length}
            </span>
            <span className="fc-progress-bar">
              <i style={{ width: `${(learnedCount / Math.max(1, ids.length)) * 100}%` }} />
            </span>
          </div>
          <button type="button" className="fc-x" data-nosfx aria-label={tr('とじる', 'Close')} onClick={close}>
            ✕
          </button>
        </header>

        {ids.length > 1 && (
          <div className="fc-tabs" ref={tabsRef} role="tablist">
            {ids.map((x, i) => (
              <button
                key={x}
                type="button"
                role="tab"
                aria-selected={i === index}
                data-nosfx
                className={`fc-tab ${i === index ? 'on' : ''} ${learned.includes(x) ? 'done' : ''}`}
                onClick={() => go(i)}
              >
                {learned.includes(x) && (
                  <span className="fc-tab-check" aria-hidden>
                    ✓
                  </span>
                )}
                {SKILLS[x]?.name ?? x}
              </button>
            ))}
          </div>
        )}

        <div
          className="fc-body"
          ref={bodyRef}
          onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const t = touch.current
            touch.current = null
            if (!t) return
            const dx = e.changedTouches[0].clientX - t.x
            const dy = e.changedTouches[0].clientY - t.y
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1))
          }}
        >
          <div key={id} className={`fc-page ${dir}`}>
            <div className="fc-head">
              <h4 className="fc-name">{skill.name}</h4>
              <span className={`fc-badge ${isLearned ? 'on' : ''}`}>
                {isLearned ? tr('✓ 習得ずみ', '✓ Learned') : tr('📍 この町で 覚えられる', '📍 Learn it here')}
              </span>
            </div>
            <p className="fc-use">
              <span className="fc-use-k">{tr('🎯 こんな とき', '🎯 Use it')}</span>
              {g.use}
            </p>
            <section className="fc-sec">
              <h5>{tr('✍️ 書き方', '✍️ How to write it')}</h5>
              <code className="fc-form">{g.form}</code>
            </section>
            <section className="fc-sec">
              <h5>{tr('📋 例', '📋 Examples')}</h5>
              <ul className="fc-ex">
                {g.ex.map((e) => (
                  <Example key={e} line={e} />
                ))}
              </ul>
            </section>
            <div className="fc-tip">
              <span className="fc-tip-k">{tr('💡 ポイント', '💡 Key point')}</span>
              <p>{g.tip}</p>
            </div>
          </div>
        </div>

        <footer className="fc-foot">
          {ids.length > 1 && (
            <button type="button" className="fc-nav" data-nosfx disabled={index === 0} aria-label={tr('前の 関数', 'Previous')} onClick={() => go(index - 1)}>
              ‹
            </button>
          )}
          <button type="button" className="fc-ok" data-nosfx onClick={close}>
            {tr('わかった', 'Got it')}
          </button>
          {ids.length > 1 && (
            <button type="button" className="fc-nav" data-nosfx disabled={index === ids.length - 1} aria-label={tr('次の 関数', 'Next')} onClick={() => go(index + 1)}>
              ›
            </button>
          )}
        </footer>
        {ids.length > 1 && (
          <div className="fc-dots" aria-hidden>
            {ids.map((x, i) => (
              <i key={x} className={i === index ? 'on' : ''} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
