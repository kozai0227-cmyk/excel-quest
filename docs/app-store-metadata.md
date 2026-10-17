# App Store Connect に 入れる 内容（下書き）

App Store Connect の 各欄に、そのまま 貼り付けて 使える 形に しています。
文字数は 上限内に おさまることを 確認済みです（全角も 1文字と 数えます）。
**「Excel」「エクセル」「Microsoft」は 他社の 商標なので、どの 欄にも 入れないでください。**

---

## 1.1.0 で 変えるもの（英語版 ＋ 評価の お願い ＋ 検索の 見直し）

1.0.2 は 出さずに、1.0.2 で 予定していた「評価の お願い」と「名前・サブタイトル・キーワードの 見直し」も、1.1.0 に まとめて 出します（1.0.1 の 次が 1.1.0）。

1.1.0 で 変わる こと：

- **英語に 対応**：端末の 言語が 日本語なら 日本語、それ以外なら 英語で 始まる（タイトル画面の 🌐 と 設定から 切りかえ）
  - ホーム画面の 名前も 英語の 端末では `Equal Quest` に なる
  - ストアの「言語」欄には、アプリの 中身から 自動で「英語、日本語」と 出る
  - 配信地域は 今は 日本のみの まま。日本で 端末を 英語に している 人には 英語の ページが 表示される（国を 広げるのは 次の 段階）
- **評価の お願い**：章を クリアした あと、App Store の 評価を お願いする（下の メモ）
- **検索の 見直し**：日本語の ページの 名前・サブタイトル・キーワードを 変える（下の 表）
- **表の 列幅**：依頼の 表で 長い 文字が 切れないよう、列の 幅を 自動で 広げる
- **アイコンの 文字を 英語に**：「イコール・クエスト」→「EQUAL QUEST」（ゲーム内の 英語ロゴと 同じ 字）。アイコンは 言語ごとに 変えられないので、日本の 利用者にも この アイコンが 出る。元の 日本語の アイコンは `store/app-icon-ja.png` に 残してある（Web 版の アイコンは 日本語の まま）

> 評価の お願いは Apple 標準の 画面です。出るか どうかと 回数（1年に 3回まで）は Apple が 決めます。
> 第1章・第4章・最終章の おわりに 1回ずつ お願いします（第2章は 全章解放の 案内が 出るので 外しています）。
> TestFlight では 出ません。Xcode から 実機で 動かすと 毎回 出るので、そこで 確かめられます。

### 名前・サブタイトル・キーワード（日本語の ページ）

App Store の 検索に 使われるのは **名前・サブタイトル・キーワード欄** です（説明文は 検索に 使われない）。
いちばん 効くのは 名前なので、名前に「関数」「表計算」を 入れ、キーワード欄には 名前・サブタイトルと 重ならない 言葉を 入れました。

| 欄 | 1.0.1 まで | 1.1.0 から |
|---|---|---|
| 名前 | イコール・クエスト | `イコール・クエスト：関数が身につく表計算RPG`（23字） |
| サブタイトル | 関数と数式が身につく表計算RPG | `異世界転生×表計算を遊んで覚える勉強ゲーム`（21字） |
| キーワード | （下の 旧案） | 下の「キーワード」（99字） |

- 3つの 欄の 言葉は 組み合わせて 検索される（例：「関数 勉強」「表計算 初心者」「VLOOKUP 初心者」「異世界転生 RPG」）
- サブタイトルの「異世界転生」は、よく 検索される ジャンル名（物語は 厳密には「転移」だが、ジャンル名として 広く 使われて いる ほうに した）
- ホーム画面の 名前（イコールクエスト）と、ゲーム内の タイトルは そのまま
- 名前・サブタイトル・キーワードは **新しい バージョンを 出す ときにしか 変えられない**

### 手順

1. Mac で 最新を 取ってきて、アプリを 組み立てる
   ```sh
   git pull origin main
   npm run ios
   npx cap open ios
   ```
   > `git pull` で `project.pbxproj` が「上書きされる」と 止まったら、前に Xcode で 入れた Version・Build の 変更が 残っているだけです。
   > `git checkout -- ios/App/App.xcodeproj/project.pbxproj` で 戻してから、もう一度 `git pull origin main`（Version・Build は 手順2で 入れ直す）
2. Xcode の **TARGETS > App > General** で **Version を `1.1.0`、Build を `5`**（前より 大きい 数）に する
3. **シミュレーターで 英語を 確かめる**（任意）：シミュレーターの 設定 → 一般 → 言語と地域 で 英語に して アプリを 開く →
   ホーム画面の 名前が `Equal Quest`、タイトルが `EQUAL QUEST` で 始まれば OK（日本語に もどすと 日本語で 始まる）
4. Archive → Upload（**1.1.0 (5) は アップロード済み**。「処理が 完了しました」の メールが 来たら 次へ）
5. App Store Connect →「配信」の **＋** → バージョン `1.1.0` を 作る
6. 左の **App 情報**（**日本語**）で、名前と サブタイトルを 上の 表の とおりに 変えて 保存
7. 左の **App 情報** → 右上の 言語メニューで **英語（米国）**（無ければ 追加）→ 下の「英語（米国）の ページ」の 表の とおり 名前・サブタイトル・プライバシーポリシーの URL を 入れて 保存
8. 1.1.0 の ページ（**日本語**）
   - **このバージョンの 最新情報** に 下の 日本語を 貼る
   - **説明** を 下の「説明」に 差し替え（「■ 英語でも遊べる」を 足した）
   - **キーワード** を 下の「キーワード」（1.1.0 から）に 差し替え
   - **マーケティング URL** に `https://equal-quest.vercel.app/`（紹介ページ）を 入れる
   - **ビルド** で 1.1.0 (5) を 選ぶ
9. 1.1.0 の ページ（右上の 言語メニューで **英語（米国）**）
   - **スクリーンショット**：`store/screenshots-6.3-en/` の 6枚（6.9インチの 欄が あれば `store/screenshots-en/`）
   - **プロモーションテキスト・説明・キーワード・サポート URL・最新情報**：下の「英語（米国）の ページ」の とおり
10. **App 内課金「全章解放」に 英語を 足す**：左の 収益化 → App 内課金 → 全章解放 → ローカリゼーション の **＋** → 英語（米国）
    （表示名・説明は 下の「App 内課金」の 表）。足したら 1.1.0 の ページの「App 内課金と サブスクリプション」で 全章解放を 選び、いっしょに 提出する
11. **App Review に関する情報** の メモを 下の 英文に 差し替え（英語の 画面の 名前に した）
12. 「審査に 提出」

#### このバージョンの 最新情報（1.1.0・日本語）

```
・英語に対応しました。端末の言語が日本語以外のときは英語で始まります（タイトル画面と設定から、いつでも切りかえられます）
・依頼の表で、長い文字が切れないように列の幅を自動で広げるようにしました
・章をクリアしたあと、App Storeでの評価をお願いすることがあります（評価はいつでも任意です）
・そのほか、細かな表示を改善しました
```

#### What's New（1.1.0・英語）

```
- Now available in English! The game starts in English when your device language isn't Japanese. You can switch languages anytime from the title screen or Settings.
- Table columns now widen automatically so long text isn't cut off.
- After you clear a chapter, you may be asked to rate the app on the App Store (always optional).
- Other small display improvements.
```

---

## アプリの 情報

| 欄 | 入れる 内容 | 上限 |
|---|---|---|
| 名前 | `イコール・クエスト：関数が身につく表計算RPG`（23字・1.1.0 から） | 30字 |
| サブタイトル | `異世界転生×表計算を遊んで覚える勉強ゲーム`（21字・1.1.0 から） | 30字 |
| プライマリカテゴリ | 教育 | |
| セカンダリカテゴリ | ゲーム（ロールプレイング） | |
| 著作権 | `2026 kozai0227-cmyk`（本名や 屋号に しても よい） | |
| プライバシーポリシーの URL | `https://equal-quest.vercel.app/privacy.html` | |
| サポート URL | `https://equal-quest.vercel.app/support.html` | |
| マーケティング URL | `https://equal-quest.vercel.app/`（紹介ページ。1.1.0 から 入れる） | |

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

■ 英語でも遊べる
・日本語と英語に対応。タイトル画面と設定から、いつでも切りかえられます

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

1.1.0 から：

```
学習,スプレッドシート,パソコン,事務,社会人,新人,仕事,数式,VLOOKUP,IF,XLOOKUP,SUMIF,SUMIFS,COUNTIF,IFERROR,絶対参照,集計,初心者,入門,異世界
```

（99字。名前・サブタイトルに ある 言葉〔関数・表計算・RPG・異世界転生・勉強・ゲーム〕は 自動で 検索対象に なるので、ここには 入れない。
サブタイトルから 外れた VLOOKUP・IF と、「異世界」を 足し、PC（パソコンと 重なる）・効率化・研修・ピボット（ゲームで 扱わない）を 外した。
言葉は 短く 区切る ほうが、ほかの 欄の 言葉と 組み合わさって 多くの 検索に 出る）

<details><summary>1.0.1 までの キーワード</summary>

```
スプレッドシート,勉強,学習,ゲーム,クイズ,レトロ,ドット絵,社会人,新人研修,パソコン,事務,仕事効率化,VLOOKUP,XLOOKUP,SUMIFS,COUNTIF,IF,日付,集計,資格
```

</details>

## 英語（米国）の ページ（1.1.0 から 英語の 中身）

端末を 英語に している 人には この ページが 表示されます。アプリが 英語に 対応したので、1.1.0 から 中身も 英語に します。

日本の App Store では、英語（米国）の ページの 名前・サブタイトル・キーワードも 検索に 使われる と されています（ASO 会社の 調査）。
前は この 枠に 日本語の 言葉（関数・表計算 など）を 入れる 案でしたが、英語の 利用者と、次の 段階で 国を 広げる ときの ために、
英語の 言葉を 入れます（日本語の 主な 言葉は 日本語の ページの 名前・サブタイトル・キーワードで 押さえて あります）。

| 欄 | 入れる 内容 | 上限 |
|---|---|---|
| 名前 | `Equal Quest: Spreadsheet RPG`（28字） | 30字 |
| サブタイトル | `Learn formulas and functions`（28字） | 30字 |
| キーワード | 下の 枠（98字） | 100字 |
| プロモーションテキスト | 下の 枠（168字） | 170字 |
| プライバシーポリシーの URL | `https://equal-quest.vercel.app/privacy.html#en`（英語の 部分へ 飛ぶ） | |
| サポート URL | `https://equal-quest.vercel.app/support.html#en` | |
| マーケティング URL | 空の まま（紹介ページは 日本語だけ） | |
| スクリーンショット | `store/screenshots-6.3-en/`（1206×2622）／ 6.9インチの 欄は `store/screenshots-en/`（1320×2868） | |

キーワード（他社の 商標は 入れない。名前・サブタイトルに ある 言葉〔spreadsheet・RPG・learn・formulas・functions〕は 自動で 対象）：

```
vlookup,xlookup,sumif,countif,iferror,office,skills,training,beginner,tutorial,practice,quiz,retro
```

<details><summary>前の 案：日本語の 枠として 使う キーワード（1.1.0 では 使わない）</summary>

```
関数,表計算,練習,問題集,基礎,勉強,ビジネス,新社会人,就活,資格,脳トレ,クイズ,DATEDIF,WEEKDAY,ROUND,AVERAGE,SUM,LEFT,MID,office
```

</details>

プロモーションテキスト（英語）：

```
A new office worker saves a fantasy world with spreadsheet magic! Master SUM, IF, VLOOKUP, SUMIFS, dates and text by helping the townspeople. Chapters 1-2 free, no ads.
```

説明（英語）：

```
"Your time is too valuable to waste."

That night, after hearing those words from a senior colleague, a new office worker was sucked into a #REF! error in a spreadsheet. When he woke up, he was in a land where spreadsheet formulas work like magic...

Equal Quest is a retro RPG where you help townspeople with their spreadsheet troubles and master formulas and functions from the ground up.

■ Learn skills you can use at work
- Solve requests with real spreadsheet steps. Build the formula, and if the answer is right, the request is complete!
- Battles are spreadsheet quizzes and formula questions. The numbers change every time, so memorizing won't save you
- In towers and temples, crack stone-tablet puzzles with formulas

■ Chapters 1 and 2 are free
- Play Chapters 1 and 2 for free. If you enjoy them, "Unlock All Chapters" (a one-time purchase) lets you play to the final chapter

■ 8 chapters, 81 requests and puzzles
Chapter 1: Selecting cells, AutoFill, arithmetic, SUM / AVERAGE
Chapter 2: Relative and absolute references ($), ROUND
Chapter 3: IF, AND / OR, COUNTIF / SUMIF
Chapter 4: VLOOKUP, XLOOKUP, IFERROR
Chapter 5: SUMIFS, COUNTIFS, summary tables
Chapter 6: Joining text, LEFT / MID, LEN, TRIM, FIND
Chapter 7: Date math, WEEKDAY, EDATE, DATEDIF
Final chapter: Reading and fixing errors such as #DIV/0!, #NAME? and #REF!

■ Easy formula building on your phone
- Build formulas by tapping buttons. Tap a cell to insert a reference, or press and hold, then drag, to insert a range
- Practice adding and removing $ with the F4 button

■ Book of Review
- Review by chapter, take the All-Chapter Course, or try the Weak Spot Course built from questions you missed
- No time limit, with the answer and an explanation every time
- Start right away from the title screen

■ English and Japanese
- Play in English or Japanese. Switch anytime from the title screen or Settings

■ Who it's for
- New employees and students who want to learn spreadsheets from the basics
- Anyone who uses functions without really understanding them
- Fans of retro RPGs

■ Play with peace of mind
- No internet connection needed (except when purchasing or restoring)
- No ads. The only purchase is "Unlock All Chapters," with nothing else to buy
- No personal data is collected

The functions and formulas in this app are widely used in common spreadsheet software.
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
- 配信地域：今は **日本のみ**（1.1.0 で 英語に 対応したので、ほかの 国へ 広げるのは 次の 段階で 検討）

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
| 表示名（英語（米国）・1.1.0 から） | `Unlock All Chapters`（ゲーム内の 名前と 同じ） |
| 説明（英語（米国）・45字まで） | `Play chapters 3-8 and the full Book of Review`（45字） |
| 審査用スクリーンショット | `store/iap-review.png`（購入画面・¥500・1320×2868）。TestFlight で 撮った ものに 差し替えても よい |
| 審査メモ | 下の 英文 |

```
Unlocks chapters 3 to 8 (the final chapter) and all chapters of the Book of Review. Chapters 1 and 2 are free.
To open the purchase screen quickly: Title screen > "Review" (ふくしゅう) > tap any chapter with a lock (🔒).
"Restore Purchase" (購入を 復元) is on the same screen and in Menu (B) > Settings (設定) > Unlock All Chapters (全章解放).
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
This is an offline educational RPG that teaches spreadsheet functions and formulas such as SUM, IF, VLOOKUP, SUMIFS, date and text functions, and error handling.
It is available in English and Japanese. It starts in English unless the device language is Japanese, and the language can be switched with the 🌐 button on the title screen or in Menu (B) > Settings > Language.
No account, ads, or tracking. All progress is saved on the device only. The app works offline except when purchasing or restoring.

Chapters 1 and 2 are free. A one-time non-consumable in-app purchase, "Unlock All Chapters" (com.kozai0227.equalquest.full), unlocks chapters 3 to 8.

Quick tour for review:
- Title screen > "Review": answer quiz questions immediately, no time limit. Chapters with a lock (🔒) open the purchase screen.
- The purchase screen has "Buy" and "Restore Purchase". It is also in Menu (B) > Settings > Unlock All Chapters.
- Title screen > "New Game": enter a name, watch the short prologue (or tap SKIP), and the first battle starts within about a minute.
- In formula questions, tap the buttons or tap table cells to build a formula. Long-press a cell and drag to insert a range; swipe to scroll the table.
- The privacy policy is available from the title screen and from Menu (B) > Settings.

The formula engine is our own implementation. The app is not affiliated with, and does not imitate, any third-party spreadsheet product.
```

---

## スクリーンショット

| App Store Connect の 欄 | 日本語の ページ（6枚・01〜06 の 順） | 英語（米国）の ページ（1.1.0 から） |
|---|---|---|
| **Dynamic Island 搭載 iPhone（中型ディスプレイ）**（6.1〜6.3インチ） | `store/screenshots-6.3/`（1206×2622） | `store/screenshots-6.3-en/` |
| 6.9インチ（大型）の 欄が ある 場合 | `store/screenshots/`（1320×2868） | `store/screenshots-en/` |

画面の 一番上に 出ている iPhone の 欄に 入れれば、ほかの 大きさにも 自動で 使われます。
iPad・Apple Watch の 欄は 空の ままで よい（iPhone 専用の ため）。
