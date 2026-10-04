import { autofill, boldRange, pasteRange, setCells, type GuideStep } from '../game/guide'
import { cloneGrid } from '../game/formula'

/**
 * スマホ用：依頼・謎解きを「Excel の 知識」を 1つずつ 答える ステップに した もの。
 * choice は 知識を 問う 選択問題（正解すると その操作を したことに なる）、
 * formula は ボタンで 数式を 組み立てる 問題（fill が あれば オートフィルで 広げて 確かめる）。
 * 全ステップを 正解すると、元の 依頼の 判定（check）も 通るように 作ってある（npm run check で 確認）。
 */
export const GUIDES: Record<string, GuideStep[]> = {
  // ---------------------------------------------------------------- セルノ（セル操作）
  celuno_input: [
    {
      kind: 'choice',
      q: '朝の 12頭は どの セルに 入れる？（B列が「ヒツジの数」、2行目が「朝」）',
      focus: 'B2',
      answer: 'B2',
      wrong: ['A2', 'B1', '2B'],
      explain: 'セルの 場所（セル番地）は「列の アルファベット ＋ 行の 番号」で 表す。B列の 2行目だから B2 だ。',
      apply: (g) => setCells(g, { B2: '12' }),
    },
    {
      kind: 'choice',
      q: 'B2 に 12 と 打って Enter を 押すと、次に 選ばれる セルは？',
      focus: 'B2',
      answer: 'B3（1つ 下）',
      wrong: ['C2（1つ 右）', 'B1（1つ 上）', 'B2 のまま'],
      explain: 'Enter で 確定すると 1つ 下へ 進む。だから 8 → Enter → 15 → Enter と 続けて 打てば、縦に どんどん 入力できる。右へ 進みたいときは Tab キーだ。',
      apply: (g) => setCells(g, { B3: '8', B4: '15' }),
    },
  ],

  celuno_fix: [
    {
      kind: 'choice',
      q: 'B3 を 選んで、そのまま 8 と 打つと どうなる？',
      focus: 'B3',
      answer: '80 が 消えて 8 に 入れかわる',
      wrong: ['80 の うしろに 付いて 808 に なる', 'エラーに なる', '何も 起きない'],
      explain: 'セルを 選んで そのまま 打つと、中身は まるごと 上書きされる。数字を 丸ごと 直すなら これが いちばん 早い。',
      apply: (g) => setCells(g, { B3: '8' }),
    },
    {
      kind: 'choice',
      q: 'A4「どうのつるき」の 最後の「き」だけを 直したい。まず 何を する？',
      focus: 'A4',
      answer: 'F2キー（か ダブルクリック）で 編集モードに する',
      wrong: ['Ctrl+B を 押す', 'Delete キーを 押す', 'Ctrl+Z を 押す'],
      explain: 'F2（Mac は fn+F2）か ダブルクリックで 編集モードに なり、文字の 一部だけ 直せる。選んで そのまま 打つと 全部 消えて しまうので 注意。',
      apply: (g) => setCells(g, { A4: 'どうのつるぎ' }),
    },
  ],

  celuno_copy: [
    {
      kind: 'choice',
      q: 'A1 から B4 までの 四角い 範囲は、表計算では どう 書く？',
      focus: 'A1:B4',
      answer: 'A1:B4',
      wrong: ['A1-B4', 'A1~B4', 'A1,B4'],
      explain: '範囲は「左上の セル : 右下の セル」を コロン（:）で つなぐ。A1:B4 は 2列 × 4行 の 8マスだ。',
    },
    {
      kind: 'choice',
      q: '範囲を 選んだら、コピーする ショートカットは？',
      focus: 'A1:B4',
      answer: 'Ctrl+C',
      wrong: ['Ctrl+V', 'Ctrl+X', 'Ctrl+Z'],
      explain: 'C は Copy の C（Mac は ⌘+C）。コピーした 範囲は 点線で 囲まれる。',
      actions: ['copy'],
    },
    {
      kind: 'choice',
      q: '写す先の 左上 D1 を 選んで、貼り付ける ショートカットは？',
      focus: 'D1',
      answer: 'Ctrl+V',
      wrong: ['Ctrl+P', 'Ctrl+B', 'Ctrl+Y'],
      explain: '左上の セルを 選んで Ctrl+V（⌘+V）。範囲の 形の まま 貼り付けられる。Ctrl+X で 切り取ってから 貼ると「移動」に なる。',
      apply: (g) => pasteRange(g, 'A1:B4', 'D1'),
      actions: ['paste'],
    },
  ],

  celuno_undo: [
    {
      kind: 'choice',
      q: 'うっかり 消して しまった！ 直前の 操作を 取り消す ショートカットは？',
      focus: 'B2:B5',
      answer: 'Ctrl+Z',
      wrong: ['Ctrl+Y', 'Ctrl+S', 'Esc'],
      explain: 'Ctrl+Z（⌘+Z）で 元に 戻す。何回も 押せば、その分 さかのぼれる。ツールバーの ↶ ボタンでも 同じだ。',
      apply: (_g, history) => cloneGrid(history[history.length - 1]),
      actions: ['undo'],
    },
    {
      kind: 'choice',
      q: '戻しすぎて しまったときに「やり直す」ショートカットは？',
      answer: 'Ctrl+Y',
      wrong: ['Ctrl+Z', 'Ctrl+C', 'Ctrl+B'],
      explain: 'Ctrl+Y（Mac は ⌘+Shift+Z）で やり直し。Z で 戻して、Y で 進む。この 2つが あれば、失敗を こわがらずに 試せる。',
    },
  ],

  celuno_fill: [
    {
      kind: 'choice',
      q: '選んだ セルの 右下に 出る 小さな ■ の 名前は？',
      focus: 'A2:A3',
      answer: 'フィルハンドル',
      wrong: ['セルポインター', 'オートSUM', 'スクロールバー'],
      explain: 'この ■ を ドラッグすると、続きを 自動で 入力できる。これが「オートフィル」だ。',
    },
    {
      kind: 'choice',
      q: 'A2（1）と A3（2）の 2つを 選んで、■ を A13 まで ドラッグすると？',
      focus: 'A2:A3',
      answer: '3, 4, 5 … 12 と 連番に なる',
      wrong: ['1, 2, 1, 2 … と くり返す', 'すべて 2 に なる', 'すべて 1 に なる'],
      explain: '数字を 2つ 選ぶと、その差（+1）の 分だけ 増えていく。1つだけ 選んで ドラッグすると、同じ 数字の コピーに なる。',
      apply: (g) => autofill(g, 'A2:A3', 'A13'),
      actions: ['fill'],
    },
    {
      kind: 'choice',
      q: 'B2「1月」を 1つだけ 選んで、■ を B13 まで ドラッグすると？',
      focus: 'B2',
      answer: '2月, 3月 … 12月 と 続く',
      wrong: ['1月 が 12個 並ぶ', '1月1日, 1月2日 … に なる', 'エラーに なる'],
      explain: '「1月」「月曜日」のような 決まった 並びは、1つ 選んで ドラッグ するだけで 続きが 入る。',
      apply: (g) => autofill(g, 'B2', 'B13'),
      actions: ['fill'],
    },
  ],

  celuno_bold: [
    {
      kind: 'choice',
      q: '見出しの 行（A1:C1）を 選んで 太字に する ショートカットは？',
      focus: 'A1:C1',
      answer: 'Ctrl+B',
      wrong: ['Ctrl+I', 'Ctrl+U', 'Ctrl+F'],
      explain: 'B は Bold（太字）。もう一度 押すと 元に 戻る。I は 斜体（Italic）、U は 下線（Underline）だ。',
      apply: (g) => boldRange(g, 'A1:C1'),
      actions: ['bold'],
    },
  ],

  // ---------------------------------------------------------------- カルキュレ（計算・関数）
  calc_arith: [
    {
      kind: 'choice',
      q: '数式で「掛け算」に 使う 記号は？',
      answer: '*（アスタリスク）',
      wrong: ['×', 'x（エックス）', '・'],
      explain: '掛け算は *、割り算は /。算数の × や ÷ は 使えない。',
    },
    {
      kind: 'formula',
      q: 'D2 に 小計（単価 × 数量）の 数式を 作ろう。D5 まで オートフィルで 広げるぞ',
      target: 'D2',
      fill: 'D2:D5',
      answer: '=B2*C2',
      extra: ['×'],
      explain: 'D3 には =B3*C3、D4 には =B4*C4 が 入った。数式を コピーすると 参照も 1行ずつ ずれて、それぞれの 行を 計算してくれる。',
      hint: '数式は = から 始める。単価は B2、数量は C2。',
    },
  ],

  calc_sum: [
    {
      kind: 'choice',
      q: 'たくさんの 数を 合計する 関数は？',
      answer: 'SUM',
      wrong: ['AVERAGE', 'COUNT', 'MAX'],
      explain: 'SUM（サム）は 合計。=SUM(範囲) の 形で 使う。',
    },
    {
      kind: 'formula',
      q: 'B12 に 10日分（B2〜B11）の 売上の 合計を 出そう',
      target: 'B12',
      answer: '=SUM(B2:B11)',
      explain: '範囲は「始まりの セル : 終わりの セル」。売上を 書きかえても、合計は 自動で 計算し直される。',
      hint: '=SUM( の あとに 範囲 B2:B11、最後に ) で 閉じる。',
    },
  ],

  calc_average: [
    {
      kind: 'choice',
      q: '平均を 出す 関数は？',
      answer: 'AVERAGE',
      wrong: ['MEAN', 'AVG', 'SUM'],
      explain: 'AVERAGE（アベレージ）は「合計 ÷ 個数」を まとめて やってくれる。人数で 割る 必要は ない。',
    },
    {
      kind: 'formula',
      q: 'B10 に 点数（B2〜B9）の 平均を 出そう',
      target: 'B10',
      answer: '=AVERAGE(B2:B9)',
      explain: '生徒が 増えても、範囲を 広げるだけで 平均が 出せる。',
      hint: '=AVERAGE(B2:B9)',
    },
  ],

  calc_maxmin: [
    {
      kind: 'formula',
      q: 'E2 に、釣果（B2〜B8）の いちばん 多い 数を 出そう',
      target: 'E2',
      answer: '=MAX(B2:B8)',
      explain: 'MAX は 範囲の 中の 最大値。目で 探さなくても 一瞬で わかる。',
      hint: '最大は MAX。範囲は B2:B8。',
    },
    {
      kind: 'formula',
      q: 'E3 に、いちばん 少ない 数を 出そう',
      target: 'E3',
      answer: '=MIN(B2:B8)',
      explain: 'MIN は 最小値。MAX と セットで 覚えよう。',
      hint: '最小は MIN。',
    },
  ],

  calc_count: [
    {
      kind: 'choice',
      q: '「休み」や 空白を のぞいて、数字が 入った セルだけを 数える 関数は？',
      focus: 'B2:B11',
      answer: 'COUNT',
      wrong: ['COUNTA', 'SUM', 'AVERAGE'],
      explain: 'COUNT は 数値の セルだけを 数える。COUNTA は 空白以外（文字も）ぜんぶ 数えるので、「休み」も 数えて しまう。',
    },
    {
      kind: 'formula',
      q: 'B12 に 営業日数（宿泊客の 数字が 入った 日の 数）を 出そう',
      target: 'B12',
      answer: '=COUNT(B2:B11)',
      explain: '「休み」の 文字と 空白は 自動で 無視された。',
      hint: '=COUNT(B2:B11)',
    },
  ],

  calc_report: [
    {
      kind: 'formula',
      q: 'E2 に 武器屋の 3か月の 合計を 作ろう。E4 まで オートフィルで 広げるぞ',
      target: 'E2',
      fill: 'E2:E4',
      answer: '=SUM(B2:D2)',
      explain: '横の 合計も SUM。下へ コピーすると、B3:D3、B4:D4 と 行が ずれて それぞれの 店の 合計に なる。',
      hint: '範囲は 1月〜3月の B2:D2。',
    },
    {
      kind: 'formula',
      q: 'B5 に 1月の 合計を 作ろう。E5 まで 右へ オートフィルで 広げるぞ',
      target: 'B5',
      fill: 'B5:E5',
      answer: '=SUM(B2:B4)',
      explain: '右へ コピーすると 列が ずれて C2:C4、D2:D4 … に なる。数式を 1つ 作って コピー、が 集計の 極意だ。',
      hint: '範囲は 3つの 店の B2:B4。',
    },
  ],

  // ---------------------------------------------------------------- 洞窟の扉（謎解き）
  cave_days: [
    {
      kind: 'choice',
      q: '石版の 升目を「日」まで 並べるには？',
      focus: 'A1:B1',
      answer: 'A1:B1 を 選び、右下の ■ を G1 まで 引っぱる',
      wrong: ['1つずつ 手で 打ちこむ', 'A1:B1 を コピーして C1 に 貼る', 'A1:B1 を 太字に する'],
      explain: '石版が 反応した！ 曜日も 続きの ある 並び。オートフィルで 水・木・金・土・日 と 続いた。',
      apply: (g) => autofill(g, 'A1:B1', 'G1'),
      actions: ['fill'],
    },
  ],

  cave_mirror: [
    {
      kind: 'choice',
      q: '左の 模様を、右の 台座に そっくり 写すには？',
      focus: 'A1:C3',
      answer: 'A1:C3 を コピーし、E1 を 選んで 貼り付ける',
      wrong: ['1マスずつ 手で 写す', 'A1:C3 を 選んで ■ を 右へ 引っぱる', 'E1:G3 を 選んで Delete'],
      explain: '模様が 重なった！ コピー＆貼り付けは、左上の セルを 選んで 貼るだけで 範囲ごと 写せる。',
      apply: (g) => pasteRange(g, 'A1:C3', 'E1'),
      actions: ['copy', 'paste'],
    },
  ],

  cave_words: [
    {
      kind: 'choice',
      q: 'A3 の「ひらく」を、扉への 命令の 形に 直すには？',
      focus: 'A3',
      answer: 'F2 で 編集モードに して「ひらけ」に 直す',
      wrong: ['F2 で 編集モードに して「ひらいた」に 直す', 'Delete で 消す', 'Ctrl+Z を 押す'],
      explain: '「とびらよ ひらけ」。F2 で 一部だけ 直せた。',
      apply: (g) => setCells(g, { A3: 'ひらけ' }),
    },
    {
      kind: 'choice',
      q: '呪文（A2:A3）を 力強い 文字（太字）に 刻むには？',
      focus: 'A2:A3',
      answer: 'Ctrl+B',
      wrong: ['Ctrl+I', 'Ctrl+U', 'Ctrl+Z'],
      explain: '呪文が 太く 輝いた！',
      apply: (g) => boldRange(g, 'A2:A3'),
      actions: ['bold'],
    },
  ],

  // ---------------------------------------------------------------- 計算の塔の扉（謎解き）
  tower_price: [
    {
      kind: 'formula',
      q: '「単価 × 数量」を 数式で 埋めよ（D2 に 刻み、D4 まで 映す）',
      target: 'D2',
      fill: 'D2:D4',
      answer: '=B2*C2',
      extra: ['×'],
      explain: '小計の 欄に 数字が 浮かんだ。',
    },
  ],
  tower_sum: [
    {
      kind: 'formula',
      q: 'すべての 石の 重さの 合計を、B9 に 示せ',
      target: 'B9',
      answer: '=SUM(B2:B8)',
      explain: '天秤が 揺れた。',
    },
  ],
  tower_stats: [
    {
      kind: 'formula',
      q: 'E2 に 平均点を 示せ',
      target: 'E2',
      answer: '=AVERAGE(B2:B7)',
      explain: '「欠席」の 文字は 平均に 入らない。',
    },
    {
      kind: 'formula',
      q: 'E3 に 最高点を 示せ',
      target: 'E3',
      answer: '=MAX(B2:B7)',
      explain: '最高点が 刻まれた。',
    },
    {
      kind: 'formula',
      q: 'E4 に 受験者数を 示せ（欠席は 数えない）',
      target: 'E4',
      answer: '=COUNT(B2:B7)',
      explain: '数字の ある 者だけが 数えられた。',
    },
  ],

  // ---------------------------------------------------------------- サンショウ（参照）
  sansho_rel: [
    {
      kind: 'choice',
      q: 'ミカンの 行（D3）の 数式は =B2*C2 の まま。本当は どう なるべき？',
      focus: 'D3',
      answer: '=B3*C3',
      wrong: ['=B2*C2 の まま', '=B3*C2', '=C3*D3'],
      explain: '3行目の 計算には、3行目の 単価（B3）と 数量（C3）を 使う。',
    },
    {
      kind: 'choice',
      q: 'D2 の =B2*C2 を 下へ コピー（オートフィル）すると、D3 は どうなる？',
      focus: 'D2:D6',
      answer: '=B3*C3 に 自動で ずれる',
      wrong: ['=B2*C2 の まま', 'エラーに なる', '空っぽに なる'],
      explain: 'コピーすると 参照も 同じだけ ずれる。これが「相対参照」。D2 を D6 まで オートフィルし直したら、全部の 行が 正しく なった。',
      apply: (g) => autofill(g, 'D2', 'D6'),
      actions: ['fill'],
    },
  ],

  sansho_abs: [
    {
      kind: 'choice',
      q: 'C3 の 数式は =B3*F2。答えが 0 に なって しまう 原因は？',
      focus: 'C3',
      answer: 'レートの F1 まで 下に ずれて、空っぽの F2 を 見ている',
      wrong: ['B3 が 空っぽ', '掛け算の 記号が ちがう', 'シルバーの 列が せまい'],
      explain: 'コピーで ずれて ほしくない 参照には $ を 付けて 固定する。$F$1 なら どこへ コピーしても F1 のまま。',
    },
    {
      kind: 'formula',
      q: 'C2 の 数式を 作り直そう。F1 は ずれないように F4 ボタンで $ を 付ける。C6 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C6',
      answer: '=B2*$F$1',
      explain: '$ を 付けた 参照は、コピーしても 動かない。これが「絶対参照」だ。',
      hint: 'F1 を 入れた 直後に F4 を 押すと $F$1 に なる。',
    },
  ],

  sansho_f4: [
    {
      kind: 'choice',
      q: '数式の 入力中、F1 の すぐ 後ろで F4 キーを 押すと？',
      answer: '$F$1 に なる',
      wrong: ['F1 が 消える', 'F1 の 中身（0.2）に 変わる', 'F1 が 太字に なる'],
      explain: 'F4 を 押すたびに $F$1 → F$1 → $F1 → F1 と 切り替わる（Mac は fn+F4）。$ を 手で 打たなくて いい。',
    },
    {
      kind: 'formula',
      q: 'C2 に セール価格（定価 ×（1 − 割引率））の 数式を 作ろう。割引率の F1 には F4 で $ を。C6 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C6',
      answer: '=B2*(1-$F$1)',
      explain: '1 − 0.2 で 0.8倍。カッコの 中を 先に 計算するのは 算数と 同じだ。',
      hint: '=B2*(1-F1) と 組んで、F1 の 直後に F4。',
    },
  ],

  sansho_share: [
    {
      kind: 'choice',
      q: 'C2 の =B2/B7 を 下へ コピーすると、C3 は？',
      focus: 'C2',
      answer: '=B3/B8（空の B8 で 割って エラー）',
      wrong: ['=B3/B7', '=B2/B7 の まま', '=C3/C8'],
      explain: '合計の B7 は 動いて ほしくない。$B$7 と 固定しよう。',
    },
    {
      kind: 'formula',
      q: 'C2 に 構成比（売上 ÷ 合計）の 数式を 作ろう。合計の B7 は 固定。C6 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C6',
      answer: '=B2/$B$7',
      explain: 'バラは 0.4（4割）。「合計を 固定して 割る」のが 構成比の コツだ。',
      hint: 'B7 の 直後に F4 で $B$7。',
    },
  ],

  sansho_mix: [
    {
      kind: 'choice',
      q: 'B2 の 数式を 右へ コピーしても、ずっと A列（左の数）を 見るには？',
      focus: 'A2:A6',
      answer: '$A2（列だけ 固定）',
      wrong: ['A$2（行だけ 固定）', '$A$2（両方 固定）', 'A2（固定しない）'],
      explain: '$ は すぐ 右の 部分を 固定する。$A2 は「A列は 固定、行は ずれてよい」。両方 固定すると、下へ コピーしたとき 5 の まま に なって しまう。',
    },
    {
      kind: 'choice',
      q: '下へ コピーしても、ずっと 1行目（上の数）を 見るには？',
      focus: 'B1:F1',
      answer: 'B$1（行だけ 固定）',
      wrong: ['$B1（列だけ 固定）', '$B$1（両方 固定）', 'B1（固定しない）'],
      explain: 'B$1 は「1行目は 固定、列は ずれてよい」。列か 行の 片方だけ 固定するのが「複合参照」だ。',
    },
    {
      kind: 'formula',
      q: 'B2 に 1つだけ 数式を 作り、表 ぜんぶ（B2:F6）に コピーしよう',
      target: 'B2',
      fill: 'B2:F6',
      answer: '=$A2*B$1',
      explain: 'たった 1つの 数式で 25マスが 埋まった！',
      hint: 'F4 は 押すたびに $A$2 → A$2 → $A2 と 変わる。',
    },
  ],

  sansho_round: [
    {
      kind: 'choice',
      q: '=ROUND(数値, 0) の「0」の 意味は？',
      answer: '小数点以下を 0桁に（整数に）する',
      wrong: ['0 を 足す', '0 で 割る', '0 より 小さい 数を 消す'],
      explain: 'ROUND は 四捨五入。2つ目の 数が 残す 桁数で、0 なら 整数、1 なら 小数第1位まで 残る。',
    },
    {
      kind: 'formula',
      q: 'C2 に 税込額（金額 ×（1 + 税率））を 四捨五入して 整数で 出そう。税率 F1 は 固定。C6 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C6',
      answer: '=ROUND(B2*(1+$F$1),0)',
      explain: 'ROUND の 中に 計算式を まるごと 入れれば、計算してから 四捨五入 される。',
      hint: '=ROUND( 計算 , 0 )。計算は B2*(1+$F$1)。',
    },
    {
      kind: 'formula',
      q: 'C7 に 税込額（C2〜C6）の 合計を 出そう',
      target: 'C7',
      answer: '=SUM(C2:C6)',
      explain: '四捨五入 した 後の 数を 合計したので、表の 見た目と 合計が ぴったり 合う。',
    },
  ],

  // ---------------------------------------------------------------- 鏡の神殿の扉（謎解き）
  temple_tax: [
    {
      kind: 'formula',
      q: '「納める額」を 値段と 税から 計算せよ（C2 に 刻み、C5 まで 映す）',
      target: 'C2',
      fill: 'C2:C5',
      answer: '=B2*(1+$F$1)',
      explain: '納める額が 浮かび上がった。',
    },
  ],
  temple_share: [
    {
      kind: 'formula',
      q: '各々の 鏡が すべての 光の 何割を 担うか 示せ（C2 に 刻み、C5 まで 映す）',
      target: 'C2',
      fill: 'C2:C5',
      answer: '=B2/$B$6',
      explain: '4枚の 鏡が 光った。',
    },
  ],
  temple_times: [
    {
      kind: 'formula',
      q: '縦と 横の 交わりを、ただ 1つの 式で 満たせ（B2 に 刻み、B2:E5 に 映す）',
      target: 'B2',
      fill: 'B2:E5',
      answer: '=$A2*B$1',
      explain: 'すべての マスが 光で 満たされた。',
    },
  ],

  // ---------------------------------------------------------------- イフポート（条件）
  port_compare: [
    {
      kind: 'choice',
      q: '「180 以上」を 数式の 記号で 書くと？',
      answer: '>=180',
      wrong: ['≧180', '=>180', '>180'],
      explain: '「以上」は >=、「以下」は <=、「等しくない」は <>。≧ ≦ ≠ は 使えない。> は「より大きい」なので、180 ちょうどを ふくまない。',
    },
    {
      kind: 'formula',
      q: 'C2 に「潮位が 警戒ライン（F1）以上か」を 出す 数式を 作ろう。C6 まで コピーするので F1 は 固定',
      target: 'C2',
      fill: 'C2:C6',
      answer: '=B2>=$F$1',
      explain: '比べる だけの 数式の 答えは TRUE（正しい）か FALSE（違う）に なる。',
      hint: '=B2>=F1 と 組んで、F1 の 直後に F4。',
    },
  ],

  port_if: [
    {
      kind: 'choice',
      q: 'IF 関数の 正しい 形は？',
      answer: '=IF(条件, 正しいとき, 違うとき)',
      wrong: ['=IF(正しいとき, 条件, 違うとき)', '=IF(条件, 違うとき, 正しいとき)', '=IF(条件)'],
      explain: '「もし 条件が 正しければ ○、違えば ×」。カンマ（,）で 3つに 区切る。',
    },
    {
      kind: 'choice',
      q: 'IF の 答えに 文字（大漁）を 使うときは？',
      answer: '"大漁" のように " で 囲む',
      wrong: ['そのまま 大漁 と 書く', '(大漁) のように カッコで 囲む', '[大漁] のように 角カッコで 囲む'],
      explain: '数式の 中の 文字は " で 囲む。囲まないと 関数の 名前と まちがえられて #NAME? エラーに なる。',
    },
    {
      kind: 'formula',
      q: 'C2 に、漁獲量が 50以上なら「大漁」、違えば「不漁」と 出そう。C6 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C6',
      answer: '=IF(B2>=50,"大漁","不漁")',
      extra: ['大漁', '不漁'],
      explain: 'ルールを 1回 書けば、全部の 船が 一瞬で 判定される。50 ちょうどの カモメ号も「以上」なので 大漁だ。',
      hint: '=IF( 条件 , "大漁" , "不漁" )。条件は B2>=50。',
    },
  ],

  port_ifcalc: [
    {
      kind: 'formula',
      q: 'C2 に 送料（金額が 3000以上なら 0、違えば 500）を 出そう。C6 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C6',
      answer: '=IF(B2>=3000,0,500)',
      explain: 'IF の 答えは 数値でも いい。数値は " で 囲まない。',
      hint: '=IF(B2>=3000,0,500)',
    },
    {
      kind: 'formula',
      q: 'D2 に 請求額（金額 ＋ 送料）を 出そう。D6 まで コピーするぞ',
      target: 'D2',
      fill: 'D2:D6',
      answer: '=B2+C2',
      explain: 'IF で 出した 送料も、ふつうの 数と 同じように 計算に 使える。',
    },
  ],

  port_nested: [
    {
      kind: 'choice',
      q: 'A・B・C の 3段階に 分けるには？',
      answer: 'IF の「違うとき」に、もう1つ IF を 入れる',
      wrong: ['IF を 2つ 横に 並べる', 'AND を 使う', '=IF(条件,"A","B","C") と 書く'],
      explain: '80以上なら A。違えば「60以上なら B、違えば C」。IF の 中に IF を 入れる「入れ子」で、何段階でも 分けられる。',
    },
    {
      kind: 'formula',
      q: 'C2 に 評価（80以上 → A、60以上 → B、それ未満 → C）を 出そう。C6 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C6',
      answer: '=IF(B2>=80,"A",IF(B2>=60,"B","C"))',
      explain: '60点 ちょうどの ホバシラは B、58点の カジは C。カッコは 開いた 数だけ 閉じる。',
      hint: '=IF(B2>=80,"A", ここに もう1つの IF )',
    },
  ],

  port_andor: [
    {
      kind: 'choice',
      q: '「風速 10未満」かつ「波 2未満」――両方を 満たすかを 調べる 関数は？',
      answer: 'AND',
      wrong: ['OR', 'IF', 'SUM'],
      explain: 'AND は 全部 正しいとき TRUE。OR は どれか 1つでも 正しければ TRUE。IF の 条件の 場所に 入れて 使う。',
    },
    {
      kind: 'formula',
      q: 'D2 に、風速 10未満 かつ 波 2未満 なら「出航」、違えば「欠航」。D7 まで コピーするぞ',
      target: 'D2',
      fill: 'D2:D7',
      answer: '=IF(AND(B2<10,C2<2),"出航","欠航")',
      explain: '水曜は 波が ちょうど 2m。「2未満」では ないので 欠航だ。',
      hint: '=IF(AND(B2<10,C2<2),"出航","欠航")',
    },
    {
      kind: 'formula',
      q: 'E2 に、風速 15以上 または 波 3以上 なら「警報」、違えば「なし」。E7 まで コピーするぞ',
      target: 'E2',
      fill: 'E2:E7',
      answer: '=IF(OR(B2>=15,C2>=3),"警報","なし")',
      explain: 'どちらか 1つでも 当てはまれば 警報。AND と OR を 使い分ければ、どんな ルールも 書ける。',
      hint: '「または」は OR。',
    },
  ],

  port_countif: [
    {
      kind: 'formula',
      q: 'F2 に「魚」を 運んだ 船の数を 出そう（=COUNTIF(範囲, 条件)）',
      target: 'F2',
      answer: '=COUNTIF(B2:B9,"魚")',
      extra: ['魚'],
      explain: 'COUNTIF は 条件に 合う セルの 数。条件の 文字も " で 囲む。',
      hint: '積荷の 列 B2:B9 から "魚" を 数える。',
    },
    {
      kind: 'choice',
      q: 'SUMIF の 3つの 引数の 順番は？',
      answer: '=SUMIF(条件の範囲, 条件, 合計する範囲)',
      wrong: ['=SUMIF(合計する範囲, 条件の範囲, 条件)', '=SUMIF(条件, 条件の範囲, 合計する範囲)', '=SUMIF(条件の範囲, 合計する範囲, 条件)'],
      explain: '「どこを 見て」「何に 合う 行の」「どこを 足すか」の 順。COUNTIF に 3つ目（足す 範囲）が 付いた 形だ。',
    },
    {
      kind: 'formula',
      q: 'F3 に「魚」の 箱数の 合計を 出そう',
      target: 'F3',
      answer: '=SUMIF(B2:B9,"魚",C2:C9)',
      explain: '魚の 行の 箱数（40・65・20）だけが 足された。',
      hint: '=SUMIF(B2:B9,"魚",C2:C9)',
    },
    {
      kind: 'formula',
      q: 'F4 に 50箱以上 運んだ 船の数を 出そう',
      target: 'F4',
      answer: '=COUNTIF(C2:C9,">=50")',
      extra: ['>=50'],
      explain: '数の 条件も " で 囲んで ">=50" と 書く。',
      hint: '箱数の 列 C2:C9 を ">=50" で 数える。',
    },
  ],

  // ---------------------------------------------------------------- 幽霊船の扉（謎解き）
  ship_if: [
    {
      kind: 'formula',
      q: '重さ 100以上の 荷は「重」、それ以外は「軽」と 記せ（C2 に 刻み、C6 まで 映す）',
      target: 'C2',
      fill: 'C2:C6',
      answer: '=IF(B2>=100,"重","軽")',
      extra: ['重', '軽'],
      explain: '積荷の 文字が 青白く 光った。',
    },
  ],
  ship_nested: [
    {
      kind: 'formula',
      q: '価値 1000以上は「金」、500以上は「銀」、それ未満は「銅」と 刻め（C2 に 刻み、C7 まで 映す）',
      target: 'C2',
      fill: 'C2:C7',
      answer: '=IF(B2>=1000,"金",IF(B2>=500,"銀","銅"))',
      explain: '金・銀・銅の 光が 宿った。',
    },
  ],
  ship_countif: [
    {
      kind: 'formula',
      q: 'E2 に「金貨」の 箱の 数を 示せ',
      target: 'E2',
      answer: '=COUNTIF(A2:A7,"金貨")',
      extra: ['金貨'],
      explain: '金貨の 箱が 数えられた。',
    },
    {
      kind: 'formula',
      q: 'E3 に「金貨」の 価値の 合計を 示せ',
      target: 'E3',
      answer: '=SUMIF(A2:A7,"金貨",B2:B7)',
      explain: '金貨が じゃらじゃらと 鳴った。',
    },
  ],

  // ---------------------------------------------------------------- ルックアップ（検索）
  lookup_vlookup: [
    {
      kind: 'choice',
      q: 'VLOOKUP の 4つの 引数の 正しい 順番は？',
      answer: '=VLOOKUP(探す値, 範囲, 列番号, FALSE)',
      wrong: ['=VLOOKUP(範囲, 探す値, 列番号, FALSE)', '=VLOOKUP(探す値, 列番号, 範囲, FALSE)', '=VLOOKUP(列番号, 探す値, 範囲, FALSE)'],
      explain: '「何を」「どの表の 左端で 探して」「左から 何列目を」取り出すか。最後の FALSE は「ぴったり 同じ 値だけ（完全一致）」の 意味。',
    },
    {
      kind: 'choice',
      q: '範囲 A2:C8 の 中で「名前」は 左から 何列目？',
      focus: 'A1:C1',
      answer: '2',
      wrong: ['1', '3', 'B'],
      explain: '列番号は 範囲の 左端を 1 として 数える。番号(A)が 1、名前(B)が 2、住所(C)が 3。「B」のような 列の 文字では ない。',
    },
    {
      kind: 'formula',
      q: 'F2 に、E2 の 番号（105）の 人の 名前を 出そう',
      target: 'F2',
      answer: '=VLOOKUP(E2,A2:C8,2,FALSE)',
      extra: ['1', '3', 'TRUE'],
      explain: '番号を 書きかえれば、名前も 自動で 変わる。目で 探す 必要は もう ない。',
      hint: '=VLOOKUP(E2,A2:C8,2,FALSE)',
    },
  ],

  lookup_col: [
    {
      kind: 'choice',
      q: '商品表 F2:H6 で「単価」は 何列目？',
      focus: 'F1:H1',
      answer: '3',
      wrong: ['1', '2', '8'],
      explain: '範囲の 左端（品番）が 1列目。品名が 2、単価が 3。シート全体で 何列目か（H は 8列目）では なく、範囲の 中で 数える。',
    },
    {
      kind: 'formula',
      q: 'B2 に 品名を 取り出そう。B5 まで コピーするので、商品表の 範囲は F4 で 固定',
      target: 'B2',
      fill: 'B2:B5',
      answer: '=VLOOKUP(A2,$F$2:$H$6,2,FALSE)',
      extra: ['3', 'TRUE'],
      explain: '範囲を 固定しないと、下へ コピーした とき 商品表も 1行ずつ ずれて、上の 品が 見つからなく なる。',
      hint: '範囲は F2 と H6 の それぞれの 直後に F4。',
    },
    {
      kind: 'formula',
      q: 'C2 に 単価を 取り出そう。C5 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C5',
      answer: '=VLOOKUP(A2,$F$2:$H$6,3,FALSE)',
      extra: ['2', 'TRUE'],
      explain: '列番号を 2 → 3 に 変えただけ。同じ 表から 別の 情報を 取り出せる。',
    },
  ],

  lookup_approx: [
    {
      kind: 'choice',
      q: 'VLOOKUP の 4つ目を TRUE（近似一致）に すると、72 は どの 行に 当たる？（階級表：0・60・80・95）',
      focus: 'E2:F5',
      answer: '60 の 行（72 以下で いちばん 大きい 値）',
      wrong: ['80 の 行（いちばん 近い 値）', '見つからず #N/A', '95 の 行（いちばん 大きい 値）'],
      explain: '近似一致は「探す値 以下で いちばん 大きい 値」の 行を 選ぶ。だから 区切りの 表は 小さい順に 並べておく。点数や 金額の ランク分けに 便利。',
    },
    {
      kind: 'formula',
      q: 'C2 に 階級を 出そう。C6 まで コピーするので 階級表は 固定',
      target: 'C2',
      fill: 'C2:C6',
      answer: '=VLOOKUP(B2,$E$2:$F$5,2,TRUE)',
      extra: ['FALSE'],
      explain: 'IF を 何個も 重ねなくても、区切りの 表 1つで 何段階にも 分けられる。',
      hint: '4つ目は TRUE。範囲は $E$2:$F$5。',
    },
  ],

  lookup_iferror: [
    {
      kind: 'choice',
      q: 'VLOOKUP で、探す 値が 表に ないと 出る エラーは？',
      answer: '#N/A',
      wrong: ['#DIV/0!', '#NAME?', '#REF!'],
      explain: '#N/A は「見つからない（Not Available）」。#DIV/0! は 0で割った、#NAME? は 関数名の まちがい、#REF! は 参照が 消えた ときの エラー。',
    },
    {
      kind: 'choice',
      q: '=IFERROR(A, B) は どういう 意味？',
      answer: 'A が エラーなら B を、エラーで なければ A を 出す',
      wrong: ['A と B の うち 大きい ほうを 出す', 'A が B と 等しければ TRUE', 'エラーの 数を 数える'],
      explain: 'IFERROR は「エラーの ときだけ 別の 答え」。VLOOKUP を まるごと 包んで 使う。',
    },
    {
      kind: 'formula',
      q: 'B2 に 書名を 出そう。目録に なければ「未登録」。B6 まで コピーするぞ',
      target: 'B2',
      fill: 'B2:B6',
      answer: '=IFERROR(VLOOKUP(A2,$D$2:$E$6,2,FALSE),"未登録")',
      extra: ['未登録'],
      explain: '208番と 210番は 目録に ないので「未登録」。エラーが 出たときの 答えを 先に 決めておける。',
      hint: '=IFERROR( VLOOKUP(…) , "未登録" )',
    },
  ],

  lookup_xlookup: [
    {
      kind: 'choice',
      q: 'VLOOKUP では できない ことは？',
      answer: '探す列より 左の 列を 取り出す',
      wrong: ['探す列より 右の 列を 取り出す', '完全一致で 探す', '数値を 探す'],
      explain: 'VLOOKUP は 範囲の 左端で 探して 右を 取り出す 関数。番号が 右に ある 名簿から 左の 名前は 取れない。XLOOKUP なら できる。',
    },
    {
      kind: 'formula',
      q: 'F2 に、騎士番号 5（E2）の 騎士の 名前を 出そう（=XLOOKUP(探す値, 探す列, 取り出す列)）',
      target: 'F2',
      answer: '=XLOOKUP(E2,C2:C7,A2:A7)',
      explain: '探す列（C）と 取り出す列（A）を 別々に 指定するので、左の 列も 取り出せる。列番号を 数える 必要も ない。',
      hint: '探す列は 騎士番号の C2:C7、取り出す列は 名前の A2:A7。',
    },
    {
      kind: 'formula',
      q: 'F3 に、騎士番号 12（E3）の 騎士の 部隊を 出そう',
      target: 'F3',
      answer: '=XLOOKUP(E3,C2:C7,B2:B7)',
      explain: '取り出す列を B2:B7 に 変えるだけ。',
    },
  ],

  lookup_minister: [
    {
      kind: 'choice',
      q: '=XLOOKUP(探す値, 探す列, 取り出す列, "なし") の 4つ目は 何？',
      answer: '見つからない ときに 出す 値',
      wrong: ['探す 行の 数', '完全一致か どうか', '取り出す 列の 番号'],
      explain: 'XLOOKUP は 4つ目に「見つからない ときの 値」を 書ける。IFERROR で 包まなくても #N/A を 防げる。',
    },
    {
      kind: 'formula',
      q: 'B2 に 在庫数を 出そう。台帳に なければ「なし」。B6 まで コピーするので 台帳は 固定',
      target: 'B2',
      fill: 'B2:B6',
      answer: '=XLOOKUP(A2,$F$2:$F$6,$G$2:$G$6,"なし")',
      extra: ['なし'],
      explain: 'ミルクと サカナは 台帳に ないので「なし」。',
      hint: '探す列 $F$2:$F$6、取り出す列 $G$2:$G$6、見つからないとき "なし"。',
    },
    {
      kind: 'formula',
      q: 'B8 に「なし」の 品の 数を 出そう（イフポートで 覚えた 関数）',
      target: 'B8',
      answer: '=COUNTIF(B2:B6,"なし")',
      explain: '探す 関数と 数える 関数を 組み合わせれば、台帳の 確認が 一瞬で 終わる。',
    },
  ],

  // ---------------------------------------------------------------- 城の大書庫の扉（謎解き）
  lib_shelf: [
    {
      kind: 'formula',
      q: '304番の 書が 眠る 棚を、目録から 引き 示せ（F2 に 刻む）',
      target: 'F2',
      answer: '=VLOOKUP(E2,A2:C6,3,FALSE)',
      extra: ['2', 'TRUE'],
      explain: '書架が 開いた。',
    },
  ],
  lib_left: [
    {
      kind: 'formula',
      q: 'ライが 著した 書の 番号を 示せ（F2 に 刻む）',
      target: 'F2',
      answer: '=XLOOKUP(E2,C2:C6,A2:A6)',
      explain: '錠が はずれた。',
    },
  ],
  lib_missing: [
    {
      kind: 'formula',
      q: '求める 書の 名を 記せ。目録に なき 書には「なし」（B2 に 刻み、B5 まで 映す）',
      target: 'B2',
      fill: 'B2:B5',
      answer: '=IFERROR(VLOOKUP(A2,$E$2:$F$5,2,FALSE),"なし")',
      explain: '封印が ほどけた。',
    },
  ],

  // ---------------------------------------------------------------- 第5章 ピボリア（複数条件の 集計）
  pivo_countifs: [
    {
      kind: 'choice',
      q: '「北地区」で「夜」の 見回りを 数えたい。使う 関数は？',
      answer: 'COUNTIFS',
      wrong: ['COUNTIF', 'COUNT', 'SUMIFS'],
      explain: 'COUNTIF は 条件が 1つ。最後に S が つく COUNTIFS は「範囲と 条件の ペア」を いくつも 並べて、全部を 満たす 行を 数える。',
    },
    {
      kind: 'choice',
      q: 'COUNTIFS の 正しい 書き方は？',
      answer: '=COUNTIFS(A2:A11,"北",B2:B11,"夜")',
      wrong: ['=COUNTIFS(A2:A11,B2:B11,"北","夜")', '=COUNTIFS("北",A2:A11,"夜",B2:B11)', '=COUNTIFS(A2:B11,"北","夜")'],
      explain: '「範囲1, 条件1, 範囲2, 条件2」と ペアごとに 並べる。範囲を 先に まとめたり、条件を 先に 書いたりは しない。',
    },
    {
      kind: 'formula',
      q: 'E2 に、北地区の「夜」の 見回り回数を 出そう',
      target: 'E2',
      answer: '=COUNTIFS(A2:A11,"北",B2:B11,"夜")',
      extra: ['北', '夜', '"昼"'],
      explain: '北で、しかも 夜。両方を 満たす 行だけが 数えられる → 3回。',
      hint: '=COUNTIFS(地区の範囲,"北",時間帯の範囲,"夜")',
    },
    {
      kind: 'formula',
      q: 'E3 に、北地区の「昼」の 見回り回数を 出そう',
      target: 'E3',
      answer: '=COUNTIFS(A2:A11,"北",B2:B11,"昼")',
      extra: ['"夜"', '昼'],
      explain: '条件の "夜" を "昼" に 変えるだけ → 2回。',
    },
  ],

  pivo_sumifs: [
    {
      kind: 'choice',
      q: 'SUMIFS で、いちばん 最初に 書くのは？',
      answer: '合計する 範囲（売上の C2:C9）',
      wrong: ['1つ目の 条件の 範囲（A2:A9）', '1つ目の 条件（"パン"）', '最後に 書くので 最初には 書かない'],
      explain: 'SUMIFS は =SUMIFS(合計する範囲, 範囲1, 条件1, 範囲2, 条件2…)。SUMIF は 合計する範囲が 最後なので、順番の ちがいに 注意。',
    },
    {
      kind: 'formula',
      q: 'F2 に、東店の パンの 売上の 合計を 出そう',
      target: 'F2',
      answer: '=SUMIFS(C2:C9,A2:A9,"パン",B2:B9,"東店")',
      extra: ['パン', '"西店"'],
      explain: 'パン で、しかも 東店 の 行の 売上だけを 足す → 120 + 150 + 60 = 330。',
      hint: '=SUMIFS(売上の範囲, 品目の範囲,"パン", 店の範囲,"東店")',
    },
  ],

  pivo_compare: [
    {
      kind: 'choice',
      q: '「1000G 以上」を 条件に するときの 書き方は？',
      answer: '">=1000"',
      wrong: ['>=1000', '"=>1000"', '"≧1000"'],
      explain: '比べる 記号つきの 条件は " で 囲む。「以上」は >=（> が 先）。≧ は 使えない。',
    },
    {
      kind: 'formula',
      q: 'E2 に、東地区で 1000G 以上の 納税の 件数を 出そう',
      target: 'E2',
      answer: '=COUNTIFS(A2:A9,"東",B2:B9,">=1000")',
      extra: ['">1000"', '東'],
      explain: '東で、しかも 1000以上 → 1200・1500・1000 の 3件。ちょうど 1000 も「以上」なので 入る。',
      hint: '=COUNTIFS(地区の範囲,"東",金額の範囲,">=1000")',
    },
    {
      kind: 'formula',
      q: 'E3 に、その 合計金額を 出そう',
      target: 'E3',
      answer: '=SUMIFS(B2:B9,A2:A9,"東",B2:B9,">=1000")',
      extra: ['">1000"'],
      explain: '合計する 範囲（B列）と、条件の 範囲（B列）が 同じ 列でも かまわない → 3700。',
      hint: '最初に 合計する範囲 B2:B9、あとは E2 と 同じ 条件の ペア。',
    },
  ],

  pivo_average: [
    {
      kind: 'choice',
      q: '「赤組だけの 平均点」を 出す 関数は？',
      answer: 'AVERAGEIF',
      wrong: ['AVERAGE', 'COUNTIF', 'SUMIF'],
      explain: 'AVERAGEIF は 条件に 合う 行だけの 平均。=AVERAGEIF(条件の範囲, 条件, 平均する範囲) と、SUMIF と 同じ 並び。',
    },
    {
      kind: 'formula',
      q: 'E2 に、赤組の 平均点を 出そう',
      target: 'E2',
      answer: '=AVERAGEIF(A2:A8,"赤組",B2:B8)',
      extra: ['赤組', '"白組"'],
      explain: '赤組の 70・90・80・60 の 平均 → 75点。',
      hint: '=AVERAGEIF(組の範囲,"赤組",点数の範囲)',
    },
    {
      kind: 'choice',
      q: '=MAXIFS(B2:B8, A2:A8, "白組") の 1つ目（B2:B8）は 何？',
      answer: '最大値を 探す 範囲（点数）',
      wrong: ['条件の 範囲（組）', '条件（白組）', '答えを 出す セル'],
      explain: 'MAXIFS・MINIFS は SUMIFS と 同じ 並びで、答えを 探す 範囲が 先。そのあとに 条件の ペアを 並べる。',
    },
    {
      kind: 'formula',
      q: 'E3 に、白組の 最高点を 出そう',
      target: 'E3',
      answer: '=MAXIFS(B2:B8,A2:A8,"白組")',
      extra: ['"赤組"'],
      explain: '白組の 85・60・95 の うち 最大 → 95点。MINIFS なら 最低点。',
    },
  ],

  pivo_summary: [
    {
      kind: 'choice',
      q: 'F2 の 条件に "北" と 書くかわりに E2（北と 書いた セル）を 使うと 何が いい？',
      answer: '下へ コピーすると E3・E4… と 地区が 自動で 変わる',
      wrong: ['計算が 速くなる', '" を 書かずに すむ だけ', 'エラーが 出なくなる'],
      explain: '条件を セルで 指定すれば、1つの 式を コピーするだけで 南・東・西の 合計も 出せる。地区が 増えても 1行 足すだけ。',
    },
    {
      kind: 'formula',
      q: 'F2 に 北の 合計を 出そう。F5 まで コピーするので、記録の 範囲は F4 で 固定。条件は E2',
      target: 'F2',
      fill: 'F2:F5',
      answer: '=SUMIFS($B$2:$B$11,$A$2:$A$11,E2)',
      extra: ['"北"'],
      explain: '範囲を 固定しないと、下へ コピーした とき 記録の 範囲も ずれて、上の 行が 集計から もれる。条件の E2 は ずれて ほしいので $ なし。',
      hint: 'B2・B11・A2・A11 の 直後に F4。E2 は そのまま。',
    },
    {
      kind: 'choice',
      q: 'このような「項目ごとの 合計表」を、式を 書かずに マウス操作だけで 作れる 表計算ソフトの 機能は？',
      answer: 'ピボットテーブル',
      wrong: ['オートフィル', '条件付き書式', '入力規則'],
      explain: 'ピボットテーブルは、記録の 表から「地区ごとの 合計」などを 一瞬で 作る 機能。SUMIFS で 作る 集計表は、その しくみを 式で 書いたもの。',
    },
  ],

  pivo_crosstab: [
    {
      kind: 'choice',
      q: 'この 収穫表を ピボットテーブルで 作るなら、「地区」は どこに 置く？',
      focus: 'E2:E3',
      answer: '行（縦に 並ぶ 見出し）',
      wrong: ['列（横に 並ぶ 見出し）', '値（合計する 数）', 'フィルター'],
      explain: 'ピボットテーブルは「行」「列」「値」「フィルター」の 4つの 欄に 項目を 置いて 表を 作る。この 表なら 行＝地区、列＝作物、値＝量の 合計。',
    },
    {
      kind: 'choice',
      q: 'F2 の 式を 右へも 下へも コピーする。地区の 見出し E2 は どう 固定する？',
      focus: 'E2:E3',
      answer: '$E2（列だけ 固定）',
      wrong: ['$E$2（両方 固定）', 'E$2（行だけ 固定）', 'E2（固定しない）'],
      explain: '右へ コピーしても E列を 見続けたいので 列を 固定。下へは E3 に ずれて ほしいので 行は 固定しない。作物の 見出しは 逆に F$1（行だけ 固定）。',
    },
    {
      kind: 'formula',
      q: 'F2 に 北の 小麦の 合計を 出そう。G3 まで コピーするぞ（記録の 範囲は $ で 固定、地区は $E2、作物は F$1）',
      target: 'F2',
      fill: 'F2:G3',
      answer: '=SUMIFS($C$2:$C$11,$A$2:$A$11,$E2,$B$2:$B$11,F$1)',
      extra: ['"北"', '"小麦"'],
      explain: '1つの 式で 4マス すべてが 正しく 埋まった。これが ピボットテーブルの 中身と 同じ「縦 × 横」の 集計。',
      hint: 'F4 は 1回で $E$2、2回で E$2、3回で $E2。',
    },
  ],

  // ---------------------------------------------------------------- 王宮の宝物庫の扉（謎解き）
  trs_count: [
    {
      kind: 'formula',
      q: '古き 金貨の 数を 示せ（E2 に 刻む）',
      target: 'E2',
      answer: '=COUNTIFS(A2:A8,"金貨",B2:B8,"古")',
      extra: ['"銀貨"', '"新"'],
      explain: '扉が 開いた。',
    },
  ],
  trs_sum: [
    {
      kind: 'formula',
      q: '重さ 10 以上の 宝石、その 重さの 和を 示せ（E2 に 刻む）',
      target: 'E2',
      answer: '=SUMIFS(B2:B8,A2:A8,"宝石",B2:B8,">=10")',
      extra: ['">10"', '"金塊"'],
      explain: '錠が はずれた。',
    },
  ],
  trs_cross: [
    {
      kind: 'formula',
      q: '部屋 × 宝 の 数を 表に 記せ（F2 に 刻み、G3 まで 映す）',
      target: 'F2',
      fill: 'F2:G3',
      answer: '=SUMIFS($C$2:$C$8,$A$2:$A$8,$E2,$B$2:$B$8,F$1)',
      explain: '王冠の 扉が 開いた。',
    },
  ],

  // ---------------------------------------------------------------- 第6章 テキストリア（文字列）
  text_concat: [
    {
      kind: 'choice',
      q: 'A2「山田」と B2「太郎」を つないで「山田太郎」に する 式は？',
      answer: '=A2&B2',
      wrong: ['=A2+B2', '=SUM(A2,B2)', '=A2B2'],
      explain: '文字と 文字を つなぐのは「&」。+ は 数の 足し算なので、文字に 使うと エラー（#VALUE!）に なる。',
    },
    {
      kind: 'formula',
      q: 'C2 に「山田 太郎」（間に 空白）を 作ろう。C5 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C5',
      answer: '=A2&" "&B2',
      extra: ['""'],
      explain: '空白も 1つの 文字。" " と 書いて、名字と 名前の 間に & で つなぐ。',
      hint: '=A2 & " " & B2',
    },
  ],

  text_leftright: [
    {
      kind: 'choice',
      q: '「TX-1023」の 左から 2文字を 取り出す 式は？',
      answer: '=LEFT(A2,2)',
      wrong: ['=RIGHT(A2,2)', '=LEFT(2,A2)', '=MID(A2,2)'],
      explain: '=LEFT(文字列, 文字数)。左から 数えて 何文字 取り出すかを 2つ目に 書く。',
    },
    {
      kind: 'formula',
      q: 'B2 に 産地（左から 2文字）を 取り出そう。B5 まで コピーするぞ',
      target: 'B2',
      fill: 'B2:B5',
      answer: '=LEFT(A2,2)',
      extra: ['3', '4'],
      explain: 'TX・NB・KS・TX。決まった 位置の 文字なら LEFT で 一発。',
    },
    {
      kind: 'formula',
      q: 'C2 に 品番（右から 4文字）を 取り出そう。C5 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C5',
      answer: '=RIGHT(A2,4)',
      extra: ['2', '3'],
      explain: '右から 数えて 4文字。「0450」の 頭の 0 も 消えずに 残る（文字として 取り出すため）。',
    },
  ],

  text_mid: [
    {
      kind: 'choice',
      q: '=MID("03-1234-5678", 4, 4) の 4 と 4 は それぞれ 何？',
      answer: '4文字目から、4文字 取り出す',
      wrong: ['4文字目まで、4回 取り出す', '左から 4文字と 右から 4文字', '4文字目を 4に 置きかえる'],
      explain: '=MID(文字列, 何文字目から, 何文字)。0・3・- の 次の「1」が 4文字目。そこから 4文字で「1234」。',
    },
    {
      kind: 'formula',
      q: 'B2 に 局番（4文字目から 4文字）を 取り出そう。B5 まで コピーするぞ',
      target: 'B2',
      fill: 'B2:B5',
      answer: '=MID(A2,4,4)',
      extra: ['3', '5'],
      explain: 'まん中の 文字も「何文字目から 何文字」で 自由に 切り取れる。',
    },
  ],

  text_len: [
    {
      kind: 'choice',
      q: '=LEN("宿屋 ひらがな") の 答えは？（間に 空白が 1つ）',
      answer: '7',
      wrong: ['6', '5', '8'],
      explain: 'LEN は 文字数を 数える。空白も 1文字と 数えるので、6文字 ＋ 空白 1つ で 7。',
    },
    {
      kind: 'formula',
      q: 'B2 に 店名の 文字数を 出そう。B5 まで コピーするぞ',
      target: 'B2',
      fill: 'B2:B5',
      answer: '=LEN(A2)',
      explain: '7・10・6・9 文字。指で 数えなくても 一瞬。',
    },
    {
      kind: 'formula',
      q: 'C2 に、8文字より 多ければ「長い」、そうでなければ「OK」と 出そう。C5 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C5',
      answer: '=IF(LEN(A2)>8,"長い","OK")',
      extra: ['長い', '">=8"'],
      explain: 'IF の 条件に LEN を そのまま 書ける。関数の 中に 関数を 入れて 組み合わせるのが コツ。',
      hint: '=IF( LEN(A2)>8 , "長い" , "OK" )',
    },
  ],

  text_clean: [
    {
      kind: 'choice',
      q: '=TRIM("  佐藤  次郎 ") の 答えは？',
      answer: '「佐藤 次郎」（前後の 空白が 消え、間は 1つ）',
      wrong: ['「佐藤次郎」（空白が すべて 消える）', '「  佐藤  次郎 」（何も 変わらない）', '「佐藤  次郎」（前後だけ 消える）'],
      explain: 'TRIM は 前後の 空白を 消し、間に 続いた 空白は 1つに そろえる。間の 空白まで 全部は 消さない。',
    },
    {
      kind: 'formula',
      q: 'B2 に、A2 の 名前から よけいな 空白を 取り除こう。B4 まで コピーするぞ',
      target: 'B2',
      fill: 'B2:B4',
      answer: '=TRIM(A2)',
      explain: '並べたときに ガタガタしていた 名前が そろった。',
    },
    {
      kind: 'formula',
      q: 'D2 に、C2 の「株式会社」を「(株)」に 置きかえよう。D4 まで コピーするぞ',
      target: 'D2',
      fill: 'D2:D4',
      answer: '=SUBSTITUTE(C2,"株式会社","(株)")',
      extra: ['株式会社', '"株"'],
      explain: '=SUBSTITUTE(文字列, 探す文字, 置きかえる文字)。前に あっても 後ろに あっても 置きかわる。',
      hint: '=SUBSTITUTE( C2 , "株式会社" , "(株)" )',
    },
  ],

  text_find: [
    {
      kind: 'choice',
      q: '=FIND("@","taro@moji.jp") の 答えは？',
      answer: '5',
      wrong: ['4', '6', 'taro'],
      explain: 'FIND は その文字が 何文字目に あるかを 返す。t・a・r・o の 次なので 5文字目。',
    },
    {
      kind: 'choice',
      q: '名前（@ より 前）を 取り出すには、LEFT で 何文字 取り出せば いい？',
      answer: 'FIND("@",A2)-1 文字',
      wrong: ['FIND("@",A2) 文字', 'FIND("@",A2)+1 文字', 'LEN(A2) 文字'],
      explain: '@ が 5文字目なら、名前は その 1つ手前の 4文字。だから FIND(…)-1。',
    },
    {
      kind: 'formula',
      q: 'B2 に、@ より 前（名前）を 取り出そう。B4 まで コピーするぞ',
      target: 'B2',
      fill: 'B2:B4',
      answer: '=LEFT(A2,FIND("@",A2)-1)',
      extra: ['"."'],
      explain: '@ の 位置が 人ごとに ちがっても、FIND が 毎回 数えて くれる。',
      hint: '=LEFT( A2 , FIND("@",A2)-1 )',
    },
    {
      kind: 'formula',
      q: 'C2 に、@ より 後ろ（町の 印）を 取り出そう。C4 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C4',
      answer: '=RIGHT(A2,LEN(A2)-FIND("@",A2))',
      explain: '全体の 文字数（LEN）から @ までの 文字数（FIND）を 引くと、@ より 後ろの 文字数に なる。',
      hint: '=RIGHT( A2 , LEN(A2)-FIND("@",A2) )',
    },
  ],

  // ---------------------------------------------------------------- 活版印刷所の扉（謎解き）
  prt_join: [
    {
      kind: 'formula',
      q: '左の 字と 右の 字を つなぎ、扉に 命じよ（C2 に 刻む）',
      target: 'C2',
      answer: '=A2&B2',
      explain: '扉が 開いた。',
    },
  ],
  prt_mid: [
    {
      kind: 'formula',
      q: '4番目の 字より 2字、そこに 鍵は 眠る（B2 に 刻む）',
      target: 'B2',
      answer: '=MID(A2,4,2)',
      extra: ['3', '5'],
      explain: '錠が はずれた。',
    },
  ],
  prt_find: [
    {
      kind: 'formula',
      q: '「:」の 後ろの 言葉を 示せ（B2 に 刻み、B4 まで 映す）',
      target: 'B2',
      fill: 'B2:B4',
      answer: '=RIGHT(A2,LEN(A2)-FIND(":",A2))',
      explain: '最奥の 扉が 開いた。',
    },
  ],

  // ---------------------------------------------------------------- 第7章 コヨミノ（日付）
  date_add: [
    {
      kind: 'choice',
      q: '表計算で「2026/10/28」の 5日後を 出すには？',
      answer: '日付の セルに 5 を 足す（=A5+5）',
      wrong: ['日付は 計算できないので 手で 数える', '=DAY(A5)+5', '=A5&"+5"'],
      explain: '表計算の 日付は「1日 ＝ 1」の 数として 中に しまわれている。だから 足せば 何日後。月を またいでも 暦どおりに 11月2日に なる。',
    },
    {
      kind: 'formula',
      q: 'C2 に、受付日（A2）の 日数（B2）後の 届け予定日を 出そう。C5 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C5',
      answer: '=A2+B2',
      explain: '10月20日 ＋ 14日 → 11月3日。月の 日数を 気に しなくて いい。',
    },
  ],

  date_diff: [
    {
      kind: 'choice',
      q: '「締め切り − 今日」を 計算すると 何が 出る？',
      answer: '締め切りまでの 日数',
      wrong: ['締め切りの 月', 'エラー', '今日の 曜日'],
      explain: '日付どうしの 引き算は「間の 日数」。10月15日 − 10月10日 ＝ 5。',
    },
    {
      kind: 'formula',
      q: 'B2 に、締め切り（A2）まで 今日（E1）から あと何日かを 出そう。B5 まで コピーするので 今日の セルは F4 で 固定',
      target: 'B2',
      fill: 'B2:B5',
      answer: '=A2-$E$1',
      explain: '今日の セルを 固定しないと、下へ コピーした とき E2・E3… と ずれて 空っぽの セルを 引いてしまう。',
      hint: '=A2-E1 の E1 を F4 で $E$1 に。',
    },
  ],

  date_parts: [
    {
      kind: 'choice',
      q: '日付「1995/4/12」から「4」（月）だけを 取り出す 関数は？',
      answer: 'MONTH',
      wrong: ['MID', 'DAY', 'LEFT'],
      explain: '日付の 年・月・日は YEAR・MONTH・DAY で 数として 取り出す。文字を 切り取る MID や LEFT では うまく いかない（日付の 中身は 数だから）。',
    },
    {
      kind: 'formula',
      q: 'B2 に 誕生日の「月」を 出そう。B5 まで コピーするぞ',
      target: 'B2',
      fill: 'B2:B5',
      answer: '=MONTH(A2)',
      explain: '4・12・7・1。数に なったので、比べたり 数えたり できる。',
    },
    {
      kind: 'formula',
      q: 'C2 に 誕生日の「日」を 出そう。C5 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C5',
      answer: '=DAY(A2)',
      explain: '年なら YEAR。3つ そろえて 覚えよう。',
    },
  ],

  date_weekday: [
    {
      kind: 'choice',
      q: '=WEEKDAY(日付, 2) で、土曜日は いくつ？',
      answer: '6',
      wrong: ['7', '1', '0'],
      explain: '2つ目を 2 に すると 月曜 1・火曜 2 … 土曜 6・日曜 7。だから 土日は「6以上」で まとめて 判定できる。',
    },
    {
      kind: 'formula',
      q: 'B2 に、土日なら「休み」、それ以外は「営業」と 出そう。B6 まで コピーするぞ',
      target: 'B2',
      fill: 'B2:B6',
      answer: '=IF(WEEKDAY(A2,2)>=6,"休み","営業")',
      extra: ['1', '7', '休み'],
      explain: '曜日を 数に すれば、IF で「6以上は 休み」と 判断できる。',
      hint: '=IF( WEEKDAY(A2,2)>=6 , "休み" , "営業" )',
    },
  ],

  date_edate: [
    {
      kind: 'choice',
      q: '=EDATE("2026/3/31", 1) の 答えは？',
      answer: '2026/4/30',
      wrong: ['2026/4/31', '2026/5/1', '2026/3/32'],
      explain: 'EDATE は ○か月後の 同じ日。4月に 31日は ないので、その月の 末日（4月30日）に なる。',
    },
    {
      kind: 'formula',
      q: 'C2 に、開始日（A2）の 月数（B2）後の 更新日を 出そう。C4 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C4',
      answer: '=EDATE(A2,B2)',
      explain: '日数ではなく「月」で 足す。毎月の 支払日や 更新日に 使う。',
    },
    {
      kind: 'formula',
      q: 'D2 に、開始日の 月の 末日を 出そう。D4 まで コピーするぞ',
      target: 'D2',
      fill: 'D2:D4',
      answer: '=EOMONTH(A2,0)',
      extra: ['1'],
      explain: '=EOMONTH(日付, 0) で その月の 末日。1 なら 翌月末。月末締めの 計算に べんり。',
    },
  ],

  date_datedif: [
    {
      kind: 'choice',
      q: '入村日から 今日までの「満年数」を 出す 関数は？',
      answer: '=DATEDIF(入村日, 今日, "Y")',
      wrong: ['=今日-入村日', '=YEAR(今日)-YEAR(入村日)', '=DAY(今日-入村日)'],
      explain: '引き算は 日数に なる。YEAR の 引き算は「まだ その日を 迎えて いない」年も 1年と 数えて しまう。満年数は DATEDIF の "Y"。',
    },
    {
      kind: 'formula',
      q: 'B2 に、入村日（A2）から 今日（E1）までの 満年数を 出そう。B5 まで コピーするので 今日は 固定',
      target: 'B2',
      fill: 'B2:B5',
      answer: '=DATEDIF(A2,$E$1,"Y")',
      extra: ['"M"', '"D"'],
      explain: '24・7・10・16年。2016年10月9日の 人は、10月9日を 過ぎたので ちょうど 10年。',
      hint: '=DATEDIF( A2 , $E$1 , "Y" )',
    },
    {
      kind: 'formula',
      q: 'C2 に、10年 以上なら「表彰」、それ以外は「-」と 出そう。C5 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C5',
      answer: '=IF(B2>=10,"表彰","-")',
      explain: '計算した 年数を IF で 判定。ここまでの 関数を 組み合わせれば、名簿の 管理も 自動に なる。',
    },
  ],

  // ---------------------------------------------------------------- 時計塔の扉（謎解き）
  clk_add: [
    {
      kind: 'formula',
      q: '始まりの日より 百日の 後、その 日付を 示せ（C2 に 刻む）',
      target: 'C2',
      answer: '=A2+B2',
      explain: '扉が 開いた。',
    },
  ],
  clk_weekday: [
    {
      kind: 'formula',
      q: 'この日は 月曜より 数えて 幾つめか（B2 に 刻む）',
      target: 'B2',
      answer: '=WEEKDAY(A2,2)',
      extra: ['1'],
      explain: '錠が はずれた。',
    },
  ],
  clk_months: [
    {
      kind: 'formula',
      q: '3つの 時の 間、満ちた 月の 数を 示せ（C2 に 刻み、C4 まで 映す）',
      target: 'C2',
      fill: 'C2:C4',
      answer: '=DATEDIF(A2,B2,"M")',
      extra: ['"Y"'],
      explain: '最上階への 扉が 開いた。',
    },
  ],

  // ---------------------------------------------------------------- 最終章 ホープ（エラーの 直し方と 総まとめ）
  err_div0: [
    {
      kind: 'choice',
      q: '「#DIV/0!」は 何が 起きた という エラー？',
      answer: '0（または 空の セル）で 割った',
      wrong: ['関数の 名前が まちがっている', '参照先の セルが 消えた', '文字を 計算しようとした'],
      explain: 'DIV は divide（割る）。0 で 割ることは できないので エラーに なる。人数や 個数が 0 の 行で よく 出る。',
    },
    {
      kind: 'formula',
      q: 'C2 に 1人あたりの 食料を 出そう。0 で 割る 行は「-」。C5 まで コピーするぞ',
      target: 'C2',
      fill: 'C2:C5',
      answer: '=IFERROR(A2/B2,"-")',
      extra: ['0', '-'],
      explain: '人数が 0 の 行だけ「-」。エラーが 出たときの 答えを 先に 決めておけば、表が きれいに 保てる。',
      hint: '=IFERROR( A2/B2 , "-" )',
    },
  ],

  err_value: [
    {
      kind: 'choice',
      q: '=B2+B3+B4+B5+B6 が「#VALUE!」に なった。原因は？',
      answer: '足す セルの 中に 文字（休み）が まざっている',
      wrong: ['0 で 割っている', '関数の 名前が まちがっている', 'セルが 足りない'],
      explain: '#VALUE! は「計算できない 種類の 値」が まざったときの エラー。+ は 文字を 足せない。',
      focus: 'B2:B6',
    },
    {
      kind: 'formula',
      q: 'B7 の 式を 直して、魔物の 数の 合計を 出そう',
      target: 'B7',
      answer: '=SUM(B2:B6)',
      explain: 'SUM は 範囲の 中の 数だけを 足し、文字は 飛ばして くれる。だから「休み」が あっても 36 に なる。',
    },
  ],

  err_name: [
    {
      kind: 'choice',
      q: '「#NAME?」が 出る 原因として 正しいのは？',
      answer: '関数名の 打ちまちがいや、" を 付け忘れた 文字',
      wrong: ['0 で 割った', '参照先の セルを 消した', '文字を 足し算した'],
      explain: '#NAME? は「その 名前を 知らない」。SUMM のような つづりの まちがいや、"OK" の " を 忘れて OK を 名前だと 思われたときに 出る。',
    },
    {
      kind: 'formula',
      q: 'D2 の 式（=SUMM(A2:A5)）を 直して、点数の 合計を 出そう',
      target: 'D2',
      answer: '=SUM(A2:A5)',
      explain: 'つづりを 直すだけ。関数の ボタンや 入力候補を 使えば、打ちまちがいは 防げる。',
    },
    {
      kind: 'formula',
      q: 'D3 の 式（=IF(A2>=60,OK,NG)）を 直そう。文字には " を 付ける',
      target: 'D3',
      answer: '=IF(A2>=60,"OK","NG")',
      extra: ['OK', 'NG'],
      explain: '文字は かならず " で 囲む。囲まないと、表計算ソフトは それを 関数や 名前だと 思ってしまう。',
    },
  ],

  err_ref: [
    {
      kind: 'choice',
      q: '「#REF!」が 出る 原因は？',
      answer: '式が 参照していた セル（行・列）を 削除した',
      wrong: ['0 で 割った', '文字を 計算した', '" を 付け忘れた'],
      explain: '#REF! は「参照先が ない」。消した 列を 使っていた 式が こわれる。削除の 前に、その セルを 使う 式が ないか 確かめよう。',
    },
    {
      kind: 'formula',
      q: 'C2 の 式を 直して、通行料（B2）× 税率（E1）を 出そう。C5 まで コピーするので 税率は 固定',
      target: 'C2',
      fill: 'C2:C5',
      answer: '=B2*$E$1',
      explain: 'こわれた 参照を、新しい 税率の セルへ 付けかえた。コピーするので $E$1 で 固定。',
    },
  ],

  err_report: [
    {
      kind: 'formula',
      q: 'F2 に 北隊の 兵糧の 合計を 出そう。F4 まで コピーするので 記録の 範囲は 固定、条件は E2',
      target: 'F2',
      fill: 'F2:F4',
      answer: '=SUMIFS($C$2:$C$9,$A$2:$A$9,E2)',
      extra: ['"北隊"'],
      explain: '北隊 120、南隊 75、西隊 110。第5章の 集計表と 同じ 形。',
      hint: '=SUMIFS( $C$2:$C$9 , $A$2:$A$9 , E2 )',
    },
    {
      kind: 'formula',
      q: 'G2 に、合計が 100 以上なら「十分」、それ以外は「不足」と 出そう。G4 まで コピーするぞ',
      target: 'G2',
      fill: 'G2:G4',
      answer: '=IF(F2>=100,"十分","不足")',
      extra: ['十分'],
      explain: '集計して、判定する。2つの 魔法を つなげれば、報告書が 自動で できあがる。',
    },
  ],

  err_final: [
    {
      kind: 'formula',
      q: 'B6 に 人数の 合計を 出そう',
      target: 'B6',
      answer: '=SUM(B2:B5)',
      explain: '総勢 120 名。',
    },
    {
      kind: 'choice',
      q: '「総勢 」と B6 と「 名、出陣!」を つなぐ 式は？',
      answer: '="総勢 "&B6&" 名、出陣!"',
      wrong: ['="総勢 B6 名、出陣!"', '=総勢 &B6& 名、出陣!', '="総勢 "+B6+" 名、出陣!"'],
      explain: '文字は " で 囲み、セルは そのまま 書いて & で つなぐ。" の 中に B6 と 書くと、ただの 文字「B6」に なってしまう。',
    },
    {
      kind: 'formula',
      q: 'A8 に、号令の 文を 作ろう（「総勢 」・B6・「 名、出陣!」を つなぐ）',
      target: 'A8',
      answer: '="総勢 "&B6&" 名、出陣!"',
      explain: '人数が 変われば、号令の 文も 自動で 変わる。計算と 文字が、1つに つながった。',
      hint: '="総勢 " & B6 & " 名、出陣!"',
    },
  ],

  // ---------------------------------------------------------------- 魔王城の扉（謎解き）
  cst_iferror: [
    {
      kind: 'formula',
      q: '割れるものは 割り、割れぬものには 0 を 刻め（C2 に 刻み、C4 まで 映す）',
      target: 'C2',
      fill: 'C2:C4',
      answer: '=IFERROR(A2/B2,0)',
      explain: '紋章が 割れた。',
    },
  ],
  cst_lookup: [
    {
      kind: 'formula',
      q: '品の 値を 表より 引き、数を 掛けて 代価を 示せ（C2 に 刻み、C4 まで 映す）',
      target: 'C2',
      fill: 'C2:C4',
      answer: '=XLOOKUP(A2,$E$2:$E$4,$F$2:$F$4)*B2',
      explain: '重い 扉が 開いた。',
    },
  ],
  cst_seals: [
    {
      kind: 'formula',
      q: '七つの 力の 和が 百に 届くならば「ヒラケ」、届かぬならば「トジヨ」（B9 に 刻む）',
      target: 'B9',
      answer: '=IF(SUM(B2:B8)>=100,"ヒラケ","トジヨ")',
      explain: '玉座の間への 扉が 開いた。',
    },
  ],
}
