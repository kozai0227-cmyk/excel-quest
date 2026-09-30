import { useSyncExternalStore } from 'react'

/**
 * 数式の入力方式。
 * keyboard … 本物の Excel と同じく キーボードで打つ（PC）
 * touch    … 関数・セル・記号のボタンを 選んで 組み立てる（スマホ）
 *
 * 決め方：URL の ?input=touch|keyboard ＞ メニューで選んだもの ＞ 端末から自動判定
 */
export type InputMode = 'keyboard' | 'touch'

const KEY = 'excel-quest-input'
const isMode = (s: string | null): s is InputMode => s === 'keyboard' || s === 'touch'

function initial(): InputMode {
  if (typeof window === 'undefined') return 'keyboard'
  const p = new URLSearchParams(location.search).get('input')
  if (isMode(p)) return p
  try {
    const s = localStorage.getItem(KEY)
    if (isMode(s)) return s
  } catch {
    // 保存できない環境（プライベートモードなど）は 自動判定のまま
  }
  return matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard'
}

let mode = initial()
const subs = new Set<() => void>()

export const getInputMode = () => mode

export function setInputMode(m: InputMode) {
  mode = m
  try {
    localStorage.setItem(KEY, m)
  } catch {
    // 保存できなくても この場では 切り替わる
  }
  subs.forEach((f) => f())
}

export const useInputMode = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    getInputMode,
  )
