import { tr } from '../game/lang'

export interface SkillDef {
  name: string
  /** 町の 名前（日本語の まま。教会の 相談で MAPS の 名前と 照らし合わせる） */
  town: string
  desc: string
}

export const SKILLS: Record<string, SkillDef> = {
  input: {
    name: tr('セル入力', 'Cell Input'),
    town: 'セルノ',
    desc: tr('セルを選んで入力 → Enterで確定（下へ移動）。Tabなら右へ。', 'Select a cell and type → Enter confirms (moves down). Tab moves right.'),
  },
  edit: {
    name: tr('セルの修正', 'Editing Cells'),
    town: 'セルノ',
    desc: tr('そのまま打つと上書き。F2 かダブルクリックで一部だけ修正。', 'Typing overwrites. Use F2 or a double-click to fix just part of it.'),
  },
  copy: {
    name: tr('コピー＆貼り付け', 'Copy & Paste'),
    town: 'セルノ',
    desc: tr('Ctrl+C でコピー、Ctrl+V で貼り付け。（Macは ⌘）', 'Ctrl+C copies, Ctrl+V pastes. (⌘ on a Mac)'),
  },
  undo: {
    name: tr('元に戻す', 'Undo'),
    town: 'セルノ',
    desc: tr('Ctrl+Z で直前の操作を取り消し。Ctrl+Y でやり直し。', 'Ctrl+Z undoes the last action. Ctrl+Y redoes it.'),
  },
  autofill: {
    name: tr('オートフィル', 'AutoFill'),
    town: 'セルノ',
    desc: tr('右下の■をドラッグ。数字は2つ選ぶと連番、「1月」などは自動で続く。', 'Drag the ■ at the bottom-right. Select two numbers for a series; things like "Jan" continue automatically.'),
  },
  bold: {
    name: tr('太字', 'Bold'),
    town: 'セルノ',
    desc: tr('Ctrl+B で太字のON/OFF。見出しを目立たせよう。', 'Ctrl+B turns bold on and off. Make your headers stand out.'),
  },
  arith: {
    name: tr('四則演算', 'Arithmetic'),
    town: 'カルキュレ',
    desc: tr('= で始める。足す + 引く - 掛ける * 割る /', 'Start with =. Add +, subtract -, multiply *, divide /'),
  },
  SUM: {
    name: 'SUM',
    town: 'カルキュレ',
    desc: tr('=SUM(B2:B11) 範囲の合計。', '=SUM(B2:B11) totals a range.'),
  },
  AVERAGE: {
    name: 'AVERAGE',
    town: 'カルキュレ',
    desc: tr('=AVERAGE(B2:B9) 範囲の平均。', '=AVERAGE(B2:B9) averages a range.'),
  },
  MAXMIN: {
    name: 'MAX / MIN',
    town: 'カルキュレ',
    desc: tr('=MAX(範囲) 最大値、=MIN(範囲) 最小値。', '=MAX(range) gives the largest value, =MIN(range) the smallest.'),
  },
  COUNT: {
    name: 'COUNT',
    town: 'カルキュレ',
    desc: tr('=COUNT(範囲) 数値のセルを数える。空白以外すべてなら COUNTA。', '=COUNT(range) counts cells with numbers. To count every non-blank cell, use COUNTA.'),
  },
  report: {
    name: tr('集計表づくり', 'Building Reports'),
    town: 'カルキュレ',
    desc: tr('合計の数式を1つ作ってオートフィル。縦と横の合計で表が完成。', 'Build one total formula and AutoFill it. Row and column totals complete the table.'),
  },
  relref: {
    name: tr('相対参照', 'Relative Reference'),
    town: 'サンショウ',
    desc: tr('数式をコピーすると 参照も いっしょに ずれる（=C2/B2 → =C3/B3）。', 'Copy a formula and its references shift along with it (=C2/B2 → =C3/B3).'),
  },
  absref: {
    name: tr('絶対参照（$）', 'Absolute Reference ($)'),
    town: 'サンショウ',
    desc: tr('$E$2 のように $ を付けると、コピーしても その参照は ずれない。', 'Add $ like $E$2, and that reference won\'t shift when copied.'),
  },
  f4: {
    name: tr('F4キー', 'F4 Key'),
    town: 'サンショウ',
    desc: tr('数式の入力中に F4 を押すと、$A$1 → A$1 → $A1 → A1 と 切り替わる。', 'Press F4 while typing a formula to cycle $A$1 → A$1 → $A1 → A1.'),
  },
  share: {
    name: tr('構成比', 'Share of Total'),
    town: 'サンショウ',
    desc: tr('=B2/$B$6 のように、合計を 絶対参照で 固定して 割る。', 'Lock the total with an absolute reference and divide by it, like =B2/$B$6.'),
  },
  mixref: {
    name: tr('複合参照', 'Mixed Reference'),
    town: 'サンショウ',
    desc: tr('$A2（列だけ固定）と B$1（行だけ固定）。九九の表を 1つの数式で 作れる。', '$A2 (column locked) and B$1 (row locked). Build a whole times table with one formula.'),
  },
  round: {
    name: 'ROUND',
    town: 'サンショウ',
    desc: tr('=ROUND(数値, 0) で 四捨五入。端数処理に 使う。', '=ROUND(number, 0) rounds to the nearest whole number. Use it to tidy up fractions.'),
  },
  compare: { name: '比較演算子', town: 'イフポート', desc: '>=（以上）<=（以下）>（より大きい）<（未満）=（等しい）<>（等しくない）。結果は TRUE か FALSE。' },
  if: { name: 'IF', town: 'イフポート', desc: '=IF(条件, 正しいとき, 違うとき)。文字は "大漁" のように " で囲む。' },
  ifcalc: { name: 'IF×計算', town: 'イフポート', desc: 'IF の答えに 数値や 計算式も 使える。=IF(B2>=3000, 0, 500)' },
  nestif: { name: '入れ子のIF', town: 'イフポート', desc: 'IF の中に IF を入れて 3段階以上に 分ける。=IF(B2>=80,"A",IF(B2>=60,"B","C"))' },
  andor: { name: 'AND / OR', town: 'イフポート', desc: 'AND(条件1, 条件2) は 両方、OR は どちらか 一方を 満たすと TRUE。IF と 組み合わせる。' },
  countif: { name: 'COUNTIF・SUMIF', town: 'イフポート', desc: '=COUNTIF(範囲, "魚") で 条件に合う 数、=SUMIF(範囲, "魚", 合計範囲) で 条件に合う 合計。' },
  vlookup: { name: 'VLOOKUP', town: 'ルックアップ', desc: '=VLOOKUP(探す値, 範囲, 列番号, FALSE)。範囲の 左端で 探して、同じ行の 右の 列を 取り出す。FALSE は 完全一致。' },
  colindex: { name: '列番号と 範囲の固定', town: 'ルックアップ', desc: '列番号を 変えれば 同じ表から 別の 情報が 取れる。コピーするなら 範囲は $F$2:$H$6 のように 固定。' },
  approx: { name: '近似一致（TRUE）', town: 'ルックアップ', desc: '4つ目を TRUE に すると「探す値 以下で いちばん 近い 行」を 探す。区切りの 表は 小さい順に 並べる。' },
  iferror: { name: 'IFERROR', town: 'ルックアップ', desc: '=IFERROR(計算, エラーの ときの 値)。見つからない #N/A を「未登録」などに 置きかえる。' },
  xlookup: { name: 'XLOOKUP', town: 'ルックアップ', desc: '=XLOOKUP(探す値, 探す列, 取り出す列)。探す列より 左の 列も 取り出せる。' },
  countifs: { name: 'COUNTIFS', town: 'ピボリア', desc: '=COUNTIFS(範囲1, 条件1, 範囲2, 条件2)。範囲と 条件の ペアを 並べて、すべてを 満たす 行を 数える。' },
  sumifs: { name: 'SUMIFS', town: 'ピボリア', desc: '=SUMIFS(合計する範囲, 範囲1, 条件1, 範囲2, 条件2)。合計する範囲が 最初（SUMIF とは 順番が ちがう）。' },
  ifscompare: { name: '比べる 条件', town: 'ピボリア', desc: '条件に ">=1000" のように 比べる 記号を 使える。合計する範囲と 条件の範囲が 同じ 列でも よい。' },
  averageif: { name: 'AVERAGEIF・MAXIFS', town: 'ピボリア', desc: '=AVERAGEIF(条件の範囲, 条件, 平均する範囲)。=MAXIFS(探す範囲, 条件の範囲, 条件)。MINIFS で 最小。' },
  summary: { name: '集計表', town: 'ピボリア', desc: '条件に 見出しの セルを 使い、範囲を $ で 固定して コピー。=SUMIFS($B$2:$B$11,$A$2:$A$11,E2)' },
  crosstab: { name: 'クロス集計', town: 'ピボリア', desc: '縦の 見出しは $E2、横の 見出しは F$1。1つの 式で「縦 × 横」の 表を 埋める。ピボットテーブルの 中身と 同じ。' },
  concat: { name: '& で つなぐ', town: 'テキストリア', desc: '=A2&" "&B2 のように「&」で 文字と 文字を つなぐ。空白や 記号も " " で 囲んで つなげる。' },
  leftright: { name: 'LEFT・RIGHT', town: 'テキストリア', desc: '=LEFT(文字列, 文字数) で 左から、=RIGHT(文字列, 文字数) で 右から 文字を 取り出す。' },
  mid: { name: 'MID', town: 'テキストリア', desc: '=MID(文字列, 何文字目から, 何文字)。まん中の 文字を 取り出す。' },
  len: { name: 'LEN', town: 'テキストリア', desc: '=LEN(文字列) で 文字数。空白も 1文字。IF と 組み合わせて 長さの 判定にも 使える。' },
  clean: { name: 'TRIM・SUBSTITUTE', town: 'テキストリア', desc: '=TRIM(文字列) で よけいな 空白を 消す。=SUBSTITUTE(文字列, 探す, 置きかえ) で 文字を 置きかえる。' },
  find: { name: 'FIND', town: 'テキストリア', desc: '=FIND("@", A2) で その文字が 何文字目か わかる。=LEFT(A2,FIND("@",A2)-1) で @ の 前を 取り出す。' },
  dateadd: { name: '日付の 足し算', town: 'コヨミノ', desc: '日付は「1日 ＝ 1」の 数。=A2+7 で 7日後。月や 年を またいでも 暦どおり。' },
  datediff: { name: '日付の 引き算', town: 'コヨミノ', desc: '=締め切り-今日 で 間の 日数。今日の セルは $E$1 のように 固定して コピー。' },
  dateparts: { name: 'YEAR・MONTH・DAY', town: 'コヨミノ', desc: '=YEAR(日付)・=MONTH(日付)・=DAY(日付) で 年・月・日を 数として 取り出す。' },
  weekday: { name: 'WEEKDAY', town: 'コヨミノ', desc: '=WEEKDAY(日付, 2) で 月曜 1 〜 日曜 7。土日は「6以上」で 判定できる。' },
  edate: { name: 'EDATE・EOMONTH', town: 'コヨミノ', desc: '=EDATE(日付, 月数) で ○か月後、=EOMONTH(日付, 0) で その月の 末日。' },
  datedif: { name: 'DATEDIF', town: 'コヨミノ', desc: '=DATEDIF(開始日, 終了日, "Y") で 満年数。"M" で 満月数、"D" で 日数。' },
  diverr: { name: '#DIV/0! の 直し方', town: 'ホープ', desc: '0 で 割ると #DIV/0!。=IFERROR(A2/B2,"-") で エラーの ときの 答えを 決めておく。' },
  valueerr: { name: '#VALUE! の 直し方', town: 'ホープ', desc: '文字を + で 計算すると #VALUE!。SUM なら 文字を 飛ばして 数だけ 足す。' },
  nameerr: { name: '#NAME? の 直し方', town: 'ホープ', desc: '関数名の 打ちまちがいや、" の 付け忘れで #NAME?。つづりと " を 確かめる。' },
  referr: { name: '#REF! の 直し方', town: 'ホープ', desc: '参照先の セルを 消すと #REF!。新しい セルへ 参照を 付けかえる。' },
  combine: { name: '集計と 判定の 組み合わせ', town: 'ホープ', desc: 'SUMIFS で 集計し、IF で 判定。関数を つなげれば 報告書が 自動に なる。' },
  message: { name: '計算結果を 文に する', town: 'ホープ', desc: '="総勢 "&B6&" 名" のように、計算した 数と 文字を & で つないで 文を 作る。' },
  notfound: { name: 'XLOOKUP の 見つからないとき', town: 'ルックアップ', desc: '=XLOOKUP(探す値, 探す列, 取り出す列, "なし")。4つ目に 見つからない ときの 値を 書ける。' },
}
