import type { CapacitorConfig } from '@capacitor/cli'

/** iPhone アプリ（Capacitor）の 設定。appId は App Store Connect の バンドルIDと 同じに する */
const config: CapacitorConfig = {
  appId: 'com.kozai0227.equalquest',
  appName: 'イコールクエスト',
  webDir: 'dist',
  // 起動直後（画面を 描く 前）に 見える 色。タイトル画面の 空に そろえる
  backgroundColor: '#2a74da',
  ios: {
    // 画面の 端（ノッチ）は CSS の safe-area で 調整するので、Web 画面は 全面に 広げる
    contentInset: 'never',
    // ゲーム画面 全体が ゴムのように 伸び縮み しないように
    scrollEnabled: false,
    backgroundColor: '#2a74da',
  },
}

export default config
