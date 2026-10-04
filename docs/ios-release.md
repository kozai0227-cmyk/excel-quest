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

## 5. App Store Connect の 入力で 迷いやすい ところ（おすすめの 答え）

| 項目 | おすすめ |
|---|---|
| **Appのプライバシー**（データの収集） | 「データを収集していません」。セーブは 端末の 中だけで、外部に 送らない。広告・解析も ない |
| **プライバシーポリシーの URL** | 必須。「個人情報を 集めない」旨の ページを 用意する（例：GitHub Pages など） |
| **年齢制限指定** | 「アニメまたはファンタジーの暴力：まれ/軽度」→ 結果は 4+ か 9+ の 想定。ほかは すべて「なし」 |
| **カテゴリ** | プライマリ：教育　セカンダリ：ゲーム（ロールプレイング） |
| **対応端末** | iPhone のみ（iPad では iPhone 版が 拡大表示で 動く） |
| **サインイン情報** | 不要（アカウントの 仕組みが ない） |
| **審査メモ（App Review Information の Notes）** | 下の 文例を 貼る |
| **スクリーンショット** | 6.9インチ（iPhone 16 Pro Max など）が 必須。シミュレーターで 撮れる |

### 審査メモの 文例

```
This is an offline educational RPG that teaches spreadsheet formulas (SUM, IF, VLOOKUP, dates, etc.) in Japanese.
No account or network connection is required. All progress is saved on the device.
Tip for review: tap 「ふくしゅう」 on the title screen to try the quiz mode immediately,
or 「はじめから」 to play the story from the beginning (the first battle starts within 1 minute).
The formula engine is our own implementation; the app does not use or imitate any third-party spreadsheet product.
```

---

## 仕組みの メモ（開発者向け）

| 項目 | 内容 |
|---|---|
| 設定ファイル | `capacitor.config.ts`（バンドルID・アプリ名・背景色） |
| ネイティブ部分 | `ios/App`（Swift Package Manager 方式。CocoaPods は 不要） |
| 対応端末・向き | iPhone のみ・縦のみ（`TARGETED_DEVICE_FAMILY = 1`、`Info.plist`） |
| プライバシーマニフェスト | `ios/App/App/PrivacyInfo.xcprivacy`（追跡なし・収集なし・UserDefaults の 理由 CA92.1） |
| 入力方式 | アプリ版は ボタン入力に 固定（キーボード用の 切り替えと 説明を 出さない） |
| ステータスバー | 非表示（ゲーム画面を 全面に） |
| セーブデータ | localStorage に 加えて、アプリ本体の 保存領域（`@capacitor/preferences`）にも 写す（`src/game/native.ts`）。iOS が Web の データを 消しても 起動時に 戻る |
| フォント | DotGothic16 を アプリに 同梱（`@fontsource/dotgothic16`）。日本語の 本文は iPhone 内蔵の ヒラギノ |
| アイコン・起動画面 | `ios/App/App/Assets.xcassets`（アイコンは 1024×1024・透明なし） |
| ライセンス表記 | `public/licenses.txt`。部品を 足したら `npm run licenses` で 作り直す |
