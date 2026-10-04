import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// ドット文字の フォントは アプリに 同梱する（オフラインでも 表示できるように）
import '@fontsource/dotgothic16/400.css'
import './styles.css'
import { initNative } from './game/native'

// アプリ版は セーブ・音量などの データを 戻してから ゲームを 読みこむ
// （音量や 入力方式は 読みこんだ 瞬間に localStorage を 見るため）。ブラウザ版は すぐ 始まる
void initNative().finally(async () => {
  const [{ default: App }, { initSound }] = await Promise.all([import('./App'), import('./game/sound')])
  initSound()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
