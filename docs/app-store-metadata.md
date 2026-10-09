# App Store Connect に 入れる 内容（下書き）

App Store Connect の 各欄に、そのまま 貼り付けて 使える 形に しています。
文字数は 上限内に おさまることを 確認済みです（全角も 1文字と 数えます）。
**「Excel」「エクセル」「Microsoft」は 他社の 商標なので、どの 欄にも 入れないでください。**

---

## アプリの 情報

| 欄 | 入れる 内容 | 上限 |
|---|---|---|
| 名前 | `イコール・クエスト` | 30字 |
| サブタイトル | `関数と数式が身につく表計算RPG`（16字）<br>※ タイトル画面と そろえるなら `表計算で世界を救うRPG`（12字） | 30字 |
| プライマリカテゴリ | 教育 | |
| セカンダリカテゴリ | ゲーム（ロールプレイング） | |
| 著作権 | `2026 kozai0227-cmyk`（本名や 屋号に しても よい） | |
| プライバシーポリシーの URL | `https://excel-quest-nine.vercel.app/privacy.html` ※1 | |
| サポート URL | `https://excel-quest-nine.vercel.app/support.html` ※1 | |
| マーケティング URL | 空欄で よい | |

※1 いまの URL には「excel」の 文字が 入っています。気になる 場合は、Vercel の
プロジェクト → **Settings → Domains** で `equal-quest.vercel.app` などの 名前を 追加すると、
同じ ページが その URL でも 開けるように なります（無料）。追加したら、こちらの URL を 使ってください。

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

```
スプレッドシート,勉強,学習,ゲーム,クイズ,レトロ,ドット絵,社会人,新人研修,パソコン,事務,仕事効率化,VLOOKUP,XLOOKUP,SUMIFS,COUNTIF,IF,日付,集計,資格
```

（97字。名前・サブタイトルに 入っている 言葉は 自動で 検索対象に なるので、ここには 入れていません）

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
| 価格 | お好みで（例：600〜1,000円） |
| ファミリー共有 | オン（家族も 追加の 支払いなしで 遊べる。おすすめ） |
| 表示名（日本語） | `全章解放` |
| 説明（日本語・45字まで） | `第3章〜最終章と、ふくしゅうの書の全章が遊べます` |
| 審査用スクリーンショット | アプリの 購入画面を 撮った もの（TestFlight で 開いて 撮る） |
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

`store/screenshots/` に、6.9インチ（1320×2868 ピクセル）用の 画像を 用意しています。
App Store Connect の「iPhone 6.9インチ ディスプレイ」に 順番どおり ドラッグして ください
（6.9インチを 入れれば、ほかの 大きさは 自動で 縮小して 使われます）。
