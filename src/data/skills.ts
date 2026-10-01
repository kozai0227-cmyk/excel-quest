export interface SkillDef {
  name: string
  town: string
  desc: string
}

export const SKILLS: Record<string, SkillDef> = {
  input: { name: 'セル入力', town: 'セルノ', desc: 'セルを選んで入力 → Enterで確定（下へ移動）。Tabなら右へ。' },
  edit: { name: 'セルの修正', town: 'セルノ', desc: 'そのまま打つと上書き。F2 かダブルクリックで一部だけ修正。' },
  copy: { name: 'コピー＆貼り付け', town: 'セルノ', desc: 'Ctrl+C でコピー、Ctrl+V で貼り付け。（Macは ⌘）' },
  undo: { name: '元に戻す', town: 'セルノ', desc: 'Ctrl+Z で直前の操作を取り消し。Ctrl+Y でやり直し。' },
  autofill: { name: 'オートフィル', town: 'セルノ', desc: '右下の■をドラッグ。数字は2つ選ぶと連番、「1月」などは自動で続く。' },
  bold: { name: '太字', town: 'セルノ', desc: 'Ctrl+B で太字のON/OFF。見出しを目立たせよう。' },
  arith: { name: '四則演算', town: 'カルキュレ', desc: '= で始める。足す + 引く - 掛ける * 割る /' },
  SUM: { name: 'SUM', town: 'カルキュレ', desc: '=SUM(B2:B11) 範囲の合計。' },
  AVERAGE: { name: 'AVERAGE', town: 'カルキュレ', desc: '=AVERAGE(B2:B9) 範囲の平均。' },
  MAXMIN: { name: 'MAX / MIN', town: 'カルキュレ', desc: '=MAX(範囲) 最大値、=MIN(範囲) 最小値。' },
  COUNT: { name: 'COUNT', town: 'カルキュレ', desc: '=COUNT(範囲) 数値のセルを数える。空白以外すべてなら COUNTA。' },
  report: { name: '集計表づくり', town: 'カルキュレ', desc: '合計の数式を1つ作ってオートフィル。縦と横の合計で表が完成。' },
  relref: { name: '相対参照', town: 'サンショウ', desc: '数式をコピーすると 参照も いっしょに ずれる（=C2/B2 → =C3/B3）。' },
  absref: { name: '絶対参照（$）', town: 'サンショウ', desc: '$E$2 のように $ を付けると、コピーしても その参照は ずれない。' },
  f4: { name: 'F4キー', town: 'サンショウ', desc: '数式の入力中に F4 を押すと、$A$1 → A$1 → $A1 → A1 と 切り替わる。' },
  share: { name: '構成比', town: 'サンショウ', desc: '=B2/$B$6 のように、合計を 絶対参照で 固定して 割る。' },
  mixref: { name: '複合参照', town: 'サンショウ', desc: '$A2（列だけ固定）と B$1（行だけ固定）。九九の表を 1つの数式で 作れる。' },
  round: { name: 'ROUND', town: 'サンショウ', desc: '=ROUND(数値, 0) で 四捨五入。端数処理に 使う。' },
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
  notfound: { name: 'XLOOKUP の 見つからないとき', town: 'ルックアップ', desc: '=XLOOKUP(探す値, 探す列, 取り出す列, "なし")。4つ目に 見つからない ときの 値を 書ける。' },
}
