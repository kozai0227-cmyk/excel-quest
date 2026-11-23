import { useEffect, useRef, useState } from 'react'
import { useKeys } from '../game/keys'
import { useInputMode } from '../game/inputMode'
import { Portrait, type PortraitSrc } from './Portrait'
import { cue, sfx } from '../game/sound'
import { npcName } from '../data/en'

export interface DialogReq {
  id: number
  speaker?: string
  pages: string[]
  choices?: string[]
  portrait?: PortraitSrc
  /** 'modern' は転生前（現代パート）用のウィンドウ */
  variant?: 'dq' | 'modern'
  tagColor?: string
  resolve: (choice: number) => void
}

export function DialogBox({ req }: { req: DialogReq }) {
  const [page, setPage] = useState(0)
  const [shown, setShown] = useState(0)
  const [cursor, setCursor] = useState(0)
  const text = req.pages[page] ?? ''
  const typing = shown < text.length
  const last = page === req.pages.length - 1
  const choosing = last && !typing && !!req.choices
  const modern = req.variant === 'modern'
  // 選んだ ボタンを 一瞬 光らせてから 進む（押した 手ごたえ）。2度 押しも 防ぐ
  const [picked, setPicked] = useState<number | null>(null)
  const pickTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(pickTimer.current), [])
  // キーボード・十字ボタンで 動かした ときだけ カーソル枠を 出す（指で 押す ときは じゃまに なる）
  const keyboard = useInputMode() === 'keyboard'
  const [keyed, setKeyed] = useState(false)
  const ring = keyboard || keyed

  const pickedRef = useRef(false)
  const choose = (i: number, sound: 'select' | 'cancel' = 'select') => {
    if (pickedRef.current) return
    pickedRef.current = true
    sfx(sound)
    setCursor(i)
    setPicked(i)
    pickTimer.current = setTimeout(() => req.resolve(i), 140)
  }

  // メッセージに 合わせた 効果音（レベルアップ・アイテム など）
  useEffect(() => {
    cue(text)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!typing) return
    const t = setTimeout(() => setShown((n) => n + 1), modern ? 28 : 22)
    return () => clearTimeout(t)
  }, [typing, shown, modern])

  const advance = () => {
    if (typing) return setShown(text.length)
    if (choosing) return choose(cursor)
    sfx('blip')
    if (!last) {
      setPage(page + 1)
      setShown(0)
      return
    }
    req.resolve(-1)
  }

  useKeys((k) => {
    if (pickedRef.current) return
    if (choosing && (k === 'up' || k === 'down')) {
      sfx('cursor')
      setKeyed(true)
      const n = req.choices!.length
      setCursor((c) => (c + (k === 'down' ? 1 : n - 1)) % n)
    } else if (k === 'ok') advance()
    else if (k === 'cancel') {
      if (choosing) choose(req.choices!.length - 1, 'cancel')
      else advance()
    }
  })

  const choices = choosing && (
    <div className={`${modern ? 'win' : 'dlg-choices'} choice-win ${ring ? 'ring' : ''}`} role="menu">
      {req.choices!.map((c, i) => (
        <button
          type="button"
          role="menuitem"
          key={c}
          className={`opt ${i === cursor ? 'on' : ''} ${i === 0 ? 'first' : ''} ${picked === i ? 'picked' : ''}`}
          style={{ animationDelay: `${i * 55}ms` }}
          onPointerEnter={(e) => e.pointerType === 'mouse' && setCursor(i)}
          onClick={(e) => {
            e.stopPropagation()
            choose(i)
          }}
        >
          {c}
        </button>
      ))}
    </div>
  )

  return (
    <>
      {modern && choices}
      <div
        className={`${modern ? 'vn-win' : 'win dlg'} dialog-win ${req.portrait ? 'has-portrait' : ''} ${req.speaker ? 'named' : ''} ${choosing ? 'choosing' : ''}`}
        onClick={advance}
      >
        {!modern && choices}
        {req.portrait && <Portrait src={req.portrait} />}
        <div className="dialog-body">
          {req.speaker && (
            <div className="speaker" style={modern && req.tagColor ? { background: req.tagColor } : undefined}>
              {npcName(req.speaker)}
            </div>
          )}
          <div className="dialog-text">
            {text.slice(0, shown)}
            {!typing && !choosing && (
              <span className="next" aria-hidden="true">
                ▼
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
