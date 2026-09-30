import { useEffect, useRef } from 'react'

export type Key = 'up' | 'down' | 'left' | 'right' | 'ok' | 'cancel'

export function toKey(e: KeyboardEvent): Key | null {
  switch (e.key) {
    case 'ArrowUp': return 'up'
    case 'ArrowDown': return 'down'
    case 'ArrowLeft': return 'left'
    case 'ArrowRight': return 'right'
    case 'Enter':
    case ' ': return 'ok'
    case 'Escape': return 'cancel'
  }
  switch (e.code) {
    case 'KeyW': return 'up'
    case 'KeyS': return 'down'
    case 'KeyA': return 'left'
    case 'KeyD': return 'right'
    case 'KeyZ': return 'ok'
    case 'KeyX': return 'cancel'
  }
  return null
}

/** ウィンドウ単位のキー入力（active のときだけ） */
export function useKeys(handler: (k: Key, e: KeyboardEvent) => void, active = true) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat && !e.key.startsWith('Arrow')) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const k = toKey(e)
      if (!k) return
      e.preventDefault()
      ref.current(k, e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])
}
