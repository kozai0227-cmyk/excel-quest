import { autofill, boldRange, pasteRange, setCells, type GuideStep } from '../game/guide'
import { cloneGrid } from '../game/formula'
import { tr, tra } from '../game/lang'

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
      q: tr('朝の 12頭は どの セルに 入れる？（B列が「ヒツジの数」、2行目が「朝」）', 'Which cell gets the 12 sheep from the morning? (Column B is "Sheep", row 2 is "Morning")'),
      focus: 'B2',
      answer: 'B2',
      wrong: ['A2', 'B1', '2B'],
      explain: tr('セルの 場所（セル番地）は「列の アルファベット ＋ 行の 番号」で 表す。B列の 2行目だから B2 だ。', 'A cell\'s location (its address) is "column letter + row number". Column B, row 2, so it\'s B2.'),
      apply: (g) => setCells(g, { B2: '12' }),
    },
    {
      kind: 'choice',
      q: tr('B2 に 12 と 打って Enter を 押すと、次に 選ばれる セルは？', 'You type 12 in B2 and press Enter. Which cell is selected next?'),
      focus: 'B2',
      answer: tr('B3（1つ 下）', 'B3 (one down)'),
      wrong: tra(['C2（1つ 右）', 'B1（1つ 上）', 'B2 のまま'], ['C2 (one right)', 'B1 (one up)', 'Still B2']),
      explain: tr('Enter で 確定すると 1つ 下へ 進む。だから 8 → Enter → 15 → Enter と 続けて 打てば、縦に どんどん 入力できる。右へ 進みたいときは Tab キーだ。', 'Confirming with Enter moves you one cell down. So typing 8 → Enter → 15 → Enter fills the column in one go. Use Tab when you want to move right instead.'),
      apply: (g) => setCells(g, { B3: '8', B4: '15' }),
    },
  ],

  celuno_fix: [
    {
      kind: 'choice',
      q: tr('B3 を 選んで、そのまま 8 と 打つと どうなる？', 'You select B3 and just type 8. What happens?'),
      focus: 'B3',
      answer: tr('80 が 消えて 8 に 入れかわる', '80 is erased and replaced with 8'),
      wrong: tra(['80 の うしろに 付いて 808 に なる', 'エラーに なる', '何も 起きない'], ['8 is added after 80, making 808', 'You get an error', 'Nothing happens']),
      explain: tr('セルを 選んで そのまま 打つと、中身は まるごと 上書きされる。数字を 丸ごと 直すなら これが いちばん 早い。', 'When you select a cell and start typing, its whole content is overwritten. That\'s the fastest way to replace a number completely.'),
      apply: (g) => setCells(g, { B3: '8' }),
    },
    {
      kind: 'choice',
      q: tr('A4「どうのつるき」の 最後の「き」だけを 直したい。まず 何を する？', 'A4 says "Copper Swrod". You only want to fix "Swrod". What do you do first?'),
      focus: 'A4',
      answer: tr('F2キー（か ダブルクリック）で 編集モードに する', 'Press F2 (or double-click) to enter edit mode'),
      wrong: tra(['Ctrl+B を 押す', 'Delete キーを 押す', 'Ctrl+Z を 押す'], ['Press Ctrl+B', 'Press the Delete key', 'Press Ctrl+Z']),
      explain: tr('F2（Mac は fn+F2）か ダブルクリックで 編集モードに なり、文字の 一部だけ 直せる。選んで そのまま 打つと 全部 消えて しまうので 注意。', 'F2 (fn+F2 on a Mac) or a double-click puts you in edit mode, so you can fix just part of the text. If you select the cell and start typing, everything gets erased, so be careful.'),
      apply: (g) => setCells(g, { A4: tr('どうのつるぎ', 'Copper Sword') }),
    },
  ],

  celuno_copy: [
    {
      kind: 'choice',
      q: tr('A1 から B4 までの 四角い 範囲は、表計算では どう 書く？', 'How do you write the rectangle from A1 to B4 in a spreadsheet?'),
      focus: 'A1:B4',
      answer: 'A1:B4',
      wrong: ['A1-B4', 'A1~B4', 'A1,B4'],
      explain: tr('範囲は「左上の セル : 右下の セル」を コロン（:）で つなぐ。A1:B4 は 2列 × 4行 の 8マスだ。', 'A range is "top-left cell : bottom-right cell", joined with a colon (:). A1:B4 is 2 columns × 4 rows, 8 cells in all.'),
    },
    {
      kind: 'choice',
      q: tr('範囲を 選んだら、コピーする ショートカットは？', 'With the range selected, what\'s the shortcut to copy it?'),
      focus: 'A1:B4',
      answer: 'Ctrl+C',
      wrong: ['Ctrl+V', 'Ctrl+X', 'Ctrl+Z'],
      explain: tr('C は Copy の C（Mac は ⌘+C）。コピーした 範囲は 点線で 囲まれる。', 'C is for Copy (⌘+C on a Mac). The copied range gets a dotted outline.'),
      actions: ['copy'],
    },
    {
      kind: 'choice',
      q: tr('写す先の 左上 D1 を 選んで、貼り付ける ショートカットは？', 'Select D1, the top-left of the destination. What\'s the shortcut to paste?'),
      focus: 'D1',
      answer: 'Ctrl+V',
      wrong: ['Ctrl+P', 'Ctrl+B', 'Ctrl+Y'],
      explain: tr('左上の セルを 選んで Ctrl+V（⌘+V）。範囲の 形の まま 貼り付けられる。Ctrl+X で 切り取ってから 貼ると「移動」に なる。', 'Select the top-left cell and press Ctrl+V (⌘+V). The range is pasted in the same shape. If you cut with Ctrl+X first, pasting "moves" it instead.'),
      apply: (g) => pasteRange(g, 'A1:B4', 'D1'),
      actions: ['paste'],
    },
  ],

  celuno_undo: [
    {
      kind: 'choice',
      q: tr('うっかり 消して しまった！ 直前の 操作を 取り消す ショートカットは？', 'Oops, you deleted it by mistake! What\'s the shortcut to undo the last action?'),
      focus: 'B2:B5',
      answer: 'Ctrl+Z',
      wrong: ['Ctrl+Y', 'Ctrl+S', 'Esc'],
      explain: tr('Ctrl+Z（⌘+Z）で 元に 戻す。何回も 押せば、その分 さかのぼれる。ツールバーの ↶ ボタンでも 同じだ。', 'Ctrl+Z (⌘+Z) undoes. Press it again and again to go further back. The ↶ button on the toolbar does the same thing.'),
      apply: (_g, history) => cloneGrid(history[history.length - 1]),
      actions: ['undo'],
    },
    {
      kind: 'choice',
      q: tr('戻しすぎて しまったときに「やり直す」ショートカットは？', 'What\'s the shortcut to "redo" when you\'ve undone too much?'),
      answer: 'Ctrl+Y',
      wrong: ['Ctrl+Z', 'Ctrl+C', 'Ctrl+B'],
      explain: tr('Ctrl+Y（Mac は ⌘+Shift+Z）で やり直し。Z で 戻して、Y で 進む。この 2つが あれば、失敗を こわがらずに 試せる。', 'Ctrl+Y (⌘+Shift+Z on a Mac) redoes. Z goes back, Y goes forward. With these two, you can try things without fear of mistakes.'),
    },
  ],

  celuno_fill: [
    {
      kind: 'choice',
      q: tr('選んだ セルの 右下に 出る 小さな ■ の 名前は？', 'What\'s the name of the small ■ at the bottom-right of the selected cells?'),
      focus: 'A2:A3',
      answer: tr('フィルハンドル', 'Fill handle'),
      wrong: tra(['セルポインター', 'オートSUM', 'スクロールバー'], ['Cell pointer', 'AutoSum', 'Scroll bar']),
      explain: tr('この ■ を ドラッグすると、続きを 自動で 入力できる。これが「オートフィル」だ。', 'Drag this ■ and the rest of the series is entered for you. That\'s "AutoFill".'),
    },
    {
      kind: 'choice',
      q: tr('A2（1）と A3（2）の 2つを 選んで、■ を A13 まで ドラッグすると？', 'You select both A2 (1) and A3 (2), then drag the ■ down to A13. What happens?'),
      focus: 'A2:A3',
      answer: tr('3, 4, 5 … 12 と 連番に なる', 'It counts up: 3, 4, 5 ... 12'),
      wrong: tra(['1, 2, 1, 2 … と くり返す', 'すべて 2 に なる', 'すべて 1 に なる'], ['It repeats 1, 2, 1, 2 ...', 'Every cell becomes 2', 'Every cell becomes 1']),
      explain: tr('数字を 2つ 選ぶと、その差（+1）の 分だけ 増えていく。1つだけ 選んで ドラッグすると、同じ 数字の コピーに なる。', 'Select two numbers and the series grows by their difference (+1). Select just one number and drag, and it simply copies that number.'),
      apply: (g) => autofill(g, 'A2:A3', 'A13'),
      actions: ['fill'],
    },
    {
      kind: 'choice',
      q: tr('B2「1月」を 1つだけ 選んで、■ を B13 まで ドラッグすると？', 'You select just B2 ("Jan") and drag the ■ down to B13. What happens?'),
      focus: 'B2',
      answer: tr('2月, 3月 … 12月 と 続く', 'It continues Feb, Mar ... Dec'),
      wrong: tra(['1月 が 12個 並ぶ', '1月1日, 1月2日 … に なる', 'エラーに なる'], ['Jan repeats 12 times', 'It becomes Jan 1, Jan 2 ...', 'You get an error']),
      explain: tr('「1月」「月曜日」のような 決まった 並びは、1つ 選んで ドラッグ するだけで 続きが 入る。', 'Fixed series like "Jan" or "Mon" continue just by selecting one cell and dragging.'),
      apply: (g) => autofill(g, 'B2', 'B13'),
      actions: ['fill'],
    },
  ],

  celuno_bold: [
    {
      kind: 'choice',
      q: tr('見出しの 行（A1:C1）を 選んで 太字に する ショートカットは？', 'What\'s the shortcut to make the selected header row (A1:C1) bold?'),
      focus: 'A1:C1',
      answer: 'Ctrl+B',
      wrong: ['Ctrl+I', 'Ctrl+U', 'Ctrl+F'],
      explain: tr('B は Bold（太字）。もう一度 押すと 元に 戻る。I は 斜体（Italic）、U は 下線（Underline）だ。', 'B is for Bold. Press it again to turn it off. I is Italic and U is Underline.'),
      apply: (g) => boldRange(g, 'A1:C1'),
      actions: ['bold'],
    },
  ],

  // ---------------------------------------------------------------- カルキュレ（計算・関数）
  calc_arith: [
    {
      kind: 'choice',
      q: tr('数式で「掛け算」に 使う 記号は？', 'Which symbol do you use for "multiply" in a formula?'),
      answer: tr('*（アスタリスク）', '* (asterisk)'),
      wrong: tra(['×', 'x（エックス）', '・'], ['×', 'x (the letter x)', '·']),
      explain: tr('掛け算は *、割り算は /。算数の × や ÷ は 使えない。', 'Multiply with * and divide with /. The × and ÷ from math class don\'t work.'),
    },
    {
      kind: 'formula',
      q: tr('D2 に 小計（単価 × 数量）の 数式を 作ろう。D5 まで オートフィルで 広げるぞ', 'Build a formula in D2 for the subtotal (price × qty). We\'ll AutoFill it down to D5'),
      target: 'D2',
      fill: 'D2:D5',
      answer: '=B2*C2',
      extra: ['×'],
      explain: tr('D3 には =B3*C3、D4 には =B4*C4 が 入った。数式を コピーすると 参照も 1行ずつ ずれて、それぞれの 行を 計算してくれる。', 'D3 got =B3*C3 and D4 got =B4*C4. When you copy a formula, its references shift one row at a time, so each row calculates its own numbers.'),
      hint: tr('数式は = から 始める。単価は B2、数量は C2。', 'A formula starts with =. The price is B2 and the quantity is C2.'),
    },
  ],

  calc_sum: [
    {
      kind: 'choice',
      q: tr('たくさんの 数を 合計する 関数は？', 'Which function adds up lots of numbers?'),
      answer: 'SUM',
      wrong: ['AVERAGE', 'COUNT', 'MAX'],
      explain: tr('SUM（サム）は 合計。=SUM(範囲) の 形で 使う。', 'SUM gives the total. Use it as =SUM(range).'),
    },
    {
      kind: 'formula',
      q: tr('B12 に 10日分（B2〜B11）の 売上の 合計を 出そう', 'Get the total sales for the 10 days (B2 to B11) in B12'),
      target: 'B12',
      answer: '=SUM(B2:B11)',
      explain: tr('範囲は「始まりの セル : 終わりの セル」。売上を 書きかえても、合計は 自動で 計算し直される。', 'A range is "first cell : last cell". If you change the sales, the total recalculates automatically.'),
      hint: tr('=SUM( の あとに 範囲 B2:B11、最後に ) で 閉じる。', 'After =SUM( put the range B2:B11, then close with ).'),
    },
  ],

  calc_average: [
    {
      kind: 'choice',
      q: tr('平均を 出す 関数は？', 'Which function gives the average?'),
      answer: 'AVERAGE',
      wrong: ['MEAN', 'AVG', 'SUM'],
      explain: tr('AVERAGE（アベレージ）は「合計 ÷ 個数」を まとめて やってくれる。人数で 割る 必要は ない。', 'AVERAGE does "total ÷ count" in one go. No need to divide by the number of students yourself.'),
    },
    {
      kind: 'formula',
      q: tr('B10 に 点数（B2〜B9）の 平均を 出そう', 'Get the average of the scores (B2 to B9) in B10'),
      target: 'B10',
      answer: '=AVERAGE(B2:B9)',
      explain: tr('生徒が 増えても、範囲を 広げるだけで 平均が 出せる。', 'Even if more students join, just widen the range to get the average.'),
      hint: '=AVERAGE(B2:B9)',
    },
  ],

  calc_maxmin: [
    {
      kind: 'formula',
      q: tr('E2 に、釣果（B2〜B8）の いちばん 多い 数を 出そう', 'In E2, get the biggest catch (B2 to B8)'),
      target: 'E2',
      answer: '=MAX(B2:B8)',
      explain: tr('MAX は 範囲の 中の 最大値。目で 探さなくても 一瞬で わかる。', 'MAX gives the largest value in a range. No need to hunt for it with your eyes; you know instantly.'),
      hint: tr('最大は MAX。範囲は B2:B8。', 'The largest is MAX. The range is B2:B8.'),
    },
    {
      kind: 'formula',
      q: tr('E3 に、いちばん 少ない 数を 出そう', 'In E3, get the smallest catch'),
      target: 'E3',
      answer: '=MIN(B2:B8)',
      explain: tr('MIN は 最小値。MAX と セットで 覚えよう。', 'MIN gives the smallest value. Learn it together with MAX.'),
      hint: tr('最小は MIN。', 'The smallest is MIN.'),
    },
  ],

  calc_count: [
    {
      kind: 'choice',
      q: tr('「休み」や 空白を のぞいて、数字が 入った セルだけを 数える 関数は？', 'Which function counts only cells that contain numbers, skipping "Closed" and blanks?'),
      focus: 'B2:B11',
      answer: 'COUNT',
      wrong: ['COUNTA', 'SUM', 'AVERAGE'],
      explain: tr('COUNT は 数値の セルだけを 数える。COUNTA は 空白以外（文字も）ぜんぶ 数えるので、「休み」も 数えて しまう。', 'COUNT counts only number cells. COUNTA counts everything that isn\'t blank (text too), so it would count "Closed" as well.'),
    },
    {
      kind: 'formula',
      q: tr('B12 に 営業日数（宿泊客の 数字が 入った 日の 数）を 出そう', 'In B12, get the number of open days (days with a guest count)'),
      target: 'B12',
      answer: '=COUNT(B2:B11)',
      explain: tr('「休み」の 文字と 空白は 自動で 無視された。', 'The "Closed" text and the blanks were ignored automatically.'),
      hint: '=COUNT(B2:B11)',
    },
  ],

  calc_report: [
    {
      kind: 'formula',
      q: tr('E2 に 武器屋の 3か月の 合計を 作ろう。E4 まで オートフィルで 広げるぞ', 'In E2, build the 3-month total for Weapons. We\'ll AutoFill it down to E4'),
      target: 'E2',
      fill: 'E2:E4',
      answer: '=SUM(B2:D2)',
      explain: tr('横の 合計も SUM。下へ コピーすると、B3:D3、B4:D4 と 行が ずれて それぞれの 店の 合計に なる。', 'A row total is also SUM. Copy it down and the row shifts to B3:D3 and B4:D4, giving each shop its own total.'),
      hint: tr('範囲は 1月〜3月の B2:D2。', 'The range is B2:D2, January to March.'),
    },
    {
      kind: 'formula',
      q: tr('B5 に 1月の 合計を 作ろう。E5 まで 右へ オートフィルで 広げるぞ', 'In B5, build the total for January. We\'ll AutoFill it right to E5'),
      target: 'B5',
      fill: 'B5:E5',
      answer: '=SUM(B2:B4)',
      explain: tr('右へ コピーすると 列が ずれて C2:C4、D2:D4 … に なる。数式を 1つ 作って コピー、が 集計の 極意だ。', 'Copy it right and the column shifts to C2:C4, D2:D4, and so on. Build one formula, then copy it: that\'s the secret of reporting.'),
      hint: tr('範囲は 3つの 店の B2:B4。', 'The range is B2:B4, the three shops.'),
    },
  ],

  // ---------------------------------------------------------------- 洞窟の扉（謎解き）
  cave_days: [
    {
      kind: 'choice',
      q: tr('石版の 升目を「日」まで 並べるには？', 'How do you line up the tablet\'s squares all the way to "Sun"?'),
      focus: 'A1:B1',
      answer: tr('A1:B1 を 選び、右下の ■ を G1 まで 引っぱる', 'Select A1:B1 and drag the ■ at its corner to G1'),
      wrong: tra(['1つずつ 手で 打ちこむ', 'A1:B1 を コピーして C1 に 貼る', 'A1:B1 を 太字に する'], ['Type each one in by hand', 'Copy A1:B1 and paste it into C1', 'Make A1:B1 bold']),
      explain: tr('石版が 反応した！ 曜日も 続きの ある 並び。オートフィルで 水・木・金・土・日 と 続いた。', 'The tablet reacted! Weekdays are a series too. AutoFill continued with Wed, Thu, Fri, Sat, Sun.'),
      apply: (g) => autofill(g, 'A1:B1', 'G1'),
      actions: ['fill'],
    },
  ],

  cave_mirror: [
    {
      kind: 'choice',
      q: tr('左の 模様を、右の 台座に そっくり 写すには？', 'How do you copy the pattern on the left exactly onto the pedestal on the right?'),
      focus: 'A1:C3',
      answer: tr('A1:C3 を コピーし、E1 を 選んで 貼り付ける', 'Copy A1:C3, select E1, and paste'),
      wrong: tra(['1マスずつ 手で 写す', 'A1:C3 を 選んで ■ を 右へ 引っぱる', 'E1:G3 を 選んで Delete'], ['Copy it one square at a time by hand', 'Select A1:C3 and drag the ■ to the right', 'Select E1:G3 and press Delete']),
      explain: tr('模様が 重なった！ コピー＆貼り付けは、左上の セルを 選んで 貼るだけで 範囲ごと 写せる。', 'The patterns match! With copy and paste, you only need to select the top-left cell to paste the whole range.'),
      apply: (g) => pasteRange(g, 'A1:C3', 'E1'),
      actions: ['copy', 'paste'],
    },
  ],

  cave_words: [
    {
      kind: 'choice',
      q: tr('A3 の「ひらく」を、扉への 命令の 形に 直すには？', 'How do you turn "opens" in A3 into a command for the door?'),
      focus: 'A3',
      answer: tr('F2 で 編集モードに して「ひらけ」に 直す', 'Press F2 for edit mode and change it to "open"'),
      wrong: tra(['F2 で 編集モードに して「ひらいた」に 直す', 'Delete で 消す', 'Ctrl+Z を 押す'], ['Press F2 for edit mode and change it to "opened"', 'Erase it with Delete', 'Press Ctrl+Z']),
      explain: tr('「とびらよ ひらけ」。F2 で 一部だけ 直せた。', '"O door, open!" F2 let you fix just part of it.'),
      apply: (g) => setCells(g, { A3: tr('ひらけ', 'open') }),
    },
    {
      kind: 'choice',
      q: tr('呪文（A2:A3）を 力強い 文字（太字）に 刻むには？', 'How do you carve the spell (A2:A3) in strong letters (bold)?'),
      focus: 'A2:A3',
      answer: 'Ctrl+B',
      wrong: ['Ctrl+I', 'Ctrl+U', 'Ctrl+Z'],
      explain: tr('呪文が 太く 輝いた！', 'The spell glows boldly!'),
      apply: (g) => boldRange(g, 'A2:A3'),
      actions: ['bold'],
    },
  ],

  // ---------------------------------------------------------------- 計算の塔の扉（謎解き）
  tower_price: [
    {
      kind: 'formula',
      q: tr('「単価 × 数量」を 数式で 埋めよ（D2 に 刻み、D4 まで 映す）', 'Fill in "price × qty" with a formula (carve it in D2 and reflect it down to D4)'),
      target: 'D2',
      fill: 'D2:D4',
      answer: '=B2*C2',
      extra: ['×'],
      explain: tr('小計の 欄に 数字が 浮かんだ。', 'Numbers appeared in the Subtotal column.'),
    },
  ],
  tower_sum: [
    {
      kind: 'formula',
      q: tr('すべての 石の 重さの 合計を、B9 に 示せ', 'Show the total weight of all the stones in B9'),
      target: 'B9',
      answer: '=SUM(B2:B8)',
      explain: tr('天秤が 揺れた。', 'The scales tipped.'),
    },
  ],
  tower_stats: [
    {
      kind: 'formula',
      q: tr('E2 に 平均点を 示せ', 'Show the average score in E2'),
      target: 'E2',
      answer: '=AVERAGE(B2:B7)',
      explain: tr('「欠席」の 文字は 平均に 入らない。', 'The word "Absent" is not included in the average.'),
    },
    {
      kind: 'formula',
      q: tr('E3 に 最高点を 示せ', 'Show the top score in E3'),
      target: 'E3',
      answer: '=MAX(B2:B7)',
      explain: tr('最高点が 刻まれた。', 'The top score was carved.'),
    },
    {
      kind: 'formula',
      q: tr('E4 に 受験者数を 示せ（欠席は 数えない）', 'Show the number of test takers in E4 (absent students don\'t count)'),
      target: 'E4',
      answer: '=COUNT(B2:B7)',
      explain: tr('数字の ある 者だけが 数えられた。', 'Only those with a number were counted.'),
    },
  ],

  // ---------------------------------------------------------------- サンショウ（参照）
  sansho_rel: [
    {
      kind: 'choice',
      q: tr('ミカンの 行（D3）の 数式は =B2*C2 の まま。本当は どう なるべき？', 'The Orange row (D3) still has the formula =B2*C2. What should it really be?'),
      focus: 'D3',
      answer: '=B3*C3',
      wrong: tra(['=B2*C2 の まま', '=B3*C2', '=C3*D3'], ['=B2*C2 (as is)', '=B3*C2', '=C3*D3']),
      explain: tr('3行目の 計算には、3行目の 単価（B3）と 数量（C3）を 使う。', 'Row 3\'s calculation should use row 3\'s price (B3) and quantity (C3).'),
    },
    {
      kind: 'choice',
      q: tr('D2 の =B2*C2 を 下へ コピー（オートフィル）すると、D3 は どうなる？', 'If you copy (AutoFill) =B2*C2 in D2 downward, what does D3 become?'),
      focus: 'D2:D6',
      answer: tr('=B3*C3 に 自動で ずれる', 'It shifts to =B3*C3 automatically'),
      wrong: tra(['=B2*C2 の まま', 'エラーに なる', '空っぽに なる'], ['It stays =B2*C2', 'You get an error', 'It becomes empty']),
      explain: tr('コピーすると 参照も 同じだけ ずれる。これが「相対参照」。D2 を D6 まで オートフィルし直したら、全部の 行が 正しく なった。', 'When you copy, references shift by the same amount. That\'s a "relative reference". After AutoFilling D2 down to D6 again, every row is correct.'),
      apply: (g) => autofill(g, 'D2', 'D6'),
      actions: ['fill'],
    },
  ],

  sansho_abs: [
    {
      kind: 'choice',
      q: tr('C3 の 数式は =B3*F2。答えが 0 に なって しまう 原因は？', 'C3 has the formula =B3*F2. Why does the answer come out as 0?'),
      focus: 'C3',
      answer: tr('レートの F1 まで 下に ずれて、空っぽの F2 を 見ている', 'The rate in F1 shifted down too, so it\'s looking at the empty F2'),
      wrong: tra(['B3 が 空っぽ', '掛け算の 記号が ちがう', 'シルバーの 列が せまい'], ['B3 is empty', 'The multiply symbol is wrong', 'The Silver column is too narrow']),
      explain: tr('コピーで ずれて ほしくない 参照には $ を 付けて 固定する。$F$1 なら どこへ コピーしても F1 のまま。', 'Put $ on any reference you don\'t want to shift when copying. $F$1 stays F1 wherever you copy it.'),
    },
    {
      kind: 'formula',
      q: tr('C2 の 数式を 作り直そう。F1 は ずれないように F4 ボタンで $ を 付ける。C6 まで コピーするぞ', 'Rebuild the formula in C2. Use the F4 button to add $ so F1 doesn\'t shift. We\'ll copy it down to C6'),
      target: 'C2',
      fill: 'C2:C6',
      answer: '=B2*$F$1',
      explain: tr('$ を 付けた 参照は、コピーしても 動かない。これが「絶対参照」だ。', 'A reference with $ doesn\'t move when copied. That\'s an "absolute reference".'),
      hint: tr('F1 を 入れた 直後に F4 を 押すと $F$1 に なる。', 'Press F4 right after entering F1 to make it $F$1.'),
    },
  ],

  sansho_f4: [
    {
      kind: 'choice',
      q: tr('数式の 入力中、F1 の すぐ 後ろで F4 キーを 押すと？', 'While typing a formula, what happens if you press F4 right after F1?'),
      answer: tr('$F$1 に なる', 'It becomes $F$1'),
      wrong: tra(['F1 が 消える', 'F1 の 中身（0.2）に 変わる', 'F1 が 太字に なる'], ['F1 is deleted', 'F1 turns into its value (0.2)', 'F1 becomes bold']),
      explain: tr('F4 を 押すたびに $F$1 → F$1 → $F1 → F1 と 切り替わる（Mac は fn+F4）。$ を 手で 打たなくて いい。', 'Each press of F4 cycles $F$1 → F$1 → $F1 → F1 (fn+F4 on a Mac). No need to type $ by hand.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に セール価格（定価 ×（1 − 割引率））の 数式を 作ろう。割引率の F1 には F4 で $ を。C6 まで コピーするぞ', 'In C2, build the sale price formula (list price × (1 − discount)). Use F4 to add $ to the discount in F1. We\'ll copy it down to C6'),
      target: 'C2',
      fill: 'C2:C6',
      answer: '=B2*(1-$F$1)',
      explain: tr('1 − 0.2 で 0.8倍。カッコの 中を 先に 計算するのは 算数と 同じだ。', '1 − 0.2 makes it 0.8 times. Calculating inside the parentheses first works just like in math.'),
      hint: tr('=B2*(1-F1) と 組んで、F1 の 直後に F4。', 'Build =B2*(1-F1), and press F4 right after F1.'),
    },
  ],

  sansho_share: [
    {
      kind: 'choice',
      q: tr('C2 の =B2/B7 を 下へ コピーすると、C3 は？', 'If you copy =B2/B7 in C2 downward, what does C3 become?'),
      focus: 'C2',
      answer: tr('=B3/B8（空の B8 で 割って エラー）', '=B3/B8 (divides by the empty B8 and errors)'),
      wrong: tra(['=B3/B7', '=B2/B7 の まま', '=C3/C8'], ['=B3/B7', 'It stays =B2/B7', '=C3/C8']),
      explain: tr('合計の B7 は 動いて ほしくない。$B$7 と 固定しよう。', 'You don\'t want the total in B7 to move. Lock it as $B$7.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に 構成比（売上 ÷ 合計）の 数式を 作ろう。合計の B7 は 固定。C6 まで コピーするぞ', 'In C2, build the share formula (sales ÷ total). Lock the total in B7. We\'ll copy it down to C6'),
      target: 'C2',
      fill: 'C2:C6',
      answer: '=B2/$B$7',
      explain: tr('バラは 0.4（4割）。「合計を 固定して 割る」のが 構成比の コツだ。', 'Rose is 0.4 (40%). "Lock the total and divide by it" is the trick to shares.'),
      hint: tr('B7 の 直後に F4 で $B$7。', 'Press F4 right after B7 to make it $B$7.'),
    },
  ],

  sansho_mix: [
    {
      kind: 'choice',
      q: tr('B2 の 数式を 右へ コピーしても、ずっと A列（左の数）を 見るには？', 'How do you keep looking at column A (the left numbers) even when copying the formula in B2 to the right?'),
      focus: 'A2:A6',
      answer: tr('$A2（列だけ 固定）', '$A2 (lock the column only)'),
      wrong: tra(['A$2（行だけ 固定）', '$A$2（両方 固定）', 'A2（固定しない）'], ['A$2 (lock the row only)', '$A$2 (lock both)', 'A2 (lock nothing)']),
      explain: tr('$ は すぐ 右の 部分を 固定する。$A2 は「A列は 固定、行は ずれてよい」。両方 固定すると、下へ コピーしたとき 5 の まま に なって しまう。', '$ locks the part right after it. $A2 means "column A is locked, the row may shift". If you lock both, copying down would keep using 5.'),
    },
    {
      kind: 'choice',
      q: tr('下へ コピーしても、ずっと 1行目（上の数）を 見るには？', 'How do you keep looking at row 1 (the top numbers) even when copying down?'),
      focus: 'B1:F1',
      answer: tr('B$1（行だけ 固定）', 'B$1 (lock the row only)'),
      wrong: tra(['$B1（列だけ 固定）', '$B$1（両方 固定）', 'B1（固定しない）'], ['$B1 (lock the column only)', '$B$1 (lock both)', 'B1 (lock nothing)']),
      explain: tr('B$1 は「1行目は 固定、列は ずれてよい」。列か 行の 片方だけ 固定するのが「複合参照」だ。', 'B$1 means "row 1 is locked, the column may shift". Locking just the column or just the row is a "mixed reference".'),
    },
    {
      kind: 'formula',
      q: tr('B2 に 1つだけ 数式を 作り、表 ぜんぶ（B2:F6）に コピーしよう', 'Build just one formula in B2 and copy it to the whole table (B2:F6)'),
      target: 'B2',
      fill: 'B2:F6',
      answer: '=$A2*B$1',
      explain: tr('たった 1つの 数式で 25マスが 埋まった！', 'One formula filled all 25 cells!'),
      hint: tr('F4 は 押すたびに $A$2 → A$2 → $A2 と 変わる。', 'Each press of F4 cycles $A$2 → A$2 → $A2.'),
    },
  ],

  sansho_round: [
    {
      kind: 'choice',
      q: tr('=ROUND(数値, 0) の「0」の 意味は？', 'In =ROUND(number, 0), what does the "0" mean?'),
      answer: tr('小数点以下を 0桁に（整数に）する', 'Keep 0 decimal places (make it a whole number)'),
      wrong: tra(['0 を 足す', '0 で 割る', '0 より 小さい 数を 消す'], ['Add 0', 'Divide by 0', 'Drop numbers smaller than 0']),
      explain: tr('ROUND は 四捨五入。2つ目の 数が 残す 桁数で、0 なら 整数、1 なら 小数第1位まで 残る。', 'ROUND rounds a number. The second number is how many decimal places to keep: 0 for a whole number, 1 to keep one decimal place.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に 税込額（金額 ×（1 + 税率））を 四捨五入して 整数で 出そう。税率 F1 は 固定。C6 まで コピーするぞ', 'In C2, get the price with tax (amount × (1 + tax rate)) rounded to a whole number. Lock the tax rate in F1. We\'ll copy it down to C6'),
      target: 'C2',
      fill: 'C2:C6',
      answer: '=ROUND(B2*(1+$F$1),0)',
      explain: tr('ROUND の 中に 計算式を まるごと 入れれば、計算してから 四捨五入 される。', 'Put the whole calculation inside ROUND, and it calculates first, then rounds.'),
      hint: tr('=ROUND( 計算 , 0 )。計算は B2*(1+$F$1)。', '=ROUND( calculation , 0 ). The calculation is B2*(1+$F$1).'),
    },
    {
      kind: 'formula',
      q: tr('C7 に 税込額（C2〜C6）の 合計を 出そう', 'In C7, get the total of the prices with tax (C2 to C6)'),
      target: 'C7',
      answer: '=SUM(C2:C6)',
      explain: tr('四捨五入 した 後の 数を 合計したので、表の 見た目と 合計が ぴったり 合う。', 'You added up the rounded numbers, so the total matches what the table shows exactly.'),
    },
  ],

  // ---------------------------------------------------------------- 鏡の神殿の扉（謎解き）
  temple_tax: [
    {
      kind: 'formula',
      q: tr('「納める額」を 値段と 税から 計算せよ（C2 に 刻み、C5 まで 映す）', 'Calculate the "Amount Due" from the price and the tax (carve it in C2 and reflect it down to C5)'),
      target: 'C2',
      fill: 'C2:C5',
      answer: '=B2*(1+$F$1)',
      explain: tr('納める額が 浮かび上がった。', 'The amounts due rose to the surface.'),
    },
  ],
  temple_share: [
    {
      kind: 'formula',
      q: tr('各々の 鏡が すべての 光の 何割を 担うか 示せ（C2 に 刻み、C5 まで 映す）', 'Show what share of all the light each mirror carries (carve it in C2 and reflect it down to C5)'),
      target: 'C2',
      fill: 'C2:C5',
      answer: '=B2/$B$6',
      explain: tr('4枚の 鏡が 光った。', 'The four mirrors shone.'),
    },
  ],
  temple_times: [
    {
      kind: 'formula',
      q: tr('縦と 横の 交わりを、ただ 1つの 式で 満たせ（B2 に 刻み、B2:E5 に 映す）', 'Fill every crossing of row and column with a single formula (carve it in B2 and reflect it across B2:E5)'),
      target: 'B2',
      fill: 'B2:E5',
      answer: '=$A2*B$1',
      explain: tr('すべての マスが 光で 満たされた。', 'Every square was filled with light.'),
    },
  ],

  // ---------------------------------------------------------------- イフポート（条件）
  port_compare: [
    {
      kind: 'choice',
      q: tr('「180 以上」を 数式の 記号で 書くと？', 'How do you write "180 or more" with formula symbols?'),
      answer: '>=180',
      wrong: ['≧180', '=>180', '>180'],
      explain: tr('「以上」は >=、「以下」は <=、「等しくない」は <>。≧ ≦ ≠ は 使えない。> は「より大きい」なので、180 ちょうどを ふくまない。', '"At least" is >=, "at most" is <=, and "not equal" is <>. You can\'t use ≧ ≦ ≠. > means "greater than," so it doesn\'t include exactly 180.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に「潮位が 警戒ライン（F1）以上か」を 出す 数式を 作ろう。C6 まで コピーするので F1 は 固定', 'Build a formula in C2 that shows whether the tide is at or above the alert line (F1). Lock F1, since we\'ll copy it down to C6'),
      target: 'C2',
      fill: 'C2:C6',
      answer: '=B2>=$F$1',
      explain: tr('比べる だけの 数式の 答えは TRUE（正しい）か FALSE（違う）に なる。', 'A formula that only compares gives TRUE (right) or FALSE (wrong).'),
      hint: tr('=B2>=F1 と 組んで、F1 の 直後に F4。', 'Build =B2>=F1, and press F4 right after F1.'),
    },
  ],

  port_if: [
    {
      kind: 'choice',
      q: tr('IF 関数の 正しい 形は？', 'What\'s the correct form of the IF function?'),
      answer: tr('=IF(条件, 正しいとき, 違うとき)', '=IF(condition, if true, if false)'),
      wrong: tra(['=IF(正しいとき, 条件, 違うとき)', '=IF(条件, 違うとき, 正しいとき)', '=IF(条件)'], ['=IF(if true, condition, if false)', '=IF(condition, if false, if true)', '=IF(condition)']),
      explain: tr('「もし 条件が 正しければ ○、違えば ×」。カンマ（,）で 3つに 区切る。', '"If the condition is true, then this; if not, then that." Separate the three parts with commas (,).'),
    },
    {
      kind: 'choice',
      q: tr('IF の 答えに 文字（大漁）を 使うときは？', 'How do you use text (Great) as an IF answer?'),
      answer: tr('"大漁" のように " で 囲む', 'Wrap it in " like "Great"'),
      wrong: tra(['そのまま 大漁 と 書く', '(大漁) のように カッコで 囲む', '[大漁] のように 角カッコで 囲む'], ['Just write Great as is', 'Wrap it in parentheses like (Great)', 'Wrap it in brackets like [Great]']),
      explain: tr('数式の 中の 文字は " で 囲む。囲まないと 関数の 名前と まちがえられて #NAME? エラーに なる。', 'Text inside a formula is wrapped in ". Without them, it gets mistaken for a function name and you get a #NAME? error.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に、漁獲量が 50以上なら「大漁」、違えば「不漁」と 出そう。C6 まで コピーするぞ', 'In C2, show "Great" if the catch is 50 or more, otherwise "Poor". We\'ll copy it down to C6'),
      target: 'C2',
      fill: 'C2:C6',
      answer: tr('=IF(B2>=50,"大漁","不漁")', '=IF(B2>=50,"Great","Poor")'),
      extra: tra(['大漁', '不漁'], ['Great', 'Poor']),
      explain: tr('ルールを 1回 書けば、全部の 船が 一瞬で 判定される。50 ちょうどの カモメ号も「以上」なので 大漁だ。', 'Write the rule once, and every boat is judged in an instant. Seagull, with exactly 50, counts as "at least," so it\'s Great.'),
      hint: tr('=IF( 条件 , "大漁" , "不漁" )。条件は B2>=50。', '=IF( condition , "Great" , "Poor" ). The condition is B2>=50.'),
    },
  ],

  port_ifcalc: [
    {
      kind: 'formula',
      q: tr('C2 に 送料（金額が 3000以上なら 0、違えば 500）を 出そう。C6 まで コピーするぞ', 'In C2, show the shipping (0 if the amount is 3000 or more, otherwise 500). We\'ll copy it down to C6'),
      target: 'C2',
      fill: 'C2:C6',
      answer: '=IF(B2>=3000,0,500)',
      explain: tr('IF の 答えは 数値でも いい。数値は " で 囲まない。', 'IF\'s answers can be numbers too. Numbers aren\'t wrapped in ".'),
      hint: '=IF(B2>=3000,0,500)',
    },
    {
      kind: 'formula',
      q: tr('D2 に 請求額（金額 ＋ 送料）を 出そう。D6 まで コピーするぞ', 'In D2, show the total due (amount + shipping). We\'ll copy it down to D6'),
      target: 'D2',
      fill: 'D2:D6',
      answer: '=B2+C2',
      explain: tr('IF で 出した 送料も、ふつうの 数と 同じように 計算に 使える。', 'The shipping from IF can be used in calculations just like any other number.'),
    },
  ],

  port_nested: [
    {
      kind: 'choice',
      q: tr('A・B・C の 3段階に 分けるには？', 'How do you split grades into three levels: A, B and C?'),
      answer: tr('IF の「違うとき」に、もう1つ IF を 入れる', 'Put another IF in the "if false" part of the IF'),
      wrong: tra(['IF を 2つ 横に 並べる', 'AND を 使う', '=IF(条件,"A","B","C") と 書く'], ['Put two IFs side by side', 'Use AND', 'Write =IF(condition,"A","B","C")']),
      explain: tr('80以上なら A。違えば「60以上なら B、違えば C」。IF の 中に IF を 入れる「入れ子」で、何段階でも 分けられる。', 'A if 80 or more. If not, then "B if 60 or more, otherwise C." Nesting an IF inside an IF lets you split things into as many levels as you like.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に 評価（80以上 → A、60以上 → B、それ未満 → C）を 出そう。C6 まで コピーするぞ', 'In C2, show the grade (80+ → A, 60+ → B, otherwise → C). We\'ll copy it down to C6'),
      target: 'C2',
      fill: 'C2:C6',
      answer: '=IF(B2>=80,"A",IF(B2>=60,"B","C"))',
      explain: tr('60点 ちょうどの ホバシラは B、58点の カジは C。カッコは 開いた 数だけ 閉じる。', 'Spar, with exactly 60, gets a B, and Rudder, with 58, gets a C. Close as many parentheses as you opened.'),
      hint: tr('=IF(B2>=80,"A", ここに もう1つの IF )', '=IF(B2>=80,"A", another IF goes here )'),
    },
  ],

  port_andor: [
    {
      kind: 'choice',
      q: tr('「風速 10未満」かつ「波 2未満」――両方を 満たすかを 調べる 関数は？', 'Wind under 10 AND waves under 2: which function checks that both are met?'),
      answer: 'AND',
      wrong: tra(['OR', 'IF', 'SUM'], ['OR', 'IF', 'SUM']),
      explain: tr('AND は 全部 正しいとき TRUE。OR は どれか 1つでも 正しければ TRUE。IF の 条件の 場所に 入れて 使う。', 'AND is TRUE when everything is true. OR is TRUE if even one is true. Use them in the condition spot of IF.'),
    },
    {
      kind: 'formula',
      q: tr('D2 に、風速 10未満 かつ 波 2未満 なら「出航」、違えば「欠航」。D7 まで コピーするぞ', 'In D2, show "Sail" if the wind is under 10 AND the waves are under 2, otherwise "Stay". We\'ll copy it down to D7'),
      target: 'D2',
      fill: 'D2:D7',
      answer: tr('=IF(AND(B2<10,C2<2),"出航","欠航")', '=IF(AND(B2<10,C2<2),"Sail","Stay")'),
      explain: tr('水曜は 波が ちょうど 2m。「2未満」では ないので 欠航だ。', 'On Wednesday the waves are exactly 2 m. That isn\'t "under 2," so it\'s Stay.'),
      hint: tr('=IF(AND(B2<10,C2<2),"出航","欠航")', '=IF(AND(B2<10,C2<2),"Sail","Stay")'),
    },
    {
      kind: 'formula',
      q: tr('E2 に、風速 15以上 または 波 3以上 なら「警報」、違えば「なし」。E7 まで コピーするぞ', 'In E2, show "Alert" if the wind is 15 or more OR the waves are 3 or more, otherwise "None". We\'ll copy it down to E7'),
      target: 'E2',
      fill: 'E2:E7',
      answer: tr('=IF(OR(B2>=15,C2>=3),"警報","なし")', '=IF(OR(B2>=15,C2>=3),"Alert","None")'),
      explain: tr('どちらか 1つでも 当てはまれば 警報。AND と OR を 使い分ければ、どんな ルールも 書ける。', 'If even one applies, it\'s an Alert. Use AND and OR wisely, and you can write any rule.'),
      hint: tr('「または」は OR。', '"Or" is OR.'),
    },
  ],

  port_countif: [
    {
      kind: 'formula',
      q: tr('F2 に「魚」を 運んだ 船の数を 出そう（=COUNTIF(範囲, 条件)）', 'In F2, show the number of ships that brought "Fish" (=COUNTIF(range, condition))'),
      target: 'F2',
      answer: tr('=COUNTIF(B2:B9,"魚")', '=COUNTIF(B2:B9,"Fish")'),
      extra: tra(['魚'], ['Fish']),
      explain: tr('COUNTIF は 条件に 合う セルの 数。条件の 文字も " で 囲む。', 'COUNTIF counts the cells that match a condition. Text conditions are wrapped in " too.'),
      hint: tr('積荷の 列 B2:B9 から "魚" を 数える。', 'Count "Fish" in the cargo column, B2:B9.'),
    },
    {
      kind: 'choice',
      q: tr('SUMIF の 3つの 引数の 順番は？', 'What order do the three arguments of SUMIF go in?'),
      answer: tr('=SUMIF(条件の範囲, 条件, 合計する範囲)', '=SUMIF(range to check, condition, range to total)'),
      wrong: tra(['=SUMIF(合計する範囲, 条件の範囲, 条件)', '=SUMIF(条件, 条件の範囲, 合計する範囲)', '=SUMIF(条件の範囲, 合計する範囲, 条件)'], ['=SUMIF(range to total, range to check, condition)', '=SUMIF(condition, range to check, range to total)', '=SUMIF(range to check, range to total, condition)']),
      explain: tr('「どこを 見て」「何に 合う 行の」「どこを 足すか」の 順。COUNTIF に 3つ目（足す 範囲）が 付いた 形だ。', '"Where to look," "which rows match," and "what to add," in that order. It\'s COUNTIF with a third part (the range to add).'),
    },
    {
      kind: 'formula',
      q: tr('F3 に「魚」の 箱数の 合計を 出そう', 'In F3, show the total number of crates of "Fish"'),
      target: 'F3',
      answer: tr('=SUMIF(B2:B9,"魚",C2:C9)', '=SUMIF(B2:B9,"Fish",C2:C9)'),
      explain: tr('魚の 行の 箱数（40・65・20）だけが 足された。', 'Only the crates in the Fish rows (40, 65 and 20) were added.'),
      hint: tr('=SUMIF(B2:B9,"魚",C2:C9)', '=SUMIF(B2:B9,"Fish",C2:C9)'),
    },
    {
      kind: 'formula',
      q: tr('F4 に 50箱以上 運んだ 船の数を 出そう', 'In F4, show the number of ships that brought 50 or more crates'),
      target: 'F4',
      answer: '=COUNTIF(C2:C9,">=50")',
      extra: ['>=50'],
      explain: tr('数の 条件も " で 囲んで ">=50" と 書く。', 'Number conditions are also wrapped in ", like ">=50".'),
      hint: tr('箱数の 列 C2:C9 を ">=50" で 数える。', 'Count the crates column, C2:C9, with ">=50".'),
    },
  ],

  // ---------------------------------------------------------------- 幽霊船の扉（謎解き）
  ship_if: [
    {
      kind: 'formula',
      q: tr('重さ 100以上の 荷は「重」、それ以外は「軽」と 記せ（C2 に 刻み、C6 まで 映す）', 'Mark cargo weighing 100 or more as "Heavy," and the rest as "Light" (carve it in C2 and reflect it down to C6)'),
      target: 'C2',
      fill: 'C2:C6',
      answer: tr('=IF(B2>=100,"重","軽")', '=IF(B2>=100,"Heavy","Light")'),
      extra: tra(['重', '軽'], ['Heavy', 'Light']),
      explain: tr('積荷の 文字が 青白く 光った。', 'The words on the cargo glowed pale blue.'),
    },
  ],
  ship_nested: [
    {
      kind: 'formula',
      q: tr('価値 1000以上は「金」、500以上は「銀」、それ未満は「銅」と 刻め（C2 に 刻み、C7 まで 映す）', 'Carve "Gold" for a value of 1000 or more, "Silver" for 500 or more, and "Bronze" for less (carve it in C2 and reflect it down to C7)'),
      target: 'C2',
      fill: 'C2:C7',
      answer: tr('=IF(B2>=1000,"金",IF(B2>=500,"銀","銅"))', '=IF(B2>=1000,"Gold",IF(B2>=500,"Silver","Bronze"))'),
      explain: tr('金・銀・銅の 光が 宿った。', 'The light of gold, silver and bronze filled them.'),
    },
  ],
  ship_countif: [
    {
      kind: 'formula',
      q: tr('E2 に「金貨」の 箱の 数を 示せ', 'In E2, show the number of "Gold" chests'),
      target: 'E2',
      answer: tr('=COUNTIF(A2:A7,"金貨")', '=COUNTIF(A2:A7,"Gold")'),
      extra: tra(['金貨'], ['Gold']),
      explain: tr('金貨の 箱が 数えられた。', 'The gold chests were counted.'),
    },
    {
      kind: 'formula',
      q: tr('E3 に「金貨」の 価値の 合計を 示せ', 'In E3, show the total value of the "Gold"'),
      target: 'E3',
      answer: tr('=SUMIF(A2:A7,"金貨",B2:B7)', '=SUMIF(A2:A7,"Gold",B2:B7)'),
      explain: tr('金貨が じゃらじゃらと 鳴った。', 'The gold coins jingled.'),
    },
  ],

  // ---------------------------------------------------------------- ルックアップ（検索）
  lookup_vlookup: [
    {
      kind: 'choice',
      q: tr('VLOOKUP の 4つの 引数の 正しい 順番は？', 'What is the correct order of the four arguments of VLOOKUP?'),
      answer: tr('=VLOOKUP(探す値, 範囲, 列番号, FALSE)', '=VLOOKUP(value to find, range, column number, FALSE)'),
      wrong: tra(['=VLOOKUP(範囲, 探す値, 列番号, FALSE)', '=VLOOKUP(探す値, 列番号, 範囲, FALSE)', '=VLOOKUP(列番号, 探す値, 範囲, FALSE)'], ['=VLOOKUP(range, value to find, column number, FALSE)', '=VLOOKUP(value to find, column number, range, FALSE)', '=VLOOKUP(column number, value to find, range, FALSE)']),
      explain: tr('「何を」「どの表の 左端で 探して」「左から 何列目を」取り出すか。最後の FALSE は「ぴったり 同じ 値だけ（完全一致）」の 意味。', '"What," "search the left edge of which table," and "which column from the left" to pull out. The FALSE at the end means "exact matches only."'),
    },
    {
      kind: 'choice',
      q: tr('範囲 A2:C8 の 中で「名前」は 左から 何列目？', 'In the range A2:C8, which column from the left is "Name"?'),
      focus: 'A1:C1',
      answer: '2',
      wrong: ['1', '3', 'B'],
      explain: tr('列番号は 範囲の 左端を 1 として 数える。番号(A)が 1、名前(B)が 2、住所(C)が 3。「B」のような 列の 文字では ない。', 'Column numbers count the left edge of the range as 1. No. (A) is 1, Name (B) is 2, Address (C) is 3. It\'s not a column letter like "B."'),
    },
    {
      kind: 'formula',
      q: tr('F2 に、E2 の 番号（105）の 人の 名前を 出そう', 'In F2, show the name of the person with E2\'s number (105)'),
      target: 'F2',
      answer: '=VLOOKUP(E2,A2:C8,2,FALSE)',
      extra: ['1', '3', 'TRUE'],
      explain: tr('番号を 書きかえれば、名前も 自動で 変わる。目で 探す 必要は もう ない。', 'Change the number, and the name changes automatically. No more searching by eye.'),
      hint: '=VLOOKUP(E2,A2:C8,2,FALSE)',
    },
  ],

  lookup_col: [
    {
      kind: 'choice',
      q: tr('商品表 F2:H6 で「単価」は 何列目？', 'In the product list F2:H6, which column is "Price"?'),
      focus: 'F1:H1',
      answer: '3',
      wrong: ['1', '2', '8'],
      explain: tr('範囲の 左端（品番）が 1列目。品名が 2、単価が 3。シート全体で 何列目か（H は 8列目）では なく、範囲の 中で 数える。', 'The left edge of the range (Code) is column 1. Item is 2 and Price is 3. Count inside the range, not across the whole sheet (where H is column 8).'),
    },
    {
      kind: 'formula',
      q: tr('B2 に 品名を 取り出そう。B5 まで コピーするので、商品表の 範囲は F4 で 固定', 'Pull out the item name in B2. Since we\'ll copy it down to B5, lock the product list range with F4'),
      target: 'B2',
      fill: 'B2:B5',
      answer: '=VLOOKUP(A2,$F$2:$H$6,2,FALSE)',
      extra: ['3', 'TRUE'],
      explain: tr('範囲を 固定しないと、下へ コピーした とき 商品表も 1行ずつ ずれて、上の 品が 見つからなく なる。', 'If you don\'t lock the range, the product list shifts down one row at a time as you copy, and the items at the top can\'t be found.'),
      hint: tr('範囲は F2 と H6 の それぞれの 直後に F4。', 'Press F4 right after F2 and right after H6.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に 単価を 取り出そう。C5 まで コピーするぞ', 'Pull out the price in C2. We\'ll copy it down to C5'),
      target: 'C2',
      fill: 'C2:C5',
      answer: '=VLOOKUP(A2,$F$2:$H$6,3,FALSE)',
      extra: ['2', 'TRUE'],
      explain: tr('列番号を 2 → 3 に 変えただけ。同じ 表から 別の 情報を 取り出せる。', 'Just changing the column number from 2 to 3 pulls different information from the same table.'),
    },
  ],

  lookup_approx: [
    {
      kind: 'choice',
      q: tr('VLOOKUP の 4つ目を TRUE（近似一致）に すると、72 は どの 行に 当たる？（階級表：0・60・80・95）', 'With the 4th part of VLOOKUP set to TRUE (approximate match), which row does 72 land on? (rank table: 0, 60, 80, 95)'),
      focus: 'E2:F5',
      answer: tr('60 の 行（72 以下で いちばん 大きい 値）', 'The 60 row (the largest value at or below 72)'),
      wrong: tra(['80 の 行（いちばん 近い 値）', '見つからず #N/A', '95 の 行（いちばん 大きい 値）'], ['The 80 row (the closest value)', 'Not found: #N/A', 'The 95 row (the largest value)']),
      explain: tr('近似一致は「探す値 以下で いちばん 大きい 値」の 行を 選ぶ。だから 区切りの 表は 小さい順に 並べておく。点数や 金額の ランク分けに 便利。', 'Approximate match picks the row with "the largest value at or below the one you\'re looking for." That\'s why cutoff tables are sorted smallest first. Great for ranking scores or amounts.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に 階級を 出そう。C6 まで コピーするので 階級表は 固定', 'Show the rank in C2. Since we\'ll copy it down to C6, lock the rank table'),
      target: 'C2',
      fill: 'C2:C6',
      answer: '=VLOOKUP(B2,$E$2:$F$5,2,TRUE)',
      extra: ['FALSE'],
      explain: tr('IF を 何個も 重ねなくても、区切りの 表 1つで 何段階にも 分けられる。', 'No need to stack IF after IF; one table of cutoffs can split things into many levels.'),
      hint: tr('4つ目は TRUE。範囲は $E$2:$F$5。', 'The 4th part is TRUE. The range is $E$2:$F$5.'),
    },
  ],

  lookup_iferror: [
    {
      kind: 'choice',
      q: tr('VLOOKUP で、探す 値が 表に ないと 出る エラーは？', 'Which error does VLOOKUP give when the value isn\'t in the table?'),
      answer: '#N/A',
      wrong: ['#DIV/0!', '#NAME?', '#REF!'],
      explain: tr('#N/A は「見つからない（Not Available）」。#DIV/0! は 0で割った、#NAME? は 関数名の まちがい、#REF! は 参照が 消えた ときの エラー。', '#N/A means "Not Available" (not found). #DIV/0! is dividing by 0, #NAME? is a misspelled function name, and #REF! is a reference that was deleted.'),
    },
    {
      kind: 'choice',
      q: tr('=IFERROR(A, B) は どういう 意味？', 'What does =IFERROR(A, B) mean?'),
      answer: tr('A が エラーなら B を、エラーで なければ A を 出す', 'Show B if A is an error, otherwise show A'),
      wrong: tra(['A と B の うち 大きい ほうを 出す', 'A が B と 等しければ TRUE', 'エラーの 数を 数える'], ['Show whichever of A and B is bigger', 'TRUE if A equals B', 'Count the errors']),
      explain: tr('IFERROR は「エラーの ときだけ 別の 答え」。VLOOKUP を まるごと 包んで 使う。', 'IFERROR means "a different answer only when there\'s an error." Wrap the whole VLOOKUP in it.'),
    },
    {
      kind: 'formula',
      q: tr('B2 に 書名を 出そう。目録に なければ「未登録」。B6 まで コピーするぞ', 'Show the title in B2. If it\'s not in the catalog, "Unlisted". We\'ll copy it down to B6'),
      target: 'B2',
      fill: 'B2:B6',
      answer: tr('=IFERROR(VLOOKUP(A2,$D$2:$E$6,2,FALSE),"未登録")', '=IFERROR(VLOOKUP(A2,$D$2:$E$6,2,FALSE),"Unlisted")'),
      extra: tra(['未登録'], ['Unlisted']),
      explain: tr('208番と 210番は 目録に ないので「未登録」。エラーが 出たときの 答えを 先に 決めておける。', 'No. 208 and No. 210 aren\'t in the catalog, so they\'re "Unlisted." You can decide ahead of time what to show when there\'s an error.'),
      hint: tr('=IFERROR( VLOOKUP(…) , "未登録" )', '=IFERROR( VLOOKUP(…) , "Unlisted" )'),
    },
  ],

  lookup_xlookup: [
    {
      kind: 'choice',
      q: tr('VLOOKUP では できない ことは？', 'What can\'t VLOOKUP do?'),
      answer: tr('探す列より 左の 列を 取り出す', 'Return a column to the left of the one it searches'),
      wrong: tra(['探す列より 右の 列を 取り出す', '完全一致で 探す', '数値を 探す'], ['Return a column to the right of the one it searches', 'Search for an exact match', 'Search for numbers']),
      explain: tr('VLOOKUP は 範囲の 左端で 探して 右を 取り出す 関数。番号が 右に ある 名簿から 左の 名前は 取れない。XLOOKUP なら できる。', 'VLOOKUP searches the left edge of the range and returns something to the right. It can\'t get a name on the left from a roster with numbers on the right. XLOOKUP can.'),
    },
    {
      kind: 'formula',
      q: tr('F2 に、騎士番号 5（E2）の 騎士の 名前を 出そう（=XLOOKUP(探す値, 探す列, 取り出す列)）', 'In F2, show the name of knight No. 5 (E2) (=XLOOKUP(value to find, column to search, column to return))'),
      target: 'F2',
      answer: '=XLOOKUP(E2,C2:C7,A2:A7)',
      explain: tr('探す列（C）と 取り出す列（A）を 別々に 指定するので、左の 列も 取り出せる。列番号を 数える 必要も ない。', 'You set the column to search (C) and the column to return (A) separately, so it can return a column to the left. No need to count column numbers either.'),
      hint: tr('探す列は 騎士番号の C2:C7、取り出す列は 名前の A2:A7。', 'Search the knight number column, C2:C7, and return the name column, A2:A7.'),
    },
    {
      kind: 'formula',
      q: tr('F3 に、騎士番号 12（E3）の 騎士の 部隊を 出そう', 'In F3, show the unit of knight No. 12 (E3)'),
      target: 'F3',
      answer: '=XLOOKUP(E3,C2:C7,B2:B7)',
      explain: tr('取り出す列を B2:B7 に 変えるだけ。', 'Just change the return column to B2:B7.'),
    },
  ],

  lookup_minister: [
    {
      kind: 'choice',
      q: tr('=XLOOKUP(探す値, 探す列, 取り出す列, "なし") の 4つ目は 何？', 'What is the 4th part of =XLOOKUP(value to find, column to search, column to return, "None")?'),
      answer: tr('見つからない ときに 出す 値', 'The value to show when nothing is found'),
      wrong: tra(['探す 行の 数', '完全一致か どうか', '取り出す 列の 番号'], ['The number of rows to search', 'Whether to use an exact match', 'The number of the column to return']),
      explain: tr('XLOOKUP は 4つ目に「見つからない ときの 値」を 書ける。IFERROR で 包まなくても #N/A を 防げる。', 'XLOOKUP lets you write "the value if not found" as the 4th part. It prevents #N/A without wrapping it in IFERROR.'),
    },
    {
      kind: 'formula',
      q: tr('B2 に 在庫数を 出そう。台帳に なければ「なし」。B6 まで コピーするので 台帳は 固定', 'Show the stock in B2. If it\'s not in the ledger, "None". Since we\'ll copy it down to B6, lock the ledger'),
      target: 'B2',
      fill: 'B2:B6',
      answer: tr('=XLOOKUP(A2,$F$2:$F$6,$G$2:$G$6,"なし")', '=XLOOKUP(A2,$F$2:$F$6,$G$2:$G$6,"None")'),
      extra: tra(['なし'], ['None']),
      explain: tr('ミルクと サカナは 台帳に ないので「なし」。', 'Milk and Fish aren\'t in the ledger, so they show "None."'),
      hint: tr('探す列 $F$2:$F$6、取り出す列 $G$2:$G$6、見つからないとき "なし"。', 'Search $F$2:$F$6, return $G$2:$G$6, and show "None" if not found.'),
    },
    {
      kind: 'formula',
      q: tr('B8 に「なし」の 品の 数を 出そう（イフポートで 覚えた 関数）', 'In B8, show the number of "None" items (with a function you learned in Ifport)'),
      target: 'B8',
      answer: tr('=COUNTIF(B2:B6,"なし")', '=COUNTIF(B2:B6,"None")'),
      explain: tr('探す 関数と 数える 関数を 組み合わせれば、台帳の 確認が 一瞬で 終わる。', 'Combine a function that finds with a function that counts, and checking the ledger takes no time at all.'),
    },
  ],

  // ---------------------------------------------------------------- 城の大書庫の扉（謎解き）
  lib_shelf: [
    {
      kind: 'formula',
      q: tr('304番の 書が 眠る 棚を、目録から 引き 示せ（F2 に 刻む）', 'Look up the shelf where book No. 304 sleeps in the catalog and show it (carve it in F2)'),
      target: 'F2',
      answer: '=VLOOKUP(E2,A2:C6,3,FALSE)',
      extra: ['2', 'TRUE'],
      explain: tr('書架が 開いた。', 'The bookshelves opened.'),
    },
  ],
  lib_left: [
    {
      kind: 'formula',
      q: tr('ライが 著した 書の 番号を 示せ（F2 に 刻む）', 'Show the number of the book written by Rai (carve it in F2)'),
      target: 'F2',
      answer: '=XLOOKUP(E2,C2:C6,A2:A6)',
      explain: tr('錠が はずれた。', 'The lock came off.'),
    },
  ],
  lib_missing: [
    {
      kind: 'formula',
      q: tr('求める 書の 名を 記せ。目録に なき 書には「なし」（B2 に 刻み、B5 まで 映す）', 'Write the name of each book sought. For a book not in the catalog, write "None" (carve it in B2 and reflect it down to B5)'),
      target: 'B2',
      fill: 'B2:B5',
      answer: tr('=IFERROR(VLOOKUP(A2,$E$2:$F$5,2,FALSE),"なし")', '=IFERROR(VLOOKUP(A2,$E$2:$F$5,2,FALSE),"None")'),
      explain: tr('封印が ほどけた。', 'The seal came loose.'),
    },
  ],

  // ---------------------------------------------------------------- 第5章 ピボリア（複数条件の 集計）
  pivo_countifs: [
    {
      kind: 'choice',
      q: tr('「北地区」で「夜」の 見回りを 数えたい。使う 関数は？', 'You want to count the "Night" patrols in the "North district." Which function do you use?'),
      answer: 'COUNTIFS',
      wrong: ['COUNTIF', 'COUNT', 'SUMIFS'],
      explain: tr('COUNTIF は 条件が 1つ。最後に S が つく COUNTIFS は「範囲と 条件の ペア」を いくつも 並べて、全部を 満たす 行を 数える。', 'COUNTIF takes one condition. COUNTIFS, with an S at the end, lines up as many "range and condition pairs" as you like and counts the rows that meet them all.'),
    },
    {
      kind: 'choice',
      q: tr('COUNTIFS の 正しい 書き方は？', 'What\'s the correct way to write COUNTIFS?'),
      answer: tr('=COUNTIFS(A2:A11,"北",B2:B11,"夜")', '=COUNTIFS(A2:A11,"North",B2:B11,"Night")'),
      wrong: tra(['=COUNTIFS(A2:A11,B2:B11,"北","夜")', '=COUNTIFS("北",A2:A11,"夜",B2:B11)', '=COUNTIFS(A2:B11,"北","夜")'], ['=COUNTIFS(A2:A11,B2:B11,"North","Night")', '=COUNTIFS("North",A2:A11,"Night",B2:B11)', '=COUNTIFS(A2:B11,"North","Night")']),
      explain: tr('「範囲1, 条件1, 範囲2, 条件2」と ペアごとに 並べる。範囲を 先に まとめたり、条件を 先に 書いたりは しない。', 'Line them up pair by pair: "range1, condition1, range2, condition2." Don\'t group the ranges first or write the conditions first.'),
    },
    {
      kind: 'formula',
      q: tr('E2 に、北地区の「夜」の 見回り回数を 出そう', 'In E2, show the number of "Night" patrols in the North district'),
      target: 'E2',
      answer: tr('=COUNTIFS(A2:A11,"北",B2:B11,"夜")', '=COUNTIFS(A2:A11,"North",B2:B11,"Night")'),
      extra: tra(['北', '夜', '"昼"'], ['North', 'Night', '"Day"']),
      explain: tr('北で、しかも 夜。両方を 満たす 行だけが 数えられる → 3回。', 'North, and also Night. Only rows that meet both are counted → 3.'),
      hint: tr('=COUNTIFS(地区の範囲,"北",時間帯の範囲,"夜")', '=COUNTIFS(district range,"North",time range,"Night")'),
    },
    {
      kind: 'formula',
      q: tr('E3 に、北地区の「昼」の 見回り回数を 出そう', 'In E3, show the number of "Day" patrols in the North district'),
      target: 'E3',
      answer: tr('=COUNTIFS(A2:A11,"北",B2:B11,"昼")', '=COUNTIFS(A2:A11,"North",B2:B11,"Day")'),
      extra: tra(['"夜"', '昼'], ['"Night"', 'Day']),
      explain: tr('条件の "夜" を "昼" に 変えるだけ → 2回。', 'Just change the "Night" condition to "Day" → 2.'),
    },
  ],

  pivo_sumifs: [
    {
      kind: 'choice',
      q: tr('SUMIFS で、いちばん 最初に 書くのは？', 'What do you write first in SUMIFS?'),
      answer: tr('合計する 範囲（売上の C2:C9）', 'The range to total (sales, C2:C9)'),
      wrong: tra(['1つ目の 条件の 範囲（A2:A9）', '1つ目の 条件（"パン"）', '最後に 書くので 最初には 書かない'], ['The range for the 1st condition (A2:A9)', 'The 1st condition ("Bread")', 'Nothing; it goes last']),
      explain: tr('SUMIFS は =SUMIFS(合計する範囲, 範囲1, 条件1, 範囲2, 条件2…)。SUMIF は 合計する範囲が 最後なので、順番の ちがいに 注意。', 'SUMIFS is =SUMIFS(range to total, range1, condition1, range2, condition2...). In SUMIF the range to total comes last, so watch out for the different order.'),
    },
    {
      kind: 'formula',
      q: tr('F2 に、東店の パンの 売上の 合計を 出そう', 'In F2, show the total Bread sales at the East shop'),
      target: 'F2',
      answer: tr('=SUMIFS(C2:C9,A2:A9,"パン",B2:B9,"東店")', '=SUMIFS(C2:C9,A2:A9,"Bread",B2:B9,"East")'),
      extra: tra(['パン', '"西店"'], ['Bread', '"West"']),
      explain: tr('パン で、しかも 東店 の 行の 売上だけを 足す → 120 + 150 + 60 = 330。', 'Only the sales in rows that are Bread and also East are added → 120 + 150 + 60 = 330.'),
      hint: tr('=SUMIFS(売上の範囲, 品目の範囲,"パン", 店の範囲,"東店")', '=SUMIFS(sales range, item range,"Bread", shop range,"East")'),
    },
  ],

  pivo_compare: [
    {
      kind: 'choice',
      q: tr('「1000G 以上」を 条件に するときの 書き方は？', 'How do you write "1000G or more" as a condition?'),
      answer: '">=1000"',
      wrong: tra(['>=1000', '"=>1000"', '"≧1000"'], ['>=1000', '"=>1000"', '"≧1000"']),
      explain: tr('比べる 記号つきの 条件は " で 囲む。「以上」は >=（> が 先）。≧ は 使えない。', 'Conditions with a comparison symbol are wrapped in ". "At least" is >= (with > first). You can\'t use ≧.'),
    },
    {
      kind: 'formula',
      q: tr('E2 に、東地区で 1000G 以上の 納税の 件数を 出そう', 'In E2, show the number of payments of 1000G or more in the East district'),
      target: 'E2',
      answer: tr('=COUNTIFS(A2:A9,"東",B2:B9,">=1000")', '=COUNTIFS(A2:A9,"East",B2:B9,">=1000")'),
      extra: tra(['">1000"', '東'], ['">1000"', 'East']),
      explain: tr('東で、しかも 1000以上 → 1200・1500・1000 の 3件。ちょうど 1000 も「以上」なので 入る。', 'East, and also 1000 or more → 1200, 1500 and 1000: 3 payments. Exactly 1000 counts as "or more," so it\'s included.'),
      hint: tr('=COUNTIFS(地区の範囲,"東",金額の範囲,">=1000")', '=COUNTIFS(district range,"East",amount range,">=1000")'),
    },
    {
      kind: 'formula',
      q: tr('E3 に、その 合計金額を 出そう', 'In E3, show their total amount'),
      target: 'E3',
      answer: tr('=SUMIFS(B2:B9,A2:A9,"東",B2:B9,">=1000")', '=SUMIFS(B2:B9,A2:A9,"East",B2:B9,">=1000")'),
      extra: ['">1000"'],
      explain: tr('合計する 範囲（B列）と、条件の 範囲（B列）が 同じ 列でも かまわない → 3700。', 'It\'s fine for the range to total (column B) and a condition range (column B) to be the same column → 3700.'),
      hint: tr('最初に 合計する範囲 B2:B9、あとは E2 と 同じ 条件の ペア。', 'First the range to total, B2:B9, then the same condition pairs as E2.'),
    },
  ],

  pivo_average: [
    {
      kind: 'choice',
      q: tr('「赤組だけの 平均点」を 出す 関数は？', 'Which function gives "the average score of the Red team only"?'),
      answer: 'AVERAGEIF',
      wrong: ['AVERAGE', 'COUNTIF', 'SUMIF'],
      explain: tr('AVERAGEIF は 条件に 合う 行だけの 平均。=AVERAGEIF(条件の範囲, 条件, 平均する範囲) と、SUMIF と 同じ 並び。', 'AVERAGEIF averages only the rows that match a condition. =AVERAGEIF(range to check, condition, range to average): the same order as SUMIF.'),
    },
    {
      kind: 'formula',
      q: tr('E2 に、赤組の 平均点を 出そう', 'In E2, show the Red team\'s average score'),
      target: 'E2',
      answer: tr('=AVERAGEIF(A2:A8,"赤組",B2:B8)', '=AVERAGEIF(A2:A8,"Red",B2:B8)'),
      extra: tra(['赤組', '"白組"'], ['Red', '"White"']),
      explain: tr('赤組の 70・90・80・60 の 平均 → 75点。', 'The average of the Red team\'s 70, 90, 80 and 60 → 75.'),
      hint: tr('=AVERAGEIF(組の範囲,"赤組",点数の範囲)', '=AVERAGEIF(team range,"Red",score range)'),
    },
    {
      kind: 'choice',
      q: tr('=MAXIFS(B2:B8, A2:A8, "白組") の 1つ目（B2:B8）は 何？', 'In =MAXIFS(B2:B8, A2:A8, "White"), what is the 1st part (B2:B8)?'),
      answer: tr('最大値を 探す 範囲（点数）', 'The range to find the max in (scores)'),
      wrong: tra(['条件の 範囲（組）', '条件（白組）', '答えを 出す セル'], ['The range to check (teams)', 'The condition (White)', 'The cell that shows the answer']),
      explain: tr('MAXIFS・MINIFS は SUMIFS と 同じ 並びで、答えを 探す 範囲が 先。そのあとに 条件の ペアを 並べる。', 'MAXIFS and MINIFS follow the same order as SUMIFS: the range to search for the answer comes first, then the condition pairs.'),
    },
    {
      kind: 'formula',
      q: tr('E3 に、白組の 最高点を 出そう', 'In E3, show the White team\'s top score'),
      target: 'E3',
      answer: tr('=MAXIFS(B2:B8,A2:A8,"白組")', '=MAXIFS(B2:B8,A2:A8,"White")'),
      extra: tra(['"赤組"'], ['"Red"']),
      explain: tr('白組の 85・60・95 の うち 最大 → 95点。MINIFS なら 最低点。', 'The largest of the White team\'s 85, 60 and 95 → 95. MINIFS gives the lowest score.'),
    },
  ],

  pivo_summary: [
    {
      kind: 'choice',
      q: tr('F2 の 条件に "北" と 書くかわりに E2（北と 書いた セル）を 使うと 何が いい？', 'What\'s good about using E2 (the cell that says North) instead of writing "North" as the condition in F2?'),
      answer: tr('下へ コピーすると E3・E4… と 地区が 自動で 変わる', 'Copy it down, and the district changes automatically: E3, E4...'),
      wrong: tra(['計算が 速くなる', '" を 書かずに すむ だけ', 'エラーが 出なくなる'], ['It calculates faster', 'You just skip typing the "', 'Errors stop appearing']),
      explain: tr('条件を セルで 指定すれば、1つの 式を コピーするだけで 南・東・西の 合計も 出せる。地区が 増えても 1行 足すだけ。', 'Set the condition with a cell, and copying one formula gives you the South, East and West totals too. More districts? Just add a row.'),
    },
    {
      kind: 'formula',
      q: tr('F2 に 北の 合計を 出そう。F5 まで コピーするので、記録の 範囲は F4 で 固定。条件は E2', 'Show North\'s total in F2. Since we\'ll copy it down to F5, lock the record ranges with F4. The condition is E2'),
      target: 'F2',
      fill: 'F2:F5',
      answer: '=SUMIFS($B$2:$B$11,$A$2:$A$11,E2)',
      extra: tra(['"北"'], ['"North"']),
      explain: tr('範囲を 固定しないと、下へ コピーした とき 記録の 範囲も ずれて、上の 行が 集計から もれる。条件の E2 は ずれて ほしいので $ なし。', 'If you don\'t lock the ranges, they shift as you copy down, and the top rows drop out of the totals. E2 should shift, so no $ on it.'),
      hint: tr('B2・B11・A2・A11 の 直後に F4。E2 は そのまま。', 'Press F4 right after B2, B11, A2 and A11. Leave E2 as is.'),
    },
    {
      kind: 'choice',
      q: tr('このような「項目ごとの 合計表」を、式を 書かずに マウス操作だけで 作れる 表計算ソフトの 機能は？', 'Which spreadsheet feature builds a "totals by item" table like this with just the mouse, no formulas?'),
      answer: tr('ピボットテーブル', 'PivotTable'),
      wrong: tra(['オートフィル', '条件付き書式', '入力規則'], ['AutoFill', 'Conditional formatting', 'Data validation']),
      explain: tr('ピボットテーブルは、記録の 表から「地区ごとの 合計」などを 一瞬で 作る 機能。SUMIFS で 作る 集計表は、その しくみを 式で 書いたもの。', 'A PivotTable instantly builds things like "totals by district" from a table of records. A summary table built with SUMIFS writes out that same mechanism as formulas.'),
    },
  ],

  pivo_crosstab: [
    {
      kind: 'choice',
      q: tr('この 収穫表を ピボットテーブルで 作るなら、「地区」は どこに 置く？', 'If you built this harvest table as a PivotTable, where would you put "District"?'),
      focus: 'E2:E3',
      answer: tr('行（縦に 並ぶ 見出し）', 'Rows (headings running down)'),
      wrong: tra(['列（横に 並ぶ 見出し）', '値（合計する 数）', 'フィルター'], ['Columns (headings running across)', 'Values (the numbers to total)', 'Filters']),
      explain: tr('ピボットテーブルは「行」「列」「値」「フィルター」の 4つの 欄に 項目を 置いて 表を 作る。この 表なら 行＝地区、列＝作物、値＝量の 合計。', 'A PivotTable is built by placing fields in four areas: Rows, Columns, Values and Filters. For this table: Rows = District, Columns = Crop, Values = sum of Amount.'),
    },
    {
      kind: 'choice',
      q: tr('F2 の 式を 右へも 下へも コピーする。地区の 見出し E2 は どう 固定する？', 'You\'ll copy F2\'s formula both right and down. How do you lock the district heading E2?'),
      focus: 'E2:E3',
      answer: tr('$E2（列だけ 固定）', '$E2 (lock the column only)'),
      wrong: tra(['$E$2（両方 固定）', 'E$2（行だけ 固定）', 'E2（固定しない）'], ['$E$2 (lock both)', 'E$2 (lock the row only)', 'E2 (lock nothing)']),
      explain: tr('右へ コピーしても E列を 見続けたいので 列を 固定。下へは E3 に ずれて ほしいので 行は 固定しない。作物の 見出しは 逆に F$1（行だけ 固定）。', 'You want it to keep looking at column E when copied right, so lock the column. Copied down, it should shift to E3, so don\'t lock the row. The crop heading is the opposite: F$1 (lock the row only).'),
    },
    {
      kind: 'formula',
      q: tr('F2 に 北の 小麦の 合計を 出そう。G3 まで コピーするぞ（記録の 範囲は $ で 固定、地区は $E2、作物は F$1）', 'In F2, show the total for North\'s Wheat. We\'ll copy it to G3 (lock the record ranges with $, the district as $E2, the crop as F$1)'),
      target: 'F2',
      fill: 'F2:G3',
      answer: '=SUMIFS($C$2:$C$11,$A$2:$A$11,$E2,$B$2:$B$11,F$1)',
      extra: tra(['"北"', '"小麦"'], ['"North"', '"Wheat"']),
      explain: tr('1つの 式で 4マス すべてが 正しく 埋まった。これが ピボットテーブルの 中身と 同じ「縦 × 横」の 集計。', 'One formula filled all 4 cells correctly. This is the same "down × across" total that\'s inside a PivotTable.'),
      hint: tr('F4 は 1回で $E$2、2回で E$2、3回で $E2。', 'Press F4 once for $E$2, twice for E$2, three times for $E2.'),
    },
  ],

  // ---------------------------------------------------------------- 王宮の宝物庫の扉（謎解き）
  trs_count: [
    {
      kind: 'formula',
      q: tr('古き 金貨の 数を 示せ（E2 に 刻む）', 'Show the number of old gold coins (carve it in E2)'),
      target: 'E2',
      answer: tr('=COUNTIFS(A2:A8,"金貨",B2:B8,"古")', '=COUNTIFS(A2:A8,"Gold",B2:B8,"Old")'),
      extra: tra(['"銀貨"', '"新"'], ['"Silver"', '"New"']),
      explain: tr('扉が 開いた。', 'The door opened.'),
    },
  ],
  trs_sum: [
    {
      kind: 'formula',
      q: tr('重さ 10 以上の 宝石、その 重さの 和を 示せ（E2 に 刻む）', 'Show the sum of the weights of the jewels weighing 10 or more (carve it in E2)'),
      target: 'E2',
      answer: tr('=SUMIFS(B2:B8,A2:A8,"宝石",B2:B8,">=10")', '=SUMIFS(B2:B8,A2:A8,"Jewel",B2:B8,">=10")'),
      extra: tra(['">10"', '"金塊"'], ['">10"', '"Ingot"']),
      explain: tr('錠が はずれた。', 'The lock came off.'),
    },
  ],
  trs_cross: [
    {
      kind: 'formula',
      q: tr('部屋 × 宝 の 数を 表に 記せ（F2 に 刻み、G3 まで 映す）', 'Record the count for each room × treasure in the table (carve it in F2 and reflect it to G3)'),
      target: 'F2',
      fill: 'F2:G3',
      answer: '=SUMIFS($C$2:$C$8,$A$2:$A$8,$E2,$B$2:$B$8,F$1)',
      explain: tr('王冠の 扉が 開いた。', 'The Door of Crowns opened.'),
    },
  ],

  // ---------------------------------------------------------------- 第6章 テキストリア（文字列）
  text_concat: [
    {
      kind: 'choice',
      q: tr('A2「山田」と B2「太郎」を つないで「山田太郎」に する 式は？', 'Which formula joins A2 "John" and B2 "Smith" into "JohnSmith"?'),
      answer: '=A2&B2',
      wrong: ['=A2+B2', '=SUM(A2,B2)', '=A2B2'],
      explain: tr('文字と 文字を つなぐのは「&」。+ は 数の 足し算なので、文字に 使うと エラー（#VALUE!）に なる。', 'Text is joined with "&". + is for adding numbers, so using it on text gives an error (#VALUE!).'),
    },
    {
      kind: 'formula',
      q: tr('C2 に「山田 太郎」（間に 空白）を 作ろう。C5 まで コピーするぞ', 'In C2, make "John Smith" (with a space between). We\'ll copy it down to C5'),
      target: 'C2',
      fill: 'C2:C5',
      answer: '=A2&" "&B2',
      extra: ['""'],
      explain: tr('空白も 1つの 文字。" " と 書いて、名字と 名前の 間に & で つなぐ。', 'A space is a character too. Write it as " " and join it between the first and last names with &.'),
      hint: '=A2 & " " & B2',
    },
  ],

  text_leftright: [
    {
      kind: 'choice',
      q: tr('「TX-1023」の 左から 2文字を 取り出す 式は？', 'Which formula pulls out the left 2 characters of "TX-1023"?'),
      answer: '=LEFT(A2,2)',
      wrong: ['=RIGHT(A2,2)', '=LEFT(2,A2)', '=MID(A2,2)'],
      explain: tr('=LEFT(文字列, 文字数)。左から 数えて 何文字 取り出すかを 2つ目に 書く。', '=LEFT(text, count). The 2nd part says how many characters to take, counting from the left.'),
    },
    {
      kind: 'formula',
      q: tr('B2 に 産地（左から 2文字）を 取り出そう。B5 まで コピーするぞ', 'Pull out the origin (left 2 characters) in B2. We\'ll copy it down to B5'),
      target: 'B2',
      fill: 'B2:B5',
      answer: '=LEFT(A2,2)',
      extra: ['3', '4'],
      explain: tr('TX・NB・KS・TX。決まった 位置の 文字なら LEFT で 一発。', 'TX, NB, KS, TX. For characters in a fixed position, LEFT does it in one shot.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に 品番（右から 4文字）を 取り出そう。C5 まで コピーするぞ', 'Pull out the item number (right 4 characters) in C2. We\'ll copy it down to C5'),
      target: 'C2',
      fill: 'C2:C5',
      answer: '=RIGHT(A2,4)',
      extra: ['2', '3'],
      explain: tr('右から 数えて 4文字。「0450」の 頭の 0 も 消えずに 残る（文字として 取り出すため）。', '4 characters counting from the right. The leading 0 in "0450" stays too (because it\'s pulled out as text).'),
    },
  ],

  text_mid: [
    {
      kind: 'choice',
      q: tr('=MID("03-1234-5678", 4, 4) の 4 と 4 は それぞれ 何？', 'In =MID("03-1234-5678", 4, 4), what do the two 4s mean?'),
      answer: tr('4文字目から、4文字 取り出す', 'Start at the 4th character and take 4'),
      wrong: tra(['4文字目まで、4回 取り出す', '左から 4文字と 右から 4文字', '4文字目を 4に 置きかえる'], ['Up to the 4th character, 4 times', '4 from the left and 4 from the right', 'Replace the 4th character with 4']),
      explain: tr('=MID(文字列, 何文字目から, 何文字)。0・3・- の 次の「1」が 4文字目。そこから 4文字で「1234」。', '=MID(text, start position, count). The "1" after 0, 3 and - is the 4th character. Take 4 from there to get "1234".'),
    },
    {
      kind: 'formula',
      q: tr('B2 に 局番（4文字目から 4文字）を 取り出そう。B5 まで コピーするぞ', 'Pull out the exchange code (4 characters starting at the 4th) in B2. We\'ll copy it down to B5'),
      target: 'B2',
      fill: 'B2:B5',
      answer: '=MID(A2,4,4)',
      extra: ['3', '5'],
      explain: tr('まん中の 文字も「何文字目から 何文字」で 自由に 切り取れる。', 'Even characters in the middle can be cut out freely with "start at X, take Y."'),
    },
  ],

  text_len: [
    {
      kind: 'choice',
      q: tr('=LEN("宿屋 ひらがな") の 答えは？（間に 空白が 1つ）', 'What is =LEN("Hiragana Inn")? (one space in the middle)'),
      answer: tr('7', '12'),
      wrong: tra(['6', '5', '8'], ['11', '13', '10']),
      explain: tr('LEN は 文字数を 数える。空白も 1文字と 数えるので、6文字 ＋ 空白 1つ で 7。', 'LEN counts characters. Spaces count as 1 character too, so 11 letters + 1 space = 12.'),
    },
    {
      kind: 'formula',
      q: tr('B2 に 店名の 文字数を 出そう。B5 まで コピーするぞ', 'Show the number of characters in the shop name in B2. We\'ll copy it down to B5'),
      target: 'B2',
      fill: 'B2:B5',
      answer: '=LEN(A2)',
      explain: tr('7・10・6・9 文字。指で 数えなくても 一瞬。', '11, 22, 12 and 22 characters. Instant, no finger counting.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に、8文字より 多ければ「長い」、そうでなければ「OK」と 出そう。C5 まで コピーするぞ', 'In C2, show "Long" if it has more than 12 characters, otherwise "OK". We\'ll copy it down to C5'),
      target: 'C2',
      fill: 'C2:C5',
      answer: tr('=IF(LEN(A2)>8,"長い","OK")', '=IF(LEN(A2)>12,"Long","OK")'),
      extra: tra(['長い', '">=8"'], ['Long', '">=12"']),
      explain: tr('IF の 条件に LEN を そのまま 書ける。関数の 中に 関数を 入れて 組み合わせるのが コツ。', 'You can write LEN right in the condition of IF. The trick is to combine functions by putting one inside another.'),
      hint: tr('=IF( LEN(A2)>8 , "長い" , "OK" )', '=IF( LEN(A2)>12 , "Long" , "OK" )'),
    },
  ],

  text_clean: [
    {
      kind: 'choice',
      q: tr('=TRIM("  佐藤  次郎 ") の 答えは？', 'What is =TRIM("Ken  Lee ")?'),
      answer: tr('「佐藤 次郎」（前後の 空白が 消え、間は 1つ）', '"Ken Lee" (the end spaces go, one stays in the middle)'),
      wrong: tra(['「佐藤次郎」（空白が すべて 消える）', '「  佐藤  次郎 」（何も 変わらない）', '「佐藤  次郎」（前後だけ 消える）'], ['"KenLee" (all spaces go)', '"Ken  Lee " (nothing changes)', '"Ken  Lee" (only the ends go)']),
      explain: tr('TRIM は 前後の 空白を 消し、間に 続いた 空白は 1つに そろえる。間の 空白まで 全部は 消さない。', 'TRIM removes spaces at the start and end, and squeezes runs of spaces in between down to one. It doesn\'t remove every space in the middle.'),
    },
    {
      kind: 'formula',
      q: tr('B2 に、A2 の 名前から よけいな 空白を 取り除こう。B4 まで コピーするぞ', 'In B2, remove the extra spaces from the name in A2. We\'ll copy it down to B4'),
      target: 'B2',
      fill: 'B2:B4',
      answer: '=TRIM(A2)',
      explain: tr('並べたときに ガタガタしていた 名前が そろった。', 'The names that looked crooked when lined up are neat now.'),
    },
    {
      kind: 'formula',
      q: tr('D2 に、C2 の「株式会社」を「(株)」に 置きかえよう。D4 まで コピーするぞ', 'In D2, replace "Corporation" in C2 with "Corp." We\'ll copy it down to D4'),
      target: 'D2',
      fill: 'D2:D4',
      answer: tr('=SUBSTITUTE(C2,"株式会社","(株)")', '=SUBSTITUTE(C2,"Corporation","Corp.")'),
      extra: tra(['株式会社', '"株"'], ['Corporation', '"Corp"']),
      explain: tr('=SUBSTITUTE(文字列, 探す文字, 置きかえる文字)。前に あっても 後ろに あっても 置きかわる。', '=SUBSTITUTE(text, text to find, replacement). It\'s replaced wherever it appears.'),
      hint: tr('=SUBSTITUTE( C2 , "株式会社" , "(株)" )', '=SUBSTITUTE( C2 , "Corporation" , "Corp." )'),
    },
  ],

  text_find: [
    {
      kind: 'choice',
      q: tr('=FIND("@","taro@moji.jp") の 答えは？', 'What is =FIND("@","taro@moji.jp")?'),
      answer: '5',
      wrong: ['4', '6', 'taro'],
      explain: tr('FIND は その文字が 何文字目に あるかを 返す。t・a・r・o の 次なので 5文字目。', 'FIND returns which character the text is at. It comes after t, a, r and o, so it\'s the 5th.'),
    },
    {
      kind: 'choice',
      q: tr('名前（@ より 前）を 取り出すには、LEFT で 何文字 取り出せば いい？', 'To pull out the name (before the @), how many characters should LEFT take?'),
      answer: tr('FIND("@",A2)-1 文字', 'FIND("@",A2)-1 characters'),
      wrong: tra(['FIND("@",A2) 文字', 'FIND("@",A2)+1 文字', 'LEN(A2) 文字'], ['FIND("@",A2) characters', 'FIND("@",A2)+1 characters', 'LEN(A2) characters']),
      explain: tr('@ が 5文字目なら、名前は その 1つ手前の 4文字。だから FIND(…)-1。', 'If the @ is the 5th character, the name is the 4 characters just before it. That\'s why it\'s FIND(…)-1.'),
    },
    {
      kind: 'formula',
      q: tr('B2 に、@ より 前（名前）を 取り出そう。B4 まで コピーするぞ', 'In B2, pull out the part before the @ (the name). We\'ll copy it down to B4'),
      target: 'B2',
      fill: 'B2:B4',
      answer: '=LEFT(A2,FIND("@",A2)-1)',
      extra: ['"."'],
      explain: tr('@ の 位置が 人ごとに ちがっても、FIND が 毎回 数えて くれる。', 'Even if the @ is in a different place for each person, FIND counts it every time.'),
      hint: tr('=LEFT( A2 , FIND("@",A2)-1 )', '=LEFT( A2 , FIND("@",A2)-1 )'),
    },
    {
      kind: 'formula',
      q: tr('C2 に、@ より 後ろ（町の 印）を 取り出そう。C4 まで コピーするぞ', 'In C2, pull out the part after the @ (the town\'s mark). We\'ll copy it down to C4'),
      target: 'C2',
      fill: 'C2:C4',
      answer: '=RIGHT(A2,LEN(A2)-FIND("@",A2))',
      explain: tr('全体の 文字数（LEN）から @ までの 文字数（FIND）を 引くと、@ より 後ろの 文字数に なる。', 'Subtract the characters up to the @ (FIND) from the total length (LEN), and you get the number of characters after the @.'),
      hint: tr('=RIGHT( A2 , LEN(A2)-FIND("@",A2) )', '=RIGHT( A2 , LEN(A2)-FIND("@",A2) )'),
    },
  ],

  // ---------------------------------------------------------------- 活版印刷所の扉（謎解き）
  prt_join: [
    {
      kind: 'formula',
      q: tr('左の 字と 右の 字を つなぎ、扉に 命じよ（C2 に 刻む）', 'Join the left letters and the right letters, and command the door (carve it in C2)'),
      target: 'C2',
      answer: '=A2&B2',
      explain: tr('扉が 開いた。', 'The door opened.'),
    },
  ],
  prt_mid: [
    {
      kind: 'formula',
      q: tr('4番目の 字より 2字、そこに 鍵は 眠る（B2 に 刻む）', 'From the 4th letter, take 2. There the key sleeps (carve it in B2)'),
      target: 'B2',
      answer: '=MID(A2,4,2)',
      extra: ['3', '5'],
      explain: tr('錠が はずれた。', 'The lock came off.'),
    },
  ],
  prt_find: [
    {
      kind: 'formula',
      q: tr('「:」の 後ろの 言葉を 示せ（B2 に 刻み、B4 まで 映す）', 'Show the word after the ":" (carve it in B2 and reflect it down to B4)'),
      target: 'B2',
      fill: 'B2:B4',
      answer: '=RIGHT(A2,LEN(A2)-FIND(":",A2))',
      explain: tr('最奥の 扉が 開いた。', 'The deepest door opened.'),
    },
  ],

  // ---------------------------------------------------------------- 第7章 コヨミノ（日付）
  date_add: [
    {
      kind: 'choice',
      q: tr('表計算で「2026/10/28」の 5日後を 出すには？', 'How do you get the date 5 days after "2026/10/28" in a spreadsheet?'),
      answer: tr('日付の セルに 5 を 足す（=A5+5）', 'Add 5 to the date cell (=A5+5)'),
      wrong: tra(['日付は 計算できないので 手で 数える', '=DAY(A5)+5', '=A5&"+5"'], ['Count by hand, since dates can\'t be calculated', '=DAY(A5)+5', '=A5&"+5"']),
      explain: tr('表計算の 日付は「1日 ＝ 1」の 数として 中に しまわれている。だから 足せば 何日後。月を またいでも 暦どおりに 11月2日に なる。', 'In a spreadsheet, dates are stored as numbers where 1 day = 1. So adding gives days later. Even across months, it follows the calendar to Nov 2.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に、受付日（A2）の 日数（B2）後の 届け予定日を 出そう。C5 まで コピーするぞ', 'In C2, show the delivery date, the number of days (B2) after the order date (A2). We\'ll copy it down to C5'),
      target: 'C2',
      fill: 'C2:C5',
      answer: '=A2+B2',
      explain: tr('10月20日 ＋ 14日 → 11月3日。月の 日数を 気に しなくて いい。', 'Oct 20 + 14 days → Nov 3. No need to worry about how many days each month has.'),
    },
  ],

  date_diff: [
    {
      kind: 'choice',
      q: tr('「締め切り − 今日」を 計算すると 何が 出る？', 'What do you get when you calculate "deadline − today"?'),
      answer: tr('締め切りまでの 日数', 'The number of days until the deadline'),
      wrong: tra(['締め切りの 月', 'エラー', '今日の 曜日'], ['The month of the deadline', 'An error', 'Today\'s weekday']),
      explain: tr('日付どうしの 引き算は「間の 日数」。10月15日 − 10月10日 ＝ 5。', 'Subtracting one date from another gives "the days between." Oct 15 − Oct 10 = 5.'),
    },
    {
      kind: 'formula',
      q: tr('B2 に、締め切り（A2）まで 今日（E1）から あと何日かを 出そう。B5 まで コピーするので 今日の セルは F4 で 固定', 'In B2, show how many days from today (E1) until the deadline (A2). Since we\'ll copy it down to B5, lock today\'s cell with F4'),
      target: 'B2',
      fill: 'B2:B5',
      answer: '=A2-$E$1',
      explain: tr('今日の セルを 固定しないと、下へ コピーした とき E2・E3… と ずれて 空っぽの セルを 引いてしまう。', 'If you don\'t lock today\'s cell, it shifts to E2, E3... as you copy down, and you end up subtracting an empty cell.'),
      hint: tr('=A2-E1 の E1 を F4 で $E$1 に。', 'In =A2-E1, turn E1 into $E$1 with F4.'),
    },
  ],

  date_parts: [
    {
      kind: 'choice',
      q: tr('日付「1995/4/12」から「4」（月）だけを 取り出す 関数は？', 'Which function pulls out just the "4" (the month) from the date "1995/4/12"?'),
      answer: 'MONTH',
      wrong: ['MID', 'DAY', 'LEFT'],
      explain: tr('日付の 年・月・日は YEAR・MONTH・DAY で 数として 取り出す。文字を 切り取る MID や LEFT では うまく いかない（日付の 中身は 数だから）。', 'Pull out a date\'s year, month and day as numbers with YEAR, MONTH and DAY. MID or LEFT, which cut text, don\'t work well (because a date is really a number).'),
    },
    {
      kind: 'formula',
      q: tr('B2 に 誕生日の「月」を 出そう。B5 まで コピーするぞ', 'Show the "month" of the birthday in B2. We\'ll copy it down to B5'),
      target: 'B2',
      fill: 'B2:B5',
      answer: '=MONTH(A2)',
      explain: tr('4・12・7・1。数に なったので、比べたり 数えたり できる。', '4, 12, 7, 1. Now that they\'re numbers, you can compare and count them.'),
    },
    {
      kind: 'formula',
      q: tr('C2 に 誕生日の「日」を 出そう。C5 まで コピーするぞ', 'Show the "day" of the birthday in C2. We\'ll copy it down to C5'),
      target: 'C2',
      fill: 'C2:C5',
      answer: '=DAY(A2)',
      explain: tr('年なら YEAR。3つ そろえて 覚えよう。', 'For the year, use YEAR. Learn all three together.'),
    },
  ],

  date_weekday: [
    {
      kind: 'choice',
      q: tr('=WEEKDAY(日付, 2) で、土曜日は いくつ？', 'With =WEEKDAY(date, 2), what number is Saturday?'),
      answer: '6',
      wrong: ['7', '1', '0'],
      explain: tr('2つ目を 2 に すると 月曜 1・火曜 2 … 土曜 6・日曜 7。だから 土日は「6以上」で まとめて 判定できる。', 'With 2 as the second part, Monday is 1, Tuesday 2... Saturday 6 and Sunday 7. So weekends can be checked together as "6 or more."'),
    },
    {
      kind: 'formula',
      q: tr('B2 に、土日なら「休み」、それ以外は「営業」と 出そう。B6 まで コピーするぞ', 'In B2, show "Closed" for weekends, otherwise "Open". We\'ll copy it down to B6'),
      target: 'B2',
      fill: 'B2:B6',
      answer: tr('=IF(WEEKDAY(A2,2)>=6,"休み","営業")', '=IF(WEEKDAY(A2,2)>=6,"Closed","Open")'),
      extra: tra(['1', '7', '休み'], ['1', '7', 'Closed']),
      explain: tr('曜日を 数に すれば、IF で「6以上は 休み」と 判断できる。', 'Turn the weekday into a number, and IF can decide "6 or more is Closed."'),
      hint: tr('=IF( WEEKDAY(A2,2)>=6 , "休み" , "営業" )', '=IF( WEEKDAY(A2,2)>=6 , "Closed" , "Open" )'),
    },
  ],

  date_edate: [
    {
      kind: 'choice',
      q: tr('=EDATE("2026/3/31", 1) の 答えは？', 'What is =EDATE("2026/3/31", 1)?'),
      answer: '2026/4/30',
      wrong: ['2026/4/31', '2026/5/1', '2026/3/32'],
      explain: tr('EDATE は ○か月後の 同じ日。4月に 31日は ないので、その月の 末日（4月30日）に なる。', 'EDATE gives the same day so many months later. April has no 31st, so it becomes the last day of that month (April 30).'),
    },
    {
      kind: 'formula',
      q: tr('C2 に、開始日（A2）の 月数（B2）後の 更新日を 出そう。C4 まで コピーするぞ', 'In C2, show the renewal date, the number of months (B2) after the start date (A2). We\'ll copy it down to C4'),
      target: 'C2',
      fill: 'C2:C4',
      answer: '=EDATE(A2,B2)',
      explain: tr('日数ではなく「月」で 足す。毎月の 支払日や 更新日に 使う。', 'Add by "months," not days. Use it for monthly payment and renewal dates.'),
    },
    {
      kind: 'formula',
      q: tr('D2 に、開始日の 月の 末日を 出そう。D4 まで コピーするぞ', 'In D2, show the last day of the start date\'s month. We\'ll copy it down to D4'),
      target: 'D2',
      fill: 'D2:D4',
      answer: '=EOMONTH(A2,0)',
      extra: ['1'],
      explain: tr('=EOMONTH(日付, 0) で その月の 末日。1 なら 翌月末。月末締めの 計算に べんり。', '=EOMONTH(date, 0) gives the last day of that month; 1 gives the end of next month. Handy for month-end calculations.'),
    },
  ],

  date_datedif: [
    {
      kind: 'choice',
      q: tr('入村日から 今日までの「満年数」を 出す 関数は？', 'Which gives the number of "full years" from the move-in date to today?'),
      answer: tr('=DATEDIF(入村日, 今日, "Y")', '=DATEDIF(move-in date, today, "Y")'),
      wrong: tra(['=今日-入村日', '=YEAR(今日)-YEAR(入村日)', '=DAY(今日-入村日)'], ['=today-move-in date', '=YEAR(today)-YEAR(move-in date)', '=DAY(today-move-in date)']),
      explain: tr('引き算は 日数に なる。YEAR の 引き算は「まだ その日を 迎えて いない」年も 1年と 数えて しまう。満年数は DATEDIF の "Y"。', 'Subtracting gives days. Subtracting YEARs counts a year even when the anniversary hasn\'t come yet. For full years, use DATEDIF with "Y".'),
    },
    {
      kind: 'formula',
      q: tr('B2 に、入村日（A2）から 今日（E1）までの 満年数を 出そう。B5 まで コピーするので 今日は 固定', 'In B2, show the full years from the move-in date (A2) to today (E1). Since we\'ll copy it down to B5, lock today'),
      target: 'B2',
      fill: 'B2:B5',
      answer: '=DATEDIF(A2,$E$1,"Y")',
      extra: ['"M"', '"D"'],
      explain: tr('24・7・10・16年。2016年10月9日の 人は、10月9日を 過ぎたので ちょうど 10年。', '24, 7, 10 and 16 years. The person from Oct 9, 2016 is past Oct 9, so it\'s exactly 10 years.'),
      hint: tr('=DATEDIF( A2 , $E$1 , "Y" )', '=DATEDIF( A2 , $E$1 , "Y" )'),
    },
    {
      kind: 'formula',
      q: tr('C2 に、10年 以上なら「表彰」、それ以外は「-」と 出そう。C5 まで コピーするぞ', 'In C2, show "Award" for 10 years or more, otherwise "-". We\'ll copy it down to C5'),
      target: 'C2',
      fill: 'C2:C5',
      answer: tr('=IF(B2>=10,"表彰","-")', '=IF(B2>=10,"Award","-")'),
      explain: tr('計算した 年数を IF で 判定。ここまでの 関数を 組み合わせれば、名簿の 管理も 自動に なる。', 'Judge the calculated years with IF. Combine the functions you\'ve learned so far, and managing the roster becomes automatic.'),
    },
  ],

  // ---------------------------------------------------------------- 時計塔の扉（謎解き）
  clk_add: [
    {
      kind: 'formula',
      q: tr('始まりの日より 百日の 後、その 日付を 示せ（C2 に 刻む）', 'One hundred days after the day of beginning: show that date (carve it in C2)'),
      target: 'C2',
      answer: '=A2+B2',
      explain: tr('扉が 開いた。', 'The door opened.'),
    },
  ],
  clk_weekday: [
    {
      kind: 'formula',
      q: tr('この日は 月曜より 数えて 幾つめか（B2 に 刻む）', 'Counting from Monday, which day is this? (carve it in B2)'),
      target: 'B2',
      answer: '=WEEKDAY(A2,2)',
      extra: ['1'],
      explain: tr('錠が はずれた。', 'The lock came off.'),
    },
  ],
  clk_months: [
    {
      kind: 'formula',
      q: tr('3つの 時の 間、満ちた 月の 数を 示せ（C2 に 刻み、C4 まで 映す）', 'Between the three spans of time, show the number of full months (carve it in C2 and reflect it down to C4)'),
      target: 'C2',
      fill: 'C2:C4',
      answer: '=DATEDIF(A2,B2,"M")',
      extra: ['"Y"'],
      explain: tr('最上階への 扉が 開いた。', 'The door to the top floor opened.'),
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
