import { useEffect, useState } from 'react'
import { useKeys } from '../game/keys'
import { Portrait, type PortraitSrc } from './Portrait'
import { cue, sfx } from '../game/sound'

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
    if (choosing) {
      sfx('select')
      return req.resolve(cursor)
    }
    sfx('blip')
    if (!last) {
      setPage(page + 1)
      setShown(0)
      return
    }
    req.resolve(-1)
  }

  useKeys((k) => {
    if (choosing && (k === 'up' || k === 'down')) {
      sfx('cursor')
      const n = req.choices!.length
      setCursor((c) => (c + (k === 'down' ? 1 : n - 1)) % n)
    } else if (k === 'ok') advance()
    else if (k === 'cancel') {
      if (choosing) {
        sfx('cancel')
        req.resolve(req.choices!.length - 1)
      } else advance()
    }
  })

  return (
    <>
      {choosing && (
        <div className="win choice-win">
          {req.choices!.map((c, i) => (
            <div
              key={c}
              className={`opt ${i === cursor ? 'on' : ''}`}
              onPointerEnter={() => setCursor(i)}
              onClick={() => req.resolve(i)}
            >
              {c}
            </div>
          ))}
        </div>
      )}
      <div className={`${modern ? 'vn-win' : 'win'} dialog-win ${req.portrait ? 'has-portrait' : ''}`} onClick={advance}>
        {req.portrait && <Portrait src={req.portrait} />}
        <div className="dialog-body">
          {req.speaker && (
            <div className="speaker" style={modern && req.tagColor ? { background: req.tagColor } : undefined}>
              {req.speaker}
            </div>
          )}
          <div className="dialog-text">
            {text.slice(0, shown)}
            {!typing && !choosing && <span className="next">▼</span>}
          </div>
        </div>
      </div>
    </>
  )
}
