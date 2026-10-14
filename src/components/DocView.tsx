import { createPortal } from 'react-dom'

/**
 * アプリに 同梱した ページ（プライバシーポリシーなど、public/ の HTML）や 文章（ライセンス表記）を 全画面で 見せる。
 * Web 版でも アプリ版でも 同じ ファイルを 表示する（通信は 不要）。
 * メニューの 中（スクロールする 枠）に 置くと、iPhone では 枠に 切られて「とじる」が 押せなく なることが あるので、
 * ページの いちばん 外側（body）に 出し、上にも 閉じる ボタンを 置く
 */
export function DocView({ src, text, title, onClose }: { src?: string; text?: string; title: string; onClose(): void }) {
  return createPortal(
    <div className="doc-view" role="dialog" aria-label={title}>
      <div className="doc-head">
        <span>{title}</span>
        <button type="button" className="doc-x" onClick={onClose} aria-label="とじる">
          ✕
        </button>
      </div>
      <div className="doc-body">{src ? <iframe src={src} title={title} /> : <pre>{text}</pre>}</div>
      <button type="button" className="btn doc-close" onClick={onClose}>
        とじる
      </button>
    </div>,
    document.body,
  )
}
