# Web 版を 検索で 見つけて もらう ための 設定

Web 版（https://equal-quest.vercel.app）に 入れてある 検索対策と、あなたが 行う 作業の まとめです。

## サイトの 形

| URL | 中身 |
|---|---|
| `/` | トップページ（紹介ページ：特徴・画面・全8章・料金・よくある質問。`scripts/landing.ts`） |
| `/play/` | ゲーム本体（ブラウザ版・第2章まで）。ホーム画面に 追加して 開いた ときは、トップから 自動で ここへ |
| `/learn/` | 関数・操作の 解説（54ページ） |
| `/support.html`・`/privacy.html` | サポート・プライバシーポリシー（URL は 今まで どおり） |

アプリ版（`npm run ios`）は、今まで どおり ゲームが トップに 入る（紹介ページ・解説ページは 入らない）。

## 入れてある もの

| もの | 中身 | 場所 |
|---|---|---|
| ページの 題名・説明文 | 検索結果に 出る 題名と 説明 | `index.html` |
| 共有画像（OGP） | X・LINE などで URL を 貼ったときの 画像（1200×630） | `public/og.png` |
| 正式な URL の 指定 | `equal-quest.vercel.app` を 正式とする（canonical） | `index.html` |
| 旧 URL を 検索に 出さない | `excel-quest-nine.vercel.app` には「検索に 出さない」印（X-Robots-Tag: noindex）。セーブデータを 守るため URL 自体は 残す | `vercel.json` |
| 関数・操作の 解説ページ | `/learn/`（一覧）と `/learn/vlookup/` など 54 ページ。教会の 解説と 同じ 内容から ビルド時に 自動で 作る | `scripts/webPages.ts` |
| サイトマップ | Google に 知らせる ページの 一覧 | `/sitemap.xml`（自動） |
| robots.txt | サイトマップの 場所を 知らせる | `public/robots.txt` |
| タイトル画面の リンク | Web 版だけ「関数の解説」リンク（アプリ版には 出ない） | `src/components/Screens.tsx` |

- 解説ページは アプリ版には 入れない（`npm run ios` は `EQ_APP=1` で ビルドする）
- 「Excel」「Microsoft」は 書いていない（「表計算」と 書く）

## あなたの 作業：Google Search Console に 登録する（10分ほど）

登録すると、Google に サイトマップを 知らせられて、どんな 言葉で 検索されて いるかも 見られます。

1. https://search.google.com/search-console を 開き、Google アカウントで ログイン
2. 「プロパティを 追加」→ 右側の **URL プレフィックス** に `https://equal-quest.vercel.app/` を 入れて「続行」
3. 確認方法の 一覧から **HTML タグ** を 開き、表示された タグ
   `<meta name="google-site-verification" content="……" />` を コピーして、こちらに 送る
4. こちらで トップページに 入れて 本番に 反映したら、Search Console に 戻って「確認」を 押す
5. 確認できたら 左の **サイトマップ** で `sitemap.xml` と 入れて「送信」
6. 左上の 検索欄（URL 検査）に `https://equal-quest.vercel.app/learn/` を 入れて「インデックス登録を リクエスト」
   （トップページ `https://equal-quest.vercel.app/` も 同じように）

> 反映されるまで 数日〜数週間 かかります。1〜2週間後に「検索パフォーマンス」で、表示された 回数や 検索語を 確かめましょう。

## App Store の アプリ番号（入れてある）

App Store Connect →「App 情報」→ **Apple ID**（数字：`6820981290`）を `src/game/appStore.ts` の `APP_STORE_ID` に 入れてあるので、

- iPhone の Safari で Web 版や 解説ページを 開いたとき、上に「App Store で 開く」バーが 出る
- 解説ページの「ゲームで 練習しよう」に「App Store で 見る」ボタンが 出る
- Web 版は 第2章までの 体験版。第3章から 先の 入口（峠・第2章の おわり・ふくしゅうの書の 鍵）では「App Store で 見る」ボタンで アプリ版へ 案内する
