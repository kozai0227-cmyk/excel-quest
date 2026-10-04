# iPhone アプリ（App Store）にする手順

このリポジトリには、iPhone アプリの Xcode プロジェクト（`ios/` フォルダ）が入っています。
ゲーム本体（Web 版と同じもの）を、Capacitor という仕組みで アプリの中に 入れて 動かします。

アプリの ビルドと 提出は **Mac と Xcode が 必要** です。以下は Mac で 行う 手順です。

---

## 0. はじめに 1回だけ 準備するもの

1. **Mac** に **Xcode**（App Store から 無料）を 入れる
2. **Node.js**（https://nodejs.org の LTS 版）を 入れる
3. **Apple Developer Program** に 登録する（年会費あり。https://developer.apple.com/programs/ ）
4. ターミナルで このリポジトリを 取ってくる
   ```sh
   git clone https://github.com/kozai0227-cmyk/excel-quest.git
   cd excel-quest
   npm ci
   ```

## 1. アプリを 組み立てて、Xcode で 開く

ゲームを 直したら、毎回 これを 実行します（Web 版の 最新を アプリに 写す）。

```sh
npm run ios          # ゲームを ビルドして ios/ に 写す
npx cap open ios     # Xcode で 開く
```

## 2. Xcode で 最初に 1回だけ 設定すること

左の 一覧で **App** → 中央の **TARGETS > App** を 選び、

- **Signing & Capabilities**
  - **Team**：自分の Apple Developer アカウントを 選ぶ
  - **Bundle Identifier**：`com.kozai0227.equalquest`（変える場合は `capacitor.config.ts` の `appId` も 同じに する）
- **General**
  - **Display Name**：`イコールクエスト`（ホーム画面に 出る 名前）
  - **Version**：`1.0.0`、**Build**：`1`（提出の たびに Build を 1 ずつ 増やす）
  - **Minimum Deployments**：iOS 15.0（そのままで よい）

## 3. 実機・シミュレーターで 動かしてみる

Xcode 上部で 端末（例：iPhone 16 シミュレーター、または USB でつないだ iPhone）を 選び、▶（Run）を 押す。

確認ポイント：
- タイトル画面が 出て、音が 鳴る（最初の タップで 音が 出る）
- 「はじめから」で プロローグ → 森 → 戦闘 まで 進める
- いったん アプリを 終了して 再起動しても「つづきから」が できる
- 機内モードでも 遊べる（ネットを 使わない）
- メニュー → 設定 →「ライセンス表記」が 表示される

## 4. App Store に 提出する

1. https://appstoreconnect.apple.com で「マイApp」→「＋」→ 新規App
   - プラットフォーム：iOS、名前：イコール・クエスト、言語：日本語
   - バンドルID：`com.kozai0227.equalquest`
2. Xcode で 端末を **Any iOS Device (arm64)** に して、メニュー **Product → Archive**
3. できあがった アーカイブで **Distribute App → App Store Connect → Upload**
4. App Store Connect で ビルドを 選び、説明文・スクリーンショット・年齢区分・価格・プライバシーポリシーの URL などを 入れて「審査に 提出」

> 「輸出コンプライアンス（暗号化）」の 質問は、`Info.plist` に「独自の 暗号化を 使っていない」と 書いてあるので 出ません。

---

## 仕組みの メモ（開発者向け）

| 項目 | 内容 |
|---|---|
| 設定ファイル | `capacitor.config.ts`（バンドルID・アプリ名・背景色） |
| ネイティブ部分 | `ios/App`（Swift Package Manager 方式。CocoaPods は 不要） |
| 画面の 向き | iPhone は 縦のみ、iPad は 全方向（`ios/App/App/Info.plist`） |
| ステータスバー | 非表示（ゲーム画面を 全面に） |
| セーブデータ | localStorage に 加えて、アプリ本体の 保存領域（`@capacitor/preferences`）にも 写す（`src/game/native.ts`）。iOS が Web の データを 消しても 起動時に 戻る |
| フォント | DotGothic16 を アプリに 同梱（`@fontsource/dotgothic16`）。日本語の 本文は iPhone 内蔵の ヒラギノ |
| アイコン・起動画面 | `ios/App/App/Assets.xcassets`（アイコンは 1024×1024・透明なし） |
| ライセンス表記 | `public/licenses.txt`。部品を 足したら `npm run licenses` で 作り直す |
