import { useSyncExternalStore } from 'react'

/**
 * 画面の レイアウト。
 * phone … スマホの 縦持ち。ゲーム画面を 縦長に 画面いっぱい 表示し、下に 操作ボタンを 置く
 * wide  … PC・タブレット・横持ち。これまでどおりの 横長の 画面
 *
 * URL の ?layout=phone|wide で 固定できる（確認用）
 */
const QUERY = '(orientation: portrait) and (max-width: 700px)'
const hasWindow = typeof window !== 'undefined'
const forced = hasWindow ? new URLSearchParams(location.search).get('layout') : null
const mq = hasWindow ? matchMedia(QUERY) : null

/** 指で さわる 端末（スマホ・タブレット） */
export const isTouchDevice = hasWindow && matchMedia('(pointer: coarse)').matches

export const isPhoneLayout = () => (forced === 'phone' ? true : forced === 'wide' ? false : !!mq?.matches)

export const usePhoneLayout = () =>
  useSyncExternalStore((f) => {
    mq?.addEventListener('change', f)
    return () => mq?.removeEventListener('change', f)
  }, isPhoneLayout)

/** スマホで 全画面にする（Android の Chrome など）。iPhone の Safari は 未対応なので 何もしない */
export function enterFullscreen() {
  const el = document.documentElement
  if (!isPhoneLayout() || document.fullscreenElement || !el.requestFullscreen) return
  const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => orientation.lock?.('portrait'))
    .catch(() => {
      // 全画面に できない 環境では そのまま 遊ぶ
    })
}

/** iPhone の Safari で 開いている（ホーム画面に 追加すれば 全画面で 遊べる） */
export const isIosBrowser = () =>
  hasWindow && /iPhone|iPod/.test(navigator.userAgent) && !(navigator as Navigator & { standalone?: boolean }).standalone
