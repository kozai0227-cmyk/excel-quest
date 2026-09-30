import * as G from './questionGen'

export type Question =
  | { type: 'choice'; q: string; choices: string[]; answer: string; explain: string }
  | {
      type: 'formula'
      q: string
      /** 表示用の小さな表（1行目から） */
      table: (string | number)[][]
      target: string
      /** 数値、または IF の結果のような 文字列 */
      expect: number | string
      mustUse?: string
      /** 入力した数式を このセルにも コピーして、答えが合うか 確かめる（絶対参照・IF の問題用） */
      copies?: { at: string; expect: number | string }[]
      hint: string
      explain: string
    }

export interface BossDef {
  id: string
  name: string
  sprite: 'slime' | 'golem' | 'celime' | 'frog' | 'bat' | 'ghost' | 'kagamin' | 'zuredori' | 'mirage' | 'jelly' | 'crab' | 'captain' | 'nainai' | 'shiori' | 'mitsukaranu'
  /** ボス（こちらの攻撃 → ボスの攻撃問題 の2段構えで戦う） */
  boss?: boolean
  /** 決まった回数の正解で倒れる（チュートリアル用） */
  hits?: number
  /** ボスが問題を出して攻撃してくるときの一言 */
  attackText?: string
  /** 倒したあと、正気に戻ったボスの ひとこと */
  defeatText?: string[]
  hp: number
  attack: [number, number]
  exp: number
  gold: number
  intro: string[]
  /** 出題リスト。関数（自動生成）なら 出題のたびに 数値が変わる */
  questions: QuestionSrc[]
}

export type QuestionSrc = Question | (() => Question)

export const BOSSES: Record<string, BossDef> = {
  slime: {
    id: 'slime',
    name: '散らかりスライム',
    sprite: 'slime',
    boss: true,
    attackText: '散らかったセルを 投げつけてきた！',
    defeatText: ['「ぷるる……表は 整えたほうが 気持ちいいぷる……。」', '散らかりスライムは 反省して、どこかへ 去っていった。'],
    hp: 120,
    attack: [9, 14],
    exp: 60,
    gold: 50,
    intro: ['（どうくつの奥で、ぐちゃぐちゃの表を まとった スライムが ぷるぷる ふるえている……）', 'ぷるる！ 表なんて 散らかってるほうが 落ちつくんだぷる！'],
    questions: [
      { type: 'choice', q: 'コピーの ショートカットは？', choices: ['Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z'], answer: 'Ctrl+C', explain: 'C は Copy の C。Macは ⌘+C。' },
      { type: 'choice', q: '直前の操作を 取り消す ショートカットは？', choices: ['Ctrl+Z', 'Ctrl+Y', 'Ctrl+B', 'Ctrl+S'], answer: 'Ctrl+Z', explain: 'Ctrl+Z で元に戻す、Ctrl+Y でやり直し。' },
      { type: 'choice', q: '貼り付けの ショートカットは？', choices: ['Ctrl+V', 'Ctrl+P', 'Ctrl+C', 'Ctrl+A'], answer: 'Ctrl+V', explain: 'Ctrl+P は印刷（Print）なので注意。' },
      { type: 'choice', q: '太字の ショートカットは？', choices: ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+F'], answer: 'Ctrl+B', explain: 'B は Bold。I は斜体、U は下線。' },
      { type: 'choice', q: 'セルに入力して Enter を押すと、選択セルは どこへ動く？', choices: ['下', '右', '上', '動かない'], answer: '下', explain: 'Enter で下へ、Tab で右へ。連続入力がはかどる。' },
      G.genSeriesFill,
      G.genSeriesFill,
      G.genCopyFill,
      G.genMonthFill,
      G.genDayFill,
      G.genAddress,
      G.genNeighbor,
      { type: 'choice', q: 'セルの中身の 一部だけ 修正したいときに 押すキーは？', choices: ['F2', 'F4', 'F5', 'Esc'], answer: 'F2', explain: 'F2（またはダブルクリック）で 編集モードに入れる。' },
      { type: 'choice', q: '範囲選択の右下にある 小さな■の名前は？', choices: ['フィルハンドル', '名前ボックス', '数式バー', 'セルポインタ'], answer: 'フィルハンドル', explain: 'ドラッグでオートフィルができる、便利な■。' },
      { type: 'choice', q: '入力中に Esc を押すと？', choices: ['入力をキャンセル', '確定して右へ', 'セルを削除', 'ファイルを保存'], answer: '入力をキャンセル', explain: 'まちがえて打ち始めても Esc で元通り。' },
      { type: 'choice', q: 'シート全体を 選択する ショートカットは？', choices: ['Ctrl+A', 'Ctrl+S', 'Ctrl+E', 'Ctrl+W'], answer: 'Ctrl+A', explain: 'A は All。' },
    ],
  },
  golem: {
    id: 'golem',
    name: '手計算ゴーレム',
    sprite: 'golem',
    boss: true,
    attackText: '筆算の 石板を ふりおろしてきた！',
    defeatText: ['「関数……ナント 便利……。ワレ、手計算ヲ 卒業スル……。」', '手計算ゴーレムは 静かに 崩れ落ち、ただの 石に もどった。'],
    hp: 210,
    attack: [13, 18],
    exp: 120,
    gold: 100,
    intro: ['（塔の頂上で、石板に びっしり筆算を 書きなぐる ゴーレムが 立ちはだかった！）', 'ゴゴゴ……計算ハ 手デ スルモノ……関数ナド 認メヌ……！'],
    questions: [
      { type: 'choice', q: '「平均」を 求める関数は？', choices: ['AVERAGE', 'SUM', 'MEAN', 'AVG'], answer: 'AVERAGE', explain: '=AVERAGE(範囲) で平均。' },
      { type: 'choice', q: 'COUNT関数が 数えるのは？', choices: ['数値が入ったセル', '空白でないすべてのセル', '空白のセル', '文字だけのセル'], answer: '数値が入ったセル', explain: '空白以外すべてを数えるなら COUNTA。' },
      { type: 'choice', q: '割り算に使う 記号は？', choices: ['/', '÷', '%', '\\'], answer: '/', explain: '足す+ 引く- 掛ける* 割る/。' },
      { type: 'choice', q: '数式の最初に 必ず付ける 記号は？', choices: ['=', '+', '#', '@'], answer: '=', explain: '= で始めると Excel が「計算して」と理解する。' },
      G.genPrecedence,
      G.genPrecedence,
      G.genMaxMin,
      G.genAverageValues,
      G.genRelativeRef,
      G.genSumCellCount,
      G.genFormulaSum,
      G.genFormulaAvg,
      G.genFormulaMul,
      G.genFormulaCount,
      G.genFormulaMaxMin,
    ],
  },
  mirage: {
    id: 'mirage',
    name: 'ズレズレ・ミラージュ',
    sprite: 'mirage',
    boss: true,
    attackText: '鏡に 映った 数式を ずらして 撃ちこんできた！',
    defeatText: [
      '「ワタシは……ずれていたのは ワタシの ほうだった……。」',
      '「$の印……ブレない 心……。オボエテ オコウ……。」',
      'ズレズレ・ミラージュの 鏡が 割れ、光の粒と なって 消えていった。',
    ],
    hp: 300,
    attack: [17, 23],
    exp: 220,
    gold: 180,
    intro: [
      '（神殿の奥。巨大な鏡の中から、ゆらゆらと 揺れる 影が あらわれた！）',
      'フフフ……コピーするたび ずれていく 数式……美しい ずれ でしょう？',
      'この町の 表は すべて ワタシが 映し出した「ずれた鏡像」。キミも ずらして あげる……！',
    ],
    questions: [
      { type: 'choice', q: '数式をコピーしても 参照が ずれないように するには？', choices: ['$を付ける', '#を付ける', '@を付ける', '!を付ける'], answer: '$を付ける', explain: '$A$1 のように $ を付けると 絶対参照になる。' },
      { type: 'choice', q: '「列は ずれて、行は 固定」なのは？', choices: ['A$1', '$A1', '$A$1', 'A1'], answer: 'A$1', explain: '$ は すぐ後ろを 固定する。A$1 は 行（1）だけ 固定。' },
      { type: 'choice', q: '数値を 四捨五入する 関数は？', choices: ['ROUND', 'INT', 'ROUNDUP', 'TRIM'], answer: 'ROUND', explain: 'ROUND は 四捨五入、ROUNDUP は 切り上げ、ROUNDDOWN は 切り捨て。' },
      { type: 'choice', q: 'Macで F4 の代わりに $ を切り替えるキーは？', choices: ['⌘+T', '⌘+4', '⌘+$', 'fn+F2'], answer: '⌘+T', explain: 'Mac の Excel では ⌘+T（または fn+F4）で 切り替わる。' },
      G.genAbsCopy,
      G.genF4Cycle,
      G.genMixedMeaning,
      G.genMixedCopy,
      G.genShareValue,
      G.genRound,
      G.genFormulaTax,
      G.genFormulaShare,
      G.genFormulaTimes,
      G.genFormulaRound,
      G.genFormulaSum,
    ],
  },
  captain: {
    id: 'captain',
    name: '幽霊船長モシナラバ',
    sprite: 'captain',
    boss: true,
    attackText: '「もしも」の 呪いを こめた 錨を 投げつけてきた！',
    defeatText: [
      '「もし……あのとき 判断を 人まかせに しなければ……。」',
      '「条件を 決めて おけば……迷わずに すんだのか……。ヨーソロー……。」',
      '幽霊船長モシナラバは、朝焼けの 光の中へ 静かに 消えていった。',
    ],
    hp: 400,
    attack: [22, 29],
    exp: 380,
    gold: 300,
    intro: [
      '（船長室の 奥。青白く 光る 船長が、舵輪を 握って 立っている……）',
      'ヨーソロー……。もしも 嵐なら？ もしも 大漁なら？ もしも 赤字なら？',
      'すべての「もしも」を、ひとつ ひとつ 目で 見て 悩み続けるが いい……！',
      'この港の 者どもは、永遠に 判断を 手作業で くり返すのだ！',
    ],
    questions: [
      { type: 'choice', q: 'IF関数の 正しい 形は？', choices: ['=IF(条件,正しいとき,違うとき)', '=IF(正しいとき,条件,違うとき)', '=IF(条件)', '=IF(違うとき,正しいとき)'], answer: '=IF(条件,正しいとき,違うとき)', explain: '条件 → TRUE のとき → FALSE のとき の 順。' },
      { type: 'choice', q: 'IFの 答えに 文字を 使うとき、文字を 囲む 記号は？', choices: ['"（ダブルクォーテーション）', "'（シングルクォーテーション）", '[ ]（カッコ）', '#（シャープ）'], answer: '"（ダブルクォーテーション）', explain: '=IF(A1>=60,"合格","不合格") のように " で 囲む。' },
      { type: 'choice', q: '「A1 が 10以上 かつ B1 が 5未満」を 表す 式は？', choices: ['AND(A1>=10,B1<5)', 'OR(A1>=10,B1<5)', 'AND(A1>10,B1<=5)', 'IF(A1>=10,B1<5)'], answer: 'AND(A1>=10,B1<5)', explain: '「かつ」は AND、「または」は OR。' },
      { type: 'choice', q: '条件に 合う セルの「数」を 数える 関数は？', choices: ['COUNTIF', 'SUMIF', 'COUNTA', 'IF'], answer: 'COUNTIF', explain: 'COUNTIF(範囲, 条件)。合計なら SUMIF。' },
      G.genCompare,
      G.genIfText,
      G.genIfNum,
      G.genNestedIf,
      G.genAndOr,
      G.genCountIfNum,
      G.genSumIf,
      G.genFormulaIf,
      G.genFormulaIfNum,
      G.genFormulaAnd,
      G.genFormulaCountIf,
      G.genFormulaSumIf,
      G.genFormulaTax,
    ],
  },
}


Object.assign(BOSSES, {
  mitsukaranu: {
    id: 'mitsukaranu',
    name: '迷宮書庫の主 ミツカラーヌ',
    sprite: 'mitsukaranu',
    boss: true,
    attackText: '「#N/A」の 紙吹雪を 巻き上げて 襲ってきた！',
    defeatText: [
      '「探せば……見つかる……。探し方さえ……知って いれば……。」',
      '「ワタシは……ただ、誰かに 見つけて ほしかった だけ なのかも しれない……。」',
      'ミツカラーヌの 表紙が 静かに 閉じ、光の 栞と なって 書架へ 戻っていった。',
    ],
    hp: 480,
    attack: [26, 33],
    exp: 520,
    gold: 420,
    intro: [
      '（大書庫の 最奥。天井まで 積まれた 本の 山の 中で、巨大な 本が 目を 開いた……！）',
      'ミツカラヌ……ミツカラヌ……。この 城の 記録は すべて ワタシが 呑みこんだ。',
      '1行ずつ 目で 探し、見つからずに 途方に くれるが いい。キサマの 答えも「#N/A」に してやろう……！',
    ],
    questions: [
      { type: 'choice', q: 'VLOOKUP の 4つ目を FALSE に すると？', choices: ['完全一致で 探す', '近似一致で 探す', '右から 探す', '見つからなければ 0'], answer: '完全一致で 探す', explain: 'FALSE は 完全一致。TRUE（または 省略）は 近似一致。番号や 名前を 探すときは FALSE。' },
      { type: 'choice', q: 'VLOOKUP で 探す値が 見つからないと 出る エラーは？', choices: ['#N/A', '#VALUE!', '#DIV/0!', '#REF!'], answer: '#N/A', explain: '#N/A は Not Available（見つからない）。IFERROR か XLOOKUP の 4つ目で 別の 値に できる。' },
      { type: 'choice', q: '探す列より 左の 列を 取り出せる 関数は？', choices: ['XLOOKUP', 'VLOOKUP', 'COUNTIF', 'ROUND'], answer: 'XLOOKUP', explain: 'XLOOKUP(探す値, 探す列, 取り出す列)。探す列と 取り出す列を 別々に 指定できる。' },
      { type: 'choice', q: 'VLOOKUP の 範囲を 下へ コピーしても ずれないように するには？', choices: ['$A$2:$C$9 のように 固定', 'A2:C9 のまま', '列番号に $ を 付ける', 'FALSE を TRUE に する'], answer: '$A$2:$C$9 のように 固定', explain: '範囲が ずれると 上の 行が 探せなくなる。F4 で 固定しよう。' },
      G.genVlookupPick,
      G.genColIndex,
      G.genApproxPick,
      G.genFormulaVlookup,
      G.genFormulaXlookup,
      G.genFormulaIferror,
      G.genFormulaIf,
      G.genFormulaSumIf,
      G.genFormulaTax,
    ],
  },
} satisfies Record<string, BossDef>)

// ================================================================ フィールドの敵
const c = (q: string, choices: string[], answer: string, explain: string): Question => ({ type: 'choice', q, choices, answer, explain })

const BASICS: QuestionSrc[] = [
  c('Excelの マス目の ひとつひとつを 何と呼ぶ？', ['セル', 'マス', 'ボックス', 'ピクセル'], 'セル', 'マス目は「セル」。セルが 集まって 表になる。'),
  c('横方向の 並びを 何と呼ぶ？', ['行', '列', '段', '帯'], '行', '横が「行（ぎょう）」、縦が「列（れつ）」。'),
  c('縦方向の 並びを 何と呼ぶ？', ['列', '行', '柱', '段'], '列', '列は A, B, C… のアルファベットで表す。'),
  c('入力した内容を 確定するキーは？', ['Enter', 'Esc', 'F1', 'Alt'], 'Enter', 'Enter で確定して 下へ。Tab なら 右へ。'),
  c('ファイルを 上書き保存する ショートカットは？', ['Ctrl+S', 'Ctrl+P', 'Ctrl+W', 'Ctrl+N'], 'Ctrl+S', 'S は Save。こまめな保存が 身を守る。'),
  G.genAddress,
  G.genAddress,
  G.genNeighbor,
  G.genNeighbor,
  G.genRangeCount,
]

const EDITS: QuestionSrc[] = [
  c('セルの一部だけ 直したい。押すキーは？', ['F2', 'F4', 'F12', 'Delete'], 'F2', 'F2 で 編集モード。ダブルクリックでもOK。'),
  c('まちがえて消した！ 元に戻すのは？', ['Ctrl+Z', 'Ctrl+Y', 'Ctrl+X', 'Ctrl+Q'], 'Ctrl+Z', 'Ctrl+Z で ひとつ前に戻る。'),
  c('切り取りの ショートカットは？', ['Ctrl+X', 'Ctrl+C', 'Ctrl+T', 'Ctrl+D'], 'Ctrl+X', '切り取って 貼り付けると「移動」になる。'),
  c('入力中に やっぱり やめたい。押すキーは？', ['Esc', 'Enter', 'Tab', 'Shift'], 'Esc', 'Esc で 入力をキャンセル。'),
  G.genSeriesFill,
  G.genSeriesFill,
  G.genCopyFill,
  G.genMonthFill,
  G.genDayFill,
  G.genRangeCount,
]

const CALCS: QuestionSrc[] = [
  c('合計を出す関数は？', ['SUM', 'ADD', 'TOTAL', 'PLUS'], 'SUM', '=SUM(範囲) で合計。'),
  c('「100÷4」を Excelで書くと？', ['=100/4', '=100÷4', '=100:4', '=100%4'], '=100/4', '割り算は /（スラッシュ）。'),
  G.genPrecedence,
  G.genPrecedence,
  G.genPrecedence,
  G.genDivision,
  G.genSumValues,
  G.genSumValues,
  G.genAverageValues,
  G.genSumCellCount,
]

const FUNCS: QuestionSrc[] = [
  c('いちばん大きい値を 求める関数は？', ['MAX', 'MIN', 'TOP', 'BIG'], 'MAX', '最大は MAX、最小は MIN。'),
  c('数値が入った セルを 数える関数は？', ['COUNT', 'SUM', 'NUMBER', 'COUNTA'], 'COUNT', '空白以外 すべてなら COUNTA。'),
  G.genMaxMin,
  G.genMaxMin,
  G.genCount,
  G.genCountA,
  G.genAverageValues,
  G.genFormulaSum,
  G.genFormulaMaxMin,
  G.genFormulaCount,
]

const REFS: QuestionSrc[] = [
  c('数式を コピーすると 参照が いっしょに ずれる。これを 何という？', ['相対参照', '絶対参照', '循環参照', '外部参照'], '相対参照', 'ふつうの A1 は 相対参照。コピーした分だけ ずれる。'),
  c('「$A$1」のような 参照を 何という？', ['絶対参照', '相対参照', '複合参照', '名前参照'], '絶対参照', '$ で 固定された参照。コピーしても A1 のまま。'),
  c('参照の $ を 切り替える キーは？', ['F4', 'F2', 'F1', 'F12'], 'F4', '数式の入力中に F4。Mac は ⌘+T。'),
  G.genRelShift,
  G.genRelShift,
  G.genAbsCopy,
  G.genAbsCopy,
  G.genF4Cycle,
  G.genMixedMeaning,
  G.genFormulaTax,
]

const MIXES: QuestionSrc[] = [
  c('「$A1」と「A$1」のように、片方だけ 固定する参照は？', ['複合参照', '絶対参照', '相対参照', '半分参照'], '複合参照', '列だけ・行だけ 固定するのが 複合参照。'),
  c('各商品の 売上が 合計の 何％かを 表したものは？', ['構成比', '前年比', '達成率', '平均値'], '構成比', '構成比 ＝ 個別 ÷ 合計。合計は $ で固定。'),
  G.genMixedCopy,
  G.genMixedCopy,
  G.genShareValue,
  G.genRound,
  G.genRound,
  G.genFormulaShare,
  G.genFormulaTimes,
  G.genFormulaRound,
]

const CONDS: QuestionSrc[] = [
  c('「10以上」を 表す 比較演算子は？', ['>=', '=>', '≧', '>'], '>=', '以上は >=、以下は <=。≧ は 使えない。'),
  c('比較の 結果として 返ってくるのは？', ['TRUE か FALSE', '0 か 100', '○ か ×', 'はい か いいえ'], 'TRUE か FALSE', '=A1>=10 のような 比較は TRUE（正しい）か FALSE（違う）に なる。'),
  G.genCompare,
  G.genCompare,
  G.genOpMeaning,
  G.genIfText,
  G.genIfText,
  G.genIfNum,
  G.genFormulaIf,
  G.genFormulaIfNum,
]

const BRANCHES: QuestionSrc[] = [
  c('「A1が 5以上 または B1が 5以上」を 表す 式は？', ['OR(A1>=5,B1>=5)', 'AND(A1>=5,B1>=5)', 'OR(A1>5,B1>5)', 'IF(A1>=5,B1>=5)'], 'OR(A1>=5,B1>=5)', '「または」は OR。どちらか 1つでも 満たせば TRUE。'),
  c('3段階（A・B・C）に 分けたいとき、よく使う 方法は？', ['IFの中に IFを入れる', 'IFを 2つ 並べる', 'SUMを使う', 'COUNTIFを使う'], 'IFの中に IFを入れる', '=IF(A1>=80,"A",IF(A1>=60,"B","C")) のように 入れ子にする。'),
  G.genNestedIf,
  G.genNestedIf,
  G.genAndOr,
  G.genAndOr,
  G.genCountIfText,
  G.genCountIfNum,
  G.genSumIf,
  G.genFormulaAnd,
  G.genFormulaCountIf,
  G.genFormulaSumIf,
]

const LOOKS: QuestionSrc[] = [
  c('表の 左端の 列で 探して、同じ行の 右の 値を 取り出す 関数は？', ['VLOOKUP', 'COUNTIF', 'SUMIF', 'ROUND'], 'VLOOKUP', 'VLOOKUP（ブイ・ルックアップ）。V は Vertical（縦）の V。'),
  c('VLOOKUP で 見つからないと 出る エラーは？', ['#N/A', '#DIV/0!', '#NAME?', '#REF!'], '#N/A', '#N/A は「見つからない」の 意味。'),
  c('番号や 名前を ぴったり 探すとき、VLOOKUP の 4つ目は？', ['FALSE', 'TRUE', '0以上', '"完全"'], 'FALSE', 'FALSE で 完全一致。書き忘れると 近似一致に なって、思わぬ 値が 出ることも。'),
  G.genVlookupPick,
  G.genVlookupPick,
  G.genColIndex,
  G.genColIndex,
  G.genFormulaVlookup,
]
const SEARCHES: QuestionSrc[] = [
  c('=IFERROR(VLOOKUP(…),"なし") の 役割は？', ['見つからない ときだけ "なし" に する', 'いつも "なし" に する', 'エラーの 数を 数える', '"なし" を 探す'], '見つからない ときだけ "なし" に する', 'IFERROR は エラーの ときだけ 2つ目の 値を 出す。'),
  c('XLOOKUP の 4つ目の 引数は？', ['見つからない ときの 値', '列番号', '完全一致か どうか', '探す 行数'], '見つからない ときの 値', '=XLOOKUP(探す値, 探す列, 取り出す列, "なし")'),
  c('近似一致（TRUE）で 使う 区切りの 表は どう 並べる？', ['小さい順', '大きい順', 'バラバラで よい', '五十音順'], '小さい順', '近似一致は「探す値 以下で いちばん 大きい 値」を 選ぶので、小さい順に 並べておく。'),
  G.genApproxPick,
  G.genApproxPick,
  G.genFormulaXlookup,
  G.genFormulaIferror,
  G.genFormulaVlookup,
]

export const FIELD_ENEMIES: Record<string, BossDef> = {
  celime_tutorial: {
    id: 'celime_tutorial',
    name: 'セルイム',
    sprite: 'celime',
    hp: 50,
    hits: 5,
    attack: [3, 5],
    exp: 14,
    gold: 10,
    intro: [],
    questions: BASICS,
  },
  celime: { id: 'celime', name: 'セルイム', sprite: 'celime', hp: 20, attack: [3, 6], exp: 7, gold: 6, intro: [], questions: BASICS },
  frog: { id: 'frog', name: 'マチガエル', sprite: 'frog', hp: 26, attack: [4, 7], exp: 10, gold: 9, intro: [], questions: EDITS },
  bat: { id: 'bat', name: 'ケタオチバット', sprite: 'bat', hp: 34, attack: [6, 10], exp: 16, gold: 13, intro: [], questions: CALCS },
  ghost: { id: 'ghost', name: 'ヒッサンゴースト', sprite: 'ghost', hp: 42, attack: [8, 12], exp: 22, gold: 18, intro: [], questions: FUNCS },
  kagamin: { id: 'kagamin', name: 'カガミン', sprite: 'kagamin', hp: 52, attack: [11, 15], exp: 30, gold: 24, intro: [], questions: REFS },
  zuredori: { id: 'zuredori', name: 'ズレドリ', sprite: 'zuredori', hp: 64, attack: [13, 18], exp: 40, gold: 32, intro: [], questions: MIXES },
  jelly: { id: 'jelly', name: 'イフクラゲ', sprite: 'jelly', hp: 78, attack: [16, 21], exp: 52, gold: 40, intro: [], questions: CONDS },
  crab: { id: 'crab', name: 'ブンキガニ', sprite: 'crab', hp: 92, attack: [18, 24], exp: 64, gold: 50, intro: [], questions: BRANCHES },
  nainai: { id: 'nainai', name: 'ナイナイ', sprite: 'nainai', hp: 104, attack: [21, 27], exp: 78, gold: 60, intro: [], questions: LOOKS },
  shiori: { id: 'shiori', name: 'シオリムシ', sprite: 'shiori', hp: 118, attack: [23, 29], exp: 90, gold: 70, intro: [], questions: SEARCHES },
}

export const ENEMIES: Record<string, BossDef> = { ...BOSSES, ...FIELD_ENEMIES }
