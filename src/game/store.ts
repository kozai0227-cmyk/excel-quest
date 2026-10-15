import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { useSyncExternalStore } from 'react'
import { isNative } from './native'
import { loadGame } from './progress'
import { APP_STORE_URL } from './appStore'

/** 無料で 遊べる 章（ここまで）。この 先は「全章解放」を 買うと 遊べる */
export const FREE_CHAPTERS = 2
/** App Store Connect で 作る 商品（非消耗型）の ID */
export const PRODUCT_ID = 'com.kozai0227.equalquest.full'
/**
 * Web 版も 全章 遊べるか。false の 今は、Web 版は 第2章までの 体験版で、
 * 第3章から 先は App Store（アプリ版）へ 案内する（アプリ版は 関係なし）
 */
export const WEB_FULL = false

/** アプリ本体の 課金部品（ios/App/App/StorePlugin.swift） */
interface StorePlugin {
  product(o: { id: string }): Promise<{ name: string; price: string }>
  purchase(o: { id: string }): Promise<{ status: 'purchased' | 'cancelled' | 'pending' }>
  owned(o: { id: string }): Promise<{ owned: boolean }>
  restore(o: { id: string }): Promise<{ owned: boolean; cancelled?: boolean }>
  requestReview(): Promise<{ requested: boolean }>
  addListener(event: 'owned', cb: (e: { id: string; owned: boolean }) => void): Promise<PluginListenerHandle>
}
const Store = registerPlugin<StorePlugin>('Store')

/** 購入済みの 印（アプリ本体の 保存領域にも 写る）。本当の 記録は App Store が 持っている */
const KEY = 'excel-quest-unlock-v1'
const readCache = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Web 版が 全章 無料だった ころに、もう 第3章から 先へ 進んでいた 人は、その ブラウザでは 最後まで 遊べる
 * （体験版に 切りかえた とたんに 冒険が 止まらないように）
 */
const EARLY_KEY = 'excel-quest-web-early-v1'
const PAID_TOWNS = ['ifport', 'lookup', 'pivoria', 'textria', 'koyomi', 'hope']
function webEarlyPlayer() {
  try {
    if (localStorage.getItem(EARLY_KEY) === '1') return true
    const g = loadGame()
    const early = !!g && PAID_TOWNS.some((t) => g.flags[`visit_${t}`])
    if (early) localStorage.setItem(EARLY_KEY, '1')
    return early
  } catch {
    return false
  }
}

/** アプリ版は 購入の 記録しだい。Web 版は WEB_FULL（か 開発中の npm run dev・前から 進んでいた 人）なら すべて 遊べる */
let unlocked = isNative ? readCache() : WEB_FULL || !!import.meta.env?.DEV || webEarlyPlayer()
/** 購入画面を 開いているか */
let screenOpen = false
const subs = new Set<() => void>()
const notify = () => subs.forEach((f) => f())
const subscribe = (f: () => void) => {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}

function setUnlocked(v: boolean) {
  if (v === unlocked) return
  unlocked = v
  try {
    if (v) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    /* 保存できなくても 今回は 遊べる */
  }
  notify()
}

export const isUnlocked = () => unlocked
/** その 章を 遊べるか */
export const chapterAllowed = (no: number) => no <= FREE_CHAPTERS || unlocked
export const useUnlocked = () => useSyncExternalStore(subscribe, isUnlocked)

export function openUnlock() {
  screenOpen = true
  notify()
}
export function closeUnlock() {
  screenOpen = false
  notify()
}
export const useUnlockScreen = () => useSyncExternalStore(subscribe, () => screenOpen)

/** Web 版から App Store の アプリの ページを 開く（ゲームは そのまま 残す） */
export function openAppStore() {
  window.open(APP_STORE_URL, '_blank', 'noopener')
}

if (isNative) {
  // 起動時に 端末の 購入記録で 確かめる（機種変更・再インストール後も 自動で 戻る）。
  // 記録が 読めない ときに 遊べなく ならないよう、ここでは 解放する 方向だけ 反映する
  Store.owned({ id: PRODUCT_ID })
    .then((r) => r.owned && setUnlocked(true))
    .catch(() => {})
  // 承認待ちの 購入が 通った・払い戻された など、あとから 届く 知らせ
  void Store.addListener('owned', (e) => e.id === PRODUCT_ID && setUnlocked(e.owned)).catch(() => {})
}

/** 価格（例：¥500）。App Store の 設定から 読む。読めなければ null */
export async function loadPrice(): Promise<string | null> {
  if (!isNative) return null
  try {
    return (await Store.product({ id: PRODUCT_ID })).price
  } catch {
    return null
  }
}

export type BuyResult = 'purchased' | 'cancelled' | 'pending' | 'error'

export async function buyFull(): Promise<BuyResult> {
  try {
    const { status } = await Store.purchase({ id: PRODUCT_ID })
    if (status === 'purchased') setUnlocked(true)
    return status
  } catch {
    return 'error'
  }
}

export type RestoreResult = 'restored' | 'none' | 'cancelled' | 'error'

export async function restoreFull(): Promise<RestoreResult> {
  try {
    const r = await Store.restore({ id: PRODUCT_ID })
    if (r.owned) {
      setUnlocked(true)
      return 'restored'
    }
    return r.cancelled ? 'cancelled' : 'none'
  } catch {
    return 'error'
  }
}

/** 評価を お願いした 章（同じ 章で 2回 お願いしない） */
const REVIEW_KEY = 'excel-quest-review-asked'
/** 評価を お願いする 章の おわり（第2章は 全章解放の 案内が 出るので 外す） */
const REVIEW_CHAPTERS = [1, 4, 8]

/**
 * 章を クリアした あとに「★で 評価」を お願いする（アプリ版だけ）。
 * Apple 標準の ダイアログを 使う（自前の「気に入りましたか？」画面は 出さない 決まり）。
 * 実際に 出すか どうかは Apple が 決め、1年に 3回まで
 */
export function askReviewAfter(chapter: number) {
  if (!isNative || !REVIEW_CHAPTERS.includes(chapter)) return
  let asked: number[] = []
  try {
    asked = JSON.parse(localStorage.getItem(REVIEW_KEY) ?? '[]')
  } catch {
    /* 読めなければ はじめて あつかい */
  }
  if (asked.includes(chapter)) return
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify([...asked, chapter]))
  } catch {
    /* 保存できなくても お願いは する */
  }
  // 古い アプリ本体（この 機能が ない 版）でも 止まらないように
  Store.requestReview().catch(() => {})
}
