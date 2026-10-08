/**
 * アプリに 同梱した ページ（プライバシーポリシーなど、public/ の HTML）を 全画面で 見せる。
 * Web 版でも アプリ版でも 同じ ファイルを 表示する（通信は 不要）。
 */
export function DocView({ src, onClose }: { src: string; onClose(): void }) {
  return (
    <div className="lic-view doc-view">
      <iframe src={src} title="document" />
      <button type="button" className="btn" onClick={onClose}>
        とじる
      </button>
    </div>
  )
}
