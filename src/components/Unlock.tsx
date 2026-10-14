import { useEffect, useState } from 'react'
import { CHAPTERS, chapterShort, chapterTag, chapterTopic } from '../data/chapters'
import { useKeys } from '../game/keys'
import { isNative } from '../game/native'
import { jingle, sfx } from '../game/sound'
import { FREE_CHAPTERS, buyFull, closeUnlock, loadPrice, openAppStore, restoreFull, useUnlocked } from '../game/store'
import { tr } from '../game/lang'

const MESSAGES = {
  purchased: () => tr('ありがとう ございます！ すべての 章が 遊べるように なりました。', 'Thank you! Every chapter is now unlocked.'),
  restored: () => tr('購入を 復元しました。すべての 章が 遊べます。', 'Your purchase was restored. Every chapter is unlocked.'),
  pending: () => tr('購入の 承認待ちです。承認されると 自動で 解放されます。', 'Your purchase is awaiting approval. Chapters unlock automatically once it is approved.'),
  error: () => tr('購入できませんでした。通信を 確かめて、もう一度 お試しください。', 'The purchase could not be completed. Check your connection and try again.'),
  none: () => tr('この Apple アカウントでの 購入は 見つかりませんでした。', 'No purchase was found for this Apple Account.'),
  restoreError: () => tr('復元できませんでした。通信を 確かめて、もう一度 お試しください。', 'Could not restore. Check your connection and try again.'),
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
    if (r !== 'cancelled') setMsg(MESSAGES[r]())
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
      setMsg(MESSAGES.restored())
    }
    if (r === 'none') setMsg(MESSAGES.none())
    if (r === 'error') setMsg(MESSAGES.restoreError())
  }

  const toStore = () => {
    sfx('select')
    openAppStore()
  }
  const btns = unlocked
    ? [{ label: tr('とじる', 'Close'), run: close }]
    : !isNative
      ? [
          { label: tr('App Store で 見る', 'View on the App Store'), run: toStore, primary: true },
          { label: tr('とじる', 'Close'), run: close },
        ]
      : [
          { label: busy ? tr('処理中……', 'Processing...') : tr(`購入する${price ? `（${price}）` : ''}`, `Buy${price ? ` (${price})` : ''}`), run: buy, primary: true },
          { label: tr('購入を 復元', 'Restore Purchase'), run: restore },
          { label: tr('あとで', 'Later'), run: close },
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
        <h2>
          {unlocked
            ? tr('🔓 全章解放 ずみ', '🔓 All Chapters Unlocked')
            : isNative
              ? tr('🔓 全章解放', '🔓 Unlock All Chapters')
              : tr('📱 続きは アプリ版で', '📱 Continue in the App')}
        </h2>
        {unlocked ? (
          <p className="unlock-lead">{msg ?? tr('すべての 章が 遊べます。最後まで 冒険を 楽しんで ください！', 'Every chapter is playable. Enjoy the adventure to the very end!')}</p>
        ) : isNative ? (
          <p className="unlock-lead">
            {tr(`第${FREE_CHAPTERS}章までは 無料で 遊べます。`, `Chapters 1-${FREE_CHAPTERS} are free to play.`)}
            <br />
            {tr('「全章解放」で、この 先の 冒険が すべて 遊べます。', '"Unlock All Chapters" opens up the rest of the adventure.')}
          </p>
        ) : (
          <p className="unlock-lead">
            {tr(`ブラウザ版は 第${FREE_CHAPTERS}章までの 体験版です。`, `The browser version is a trial up to Chapter ${FREE_CHAPTERS}.`)}
            <br />
            {tr('この 先の 冒険は、iPhone アプリ版「イコール・クエスト」で 遊べます。', 'The rest of the adventure is available in the Equal Quest iPhone app.')}
          </p>
        )}
        {!unlocked && (
          <>
            <ul className="unlock-list">
              {paid.map((ch) => (
                <li key={ch.no}>
                  <b>
                    {chapterTag(ch)}{tr('　', ': ')}{chapterShort(ch)}
                  </b>
                  <span>{chapterTopic(ch)}</span>
                </li>
              ))}
              <li>
                <b>📖 {tr('ふくしゅうの書', 'Book of Review')}</b>
                <span>{tr('すべての 章の 復習・全章まとめコース', 'Review for every chapter, plus the All-Chapter Course')}</span>
              </li>
            </ul>
            {isNative ? (
              <p className="unlock-note">{tr('1回 買えば ずっと 遊べます（買い切り）。', 'Buy once, play forever (one-time purchase).')}</p>
            ) : (
              <p className="unlock-note">
                {tr('アプリ版も 第2章までは 無料。この 先は「全章解放」（買い切り）で 遊べます。', 'Chapters 1-2 are free in the app too. Unlock the rest with "Unlock All Chapters" (one-time purchase).')}
              </p>
            )}
          </>
        )}
        {msg && !unlocked && <p className="unlock-msg">{msg}</p>}
        {isNative && !unlocked && priceFailed && !msg && <p className="unlock-msg">{tr('App Store に つながりません。通信を 確かめて ください。', "Can't connect to the App Store. Please check your connection.")}</p>}
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
        {!isNative && !unlocked && (
          <p className="unlock-fine">
            {tr('ブラウザ版の セーブデータは アプリ版に 引き継げません（アプリ版は 第1章から 始まります）。', "Browser saves can't be transferred to the app (the app starts from Chapter 1).")}
          </p>
        )}
        {isNative && !unlocked && (
          <p className="unlock-fine">
            {tr(
              'お支払いは App Store で 行われます。機種変更や 再インストールの あとは「購入を 復元」で 引き継げます（同じ Apple アカウントの 場合）。',
              'Payment is handled by the App Store. After changing devices or reinstalling, use "Restore Purchase" to get it back (with the same Apple Account).',
            )}
          </p>
        )}
      </div>
    </div>
  )
}
