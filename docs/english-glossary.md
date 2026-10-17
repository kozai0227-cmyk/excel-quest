# 英語版の 用語集（訳語を そろえるための 表）

英語に 訳すときは、この表の 名前を 使います。新しい 名前を 決めたら ここに 足してください。
「Excel」「Microsoft」は 他社の 商標なので、英語でも 使いません（"spreadsheet" と 書く）。

## ゲーム

| 日本語 | English |
|---|---|
| イコール・クエスト | Equal Quest |
| 〜表計算で世界を救うRPG〜 | ~ Save the World with Spreadsheets ~ |
| 全章解放 | Unlock All Chapters |
| ふくしゅう／ふくしゅうの書 | Review / Book of Review |
| 苦手克服コース | Weak Spot Course |
| 全章まとめコース | All-Chapter Course |
| 依頼（町の人の 悩み） | Request |
| 石版の 謎 | Tablet Puzzle |
| 宝箱 | Treasure Chest |
| 達成率 | Completion |
| 即答ボーナス | Quick Answer Bonus |
| 一発決裁 | Instant Approval（会心の 一撃） |

## 世界・町（章）

| 章 | 日本語 | English |
|---|---|---|
| 大陸 | セルシア大陸 | the continent of Cellsia |
| 1 | はじまりの村 セルノ | Cellno, Village of Beginnings |
| 1 | 計算の町 カルキュレ | Calcule, Town of Calculation |
| 2 | 鏡の町 サンショウ | Refton, Town of Mirrors |
| 3 | 条件の港町 イフポート | Ifport, Harbor of Conditions |
| 4 | 検索の城下町 ルックアップ | Lookup, Castle Town of Searching |
| 5 | 集計の王都 ピボリア | Pivoria, Royal Capital of Totals |
| 6 | 文字の宿場町 テキストリア | Textria, Post Town of Letters |
| 7 | 暦の里 コヨミノ | Calendra, Village of Calendars |
| 8 | 最果ての砦 ホープ | Fort Hope, at the World's Edge |

## 人物・敵

| 日本語 | English |
|---|---|
| 主人公（はじめの 名前 サトウ） | Sato |
| 神崎 先輩 | Kanzaki（the senior colleague） |
| 長老 | the Elder |
| セルイム | Cellime |
| 散らかりセルイム | Messy Cellime |
| 手計算ゴーレム | Hand-Calc Golem |
| 魔王レフエラー | Demon Lord Referror |

## 画面の 言葉（第1段階で 決めたもの）

| 日本語 | English |
|---|---|
| つよさ／そうび／スキル／どうぐ | Status / Equip / Skills / Items |
| にゅうりょく（ボタン／キーボード） | Input (Buttons / Keyboard) |
| 設定／セーブ／タイトルへ／とじる | Settings / Save / Title / Close |
| たたかう／どうぐ／にげる | Fight / Items / Run |
| 新入社員／セル見習い／関数つかい | New Hire / Cell Apprentice / Function Wielder |
| けいけんち／ゴールド | EXP / Gold |
| 攻撃力／守備力（装備の 表示） | ATK / DEF（ステータス画面は Attack / Defense） |
| 一発決裁↑ | Crit↑ |
| 悩み解決 x/y（町の 表示） | Requests x/y |
| 購入を 復元 | Restore Purchase |
| 次章予告 | Next Chapter |

## 書き方の 決まり

- 英語の 画面は、英字を Jersey 10（ドット体・OFL）で 表示する。日本語の 文字は DotGothic16 のまま。
- 主人公の 名前は 英語では 8文字まで（はじめの 名前は Sato）。
- 装備・町・敵の 名前は src/data/en.ts に ID ごとに 書く。日本語の データは 変えない。

## 言語の 決まり方（公開の しくみ）

- はじめて 開いた ときは 端末の 言語で 始まる（日本語なら 日本語、それ以外は 英語）。タイトル画面の 🌐 ボタンと メニュー → 設定 → 言語 で 切りかえられ、選んだ 言語は 保存される。
- 英語版を 隠したい ときは `src/game/lang.ts` の `EN_READY` を false に する（`?lang=en` で 試すことは できる）。
- iPhone アプリは `ios/App/App/Info.plist` の `CFBundleLocalizations` に ja・en を 入れている。これが ないと、英語の 端末でも アプリの 中は 日本語 扱いに なり、英語で 始まらない。
- ホーム画面の アプリ名は `ios/App/App/en.lproj/InfoPlist.strings`（Equal Quest）と `ja.lproj/InfoPlist.strings`（イコールクエスト）で 言語ごとに 変わる。
