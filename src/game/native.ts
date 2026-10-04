import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/** iPhone アプリ（Capacitor）として 動いているか。ブラウザ版では false */
export const isNative = Capacitor.isNativePlatform()

/** このゲームが localStorage に 書く キー（セーブ・苦手・音量・入力方式） */
const PREFIX = 'excel-quest-'

/**
 * アプリ版の 下ごしらえ。
 * iOS は 容量が 足りないと Web 画面の localStorage を 消すことが あるので、
 * ゲームの データを アプリ本体の 保存領域（Preferences）にも 写しておき、起動時に 戻す。
 * ゲーム側の コードは これまでどおり localStorage を 読み書きすれば よい。
 */
export async function initNative() {
  if (!isNative) return
  // 2本指での 拡大を 止める（ゲーム画面が ずれないように）
  document.querySelector('meta[name=viewport]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
  try {
    const { keys } = await Preferences.keys()
    // 消えていたら アプリ本体の 保存領域から 戻す
    for (const key of keys) {
      if (!key.startsWith(PREFIX) || localStorage.getItem(key) !== null) continue
      const { value } = await Preferences.get({ key })
      if (value !== null) localStorage.setItem(key, value)
    }
    // まだ 写していない データを 写す
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(PREFIX) && !keys.includes(key)) await Preferences.set({ key, value: localStorage.getItem(key) ?? '' })
    }
  } catch {
    // 保存領域が 使えなくても ゲームは 続けられる
  }
  // これから 書く データも 同時に 写す
  const setItem = Storage.prototype.setItem
  Storage.prototype.setItem = function (key: string, value: string) {
    setItem.call(this, key, value)
    if (this === localStorage && key.startsWith(PREFIX)) void Preferences.set({ key, value }).catch(() => {})
  }
  const removeItem = Storage.prototype.removeItem
  Storage.prototype.removeItem = function (key: string) {
    removeItem.call(this, key)
    if (this === localStorage && key.startsWith(PREFIX)) void Preferences.remove({ key }).catch(() => {})
  }
}
