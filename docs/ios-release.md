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
- メニュー → 設定 →「ライセンス表記」「プライバシーポリシー」が 表示される
- タイトル画面 下の「プライバシーポリシー」も 開ける
- ふくしゅう で 第3章から 先に 🔒 が 付き、押すと 購入画面が 出る（シミュレーターでは 価格が 出ず「App Store に つながりません」と なる。実際の 購入は 次の TestFlight で 試す）

## 3.5 App 内課金を TestFlight で 試す

課金は App Store Connect の 商品と つながって はじめて 動くので、TestFlight（テスト配信）で 試します。
TestFlight での 購入は **テスト用で、お金は かかりません**。

1. App Store Connect で App 内課金「全章解放」を 作る（[`docs/app-store-metadata.md`](app-store-metadata.md) の「App 内課金」の 表どおり）。
   状態が「メタデータが不足」でなければ（「提出準備完了」なら）テストで 買える
2. 下の「4. 提出」の 2〜3 で アップロードする（Build の 番号は 前より 大きく）
3. App Store Connect →「TestFlight」タブ → 内部テスト の グループを 作り、自分を 追加
4. iPhone に「TestFlight」アプリを 入れ、届いた 招待から イコールクエストを 入れる
5. 確かめる こと
   - 購入画面に 価格（例：¥610）が 出る
   - 「購入する」→ テスト用の 購入画面 → 第3章から 先が 遊べる（峠の 見張りが いなくなる）
   - アプリを 消して 入れ直し →「購入を 復元」で 戻る
6. 購入画面を スクリーンショット（電源ボタン＋音量を上げる ボタン）して、App 内課金の「審査用スクリーンショット」に 使う

## 4. App Store に 提出する

**提出前の チェック**（Mac でなくても できる）

- [x] `public/privacy.html` と `public/support.html` の 問い合わせ先を `mita333.support@gmail.com` に した
- [ ] main に 入れて、Vercel の 公開ページ（下の URL）に 反映された
- [ ] （任意）Vercel の **Settings → Domains** で `excel` を 含まない URL（例：`equal-quest.vercel.app`）を 追加した

**手順**

1. https://appstoreconnect.apple.com で「マイApp」→「＋」→ 新規App
   - プラットフォーム：iOS、名前：イコール・クエスト、言語：日本語
   - バンドルID：`com.kozai0227.equalquest`、SKU：`equalquest`（自分用の 管理番号。何でも よい）
2. Xcode で 端末を **Any iOS Device (arm64)** に して、メニュー **Product → Archive**
3. できあがった アーカイブで **Distribute App → App Store Connect → Upload**
4. App Store Connect に、下の「入れる 内容」を 貼り付けて、ビルドを 選ぶ
5. 同じ ページの「App 内課金と サブスクリプション」で「全章解放」を 選ぶ（最初の 課金は アプリと いっしょに 審査される）
6. 「審査に 提出」

> 「輸出コンプライアンス（暗号化）」の 質問は、`Info.plist` に「独自の 暗号化を 使っていない」と 書いてあるので 出ません。

---

## 5. App Store Connect に 入れる 内容（用意済み）

| もの | 場所 |
|---|---|
| 名前・サブタイトル・説明文・キーワード・年齢制限・プライバシー・審査メモ | [`docs/app-store-metadata.md`](app-store-metadata.md)（そのまま 貼れる 形） |
| 価格・App 内課金「全章解放」の 設定 | 同じく [`docs/app-store-metadata.md`](app-store-metadata.md) の「価格」「App 内課金」 |
| スクリーンショット（6.9インチ・1320×2868・6枚） | `store/screenshots/`（01〜06 の 順に 入れる） |
| プライバシーポリシーの URL | `https://excel-quest-nine.vercel.app/privacy.html`（アプリ内でも 同じ 内容を 表示） |
| サポート URL | `https://excel-quest-nine.vercel.app/support.html` |

> スクリーンショットは Web 版の 開発用 URL（`?quest=…`・`?boss=…`・`?at=…` など）で 場面を 呼び出し、6.9インチの 大きさで 撮った ものです。
> ゲームの 見た目を 変えたら 撮り直してください。

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
| プライバシー・サポート | `public/privacy.html`・`public/support.html`（Web で 公開、アプリ内では `DocView` で 表示。通信なし） |
| App 内課金 | `ios/App/App/StorePlugin.swift`（StoreKit 2。`MainViewController` で 登録）と `src/game/store.ts`。製品 ID `com.kozai0227.equalquest.full`、無料は 第2章まで（`FREE_CHAPTERS`） |
| 町の 見た目 | `src/game/tiles.ts` の `THEMES`（地面・道・屋根・壁・木・灯り）。マップの `theme` で 選ぶ。全体図は 手元で `?mapview=町のID` |
| 町の 出入口 | 地図の 町は 入る 向きで 着く 入口が 変わる（`Exit.from`）。馬車は 門の 馬車（χ）の 前に 立ち、行った 向きの 反対側の 門に 着く（`npm run check` で 確かめる） |
| 鍵の 場所 | 第3章への 峠の 見張り（`maps.ts` の `pass_guard`）、第2章 クリア後の 案内、ふくしゅうの 書の 章、設定 →「全章解放」 |
| Web 版 | いまは 全章 遊べる（`src/game/store.ts` の `WEB_FULL = true`）。審査が 通ったら `false` に すると 第2章までの 体験版に なる。開発用 URL（`?quest=` など）は 手元（localhost）でだけ 効く |
