import { useSyncExternalStore } from 'react'

/**
 * 表示言語（日本語／英語）。
 * はじめは 端末の 言語に 合わせ、タイトル画面と 設定から 切りかえられる（選んだ 言語は 保存する）。
 *
 * 文の 書き方：画面の 文も、データ（依頼・会話・問題）の 文も tr('日本語', 'English') の ように 2つ 並べて 書く。
 * データは 読みこんだ ときの 言語で 作られるので、言語を 切りかえたら ページを 読みなおす
 */
export type Lang = 'ja' | 'en'

/**
 * 英語版の 準備が できたか。false の 間は、端末が 英語でも 日本語で 始まり、言語の 切りかえも 出さない
 * （?lang=en を つけて 開くと 英語を 試せる。選んだ 言語は 保存されるので、?lang=ja で 戻す）
 */
export const EN_READY = false

const KEY = 'excel-quest-lang'
const hasWindow = typeof window !== 'undefined'

function detect(): Lang {
  // 自動チェック（node）は EQ_LANG=en で 英語の データを 確かめる
  if (!hasWindow) return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.EQ_LANG === 'en' ? 'en' : 'ja'
  try {
    // 試し用：URL の ?lang=en / ?lang=ja を 保存する
    const q = hasWindow ? new URLSearchParams(location.search).get('lang') : null
    if (q === 'en' || q === 'ja') localStorage.setItem(KEY, q)
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'ja') return saved
  } catch {
    /* 保存できない 環境 */
  }
  if (!EN_READY || !hasWindow) return 'ja'
  const first = navigator.languages?.[0] ?? navigator.language ?? 'ja'
  return /^ja\b/i.test(first) ? 'ja' : 'en'
}

let lang: Lang = detect()
if (hasWindow) document.documentElement.lang = lang
const subs = new Set<() => void>()

export const getLang = () => lang
export const isEn = () => lang === 'en'

/** 言語を 切りかえる（保存して ページを 読みなおす。データの 文も 新しい 言語で 作りなおすため） */
export function setLang(l: Lang) {
  if (l === lang) return
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* 保存できない ときは この 画面だけ 切りかえる */
    lang = l
    document.documentElement.lang = l
    subs.forEach((f) => f())
    return
  }
  // ?lang= が 残っていると 読みなおした ときに 戻って しまうので 消す
  const u = new URL(location.href)
  u.searchParams.delete('lang')
  location.replace(u.toString())
}

/** 言語の 切りかえを 画面に 出すか（英語版の 準備前でも、試し中なら 出す） */
export const langSwitchVisible = () => EN_READY || lang === 'en'

export function useLang() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => {
        subs.delete(f)
      }
    },
    getLang,
  )
}

/** 今の 言語の 文を えらぶ */
export const tr = (ja: string, en: string) => (lang === 'en' ? en : ja)
/** 文の 並び（会話の ページ など）や 表の 中身を 言語で えらぶ */
export const tra = <T>(ja: T, en: T): T => (lang === 'en' ? en : ja)
