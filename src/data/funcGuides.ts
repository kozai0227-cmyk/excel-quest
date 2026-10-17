/**
 * 教会の「関数の 相談」で 見せる 解説（SKILLS の ID ごと）。
 * use：どんな ときに 使うか ／ form：書き方 ／ ex：例（「　→」の 右は 説明） ／ tip：ポイント
 */
import { tr, tra } from '../game/lang'

export interface FuncGuide {
  use: string
  form: string
  ex: string[]
  tip: string
}

export const FUNC_GUIDES: Record<string, FuncGuide> = {
  // ---------------------------------------------------------------- セルノ
  input: {
    use: tr('セルに 数や 文字を 入れたい とき', 'When you want to put a number or text in a cell'),
    form: tr('セルを えらぶ → 打つ → Enter', 'Select a cell → type → Enter'),
    ex: tra(['A2 を えらんで「120」と 打ち、Enter　→ 120 が 入って、下の A3 へ 進む', 'Enter の かわりに Tab　→ 右の セル（B2）へ 進む'], [
      'Select A2, type 120 and press Enter　→ 120 goes in and you move down to A3',
      'Tab instead of Enter　→ you move to the cell on the right (B2)',
    ]),
    tip: tr('下へ 続けて 入れるなら Enter、右へ 並べるなら Tab。', 'Use Enter to keep going down, and Tab to line things up to the right.'),
  },
  edit: {
    use: tr('入れた 中身を 直したい とき', 'When you want to fix what you entered'),
    form: tr('そのまま 打つ ＝ 上書き ／ F2 ＝ 一部だけ 直す', 'Just type = overwrite / F2 = fix part of it'),
    ex: tra(['「りんご」の セルで「みかん」と 打つ　→ まるごと 置きかわる', 'F2（または ダブルクリック）　→ セルの 中に 入って、1文字だけ 直せる'], [
      'Type "Orange" in the "Apple" cell　→ the whole thing is replaced',
      'F2 (or a double-click)　→ you go inside the cell and can fix a single letter',
    ]),
    tip: tr('長い 数式の 一部だけ 直したい ときは F2 が べんり。', 'F2 is handy when you only want to fix part of a long formula.'),
  },
  copy: {
    use: tr('同じ 中身を ほかの セルにも 入れたい とき', 'When you want the same content in other cells too'),
    form: tr('Ctrl+C（コピー）→ Ctrl+V（貼り付け）', 'Ctrl+C (copy) → Ctrl+V (paste)'),
    ex: tra(['B2 を コピーして B3〜B5 に 貼り付け　→ 同じ 値が 入る', '数式を コピー　→ 参照も いっしょに ずれる（サンショウで くわしく）'], [
      'Copy B2 and paste it into B3 to B5　→ the same value goes in',
      'Copy a formula　→ its references shift too (more on this in Refton)',
    ]),
    tip: tr('Mac では Ctrl の かわりに ⌘（コマンド）キー。', 'On a Mac, use the ⌘ (Command) key instead of Ctrl.'),
  },
  undo: {
    use: tr('まちがえた 操作を 取り消したい とき', 'When you want to take back a mistake'),
    form: tr('Ctrl+Z（元に 戻す）／ Ctrl+Y（やり直し）', 'Ctrl+Z (undo) / Ctrl+Y (redo)'),
    ex: tra(['うっかり 消した 表も、Ctrl+Z　→ 元どおり', '戻しすぎたら Ctrl+Y　→ やり直し'], [
      'Deleted a table by accident? Ctrl+Z　→ back to normal',
      'Undid too much? Ctrl+Y　→ redo',
    ]),
    tip: tr('何回でも さかのぼれる。こわがらずに 試してみよう。', 'You can go back as many steps as you like. Don\'t be afraid to experiment.'),
  },
  autofill: {
    use: tr('連番や 同じ 数式を 一気に 埋めたい とき', 'When you want to fill in a series or the same formula all at once'),
    form: tr('セルの 右下の ■ を ドラッグ', 'Drag the ■ at the bottom-right of the cell'),
    ex: tra(['「1」「2」の 2つを えらんで ドラッグ　→ 3, 4, 5… と 連番', '「1月」から ドラッグ　→ 2月, 3月… と 自動で 続く', '数式を ドラッグ　→ 下の 行にも 同じ 計算'], [
      'Select both "1" and "2" and drag　→ 3, 4, 5... in order',
      'Drag from "Jan"　→ Feb, Mar... continue automatically',
      'Drag a formula　→ the same calculation in the rows below',
    ]),
    tip: tr('■ を ダブルクリックすると、となりの 列の 最後まで 一気に 埋まる。', 'Double-click the ■ to fill all the way down to the end of the neighboring column.'),
  },
  bold: {
    use: tr('見出しを 目立たせたい とき', 'When you want headers to stand out'),
    form: tr('Ctrl+B で 太字の ON / OFF', 'Ctrl+B turns bold ON / OFF'),
    ex: tra(['1行目の 見出しを えらんで Ctrl+B　→ 太字に なる'], ['Select the headers in row 1 and press Ctrl+B　→ they turn bold']),
    tip: tr('見出しが 目立つと、表が ぐっと 読みやすく なる。', 'Headers that stand out make a table much easier to read.'),
  },
  // ---------------------------------------------------------------- カルキュレ
  arith: {
    use: tr('足し算・引き算・掛け算・割り算を したい とき', 'When you want to add, subtract, multiply or divide'),
    form: tr('= で 始めて、+ − * / を 使う', 'Start with = and use + − * /'),
    ex: tra(['=B2+C2　→ 2つの セルを 足す', '=B2*C2　→ 単価 × 数量', '=(B2+C2)/2　→ かっこの 中が 先'], [
      '=B2+C2　→ adds two cells',
      '=B2*C2　→ price × qty',
      '=(B2+C2)/2　→ the parentheses come first',
    ]),
    tip: tr('掛け算は × ではなく *、割り算は ÷ ではなく / を 使う。', 'Multiply with *, not ×. Divide with /, not ÷.'),
  },
  SUM: {
    use: tr('たくさんの 数を まとめて 足したい とき', 'When you want to add up lots of numbers at once'),
    form: tr('=SUM(範囲)', '=SUM(range)'),
    ex: tra(['=SUM(B2:B11)　→ B2〜B11 の 合計', 'B2〜B4 が 120・80・100 なら =SUM(B2:B4)　→ 300'], [
      '=SUM(B2:B11)　→ the total of B2 to B11',
      'If B2 to B4 are 120, 80 and 100, =SUM(B2:B4)　→ 300',
    ]),
    tip: tr('範囲の 中の 数を 書きかえると、合計も 自動で 変わる。', 'Change a number in the range and the total updates automatically.'),
  },
  AVERAGE: {
    use: tr('平均を 出したい とき', 'When you want the average'),
    form: tr('=AVERAGE(範囲)', '=AVERAGE(range)'),
    ex: tra(['=AVERAGE(B2:B9)　→ B2〜B9 の 平均', '70・80・90 の 平均　→ 80'], [
      '=AVERAGE(B2:B9)　→ the average of B2 to B9',
      'The average of 70, 80 and 90　→ 80',
    ]),
    tip: tr('空白の セルは 数に 入れない。0 は 数に 入る。', 'Blank cells aren\'t counted. 0 is counted.'),
  },
  MAXMIN: {
    use: tr('いちばん 大きい・小さい 数を 知りたい とき', 'When you want to know the largest or smallest number'),
    form: tr('=MAX(範囲) ／ =MIN(範囲)', '=MAX(range) / =MIN(range)'),
    ex: tra(['=MAX(B2:B8)　→ 最高の 売上', '=MIN(B2:B8)　→ 最低の 気温'], [
      '=MAX(B2:B8)　→ the best sales',
      '=MIN(B2:B8)　→ the lowest temperature',
    ]),
    tip: tr('=MAX(範囲)-MIN(範囲) で「差（ばらつき）」も わかる。', '=MAX(range)-MIN(range) tells you the spread.'),
  },
  COUNT: {
    use: tr('入っている セルの 数を 数えたい とき', 'When you want to count how many cells are filled in'),
    form: tr('=COUNT(範囲) ／ =COUNTA(範囲)', '=COUNT(range) / =COUNTA(range)'),
    ex: tra(['=COUNT(B2:B10)　→ 数が 入った セルだけ 数える', '=COUNTA(A2:A10)　→ 空白 以外を ぜんぶ 数える（文字も）'], [
      '=COUNT(B2:B10)　→ counts only the cells with numbers',
      '=COUNTA(A2:A10)　→ counts every non-blank cell (text too)',
    ]),
    tip: tr('名前の 列を 数えるなら COUNTA、点数の 列なら COUNT。', 'For a column of names, use COUNTA. For a column of scores, use COUNT.'),
  },
  report: {
    use: tr('縦と 横の 合計が ある 集計表を 作りたい とき', 'When you want a summary table with row and column totals'),
    form: tr('合計の 数式を 1つ 作って オートフィル', 'Build one total formula and AutoFill it'),
    ex: tra(['E2 に =SUM(B2:D2)　→ 下へ コピーで 店ごとの 合計', 'B5 に =SUM(B2:B4)　→ 右へ コピーで 月ごとの 合計'], [
      'In E2, =SUM(B2:D2)　→ copy it down for each shop\'s total',
      'In B5, =SUM(B2:B4)　→ copy it right for each month\'s total',
    ]),
    tip: tr('数式は 1つ 作って コピー。手で 何個も 書かないのが コツ。', 'Build one formula and copy it. The trick is not to write lots of them by hand.'),
  },
  // ---------------------------------------------------------------- サンショウ
  relref: {
    use: tr('同じ 計算を 下の 行へ コピーしたい とき', 'When you want to copy the same calculation to the rows below'),
    form: tr('A1 のような ふつうの 参照（$ なし）', 'A normal reference like A1 (no $)'),
    ex: tra(['D2 に =C2/B2 を 書いて 下へ コピー　→ D3 は =C3/B3 に なる'], ['Write =C2/B2 in D2 and copy it down　→ D3 becomes =C3/B3']),
    tip: tr('コピーした 分だけ、参照も 同じ 向きに ずれる。これが ふつうの 動き。', 'References shift the same way, by however far you copy. That\'s the normal behavior.'),
  },
  absref: {
    use: tr('コピーしても 同じ セルを 見つづけたい とき', 'When you want to keep looking at the same cell even after copying'),
    form: tr('$E$2 のように $ を 付ける', 'Add $, like $E$2'),
    ex: tra(['=B2*$E$2　→ 下へ コピーしても E2（税率）は 動かない'], ['=B2*$E$2　→ E2 (the tax rate) doesn\'t move when you copy it down']),
    tip: tr('税率・単価・合計など「1か所だけの 値」は $ で 固定。', 'Lock "one-spot values" like a tax rate, unit price or total with $.'),
  },
  f4: {
    use: tr('$ を すばやく 付けたい とき', 'When you want to add $ quickly'),
    form: tr('数式の 中の 参照で F4 キー', 'Press F4 on a reference inside a formula'),
    ex: tra(['A1　→ $A$1 → A$1 → $A1 → A1 と 押すたびに 変わる'], ['A1　→ changes $A$1 → A$1 → $A1 → A1 with each press']),
    tip: tr('このゲームでは「F4 ($)」ボタンで 同じことが できる。', 'In this game, the "F4 ($)" button does the same thing.'),
  },
  share: {
    use: tr('全体の うち 何割かを 出したい とき', 'When you want to know what fraction of the whole something is'),
    form: tr('=値/$合計$（合計を 固定して 割る）', '=value/$total$ (lock the total and divide)'),
    ex: tra(['=B2/$B$6　→ 下へ コピーしても 合計 B6 で 割りつづける', '書式を「%」に する　→ 0.25 が 25% と 見える'], [
      '=B2/$B$6　→ keeps dividing by the total in B6 even when copied down',
      'Set the format to "%"　→ 0.25 shows as 25%',
    ]),
    tip: tr('構成比を ぜんぶ 足すと 100%（＝1）に なる。', 'All the shares add up to 100% (= 1).'),
  },
  mixref: {
    use: tr('縦にも 横にも コピーする 表を 1つの 式で 作りたい とき', 'When you want one formula for a table you copy both across and down'),
    form: tr('$A2（列だけ 固定）／ B$1（行だけ 固定）', '$A2 (lock the column only) / B$1 (lock the row only)'),
    ex: tra(['九九の 表：B2 に =$A2*B$1　→ 右にも 下にも コピーで 完成'], ['Times table: =$A2*B$1 in B2　→ copy it right and down, and it\'s done']),
    tip: tr('$ の 付いた ほうが 固定。列を 固定するなら 英字の 前に $。', 'The part with $ is locked. To lock the column, put $ before the letter.'),
  },
  round: {
    use: tr('端数を 四捨五入したい とき', 'When you want to round off fractions'),
    form: tr('=ROUND(数値, けた数)', '=ROUND(number, digits)'),
    ex: tra(['=ROUND(123.456, 0)　→ 123', '=ROUND(123.456, 1)　→ 123.5', '=ROUND(B2*1.1, 0)　→ 税込額を 整数に'], [
      '=ROUND(123.456, 0)　→ 123',
      '=ROUND(123.456, 1)　→ 123.5',
      '=ROUND(B2*1.1, 0)　→ the price with tax as a whole number',
    ]),
    tip: tr('切り捨ては ROUNDDOWN、切り上げは ROUNDUP。', 'Use ROUNDDOWN to round down and ROUNDUP to round up.'),
  },
  // ---------------------------------------------------------------- イフポート
  compare: {
    use: tr('2つの 値を 比べたい とき', 'When you want to compare two values'),
    form: tr('>= 以上 ／ <= 以下 ／ > より大きい ／ < 未満 ／ = 等しい ／ <> 等しくない', '>= at least / <= at most / > greater than / < less than / = equal / <> not equal'),
    ex: tra(['=B2>=50　→ 50 以上なら TRUE、それ以外は FALSE', '=A2="魚"　→ 文字は " で 囲んで 比べる'], [
      '=B2>=50　→ TRUE if 50 or more, otherwise FALSE',
      '=A2="Fish"　→ wrap text in " to compare it',
    ]),
    tip: tr('「以上」は >=。= は 後ろに 書く。', '"At least" is >=. The = goes second.'),
  },
  if: {
    use: tr('条件で 答えを 分けたい とき', 'When you want different answers depending on a condition'),
    form: tr('=IF(条件, 正しいとき, 違うとき)', '=IF(condition, if true, if false)'),
    ex: tra(['=IF(B2>=50, "大漁", "ふつう")', '=IF(C2="済", "○", "")　→ 済なら ○、それ以外は 空白'], [
      '=IF(B2>=50, "Great", "OK")',
      '=IF(C2="Done", "○", "")　→ ○ if Done, otherwise blank',
    ]),
    tip: tr('答えが 文字なら " で 囲む。何も 出さないなら "" に する。', 'Wrap text answers in ". To show nothing, use "".'),
  },
  ifcalc: {
    use: tr('条件で 計算を 変えたい とき', 'When you want the calculation to change with a condition'),
    form: tr('=IF(条件, 計算1, 計算2)', '=IF(condition, calculation1, calculation2)'),
    ex: tra(['=IF(B2>=3000, 0, 500)　→ 3000 以上は 送料 0、それ以外は 500', '=IF(B2>=10, B2*0.9, B2)　→ 10個 以上は 1割引き'], [
      '=IF(B2>=3000, 0, 500)　→ free shipping from 3000, otherwise 500',
      '=IF(B2>=10, B2*0.9, B2)　→ 10% off for 10 or more',
    ]),
    tip: tr('IF の 答えに、数や 計算式を そのまま 書ける。', 'You can write numbers and calculations right into IF\'s answers.'),
  },
  nestif: {
    use: tr('3つ 以上に 分けたい とき', 'When you want to split into three or more'),
    form: tr('=IF(条件1, 答え1, IF(条件2, 答え2, 答え3))', '=IF(condition1, answer1, IF(condition2, answer2, answer3))'),
    ex: tra(['=IF(B2>=80, "A", IF(B2>=60, "B", "C"))　→ 80 以上 A、60 以上 B、それ以外 C'], [
      '=IF(B2>=80, "A", IF(B2>=60, "B", "C"))　→ A for 80+, B for 60+, otherwise C',
    ]),
    tip: tr('きびしい 条件から 順に 書く。かっこの 数を そろえる。', 'Write the strictest condition first. Match up your parentheses.'),
  },
  andor: {
    use: tr('条件を 2つ 以上 組み合わせたい とき', 'When you want to combine two or more conditions'),
    form: tr('AND(条件1, 条件2) ／ OR(条件1, 条件2)', 'AND(condition1, condition2) / OR(condition1, condition2)'),
    ex: tra(['=IF(AND(B2>=60, C2>=60), "合格", "不合格")　→ 両方 60 以上', '=IF(OR(B2="雨", C2>=10), "中止", "出港")　→ どちらか 1つでも'], [
      '=IF(AND(B2>=60, C2>=60), "Pass", "Fail")　→ both 60 or more',
      '=IF(OR(B2="Rain", C2>=10), "Cancel", "Sail")　→ even one is enough',
    ]),
    tip: tr('AND は「かつ」、OR は「または」。', 'AND means "and," OR means "or."'),
  },
  countif: {
    use: tr('条件に 合う 数や 合計を 出したい とき', 'When you want the count or total of things that match a condition'),
    form: tr('=COUNTIF(範囲, 条件) ／ =SUMIF(範囲, 条件, 合計範囲)', '=COUNTIF(range, condition) / =SUMIF(range, condition, sum range)'),
    ex: tra(['=COUNTIF(B2:B10, "魚")　→「魚」の 行の 数', '=SUMIF(B2:B10, "魚", C2:C10)　→「魚」の 箱数の 合計', '=COUNTIF(C2:C10, ">=50")　→ 50 以上の 数'], [
      '=COUNTIF(B2:B10, "Fish")　→ the number of "Fish" rows',
      '=SUMIF(B2:B10, "Fish", C2:C10)　→ the total crates of "Fish"',
      '=COUNTIF(C2:C10, ">=50")　→ how many are 50 or more',
    ]),
    tip: tr('比べる 条件は ">=50" のように " で 囲む。', 'Wrap comparison conditions in ", like ">=50".'),
  },
  // ---------------------------------------------------------------- ルックアップ
  vlookup: {
    use: tr('番号や 名前から、別の 表の 情報を 引きたい とき', 'When you want to pull information from another table by number or name'),
    form: tr('=VLOOKUP(探す値, 範囲, 列番号, FALSE)', '=VLOOKUP(value, range, column number, FALSE)'),
    ex: tra(['=VLOOKUP(A2, $F$2:$H$6, 2, FALSE)　→ F列で A2 を 探し、同じ 行の 2列目（G列）を 返す'], [
      '=VLOOKUP(A2, $F$2:$H$6, 2, FALSE)　→ finds A2 in column F and returns the 2nd column (G) of that row',
    ]),
    tip: tr('探す 値は、範囲の いちばん 左の 列に ないと 見つからない。', 'The value must be in the leftmost column of the range, or it won\'t be found.'),
  },
  colindex: {
    use: tr('同じ 表から 別の 情報を 取りたい とき', 'When you want different information from the same table'),
    form: tr('列番号を 変える。範囲は $ で 固定', 'Change the column number. Lock the range with $'),
    ex: tra(['=VLOOKUP(A2, $F$2:$H$6, 2, FALSE)　→ 名前', '=VLOOKUP(A2, $F$2:$H$6, 3, FALSE)　→ 値段'], [
      '=VLOOKUP(A2, $F$2:$H$6, 2, FALSE)　→ the name',
      '=VLOOKUP(A2, $F$2:$H$6, 3, FALSE)　→ the price',
    ]),
    tip: tr('列番号は 範囲の 左から 数える（シートの A・B… とは ちがう）。', 'Count the column number from the left of the range (not the sheet\'s A, B...).'),
  },
  approx: {
    use: tr('点数から ランク、金額から 料金区分 のように「区切り」で 探したい とき', 'When you want to look things up by "cutoffs," like a rank from a score or a fee bracket from an amount'),
    form: tr('=VLOOKUP(探す値, 範囲, 列番号, TRUE)', '=VLOOKUP(value, range, column number, TRUE)'),
    ex: tra(['区切りの 表（0→C、60→B、80→A）で 75 を 探す　→ B'], ['Look up 75 in a cutoff table (0→C, 60→B, 80→A)　→ B']),
    tip: tr('区切りの 表は 小さい 順に 並べておく。', 'Keep the cutoff table sorted smallest first.'),
  },
  iferror: {
    use: tr('エラーの ときに 代わりの 答えを 出したい とき', 'When you want to show a different answer when there\'s an error'),
    form: tr('=IFERROR(計算, エラーの ときの 値)', '=IFERROR(calculation, value if error)'),
    ex: tra(['=IFERROR(VLOOKUP(A2, $F$2:$H$6, 2, FALSE), "未登録")　→ 見つからなければ「未登録」'], [
      '=IFERROR(VLOOKUP(A2, $F$2:$H$6, 2, FALSE), "Unlisted")　→ "Unlisted" if not found',
    ]),
    tip: tr('#N/A を そのまま 見せず、わかりやすい 言葉に 置きかえよう。', 'Don\'t show #N/A as is; replace it with a clear word.'),
  },
  xlookup: {
    use: tr('VLOOKUP より 自由に 探したい とき', 'When you want to search more freely than VLOOKUP'),
    form: tr('=XLOOKUP(探す値, 探す列, 取り出す列)', '=XLOOKUP(value, column to search, column to return)'),
    ex: tra(['=XLOOKUP(A2, $G$2:$G$6, $F$2:$F$6)　→ G列で 探して、左の F列を 取り出す'], [
      '=XLOOKUP(A2, $G$2:$G$6, $F$2:$F$6)　→ searches column G and returns column F to its left',
    ]),
    tip: tr('列番号が いらない。探す 列より 左の 列も 取り出せる。', 'No column number needed. It can even return columns to the left of the one it searches.'),
  },
  notfound: {
    use: tr('XLOOKUP で 見つからない ときの 答えを 決めたい とき', 'When you want to decide XLOOKUP\'s answer for when nothing is found'),
    form: tr('=XLOOKUP(探す値, 探す列, 取り出す列, 見つからない ときの 値)', '=XLOOKUP(value, column to search, column to return, value if not found)'),
    ex: tra(['=XLOOKUP(A2, $F$2:$F$6, $G$2:$G$6, "なし")　→ 台帳に なければ「なし」', '=COUNTIF(D2:D8, "なし")　→ 取り寄せが 必要な 品の 数'], [
      '=XLOOKUP(A2, $F$2:$F$6, $G$2:$G$6, "None")　→ "None" if it\'s not in the ledger',
      '=COUNTIF(D2:D8, "None")　→ the number of items that need ordering',
    ]),
    tip: tr('IFERROR で 包まなくても、4つ目に 書くだけで #N/A を 防げる。', 'No need to wrap it in IFERROR; just writing a 4th part prevents #N/A.'),
  },
  // ---------------------------------------------------------------- ピボリア
  countifs: {
    use: tr('2つ 以上の 条件に 合う 数を 数えたい とき', 'When you want to count things that match two or more conditions'),
    form: tr('=COUNTIFS(範囲1, 条件1, 範囲2, 条件2)', '=COUNTIFS(range1, condition1, range2, condition2)'),
    ex: tra(['=COUNTIFS(B2:B20, "北", C2:C20, "未返信")　→ 北の 貴族で、しかも 未返信'], [
      '=COUNTIFS(B2:B20, "North", C2:C20, "No reply")　→ nobles from the North who also haven\'t replied',
    ]),
    tip: tr('範囲と 条件を ペアで 並べる。ペアは いくつでも 足せる。', 'Line up ranges and conditions in pairs. You can add as many pairs as you like.'),
  },
  sumifs: {
    use: tr('2つ 以上の 条件に 合う 合計を 出したい とき', 'When you want a total of things that match two or more conditions'),
    form: tr('=SUMIFS(合計範囲, 範囲1, 条件1, 範囲2, 条件2)', '=SUMIFS(sum range, range1, condition1, range2, condition2)'),
    ex: tra(['=SUMIFS(D2:D20, B2:B20, "野菜", C2:C20, "東")　→ 東の 野菜の 売上'], [
      '=SUMIFS(D2:D20, B2:B20, "Veg", C2:C20, "East")　→ vegetable sales in the East',
    ]),
    tip: tr('SUMIFS は 合計範囲が いちばん 最初。SUMIF とは 順番が ちがう。', 'In SUMIFS the sum range comes first. The order is different from SUMIF.'),
  },
  ifscompare: {
    use: tr('「以上」「以下」で しぼって 集計したい とき', 'When you want to narrow totals down with "or more" / "or less"'),
    form: tr('条件に ">=1000" のような 比べる 記号', 'Comparison symbols in conditions, like ">=1000"'),
    ex: tra(['=COUNTIFS(C2:C20, ">=1000")　→ 1000 以上の 件数', '=SUMIFS(C2:C20, C2:C20, ">=1000")　→ 1000 以上だけの 合計'], [
      '=COUNTIFS(C2:C20, ">=1000")　→ how many are 1000 or more',
      '=SUMIFS(C2:C20, C2:C20, ">=1000")　→ the total of only those 1000 or more',
    ]),
    tip: tr('合計する 範囲と 条件の 範囲が 同じ 列でも かまわない。', 'It\'s fine for the range to total and a condition range to be the same column.'),
  },
  averageif: {
    use: tr('条件に 合う ものの 平均・最大・最小を 出したい とき', 'When you want the average, max or min of things that match a condition'),
    form: tr('=AVERAGEIF(条件の範囲, 条件, 平均する範囲) ／ =MAXIFS(探す範囲, 条件の範囲, 条件)', '=AVERAGEIF(range to check, condition, range to average) / =MAXIFS(range to search, range to check, condition)'),
    ex: tra(['=AVERAGEIF(B2:B20, "小麦", C2:C20)　→ 小麦の 平均', '=MAXIFS(C2:C20, B2:B20, "小麦")　→ 小麦の 最高'], [
      '=AVERAGEIF(B2:B20, "Wheat", C2:C20)　→ the average for Wheat',
      '=MAXIFS(C2:C20, B2:B20, "Wheat")　→ the maximum for Wheat',
    ]),
    tip: tr('最小は MINIFS。MAXIFS・MINIFS は 探す範囲が 最初。', 'For the minimum, MINIFS. In MAXIFS and MINIFS the range to search comes first.'),
  },
  summary: {
    use: tr('見出しごとの 集計表を 作りたい とき', 'When you want a table of totals for each heading'),
    form: tr('条件に 見出しの セル、範囲は $ で 固定して コピー', 'Use the heading cell as the condition, lock ranges with $, and copy'),
    ex: tra(['F2 に =SUMIFS($B$2:$B$11, $A$2:$A$11, E2)　→ 下へ コピーで 見出しごとの 合計'], [
      '=SUMIFS($B$2:$B$11, $A$2:$A$11, E2) in F2　→ copy it down for each heading\'s total',
    ]),
    tip: tr('条件を "北" と 書かず、見出しの セル（E2）を 指すのが コツ。', 'The trick is to point to the heading cell (E2) instead of writing "North".'),
  },
  crosstab: {
    use: tr('「縦 × 横」の 集計表を 1つの 式で 埋めたい とき', 'When you want to fill a "down × across" table with one formula'),
    form: tr('縦の 見出しは $E2、横の 見出しは F$1', 'Side headings as $E2, top headings as F$1'),
    ex: tra(['F2 に =SUMIFS($C$2:$C$20, $A$2:$A$20, $E2, $B$2:$B$20, F$1)　→ 右にも 下にも コピー'], [
      '=SUMIFS($C$2:$C$20, $A$2:$A$20, $E2, $B$2:$B$20, F$1) in F2　→ copy it right and down',
    ]),
    tip: tr('ピボットテーブルが 中で やっていることと 同じ。', 'It\'s the same thing a PivotTable does inside.'),
  },
  // ---------------------------------------------------------------- テキストリア
  concat: {
    use: tr('文字と 文字を つなげたい とき', 'When you want to join text to text'),
    form: tr('=A2&B2', '=A2&B2'),
    ex: tra(['=A2&" "&B2　→「山田 太郎」', '=A2&"様"　→「山田様」'], [
      '=A2&" "&B2　→ "John Smith"',
      '=A2&" Inc."　→ "Moji Inc."',
    ]),
    tip: tr('空白や 記号を はさむ ときは " " で 囲む。', 'Wrap spaces or symbols you put between them in " ".'),
  },
  leftright: {
    use: tr('左や 右から 何文字か 取り出したい とき', 'When you want to take some characters from the left or right'),
    form: tr('=LEFT(文字列, 文字数) ／ =RIGHT(文字列, 文字数)', '=LEFT(text, count) / =RIGHT(text, count)'),
    ex: tra(['=LEFT("TX-1024", 2)　→ TX', '=RIGHT("TX-1024", 4)　→ 1024'], [
      '=LEFT("TX-1024", 2)　→ TX',
      '=RIGHT("TX-1024", 4)　→ 1024',
    ]),
    tip: tr('文字数を 省くと 1文字だけ 取り出す。', 'Leave out the count, and it takes just 1 character.'),
  },
  mid: {
    use: tr('まん中の 文字を 取り出したい とき', 'When you want to take characters from the middle'),
    form: tr('=MID(文字列, 何文字目から, 何文字)', '=MID(text, start position, count)'),
    ex: tra(['=MID("2026-10-09", 6, 2)　→ 10'], ['=MID("2026-10-09", 6, 2)　→ 10']),
    tip: tr('1文字目を 1 と 数える。', 'Count the first character as 1.'),
  },
  len: {
    use: tr('文字数を 数えたい とき', 'When you want to count characters'),
    form: tr('=LEN(文字列)', '=LEN(text)'),
    ex: tra(['=LEN("テキスト")　→ 4', '=IF(LEN(A2)>10, "長い", "OK")　→ 長さの 判定'], [
      '=LEN("Text")　→ 4',
      '=IF(LEN(A2)>10, "Long", "OK")　→ checking the length',
    ]),
    tip: tr('空白も 1文字に 数える。', 'Spaces count as 1 character too.'),
  },
  clean: {
    use: tr('よけいな 空白を 消したい・文字を 置きかえたい とき', 'When you want to remove extra spaces or replace text'),
    form: tr('=TRIM(文字列) ／ =SUBSTITUTE(文字列, 探す, 置きかえ)', '=TRIM(text) / =SUBSTITUTE(text, find, replace)'),
    ex: tra(['=TRIM("  山田  太郎 ")　→「山田 太郎」', '=SUBSTITUTE(A2, "-", "")　→ ハイフンを 消す'], [
      '=TRIM("  John   Smith ")　→ "John Smith"',
      '=SUBSTITUTE(A2, "-", "")　→ removes the hyphens',
    ]),
    tip: tr('TRIM は 前後の 空白を 消し、間の 空白は 1つに そろえる。', 'TRIM removes spaces at both ends and squeezes the spaces in between down to one.'),
  },
  find: {
    use: tr('ある 文字が 何文字目に あるか 知りたい とき', 'When you want to know which character something is'),
    form: tr('=FIND(探す文字, 文字列)', '=FIND(text to find, text)'),
    ex: tra(['=FIND("@", "taro@moji.jp")　→ 5', '=LEFT(A2, FIND("@", A2)-1)　→ @ の 前（taro）'], [
      '=FIND("@", "taro@moji.jp")　→ 5',
      '=LEFT(A2, FIND("@", A2)-1)　→ the part before the @ (taro)',
    ]),
    tip: tr('FIND で 位置を 出して、LEFT・MID と 組み合わせる。', 'Get the position with FIND, then combine it with LEFT or MID.'),
  },
  // ---------------------------------------------------------------- コヨミノ
  dateadd: {
    use: tr('○日後の 日付を 出したい とき', 'When you want the date so many days later'),
    form: tr('=日付+日数', '=date+days'),
    ex: tra(['=A2+7　→ 1週間後', '=A2+30　→ 30日後（月を またいでも 暦どおり）'], [
      '=A2+7　→ one week later',
      '=A2+30　→ 30 days later (follows the calendar across months)',
    ]),
    tip: tr('日付は「1日 ＝ 1」の 数として 計算できる。', 'Dates can be calculated as numbers where 1 day = 1.'),
  },
  datediff: {
    use: tr('2つの 日付の 間が 何日か 知りたい とき', 'When you want to know how many days are between two dates'),
    form: tr('=後の 日付-前の 日付', '=later date-earlier date'),
    ex: tra(['=B2-$E$1　→ 締め切りまで あと 何日', '=B2-A2　→ 期間の 日数'], [
      '=B2-$E$1　→ days left until the deadline',
      '=B2-A2　→ the number of days in a period',
    ]),
    tip: tr('「今日」の セルは $ で 固定して コピー。', 'Lock the "today" cell with $ when you copy.'),
  },
  dateparts: {
    use: tr('日付から 年・月・日を 取り出したい とき', 'When you want the year, month or day from a date'),
    form: tr('=YEAR(日付) ／ =MONTH(日付) ／ =DAY(日付)', '=YEAR(date) / =MONTH(date) / =DAY(date)'),
    ex: tra(['=MONTH(A2)　→ 2026/10/9 なら 10', '=YEAR(A2)　→ 2026'], [
      '=MONTH(A2)　→ 10 for 2026/10/9',
      '=YEAR(A2)　→ 2026',
    ]),
    tip: tr('取り出した 月で COUNTIF すれば、月ごとの 件数も 数えられる。', 'COUNTIF on the months you pulled out, and you can count by month too.'),
  },
  weekday: {
    use: tr('曜日を 知りたい とき', 'When you want to know the day of the week'),
    form: tr('=WEEKDAY(日付, 2)', '=WEEKDAY(date, 2)'),
    ex: tra(['=WEEKDAY(A2, 2)　→ 月曜 1 〜 日曜 7', '=IF(WEEKDAY(A2, 2)>=6, "休み", "")　→ 土日は 休み'], [
      '=WEEKDAY(A2, 2)　→ Monday 1 through Sunday 7',
      '=IF(WEEKDAY(A2, 2)>=6, "Closed", "")　→ closed on weekends',
    ]),
    tip: tr('2つ目に 2 を 入れると、月曜が 1 に なって わかりやすい。', 'Put 2 as the second part so Monday is 1, which is easy to read.'),
  },
  edate: {
    use: tr('○か月後や 月末の 日付を 出したい とき', 'When you want the date so many months later, or a month end'),
    form: tr('=EDATE(日付, 月数) ／ =EOMONTH(日付, 0)', '=EDATE(date, months) / =EOMONTH(date, 0)'),
    ex: tra(['=EDATE(A2, 3)　→ 3か月後の 同じ 日', '=EOMONTH(A2, 0)　→ その月の 末日'], [
      '=EDATE(A2, 3)　→ the same day 3 months later',
      '=EOMONTH(A2, 0)　→ the last day of that month',
    ]),
    tip: tr('=EOMONTH(A2, 1) なら 翌月の 末日。', '=EOMONTH(A2, 1) gives the last day of the next month.'),
  },
  datedif: {
    use: tr('満○年・満○か月を 出したい とき', 'When you want full years or full months'),
    form: tr('=DATEDIF(開始日, 終了日, "Y")', '=DATEDIF(start date, end date, "Y")'),
    ex: tra(['=DATEDIF(A2, $E$1, "Y")　→ 満年数（年齢・勤続年数）', '"M" に すると 満月数、"D" に すると 日数'], [
      '=DATEDIF(A2, $E$1, "Y")　→ full years (age, years of service)',
      'Use "M" for full months and "D" for days',
    ]),
    tip: tr('引き算と ちがい、誕生日を 迎えたか まで 見てくれる。', 'Unlike subtraction, it even checks whether the anniversary has passed.'),
  },
  // ---------------------------------------------------------------- ホープ
  diverr: {
    use: tr('#DIV/0! が 出た とき', 'When #DIV/0! appears'),
    form: tr('=IFERROR(A2/B2, "-")', '=IFERROR(A2/B2, "-")'),
    ex: tra(['B2 が 0 や 空白　→ =A2/B2 は #DIV/0!', '=IFERROR(A2/B2, "-")　→ エラーの ときは「-」'], [
      'B2 is 0 or blank　→ =A2/B2 gives #DIV/0!',
      '=IFERROR(A2/B2, "-")　→ "-" when there\'s an error',
    ]),
    tip: tr('0 で 割ると エラー。割る 数が 0 に ならないか 確かめる。', 'Dividing by 0 is an error. Check that the divisor can\'t be 0.'),
  },
  valueerr: {
    use: tr('#VALUE! が 出た とき', 'When #VALUE! appears'),
    form: tr('文字を + で 計算しない（SUM を 使う）', 'Don\'t calculate text with + (use SUM)'),
    ex: tra(['=B2+B3+B4（B3 が「なし」）　→ #VALUE!', '=SUM(B2:B4)　→ 文字を 飛ばして 数だけ 足す'], [
      '=B2+B3+B4 (B3 is "None")　→ #VALUE!',
      '=SUM(B2:B4)　→ skips the text and adds only the numbers',
    ]),
    tip: tr('数の 列に 文字が まざっていないか 確かめる。', 'Check that no text got mixed into a column of numbers.'),
  },
  nameerr: {
    use: tr('#NAME? が 出た とき', 'When #NAME? appears'),
    form: tr('関数名の つづりと " を 確かめる', 'Check the function spelling and the "'),
    ex: tra(['=SUN(B2:B5)　→ #NAME?（SUM の 打ちまちがい）', '=IF(A2=済, "○", "")　→ #NAME?（"済" と 囲む）'], [
      '=SUN(B2:B5)　→ #NAME? (a typo for SUM)',
      '=IF(A2=Done, "○", "")　→ #NAME? (wrap it as "Done")',
    ]),
    tip: tr('入力の とちゅうで 出る 候補から 関数を 選ぶと、つづりを まちがえない。', 'Pick functions from the suggestions that appear as you type, and you won\'t misspell them.'),
  },
  referr: {
    use: tr('#REF! が 出た とき', 'When #REF! appears'),
    form: tr('参照を 新しい セルに 付けかえる', 'Reconnect the reference to a new cell'),
    ex: tra(['参照していた 列を 削除　→ =B2*#REF! に なる', '数式を 開いて、正しい セルを 指し直す　→ 元に 戻る'], [
      'You delete a column it referred to　→ it becomes =B2*#REF!',
      'Open the formula and point to the right cell again　→ back to normal',
    ]),
    tip: tr('列や 行を 消す 前に、ほかの 式から 使われていないか 確かめる。', 'Before deleting columns or rows, check that no other formula uses them.'),
  },
  combine: {
    use: tr('集計と 判定を 1つに まとめたい とき', 'When you want to combine totals and checks into one'),
    form: tr('=IF(SUMIFS(…)>=目標, "達成", "未達")', '=IF(SUMIFS(…)>=target, "Met", "Not met")'),
    ex: tra(['=IF(SUMIFS($C$2:$C$20, $A$2:$A$20, E2)>=100, "達成", "未達")'], ['=IF(SUMIFS($C$2:$C$20, $A$2:$A$20, E2)>=100, "Met", "Not met")']),
    tip: tr('中の 関数から 順に 作って、外側で 包むと まちがえにくい。', 'Build from the inner function outward, then wrap it, and you\'ll make fewer mistakes.'),
  },
  message: {
    use: tr('計算結果を 文に したい とき', 'When you want to turn a calculated result into a sentence'),
    form: tr('="文字"&セル&"文字"', '="text"&cell&"text"'),
    ex: tra(['="総勢 "&B6&" 名、出陣！"　→「総勢 120 名、出陣！」', '=A2&"さんは "&B2&" 点"　→「サトウさんは 85 点」'], [
      '="All "&B6&" troops, march!"　→ "All 120 troops, march!"',
      '=A2&" scored "&B2　→ "Sato scored 85"',
    ]),
    tip: tr('数が 変われば、文も 自動で 変わる。', 'If the number changes, the sentence changes by itself.'),
  },
}
