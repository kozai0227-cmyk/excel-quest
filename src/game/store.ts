import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { useSyncExternalStore } from 'react'
import { isNative } from './native'

/** 無料で 遊べる 章（ここまで）。この 先は「全章解放」を 買うと 遊べる */
export const FREE_CHAPTERS = 2
/** App Store Connect で 作る 商品（非消耗型）の ID */
export const PRODUCT_ID = 'com.kozai0227.equalquest.full'
/**
 * Web 版も 全章 遊べるか。App Store の 審査が 通るまでは テスト用に true のまま。
 * false に すると Web 版は 第2章までの 体験版に なる（アプリ版は 関係なし）
 */
export const WEB_FULL = true

/** アプリ本体の 課金部品（ios/App/App/StorePlugin.swift） */
interface StorePlugin {
  product(o: { id: string }): Promise<{ name: string; price: string }>
  purchase(o: { id: string }): Promise<{ status: 'purchased' | 'cancelled' | 'pending' }>
  owned(o: { id: string }): Promise<{ owned: boolean }>
  restore(o: { id: string }): Promise<{ owned: boolean; cancelled?: boolean }>
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

/** アプリ版は 購入の 記録しだい。Web 版は WEB_FULL（か 開発中の npm run dev）なら すべて 遊べる */
let unlocked = isNative ? readCache() : WEB_FULL || !!import.meta.env?.DEV
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

if (isNative) {
  // 起動時に 端末の 購入記録で 確かめる（機種変更・再インストール後も 自動で 戻る）。
  // 記録が 読めない ときに 遊べなく ならないよう、ここでは 解放する 方向だけ 反映する
  Store.owned({ id: PRODUCT_ID })
    .then((r) => r.owned && setUnlocked(true))
    .catch(() => {})
  // 承認待ちの 購入が 通った・払い戻された など、あとから 届く 知らせ
  void Store.addListener('owned', (e) => e.id === PRODUCT_ID && setUnlocked(e.owned)).catch(() => {})
}

/** 価格（例：¥610）。読めなければ null */
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
