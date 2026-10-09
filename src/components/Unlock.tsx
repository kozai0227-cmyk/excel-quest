import { useEffect, useState } from 'react'
import { CHAPTERS } from '../data/chapters'
import { useKeys } from '../game/keys'
import { isNative } from '../game/native'
import { jingle, sfx } from '../game/sound'
import { FREE_CHAPTERS, buyFull, closeUnlock, loadPrice, restoreFull, useUnlocked } from '../game/store'

const short = (t: string) => t.replace(/^(第\d章|最終章)　/, '')
const tag = (t: string) => t.split('　')[0]

const MESSAGES = {
  purchased: 'ありがとう ございます！ すべての 章が 遊べるように なりました。',
  restored: '購入を 復元しました。すべての 章が 遊べます。',
  pending: '購入の 承認待ちです。承認されると 自動で 解放されます。',
  error: '購入できませんでした。通信を 確かめて、もう一度 お試しください。',
  none: 'この Apple アカウントでの 購入は 見つかりませんでした。',
  restoreError: '復元できませんでした。通信を 確かめて、もう一度 お試しください。',
} as const

/**
 * 「全章解放」の 購入画面。第3章から 先の 入口や、ふくしゅうの書・設定から 開く。
 * ブラウザ版は 買えないので、アプリ版の 案内だけ 出す
 */
export function Unlock() {
  const unlocked = useUnlocked()
  const [price, setPrice] = useState<string | null>(null)
  const [priceFailed, setPriceFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [cursor, setCursor] = useState(0)

  useEffect(() => setCursor(0), [unlocked])
  useEffect(() => {
    if (!isNative || unlocked) return
    void loadPrice().then((p) => (p ? setPrice(p) : setPriceFailed(true)))
  }, [unlocked])

  const close = () => {
    if (busy) return
    sfx('cancel')
    closeUnlock()
  }
  const buy = async () => {
    if (busy) return
    sfx('select')
    setBusy(true)
    setMsg(null)
    const r = await buyFull()
    setBusy(false)
    if (r === 'purchased') jingle('clear')
    if (r !== 'cancelled') setMsg(MESSAGES[r])
  }
  const restore = async () => {
    if (busy) return
    sfx('select')
    setBusy(true)
    setMsg(null)
    const r = await restoreFull()
    setBusy(false)
    if (r === 'restored') {
      jingle('clear')
      setMsg(MESSAGES.restored)
    }
    if (r === 'none') setMsg(MESSAGES.none)
    if (r === 'error') setMsg(MESSAGES.restoreError)
  }

  const btns = !isNative || unlocked ? [{ label: 'とじる', run: close }] : [
    { label: busy ? '処理中……' : `購入する${price ? `（${price}）` : ''}`, run: buy, primary: true },
    { label: '購入を 復元', run: restore },
    { label: 'あとで', run: close },
  ]
  useKeys((k) => {
    if (busy) return
    if (k === 'up' || k === 'down') {
      sfx('cursor')
      setCursor((c) => (c + (k === 'up' ? btns.length - 1 : 1)) % btns.length)
    } else if (k === 'ok') btns[Math.min(cursor, btns.length - 1)].run()
    else if (k === 'cancel') close()
  })

  const paid = CHAPTERS.filter((ch) => ch.no > FREE_CHAPTERS)
  return (
    <div className="unlock">
      <div className="unlock-inner">
        <h2>{unlocked ? '🔓 全章解放 ずみ' : '🔓 全章解放'}</h2>
        {unlocked ? (
          <p className="unlock-lead">{msg ?? 'すべての 章が 遊べます。最後まで 冒険を 楽しんで ください！'}</p>
        ) : isNative ? (
          <p className="unlock-lead">
            第{FREE_CHAPTERS}章までは 無料で 遊べます。
            <br />
            「全章解放」で、この 先の 冒険が すべて 遊べます。
          </p>
        ) : (
          <p className="unlock-lead">
            ブラウザ版は 第{FREE_CHAPTERS}章までの 体験版です。
            <br />
            この 先の 冒険は、iPhone アプリ版「イコール・クエスト」で 遊べます。
          </p>
        )}
        {!unlocked && (
          <>
            <ul className="unlock-list">
              {paid.map((ch) => (
                <li key={ch.no}>
                  <b>
                    {tag(ch.title)}　{short(ch.title)}
                  </b>
                  <span>{ch.topic}</span>
                </li>
              ))}
              <li>
                <b>📖 ふくしゅうの書</b>
                <span>すべての 章の 復習・全章まとめコース</span>
              </li>
            </ul>
            {isNative && <p className="unlock-note">1回 買えば ずっと 遊べます（買い切り）。</p>}
          </>
        )}
        {msg && !unlocked && <p className="unlock-msg">{msg}</p>}
        {isNative && !unlocked && priceFailed && !msg && <p className="unlock-msg">App Store に つながりません。通信を 確かめて ください。</p>}
        <div className="unlock-btns">
          {btns.map((b, i) => (
            <button
              key={b.label}
              type="button"
              data-nosfx
              disabled={busy}
              className={`btn ${'primary' in b && b.primary ? 'primary' : ''} ${i === cursor ? 'on' : ''}`}
              onPointerEnter={() => setCursor(i)}
              onClick={b.run}
            >
              {b.label}
            </button>
          ))}
        </div>
        {isNative && !unlocked && (
          <p className="unlock-fine">
            お支払いは App Store で 行われます。機種変更や 再インストールの あとは「購入を 復元」で 引き継げます（同じ Apple アカウントの 場合）。
          </p>
        )}
      </div>
    </div>
  )
}
