import type { CapacitorConfig } from '@capacitor/cli'

/** iPhone アプリ（Capacitor）の 設定。appId は App Store Connect の バンドルIDと 同じに する */
const config: CapacitorConfig = {
  appId: 'com.kozai0227.equalquest',
  appName: 'イコールクエスト',
  webDir: 'dist',
  backgroundColor: '#000000',
  ios: {
    // 画面の 端（ノッチ）は CSS の safe-area で 調整するので、Web 画面は 全面に 広げる
    contentInset: 'never',
    // ゲーム画面 全体が ゴムのように 伸び縮み しないように
    scrollEnabled: false,
    backgroundColor: '#000000',
  },
}

export default config
