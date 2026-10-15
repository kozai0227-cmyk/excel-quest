# App Store Connect に 入れる 内容（下書き）

App Store Connect の 各欄に、そのまま 貼り付けて 使える 形に しています。
文字数は 上限内に おさまることを 確認済みです（全角も 1文字と 数えます）。
**「Excel」「エクセル」「Microsoft」は 他社の 商標なので、どの 欄にも 入れないでください。**

---

## 1.0.2 で 変えるもの（検索で 見つけてもらう ための 見直し）

App Store の 検索に 使われるのは **名前・サブタイトル・キーワード欄** です（説明文は 検索に 使われない）。
いちばん 効くのは 名前なので、名前に「関数」「表計算」を 入れ、3つの 欄で 言葉が 重ならないように しました。

| 欄 | 今まで | 1.0.2 から |
|---|---|---|
| 名前 | イコール・クエスト | `イコール・クエスト：関数が身につく表計算RPG`（23字） |
| サブタイトル | 関数と数式が身につく表計算RPG | `VLOOKUPもIF関数も遊んで覚える勉強ゲーム`（24字） |
| キーワード | （下の 旧案） | 下の「キーワード」（99字） |

- 3つの 欄の 言葉は 組み合わせて 検索される（例：「関数 勉強」「表計算 初心者」「VLOOKUP 練習」）
- ホーム画面の 名前（イコールクエスト）と、ゲーム内の タイトルは そのまま
- 名前・サブタイトル・キーワードは **新しい バージョンを 出す ときにしか 変えられない**

### 手順

1. **1.0.1 が「配信準備完了」に なるのを 待つ**（審査中は 新しい バージョンを 作れない）
2. Mac で 最新を 取ってきて、アプリを 組み立てる
   ```sh
   git pull origin main
   npm run ios
   npx cap open ios
   ```
3. Xcode の **TARGETS > App > General** で **Version を `1.0.2`、Build を `4`**（前より 大きい 数）に して、Archive → Upload
4. App Store Connect →「配信」の **＋**（iOS App の 横）→ バージョン `1.0.2` を 作る
5. 左の **App 情報** で、名前と サブタイトルを 上の 表の とおりに 変えて 保存
6. 1.0.2 の ページで
   - **キーワード** を 下の「キーワード」に 差し替え
   - **このバージョンの 最新情報** に 下の 文を 貼る
   - **ビルド** で 手順3の ビルドを 選ぶ
   - **マーケティング URL** に `https://equal-quest.vercel.app/`（紹介ページ）を 入れる
7. 「審査に 提出」

#### このバージョンの 最新情報（1.0.2）

```
・章をクリアしたあと、App Storeでの評価をお願いすることがあります（評価はいつでも任意です）
・ストアでの紹介文を見直しました
```

> 評価の お願いは Apple 標準の 画面です。出るか どうかと 回数（1年に 3回まで）は Apple が 決めます。
> 第1章・第4章・最終章の おわりに 1回ずつ お願いします（第2章は 全章解放の 案内が 出るので 外しています）。
> TestFlight では 出ません。Xcode から 実機で 動かすと 毎回 出るので、そこで 確かめられます。

---

## アプリの 情報

| 欄 | 入れる 内容 | 上限 |
|---|---|---|
| 名前 | `イコール・クエスト：関数が身につく表計算RPG`（23字・1.0.2 から） | 30字 |
| サブタイトル | `VLOOKUPもIF関数も遊んで覚える勉強ゲーム`（24字・1.0.2 から） | 30字 |
| プライマリカテゴリ | 教育 | |
| セカンダリカテゴリ | ゲーム（ロールプレイング） | |
| 著作権 | `2026 kozai0227-cmyk`（本名や 屋号に しても よい） | |
| プライバシーポリシーの URL | `https://equal-quest.vercel.app/privacy.html` | |
| サポート URL | `https://equal-quest.vercel.app/support.html` | |
| マーケティング URL | `https://equal-quest.vercel.app/`（紹介ページ。1.0.2 から 入れる） | |

※ 前の URL（`excel-quest-nine.vercel.app`）でも 同じ ページが 開けますが、「excel」が 入らない 上の URL を 使います。
前の URL は Web 版の セーブデータを 守るため 消さずに 残しています（Vercel → Settings → Domains に 両方 登録ずみ）。

> ページ内の 問い合わせ先は `mita333.support@gmail.com`。

---

## プロモーションテキスト（170字まで・いつでも 変更できる）

```
手作業に追われる新人社員が、表計算の魔法で世界を救う！ SUMからVLOOKUP・SUMIFS・日付・文字列・エラー対処まで、町の人の悩みを解決しながら楽しく身につくレトロRPG。第2章まで無料・広告なし。
```

## 説明（4000字まで）

```
「お前の時間が、もったいない。」

先輩にそう言われた夜、集計ファイルの #REF! に吸いこまれた新人社員。
目をさますと、そこは表計算が「魔法」として使われる大陸だった――。

『イコール・クエスト』は、町の人の悩みを表計算で解決しながら、関数や数式を基礎から身につけるレトロRPGです。

■ 遊びながら、仕事で使える力が身につく
・町の人の「依頼」は、本物の表計算と同じ操作で解決。数式を組み立てて、答えが合えばクリア！
・モンスターとの戦闘は、表計算のクイズと数式問題。答えるたびに数値が変わるので、丸暗記では勝てません
・ボスの塔や神殿では、石版の謎を数式で解き明かす

■ 第2章まで無料で遊べる
・第1章・第2章は無料。気に入ったら「全章解放」（買い切り）で、最終章まで遊べます

■ 全8章・81の依頼と謎
第1章　セルの選択・オートフィル・四則演算・SUM／AVERAGE
第2章　相対参照と絶対参照（$）・ROUND
第3章　IF・AND／OR・COUNTIF／SUMIF
第4章　VLOOKUP・XLOOKUP・IFERROR
第5章　SUMIFS・COUNTIFS・集計表
第6章　文字列の連結・LEFT／MID・LEN・TRIM・FIND
第7章　日付の計算・WEEKDAY・EDATE・DATEDIF
最終章　#DIV/0!・#NAME?・#REF! などエラーの読み方と直し方

■ スマホでも数式が作りやすい
・数式はボタンをタップして組み立て。表のセルをタップすると参照が入り、長押ししてなぞると範囲が入ります
・F4ボタンで $ の付け外しも練習できます

■ ふくしゅうの書
・章ごとの復習、全章まとめ、まちがえた問題の類題を集めた「苦手克服コース」
・時間制限なし。毎回、答えと解説が出ます
・タイトル画面からすぐに遊べます

■ こんな人におすすめ
・表計算を基礎から学びたい新社会人・学生
・関数を「なんとなく」使っている人
・レトロRPGが好きな人

■ 安心して遊べる
・インターネット接続は不要。どこでも遊べます（購入・復元のときだけ通信します）
・広告なし。課金は「全章解放」1回だけで、追加の支払いはありません
・個人情報を集めません

※ 本アプリで学ぶ関数や数式は、一般的な表計算ソフトで広く使われているものです。
```

## キーワード（100字まで・カンマ区切り・空白なし）

1.0.2 から：

```
学習,スプレッドシート,パソコン,PC,事務,社会人,新人,研修,仕事,効率化,数式,XLOOKUP,SUMIF,SUMIFS,COUNTIF,IFERROR,絶対参照,ピボット,集計,初心者,入門
```

（99字。名前・サブタイトルに ある 言葉〔関数・表計算・RPG・VLOOKUP・IF・勉強・ゲーム〕は 自動で 検索対象に なるので、ここには 入れない。
言葉は 短く 区切る ほうが、ほかの 欄の 言葉と 組み合わさって 多くの 検索に 出る）

<details><summary>1.0.1 までの キーワード</summary>

```
スプレッドシート,勉強,学習,ゲーム,クイズ,レトロ,ドット絵,社会人,新人研修,パソコン,事務,仕事効率化,VLOOKUP,XLOOKUP,SUMIFS,COUNTIF,IF,日付,集計,資格
```

</details>

## 英語（米国）の ページ（検索の 言葉を 増やす）

日本の App Store では、日本語の ページに 加えて **英語（米国）の ページの 名前・サブタイトル・キーワードも 検索に 使われる** と されています
（Apple の 公式資料には 書かれておらず、ASO 会社の 調査に よるもの）。英語の ページを 足すと、キーワードの 枠が 増えます。
ただし 違う 言語の ページどうしの 言葉は 組み合わせて 検索されないので、英語の ページの キーワードには「関数」「表計算」も もう一度 入れています。

端末を 英語に している 人には この ページが 表示されるので、説明文には「今は 日本語のみ」と 正直に 書いています。

**追加の しかた**：App Store Connect の **App 情報** → 右上の 言語（日本語）の メニュー → **英語（米国）** を 追加 →
名前・サブタイトル・プライバシーポリシーの URL を 入れる。続けて バージョンの ページでも 言語を 英語（米国）に 切りかえて、説明・キーワード・サポート URL を 入れる。
スクリーンショットは 入れなければ 日本語の ものが 使われます。

| 欄 | 入れる 内容 |
|---|---|
| 名前 | `Equal Quest: Spreadsheet RPG`（28字） |
| サブタイトル | `Learn formulas and functions`（28字） |
| キーワード | 下の 枠（93字） |
| プライバシーポリシーの URL | `https://equal-quest.vercel.app/privacy.html` |
| サポート URL | `https://equal-quest.vercel.app/support.html` |

```
関数,表計算,練習,問題集,基礎,勉強,ビジネス,新社会人,就活,資格,脳トレ,クイズ,DATEDIF,WEEKDAY,ROUND,AVERAGE,SUM,LEFT,MID,office
```

説明（英語）：

```
Save a fantasy world with spreadsheet skills!

Equal Quest is a retro RPG about a new office worker who gets pulled into a world where spreadsheet formulas work like magic. Help the townspeople with their problems, battle monsters with quick quiz questions, and master real formulas step by step.

- Learn by doing: build formulas by tapping buttons and cells, then check your answer instantly
- From the basics to practical skills: SUM, AVERAGE, absolute references ($), IF, VLOOKUP, XLOOKUP, SUMIFS, COUNTIFS, text functions, date math, and fixing errors such as #DIV/0! and #REF!
- 8 chapters and 81 requests and puzzles
- Book of Review: practice by chapter, or focus on the questions you missed
- Chapters 1 and 2 are free. Unlock the rest with a one-time purchase
- No ads, no account, works offline

Note: The game is currently available in Japanese only. English support is planned for a future update.
```

---

## App のプライバシー（「データの収集」）

- 「データを収集していますか？」→ **いいえ（データを収集しません）**
- これで ストアの 表示は「データの収集なし」に なります
- アプリ本体の 申告ファイル（`ios/App/App/PrivacyInfo.xcprivacy`）とも 一致しています
- App 内課金は Apple が 処理し、開発者は 購入の 情報を 受け取らない ので、「購入」の 項目も 申告不要です

## 年齢制限指定（アンケートの 答え）

| 質問 | 答え |
|---|---|
| アニメまたはファンタジーの暴力 | まれ／軽度 |
| それ以外（暴力表現・性的表現・ギャンブル・薬物・ホラー・成人向けの話題 など） | なし |
| 制限のない Web アクセス | いいえ |
| ユーザー間の やり取り・ユーザー作成コンテンツ | いいえ |
| 広告 | いいえ |

→ 判定は 年少者でも 遊べる 区分（4+ か 9+）に なる 想定です。

## コンテンツの権利

- 「第三者の コンテンツを 含みますか？」→ **いいえ**
  （フォント・部品は 利用許諾の 範囲で 同梱し、アプリ内に ライセンス表記あり）

## 価格

- アプリ本体：**無料**（「価格および配信状況」で 0 円を 選ぶ）
- 第3章から 先は、下の App 内課金「全章解放」で 売る
- 配信地域：はじめは **日本のみ** が おすすめ（本文が 日本語だけのため）

## App 内課金「全章解放」

App Store Connect の アプリの ページ → 左の **収益化 → App 内課金** → **＋** で 作ります。

| 欄 | 入れる 内容 |
|---|---|
| 種類 | **非消耗型**（1回 買えば ずっと 使える） |
| 参照名 | `全章解放`（自分用。ストアには 出ない） |
| 製品 ID | `com.kozai0227.equalquest.full`（**アプリの コードと 同じに する。1文字でも 違うと 買えない**） |
| 価格 | **¥500**（基準の 国・地域：日本） |
| ファミリー共有 | オン（家族も 追加の 支払いなしで 遊べる。おすすめ） |
| 表示名（日本語） | `全章解放` |
| 説明（日本語・45字まで） | `第3章〜最終章と、ふくしゅうの書の全章が遊べます` |
| 審査用スクリーンショット | `store/iap-review.png`（購入画面・¥500・1320×2868）。TestFlight で 撮った ものに 差し替えても よい |
| 審査メモ | 下の 英文 |

```
Unlocks chapters 3 to 8 (the final chapter) and all chapters of the review book. Chapters 1 and 2 are free.
To open the purchase screen quickly: Title screen > "ふくしゅう" (Review) > tap any chapter with a lock (🔒).
"購入を 復元" (Restore Purchases) is on the same screen and in Menu (B) > 設定 (Settings) > 全章解放.
```

> 最初の App 内課金は、アプリの 審査と いっしょに 出します。バージョンの ページの「App 内課金と サブスクリプション」で この 商品を 選んでから「審査に 提出」してください。

---

## App Review に関する情報

| 欄 | 入れる 内容 |
|---|---|
| サインインが必要 | いいえ（チェックを 外す） |
| 連絡先 | あなたの 名前・電話番号・メール（審査担当者だけが 見ます） |
| メモ | 下の 英文を 貼る |

```
This is an offline educational RPG (Japanese only) that teaches spreadsheet functions and formulas such as SUM, IF, VLOOKUP, SUMIFS, date and text functions, and error handling.
No account, ads, or tracking. All progress is saved on the device only. The app works offline except when purchasing or restoring.

Chapters 1 and 2 are free. A one-time non-consumable in-app purchase, "全章解放" (com.kozai0227.equalquest.full), unlocks chapters 3 to 8.

Quick tour for review:
- Title screen > "ふくしゅう" (Review): answer quiz questions immediately, no time limit. Chapters with a lock (🔒) open the purchase screen.
- The purchase screen has "購入する" (Buy) and "購入を 復元" (Restore Purchases). It is also in Menu (B) > 設定 (Settings) > 全章解放.
- Title screen > "はじめから" (New game): enter a name, watch the short prologue (or tap SKIP), and the first battle starts within about a minute.
- In formula questions, tap the buttons or tap table cells to build a formula. Long-press a cell and drag to insert a range; swipe to scroll the table.
- The privacy policy is available from the title screen and from Menu (B) > 設定 (Settings).

The formula engine is our own implementation. The app is not affiliated with, and does not imitate, any third-party spreadsheet product.
```

---

## スクリーンショット

| App Store Connect の 欄 | 画像（6枚・01〜06 の 順） |
|---|---|
| **Dynamic Island 搭載 iPhone（中型ディスプレイ）**（6.1〜6.3インチ） | `store/screenshots-6.3/`（1206×2622） |
| 6.9インチ（大型）の 欄が ある 場合 | `store/screenshots/`（1320×2868） |

画面の 一番上に 出ている iPhone の 欄に 入れれば、ほかの 大きさにも 自動で 使われます。
iPad・Apple Watch の 欄は 空の ままで よい（iPhone 専用の ため）。
