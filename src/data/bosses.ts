import * as G from './questionGen'
import { isEn, tr, tra } from '../game/lang'

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
  sprite: 'slime' | 'golem' | 'celime' | 'frog' | 'bat' | 'ghost' | 'kagamin' | 'zuredori' | 'mirage' | 'jelly' | 'crab' | 'captain' | 'nainai' | 'shiori' | 'mitsukaranu' | 'dupli' | 'chirakari' | 'barabaran' | 'kuuhaku' | 'kirehashi' | 'mojibake' | 'karendaru' | 'tokeidori' | 'shimekiris' | 'zerowarin' | 'nanashi' | 'refera'
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

/** 英語版の 4択（choices・answer を 省くと 日本語版と 同じ もの） */
type ChoiceEn = { q: string; choices?: string[]; answer?: string; explain: string }

/** 4択の 問題。en が あれば 英語版で 差し替える */
function c(q: string, choices: string[], answer: string, explain: string, en?: ChoiceEn): Question {
  if (en && isEn()) return { type: 'choice', q: en.q, choices: en.choices ?? choices, answer: en.answer ?? answer, explain: en.explain }
  return { type: 'choice', q, choices, answer, explain }
}

export const BOSSES: Record<string, BossDef> = {
  slime: {
    id: 'slime',
    name: '散らかりセルイム',
    sprite: 'slime',
    boss: true,
    attackText: tr('散らかったセルを 投げつけてきた！', 'It hurled a pile of messy cells!'),
    defeatText: tra(['「ぷるる……表は 整えたほうが 気持ちいいぷる……。」', '散らかりセルイムは 反省して、どこかへ 去っていった。'], [
      '"Wobble... A tidy table does feel nicer, wob..."',
      'The Messy Cellime thought about what it had done and wandered off somewhere.',
    ]),
    hp: 120,
    attack: [9, 14],
    exp: 60,
    gold: 50,
    intro: tra(['（どうくつの奥で、ぐちゃぐちゃの表を まとった 大きな セルイムが ぷるぷる ふるえている……）', 'ぷるる！ 表なんて 散らかってるほうが 落ちつくんだぷる！'], [
      '(Deep in the cave, a big Cellime wrapped in a jumbled table is wobbling...)',
      'Wobble! Tables are way more relaxing when they\'re a mess, wob!',
    ]),
    questions: [
      c('コピーの ショートカットは？', ['Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z'], 'Ctrl+C', 'C は Copy の C。Macは ⌘+C。', { q: 'What\'s the shortcut to copy?', explain: 'C is for Copy. On a Mac, ⌘+C.' }),
      c('直前の操作を 取り消す ショートカットは？', ['Ctrl+Z', 'Ctrl+Y', 'Ctrl+B', 'Ctrl+S'], 'Ctrl+Z', 'Ctrl+Z で元に戻す、Ctrl+Y でやり直し。', { q: 'What\'s the shortcut to undo the last action?', explain: 'Ctrl+Z undoes, and Ctrl+Y redoes.' }),
      c('貼り付けの ショートカットは？', ['Ctrl+V', 'Ctrl+P', 'Ctrl+C', 'Ctrl+A'], 'Ctrl+V', 'Ctrl+P は印刷（Print）なので注意。', { q: 'What\'s the shortcut to paste?', explain: 'Careful: Ctrl+P is Print.' }),
      c('太字の ショートカットは？', ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+F'], 'Ctrl+B', 'B は Bold。I は斜体、U は下線。', { q: 'What\'s the shortcut for bold?', explain: 'B is for Bold. I is Italic, U is Underline.' }),
      c('セルに入力して Enter を押すと、選択セルは どこへ動く？', ['下', '右', '上', '動かない'], '下', 'Enter で下へ、Tab で右へ。連続入力がはかどる。', { q: 'You type in a cell and press Enter. Where does the selection move?', choices: ['Down', 'Right', 'Up', 'It doesn\'t move'], answer: 'Down', explain: 'Enter moves down, Tab moves right. Great for entering data in a row.' }),
      G.genSeriesFill,
      G.genSeriesFill,
      G.genCopyFill,
      G.genMonthFill,
      G.genDayFill,
      G.genAddress,
      G.genNeighbor,
      c('セルの中身の 一部だけ 修正したいときに 押すキーは？', ['F2', 'F4', 'F5', 'Esc'], 'F2', 'F2（またはダブルクリック）で 編集モードに入れる。', { q: 'Which key do you press to fix just part of a cell?', explain: 'F2 (or a double-click) puts you in edit mode.' }),
      c('範囲選択の右下にある 小さな■の名前は？', ['フィルハンドル', '名前ボックス', '数式バー', 'セルポインタ'], 'フィルハンドル', 'ドラッグでオートフィルができる、便利な■。', { q: 'What\'s the small ■ at the bottom-right of a selection called?', choices: ['Fill handle', 'Name Box', 'Formula bar', 'Cell pointer'], answer: 'Fill handle', explain: 'The handy ■ you drag to AutoFill.' }),
      c('入力中に Esc を押すと？', ['入力をキャンセル', '確定して右へ', 'セルを削除', 'ファイルを保存'], '入力をキャンセル', 'まちがえて打ち始めても Esc で元通り。', { q: 'What happens if you press Esc while typing?', choices: ['Cancels the entry', 'Confirms and moves right', 'Deletes the cell', 'Saves the file'], answer: 'Cancels the entry', explain: 'Started typing by mistake? Esc puts it back the way it was.' }),
      c('シート全体を 選択する ショートカットは？', ['Ctrl+A', 'Ctrl+S', 'Ctrl+E', 'Ctrl+W'], 'Ctrl+A', 'A は All。', { q: 'What\'s the shortcut to select the whole sheet?', explain: 'A is for All.' }),
    ],
  },
  golem: {
    id: 'golem',
    name: '手計算ゴーレム',
    sprite: 'golem',
    boss: true,
    attackText: tr('筆算の 石板を ふりおろしてきた！', 'It slammed down a stone tablet full of longhand math!'),
    defeatText: tra(['「関数……ナント 便利……。ワレ、手計算ヲ 卒業スル……。」', '手計算ゴーレムは 静かに 崩れ落ち、ただの 石に もどった。'], [
      '"FUNCTIONS... SO CONVENIENT... I SHALL GRADUATE... FROM HAND CALCULATION..."',
      'The Hand-Calc Golem quietly crumbled and became plain stone once more.',
    ]),
    hp: 210,
    attack: [13, 18],
    exp: 120,
    gold: 100,
    intro: tra(['（塔の頂上で、石板に びっしり筆算を 書きなぐる ゴーレムが 立ちはだかった！）', 'ゴゴゴ……計算ハ 手デ スルモノ……関数ナド 認メヌ……！'], [
      '(At the top of the tower, a golem scribbling longhand math all over a stone tablet blocks your way!)',
      'RUMBLE... MATH IS DONE BY HAND... I DO NOT ACCEPT... FUNCTIONS...!',
    ]),
    questions: [
      c('「平均」を 求める関数は？', ['AVERAGE', 'SUM', 'MEAN', 'AVG'], 'AVERAGE', '=AVERAGE(範囲) で平均。', { q: 'Which function finds the "average"?', explain: '=AVERAGE(range) gives the average.' }),
      c('COUNT関数が 数えるのは？', ['数値が入ったセル', '空白でないすべてのセル', '空白のセル', '文字だけのセル'], '数値が入ったセル', '空白以外すべてを数えるなら COUNTA。', { q: 'What does the COUNT function count?', choices: ['Cells with numbers', 'Every non-blank cell', 'Blank cells', 'Cells with text only'], answer: 'Cells with numbers', explain: 'To count every non-blank cell, use COUNTA.' }),
      c('割り算に使う 記号は？', ['/', '÷', '%', '\\'], '/', '足す+ 引く- 掛ける* 割る/。', { q: 'Which symbol is used for division?', explain: 'Add +, subtract -, multiply *, divide /.' }),
      c('数式の最初に 必ず付ける 記号は？', ['=', '+', '#', '@'], '=', '= で始めると 表計算ソフトが「計算して」と理解する。', { q: 'Which symbol must every formula start with?', explain: 'Starting with = tells the spreadsheet "calculate this".' }),
      G.genPrecedence,
      G.genPrecedence,
      G.genMaxMin,
      G.genAverageValues,
      G.genRelativeRef,
      G.genRangeComma,
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
    attackText: tr('鏡に 映った 数式を ずらして 撃ちこんできた！', 'It fired a shifted formula from its mirror!'),
    defeatText: tra(
      [
        '「ワタシは……ずれていたのは ワタシの ほうだった……。」',
        '「$の印……ブレない 心……。オボエテ オコウ……。」',
        'ズレズレ・ミラージュの 鏡が 割れ、光の粒と なって 消えていった。',
      ],
      [
        '"So... it was I... who had shifted all along..."',
        '"The mark of $... a heart that never wavers... I SHALL REMEMBER IT..."',
        'The Shifty Mirage\'s mirror shattered and faded away into specks of light.',
      ],
    ),
    hp: 300,
    attack: [17, 23],
    exp: 220,
    gold: 180,
    intro: tra(
      [
        '（神殿の奥。巨大な鏡の中から、ゆらゆらと 揺れる 影が あらわれた！）',
        'フフフ……コピーするたび ずれていく 数式……美しい ずれ でしょう？',
        'この町の 表は すべて ワタシが 映し出した「ずれた鏡像」。キミも ずらして あげる……！',
      ],
      [
        '(Deep in the temple, a wavering shadow emerges from a giant mirror!)',
        'Hehehe... formulas that shift every time you copy them... Isn\'t the shifting beautiful?',
        'Every table in this town is a "shifted reflection" I cast. I\'ll shift you too...!',
      ],
    ),
    questions: [
      c('数式をコピーしても 参照が ずれないように するには？', ['$を付ける', '#を付ける', '@を付ける', '!を付ける'], '$を付ける', '$A$1 のように $ を付けると 絶対参照になる。', { q: 'How do you keep a reference from shifting when you copy a formula?', choices: ['Add $', 'Add #', 'Add @', 'Add !'], answer: 'Add $', explain: 'Adding $ like $A$1 makes it an absolute reference.' }),
      c('「列は ずれて、行は 固定」なのは？', ['A$1', '$A1', '$A$1', 'A1'], 'A$1', '$ は すぐ後ろを 固定する。A$1 は 行（1）だけ 固定。', { q: 'Which one lets the column shift but locks the row?', explain: '$ locks what comes right after it. A$1 locks only the row (1).' }),
      c('数値を 四捨五入する 関数は？', ['ROUND', 'INT', 'ROUNDUP', 'TRIM'], 'ROUND', 'ROUND は 四捨五入、ROUNDUP は 切り上げ、ROUNDDOWN は 切り捨て。', { q: 'Which function rounds a number?', explain: 'ROUND rounds to the nearest, ROUNDUP rounds up, and ROUNDDOWN rounds down.' }),
      c('Macで F4 の代わりに $ を切り替えるキーは？', ['⌘+T', '⌘+4', '⌘+$', 'fn+F2'], '⌘+T', 'Mac では ⌘+T（または fn+F4）で 切り替わる ソフトが 多い。', { q: 'On a Mac, which keys toggle $ instead of F4?', explain: 'On a Mac, many apps use ⌘+T (or fn+F4) to toggle it.' }),
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
    attackText: tr('「もしも」の 呪いを こめた 錨を 投げつけてきた！', 'It hurled an anchor laced with the curse of "what if"!'),
    defeatText: tra(
  [
        '「もし……あのとき 判断を 人まかせに しなければ……。」',
        '「条件を 決めて おけば……迷わずに すんだのか……。ヨーソロー……。」',
        '幽霊船長モシナラバは、朝焼けの 光の中へ 静かに 消えていった。',
      ],
      [
      '"If only... I hadn\'t left my decisions to others back then..."',
      '"If I had set the conditions... I wouldn\'t have had to agonize... Steady as she goes..."',
      'Ghost Captain Whatif quietly faded into the light of the dawn.',
      ],
    ),
    hp: 400,
    attack: [22, 29],
    exp: 380,
    gold: 300,
    intro: tra(
  [
        '（船長室の 奥。青白く 光る 船長が、舵輪を 握って 立っている……）',
        'ヨーソロー……。もしも 嵐なら？ もしも 大漁なら？ もしも 赤字なら？',
        'すべての「もしも」を、ひとつ ひとつ 目で 見て 悩み続けるが いい……！',
        'この港の 者どもは、永遠に 判断を 手作業で くり返すのだ！',
      ],
      [
      '(At the back of the captain\'s cabin, a pale, glowing captain stands gripping the ship\'s wheel...)',
      'Steady as she goes... What if there\'s a storm? What if it\'s a great catch? What if we lose money?',
      'Go on, agonize over every "what if," one by one, by eye...!',
      'The people of this harbor shall make every decision by hand, forever!',
      ],
    ),
    questions: [
      c('IF関数の 正しい 形は？', ['=IF(条件,正しいとき,違うとき)', '=IF(正しいとき,条件,違うとき)', '=IF(条件)', '=IF(違うとき,正しいとき)'], '=IF(条件,正しいとき,違うとき)', '条件 → TRUE のとき → FALSE のとき の 順。', { q: 'What\'s the correct form of the IF function?', choices: ['=IF(condition,if true,if false)', '=IF(if true,condition,if false)', '=IF(condition)', '=IF(if false,if true)'], answer: '=IF(condition,if true,if false)', explain: 'Condition → value when TRUE → value when FALSE, in that order.' }),
      c('IFの 答えに 文字を 使うとき、文字を 囲む 記号は？', ['"（ダブルクォーテーション）', "'（シングルクォーテーション）", '[ ]（カッコ）', '#（シャープ）'], '"（ダブルクォーテーション）', '=IF(A1>=60,"合格","不合格") のように " で 囲む。', {
        q: 'When IF returns text, which symbol wraps the text?',
        choices: ['" (double quote)', "' (single quote)", '[ ] (brackets)', '# (hash)'],
        answer: '" (double quote)',
        explain: 'Wrap it in ", like =IF(A1>=60,"Pass","Fail").',
      }),
      c('「A1 が 10以上 かつ B1 が 5未満」を 表す 式は？', ['AND(A1>=10,B1<5)', 'OR(A1>=10,B1<5)', 'AND(A1>10,B1<=5)', 'IF(A1>=10,B1<5)'], 'AND(A1>=10,B1<5)', '「かつ」は AND、「または」は OR。', { q: 'Which expresses "A1 is 10 or more AND B1 is under 5"?', explain: '"And" is AND, "or" is OR.' }),
      c('条件に 合う セルの「数」を 数える 関数は？', ['COUNTIF', 'SUMIF', 'COUNTA', 'IF'], 'COUNTIF', 'COUNTIF(範囲, 条件)。合計なら SUMIF。', { q: 'Which function counts the number of cells that match a condition?', explain: 'COUNTIF(range, condition). For a total, use SUMIF.' }),
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
    attackText: tr('「#N/A」の 紙吹雪を 巻き上げて 襲ってきた！', 'It attacked with a whirlwind of "#N/A" confetti!'),
    defeatText: tra(
  [
        '「探せば……見つかる……。探し方さえ……知って いれば……。」',
        '「ワタシは……ただ、誰かに 見つけて ほしかった だけ なのかも しれない……。」',
        'ミツカラーヌの 表紙が 静かに 閉じ、光の 栞と なって 書架へ 戻っていった。',
      ],
      [
      '"Search... and you shall find... if only you know... how to search..."',
      '"Perhaps all I ever wanted... was for someone to find me..."',
      'Notfoundra\'s cover quietly closed, and it returned to the shelves as a bookmark of light.',
      ],
    ),
    hp: 480,
    attack: [26, 33],
    exp: 520,
    gold: 420,
    intro: tra(
  [
        '（大書庫の 最奥。天井まで 積まれた 本の 山の 中で、巨大な 本が 目を 開いた……！）',
        'ミツカラヌ……ミツカラヌ……。この 城の 記録は すべて ワタシが 呑みこんだ。',
        '1行ずつ 目で 探し、見つからずに 途方に くれるが いい。キサマの 答えも「#N/A」に してやろう……！',
      ],
      [
      '(Deep in the Great Library, among mountains of books stacked to the ceiling, a giant book opened its eyes...!)',
      'NOT FOUND... NOT FOUND... I have swallowed every record in this castle.',
      'Search line by line by eye, find nothing, and despair. I shall turn your answer into "#N/A" too...!',
      ],
    ),
    questions: [
      c('VLOOKUP の 4つ目を FALSE に すると？', ['完全一致で 探す', '近似一致で 探す', '右から 探す', '見つからなければ 0'], '完全一致で 探す', 'FALSE は 完全一致。TRUE（または 省略）は 近似一致。番号や 名前を 探すときは FALSE。', { q: 'What happens when you set the 4th part of VLOOKUP to FALSE?', choices: ['It searches for an exact match', 'It searches for an approximate match', 'It searches from the right', 'It shows 0 if not found'], answer: 'It searches for an exact match', explain: 'FALSE is an exact match. TRUE (or leaving it out) is an approximate match. Use FALSE when looking up numbers or names.' }),
      c('VLOOKUP で 探す値が 見つからないと 出る エラーは？', ['#N/A', '#VALUE!', '#DIV/0!', '#REF!'], '#N/A', '#N/A は Not Available（見つからない）。IFERROR か XLOOKUP の 4つ目で 別の 値に できる。', { q: 'Which error does VLOOKUP give when the value isn\'t found?', explain: '#N/A means Not Available (not found). You can turn it into something else with IFERROR or the 4th part of XLOOKUP.' }),
      c('探す列より 左の 列を 取り出せる 関数は？', ['XLOOKUP', 'VLOOKUP', 'COUNTIF', 'ROUND'], 'XLOOKUP', 'XLOOKUP(探す値, 探す列, 取り出す列)。探す列と 取り出す列を 別々に 指定できる。', { q: 'Which function can return a column to the left of the one it searches?', explain: 'XLOOKUP(value to find, column to search, column to return). You set the column to search and the column to return separately.' }),
      c('VLOOKUP の 範囲を 下へ コピーしても ずれないように するには？', ['$A$2:$C$9 のように 固定', 'A2:C9 のまま', '列番号に $ を 付ける', 'FALSE を TRUE に する'], '$A$2:$C$9 のように 固定', '範囲が ずれると 上の 行が 探せなくなる。F4 で 固定しよう。', { q: 'How do you keep VLOOKUP\'s range from shifting when you copy it down?', choices: ['Lock it like $A$2:$C$9', 'Leave it as A2:C9', 'Add $ to the column number', 'Change FALSE to TRUE'], answer: 'Lock it like $A$2:$C$9', explain: 'If the range shifts, the top rows can\'t be searched. Lock it with F4.' }),
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

Object.assign(BOSSES, {
  barabaran: {
    id: 'barabaran',
    name: '散乱帳簿の王 バラバラン',
    sprite: 'barabaran',
    boss: true,
    attackText: tr('バラバラの 伝票を 嵐のように 吹き荒らした！', 'It whipped up a storm of scattered receipts!'),
    defeatText: tra(
  [
        '「まとめ……られた……？ あれほど バラバラに した 記録が……たった 1つの 表に……。」',
        '「数字は……並べる だけでは 何も 語らぬ……。まとめて はじめて……意味を 持つ……のか……。」',
        'バラバランの 体を つくっていた 伝票が、1枚ずつ 光の 帳簿へと 綴じられていった。',
      ],
      [
      '"Gathered...? The records I scattered so thoroughly... into just one table...?"',
      '"Numbers... say nothing when merely lined up... Only when totaled... do they have meaning...?"',
      'One by one, the receipts that made up Scatteron\'s body were bound into a ledger of light.',
      ],
    ),
    hp: 560,
    attack: [30, 37],
    exp: 640,
    gold: 520,
    intro: tra(
  [
        '（宝物庫の 最奥。積み上げられた 伝票の 山が、ゆっくりと 起き上がった……！）',
        'バラバラ……バラバラ……。王都の 記録は すべて ワシが 散らかして やった。',
        '何千枚の 伝票を 1枚ずつ 数え、足し、途方に くれるが いい。キサマの 報告書も、永遠に 終わらぬ……！',
      ],
      [
      '(Deep in the treasury, a towering mountain of receipts slowly rose up...!)',
      'Scattered... scattered... I have strewn every record in the capital.',
      'Count and add thousands of receipts one by one, and despair. Your report shall never be finished...!',
      ],
    ),
    questions: [
      c('条件が 2つ ある 合計を 出す 関数は？', ['SUMIFS', 'SUMIF', 'SUM', 'COUNTIFS'], 'SUMIFS', 'SUMIFS(合計する範囲, 範囲1, 条件1, 範囲2, 条件2)。条件は いくつでも 並べられる。', { q: 'Which function gives a total with two conditions?', explain: 'SUMIFS(range to total, range1, condition1, range2, condition2). You can line up as many conditions as you like.' }),
      c('SUMIFS と SUMIF で 位置が ちがう 引数は？', ['合計する 範囲', '条件', '条件の 範囲', 'どれも 同じ'], '合計する 範囲', 'SUMIFS は 合計する範囲が 最初、SUMIF は 最後。', { q: 'Which argument is in a different position in SUMIFS and SUMIF?', choices: ['The range to total', 'The condition', 'The range to check', 'They\'re all the same'], answer: 'The range to total', explain: 'In SUMIFS the range to total comes first; in SUMIF it comes last.' }),
      c('「1000以上」を COUNTIFS の 条件に 書くと？', ['">=1000"', '>=1000', '"=>1000"', '"≧1000"'], '">=1000"', '比べる 記号つきの 条件は " で 囲む。以上は >=。', { q: 'How do you write "1000 or more" as a COUNTIFS condition?', explain: 'Conditions with a comparison symbol are wrapped in ". "At least" is >=.' }),
      c('ピボットテーブルで、合計する 数（売上など）を 置く 欄は？', ['値', '行', '列', 'フィルター'], '値', 'ピボットテーブルは 行・列・値・フィルター の 4つの 欄で 表を 作る。', { q: 'In a PivotTable, which area holds the numbers to total (like sales)?', choices: ['Values', 'Rows', 'Columns', 'Filters'], answer: 'Values', explain: 'A PivotTable is built from four areas: Rows, Columns, Values and Filters.' }),
      G.genCountifsPick,
      G.genSumifsOrder,
      G.genCrossRef,
      G.genPivotArea,
      G.genFormulaSumifs,
      G.genFormulaCountifs,
      G.genFormulaAvgif,
      G.genFormulaXlookup,
      G.genFormulaIferror,
    ],
  },
} satisfies Record<string, BossDef>)

Object.assign(BOSSES, {
  mojibake: {
    id: 'mojibake',
    name: '文字化けの怪 モジバケーラ',
    sprite: 'mojibake',
    boss: true,
    attackText: tr('「縺薙ｓ縺ｫ縺｡縺ｯ」――意味の ない 文字の 渦が 襲いかかってきた！', '"縺薙ｓ縺ｫ縺｡縺ｯ" — a whirlpool of meaningless letters came at you!'),
    defeatText: tra(
  [
        '「繧ｪ……オ……ワタシの 言葉が……戻って……いく……？」',
        '「つなげば 意味に なり、切りとれば 必要な 分だけ 取り出せる……。文字とは……そういう ものだった のか……。」',
        'モジバケーラの 体を つくっていた 文字の 渦が ほどけ、1つずつ 正しい 活字へと 戻っていった。',
      ],
      [
      '"繧ｪ... O... My words... are coming... back...?"',
      '"Joined, they gain meaning; cut, they give just what you need... So that is... what letters are..."',
      'The whirlpool of letters that made up Mojibakera\'s body unraveled, and each letter returned to proper type.',
      ],
    ),
    hp: 640,
    attack: [33, 40],
    exp: 760,
    gold: 600,
    intro: tra(
  [
        '（印刷所の 最奥。積み上げられた 活字が ざわめき、文字の 渦が 人の 形に なった……！）',
        '繧ｳ繝ｳ繝九メ繝……おっと 失礼。ワタシは モジバケーラ。この 町の 文字は すべて ワタシが 化けさせた。',
        '名前も 番号も、つなげず 切れず 読めもしない。キサマの 言葉も、意味の ない 記号に してやろう……！',
      ],
      [
      '(Deep in the print shop, piles of type rustled, and a whirlpool of letters took human form...!)',
      '繧ｳ繝ｳ繝九メ繝... Oh, pardon me. I am Mojibakera. I garbled every letter in this town.',
      'Names and numbers alike: you can\'t join them, can\'t cut them, can\'t even read them. I\'ll turn your words into meaningless symbols too...!',
      ],
    ),
    questions: [
      c('文字と 文字を つなぐ 記号は？', ['&', '+', '*', '#'], '&', '=A1&B1 で つながる。+ は 数の 足し算。', { q: 'Which symbol joins text to text?', explain: '=A1&B1 joins them. + is for adding numbers.' }),
      c('=LEFT(A1,FIND("@",A1)-1) の 役割は？', ['@ より 前を 取り出す', '@ より 後ろを 取り出す', '@ を 消す', '@ の 数を 数える'], '@ より 前を 取り出す', 'FIND で @ の 位置を 調べ、その 1つ手前まで LEFT で 取り出す。', { q: 'What does =LEFT(A1,FIND("@",A1)-1) do?', choices: ['Takes the part before the @', 'Takes the part after the @', 'Removes the @', 'Counts the @s'], answer: 'Takes the part before the @', explain: 'FIND locates the @, and LEFT takes everything up to one before it.' }),
      c('=TRIM(" A  B ") の 結果は？', ['"A B"', '"AB"', '" A  B "', '"A  B"'], '"A B"', 'TRIM は 前後の 空白を 消し、間の 空白は 1つに そろえる。', { q: 'What is the result of =TRIM(" A  B ")?', explain: 'TRIM removes the spaces at both ends and squeezes the spaces in between down to one.' }),
      c('「株式会社」を「(株)」に 置きかえる 関数は？', ['SUBSTITUTE', 'TRIM', 'REPLACE', 'FIND'], 'SUBSTITUTE', '=SUBSTITUTE(文字列, 探す文字, 置きかえる文字)。', { q: 'Which function replaces "Corporation" with "Corp."?', explain: '=SUBSTITUTE(text, text to find, replacement).' }),
      G.genLeftRightPick,
      G.genMidPick,
      G.genJoinPick,
      G.genTextFunction,
      G.genFormulaJoin,
      G.genFormulaLeftRight,
      G.genFormulaMid,
      G.genFormulaFind,
      G.genFormulaSumifs,
    ],
  },
} satisfies Record<string, BossDef>)

Object.assign(BOSSES, {
  shimekiris: {
    id: 'shimekiris',
    name: '刻を喰らう者 シメキリス',
    sprite: 'shimekiris',
    boss: true,
    attackText: tr('時計の 針を 振りかざし、締め切りの 日付を 次々と 奪っていく！', 'It brandished its clock hands and snatched away deadline after deadline!'),
    defeatText: tra(
  [
        '「時は……数えられる……。足して、引いて、月を 数え、年を 数え……。」',
        '「暦を 知る者からは……時を 奪えぬ……のか……。」',
        'シメキリスの 歯車が 1つずつ はずれ、時計塔の 鐘が 正しい 時を 打ちはじめた。',
      ],
      [
      '"Time... can be counted... Add, subtract, count the months, count the years..."',
      '"From one who knows the calendar... time cannot be stolen...?"',
      'One by one, Deadlinus\'s gears came loose, and the clock tower bell began to toll the correct time.',
      ],
    ),
    hp: 720,
    attack: [36, 43],
    exp: 880,
    gold: 680,
    intro: tra(
  [
        '（時計塔の 最上階。巨大な 歯車の 中から、針の 腕を 持つ 怪物が 現れた……！）',
        'チクタク……チクタク……。この 村の 暦は ワタシが 喰らった。',
        '何日後か、何曜日か、何年 たったか……もう 誰にも わからぬ。キサマの 締め切りも、永遠に 過ぎ去るが いい……！',
      ],
      [
      '(At the top of the clock tower, a monster with arms like clock hands emerged from the giant gears...!)',
      'Tick-tock... tick-tock... I have devoured this village\'s calendar.',
      'How many days later, which weekday, how many years have passed... no one can tell anymore. Let your deadlines slip away forever...!',
      ],
    ),
    questions: [
      c('表計算の 日付の 中身は？', ['1日 ＝ 1 の 数', '文字', '時刻', '曜日の 番号'], '1日 ＝ 1 の 数', 'だから 足し算・引き算で 何日後・何日間が わかる。', { q: 'What is a spreadsheet date really?', choices: ['A number where 1 day = 1', 'Text', 'A time', 'A weekday number'], answer: 'A number where 1 day = 1', explain: 'That\'s why adding and subtracting tells you days later and days between.' }),
      c('=EDATE("2026/1/31", 1) の 答えは？', ['2026/2/28', '2026/2/31', '2026/3/3', '2026/3/1'], '2026/2/28', '2月に 31日は ないので、その月の 末日（2月28日）に なる。', { q: 'What is =EDATE("2026/1/31", 1)?', explain: 'February has no 31st, so it becomes the last day of that month (Feb 28).' }),
      c('満年数を 出す DATEDIF の 3つ目は？', ['"Y"', '"M"', '"D"', '"YEAR"'], '"Y"', '"Y" で 満年数、"M" で 満月数、"D" で 日数。', { q: 'What is the 3rd part of DATEDIF for full years?', explain: '"Y" gives full years, "M" full months, and "D" days.' }),
      c('=EOMONTH(A1, 0) で 出るのは？', ['A1 の 月の 末日', 'A1 の 翌月の 1日', 'A1 の 月の 1日', 'A1 の 曜日'], 'A1 の 月の 末日', '0 で その月、1 で 翌月の 末日。', { q: 'What does =EOMONTH(A1, 0) give?', choices: ['The last day of A1\'s month', 'The 1st of the month after A1', 'The 1st of A1\'s month', 'A1\'s weekday'], answer: 'The last day of A1\'s month', explain: '0 gives that month, 1 gives the last day of the next month.' }),
      G.genDateAddPick,
      G.genDateDiffPick,
      G.genWeekdayPick,
      G.genDateFunction,
      G.genFormulaDateAdd,
      G.genFormulaDateDiff,
      G.genFormulaDatePart,
      G.genFormulaEdate,
      G.genFormulaFind,
    ],
  },
} satisfies Record<string, BossDef>)

Object.assign(BOSSES, {
  refera: {
    id: 'refera',
    name: '魔王レフエラー',
    sprite: 'refera',
    boss: true,
    attackText: tr('「#REF!」の 黒い 稲妻が、世界じゅうの 参照を 断ち切っていく！', 'Black lightning of "#REF!" severs references all over the world!'),
    defeatText: tra(
  [
        '「バカな……。ワシが 消した 参照を……つなぎ直した だと……？」',
        '「エラーは……終わりでは なく……直すための……合図……。そう 言うのか……人間……。」',
        '「時間を 奪えば……人は 何も できぬと 思って いた……。だが キサマは……仕組みで 時間を 取り戻した……。」',
        '魔王レフエラーの 体が「#REF!」の 文字と ともに 崩れ、まぶしい 光が 城を つつみこんだ……。',
      ],
      [
      '"Impossible... You reconnected... the references I erased...?"',
      '"Errors are... not the end... but a signal... to fix... Is that what you\'re saying... human...?"',
      '"I thought... if I stole their time... people could do nothing... But you... took time back... with systems..."',
      'Demon Lord Referror\'s body crumbled along with the letters "#REF!", and a dazzling light engulfed the castle...',
      ],
    ),
    hp: 960,
    attack: [42, 50],
    exp: 1500,
    gold: 1200,
    intro: tra(
  [
        '（玉座に 座る 黒い 影が、ゆっくりと 立ち上がった……！）',
        'よくぞ 来た、表の理を 知る者よ。ワシこそ 魔王レフエラー。',
        '人々から「時間」を 奪う ため、数式を 消し、参照を 断ち、世界を エラーで 埋めつくして やった。',
        '手作業に 追われ、雑用に 1日を 費やす……それこそが 人間の 正しい 姿よ。',
        '7つの 町で 覚えた 小手先の 魔法など、ワシの「#REF!」の 前には 無力！ さあ、すべての 参照を 失うが いい……！',
      ],
      [
      '(The black shadow seated on the throne slowly rose...!)',
      'Well met, you who know the Law of the Sheet. I am Demon Lord Referror.',
      'To steal "time" from the people, I erased formulas, severed references, and buried the world in errors.',
      'Chased by manual work, spending whole days on busywork... That is the proper state of humankind.',
      'The petty tricks you learned in seven towns are powerless before my "#REF!" Now, lose every last reference...!',
      ],
    ),
    questions: [
      c('エラーが 出たとき、まず すべきことは？', ['エラーの 種類から 原因を 読む', 'セルを 消す', '式を すべて 書き直す', '見なかった ことに する'], 'エラーの 種類から 原因を 読む', '#DIV/0!・#VALUE!・#NAME?・#REF!・#N/A……種類ごとに 原因と 直し方が 決まっている。', { q: 'When an error appears, what should you do first?', choices: ['Read the cause from the error\'s type', 'Delete the cell', 'Rewrite every formula', 'Pretend you never saw it'], answer: 'Read the cause from the error\'s type', explain: '#DIV/0!, #VALUE!, #NAME?, #REF!, #N/A... Each type has its own cause and fix.' }),
      c('列を 削除する 前に 確かめたいことは？', ['その 列を 使っている 式が ないか', '列の 幅', '文字の 色', 'シートの 名前'], 'その 列を 使っている 式が ないか', '使われている セルを 消すと #REF! に なる。', { q: 'What should you check before deleting a column?', choices: ['Whether any formula uses that column', 'The column width', 'The text color', 'The sheet name'], answer: 'Whether any formula uses that column', explain: 'Delete a cell that\'s in use, and you get #REF!.' }),
      G.genErrorCause,
      G.genErrorMeaning,
      G.genFormulaSafeDivide,
      G.genFormulaFixSum,
      G.genFormulaShare,
      G.genFormulaIf,
      G.genFormulaXlookup,
      G.genFormulaSumifs,
      G.genFormulaFind,
      G.genFormulaDateDiff,
      G.genFormulaTimes,
    ],
  },
} satisfies Record<string, BossDef>)

// ================================================================ フィールドの敵

const BASICS: QuestionSrc[] = [
  c('表計算の マス目の ひとつひとつを 何と呼ぶ？', ['セル', 'マス', 'ボックス', 'ピクセル'], 'セル', 'マス目は「セル」。セルが 集まって 表になる。', { q: 'What do you call each box in a spreadsheet grid?', choices: ['Cell', 'Square', 'Box', 'Pixel'], answer: 'Cell', explain: 'Each box is a "cell". Cells come together to make a table.' }),
  c('横方向の 並びを 何と呼ぶ？', ['行', '列', '段', '帯'], '行', '横が「行（ぎょう）」、縦が「列（れつ）」。', { q: 'What do you call a horizontal line of cells?', choices: ['Row', 'Column', 'Tier', 'Band'], answer: 'Row', explain: 'Horizontal is a "row", vertical is a "column".' }),
  c('縦方向の 並びを 何と呼ぶ？', ['列', '行', '柱', '段'], '列', '列は A, B, C… のアルファベットで表す。', { q: 'What do you call a vertical line of cells?', choices: ['Column', 'Row', 'Pillar', 'Tier'], answer: 'Column', explain: 'Columns are labeled with letters: A, B, C...' }),
  c('入力した内容を 確定するキーは？', ['Enter', 'Esc', 'F1', 'Alt'], 'Enter', 'Enter で確定して 下へ。Tab なら 右へ。', { q: 'Which key confirms what you typed?', explain: 'Enter confirms and moves down. Tab moves right.' }),
  c('ファイルを 上書き保存する ショートカットは？', ['Ctrl+S', 'Ctrl+P', 'Ctrl+W', 'Ctrl+N'], 'Ctrl+S', 'S は Save。こまめな保存が 身を守る。', { q: 'What\'s the shortcut to save the file?', explain: 'S is for Save. Saving often keeps you safe.' }),
  G.genAddress,
  G.genAddress,
  G.genNeighbor,
  G.genNeighbor,
  G.genRangeWrite,
]

const EDITS: QuestionSrc[] = [
  c('セルの一部だけ 直したい。押すキーは？', ['F2', 'F4', 'F12', 'Delete'], 'F2', 'F2 で 編集モード。ダブルクリックでもOK。', { q: 'You want to fix just part of a cell. Which key do you press?', explain: 'F2 enters edit mode. A double-click works too.' }),
  c('まちがえて消した！ 元に戻すのは？', ['Ctrl+Z', 'Ctrl+Y', 'Ctrl+X', 'Ctrl+Q'], 'Ctrl+Z', 'Ctrl+Z で ひとつ前に戻る。', { q: 'You deleted something by mistake! How do you undo it?', explain: 'Ctrl+Z takes you back one step.' }),
  c('切り取りの ショートカットは？', ['Ctrl+X', 'Ctrl+C', 'Ctrl+T', 'Ctrl+D'], 'Ctrl+X', '切り取って 貼り付けると「移動」になる。', { q: 'What\'s the shortcut to cut?', explain: 'Cut and then paste to "move" something.' }),
  c('入力中に やっぱり やめたい。押すキーは？', ['Esc', 'Enter', 'Tab', 'Shift'], 'Esc', 'Esc で 入力をキャンセル。', { q: 'You changed your mind while typing. Which key do you press?', explain: 'Esc cancels the entry.' }),
  G.genSeriesFill,
  G.genSeriesFill,
  G.genCopyFill,
  G.genMonthFill,
  G.genDayFill,
  G.genRangeWrite,
]

const CALCS: QuestionSrc[] = [
  c('合計を出す関数は？', ['SUM', 'ADD', 'TOTAL', 'PLUS'], 'SUM', '=SUM(範囲) で合計。', { q: 'Which function gives the total?', explain: '=SUM(range) gives the total.' }),
  c('「100÷4」を 数式で書くと？', ['=100/4', '=100÷4', '=100:4', '=100%4'], '=100/4', '割り算は /（スラッシュ）。', { q: 'How do you write "100 ÷ 4" as a formula?', explain: 'Division uses / (a slash).' }),
  G.genPrecedence,
  G.genPrecedence,
  G.genPrecedence,
  G.genDivision,
  G.genSumValues,
  G.genSumValues,
  G.genAverageValues,
  G.genRangeComma,
]

const FUNCS: QuestionSrc[] = [
  c('いちばん大きい値を 求める関数は？', ['MAX', 'MIN', 'TOP', 'BIG'], 'MAX', '最大は MAX、最小は MIN。', { q: 'Which function finds the largest value?', explain: 'The largest is MAX, the smallest is MIN.' }),
  c('数値が入った セルを 数える関数は？', ['COUNT', 'SUM', 'NUMBER', 'COUNTA'], 'COUNT', '空白以外 すべてなら COUNTA。', { q: 'Which function counts cells that contain numbers?', explain: 'To count every non-blank cell, use COUNTA.' }),
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
  c('数式を コピーすると 参照が いっしょに ずれる。これを 何という？', ['相対参照', '絶対参照', '循環参照', '外部参照'], '相対参照', 'ふつうの A1 は 相対参照。コピーした分だけ ずれる。', { q: 'When you copy a formula, its references shift along with it. What is this called?', choices: ['Relative reference', 'Absolute reference', 'Circular reference', 'External reference'], answer: 'Relative reference', explain: 'A plain A1 is a relative reference. It shifts by however far you copy.' }),
  c('「$A$1」のような 参照を 何という？', ['絶対参照', '相対参照', '複合参照', '名前参照'], '絶対参照', '$ で 固定された参照。コピーしても A1 のまま。', { q: 'What do you call a reference like "$A$1"?', choices: ['Absolute reference', 'Relative reference', 'Mixed reference', 'Named reference'], answer: 'Absolute reference', explain: 'A reference locked with $. It stays A1 even when copied.' }),
  c('参照の $ を 切り替える キーは？', ['F4', 'F2', 'F1', 'F12'], 'F4', '数式の入力中に F4。Mac は ⌘+T。', { q: 'Which key toggles the $ in a reference?', explain: 'Press F4 while typing a formula. On a Mac, ⌘+T.' }),
  G.genRelShift,
  G.genRelShift,
  G.genAbsCopy,
  G.genAbsCopy,
  G.genF4Cycle,
  G.genMixedMeaning,
  G.genFormulaTax,
]

const MIXES: QuestionSrc[] = [
  c('「$A1」と「A$1」のように、片方だけ 固定する参照は？', ['複合参照', '絶対参照', '相対参照', '半分参照'], '複合参照', '列だけ・行だけ 固定するのが 複合参照。', { q: 'What do you call a reference like "$A1" or "A$1" that locks only one part?', choices: ['Mixed reference', 'Absolute reference', 'Relative reference', 'Half reference'], answer: 'Mixed reference', explain: 'Locking only the column or only the row is a mixed reference.' }),
  c('各商品の 売上が 合計の 何％かを 表したものは？', ['構成比', '前年比', '達成率', '平均値'], '構成比', '構成比 ＝ 個別 ÷ 合計。合計は $ で固定。', { q: 'What do you call each item\'s sales as a percentage of the total?', choices: ['Share', 'Year-over-year', 'Achievement rate', 'Average'], answer: 'Share', explain: 'Share = each value ÷ total. Lock the total with $.' }),
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
  c('「10以上」を 表す 比較演算子は？', ['>=', '=>', '≧', '>'], '>=', '以上は >=、以下は <=。≧ は 使えない。', { q: 'Which comparison operator means "10 or more"?', explain: 'At least is >=, at most is <=. You can\'t use ≧.' }),
  c('比較の 結果として 返ってくるのは？', ['TRUE か FALSE', '0 か 100', '○ か ×', 'はい か いいえ'], 'TRUE か FALSE', '=A1>=10 のような 比較は TRUE（正しい）か FALSE（違う）に なる。', { q: 'What does a comparison return?', choices: ['TRUE or FALSE', '0 or 100', '○ or ×', 'Yes or No'], answer: 'TRUE or FALSE', explain: 'A comparison like =A1>=10 gives TRUE (right) or FALSE (wrong).' }),
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
  c('「A1が 5以上 または B1が 5以上」を 表す 式は？', ['OR(A1>=5,B1>=5)', 'AND(A1>=5,B1>=5)', 'OR(A1>5,B1>5)', 'IF(A1>=5,B1>=5)'], 'OR(A1>=5,B1>=5)', '「または」は OR。どちらか 1つでも 満たせば TRUE。', { q: 'Which expresses "A1 is 5 or more OR B1 is 5 or more"?', explain: '"Or" is OR. TRUE if even one is met.' }),
  c('3段階（A・B・C）に 分けたいとき、よく使う 方法は？', ['IFの中に IFを入れる', 'IFを 2つ 並べる', 'SUMを使う', 'COUNTIFを使う'], 'IFの中に IFを入れる', '=IF(A1>=80,"A",IF(A1>=60,"B","C")) のように 入れ子にする。', { q: 'What\'s the usual way to split into three levels (A, B, C)?', choices: ['Put an IF inside an IF', 'Put two IFs side by side', 'Use SUM', 'Use COUNTIF'], answer: 'Put an IF inside an IF', explain: 'Nest them, like =IF(A1>=80,"A",IF(A1>=60,"B","C")).' }),
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
  c('表の 左端の 列で 探して、同じ行の 右の 値を 取り出す 関数は？', ['VLOOKUP', 'COUNTIF', 'SUMIF', 'ROUND'], 'VLOOKUP', 'VLOOKUP（ブイ・ルックアップ）。V は Vertical（縦）の V。', { q: 'Which function searches the leftmost column of a table and returns a value to the right in the same row?', explain: 'VLOOKUP. The V stands for Vertical.' }),
  c('VLOOKUP で 見つからないと 出る エラーは？', ['#N/A', '#DIV/0!', '#NAME?', '#REF!'], '#N/A', '#N/A は「見つからない」の 意味。', { q: 'Which error does VLOOKUP give when it can\'t find something?', explain: '#N/A means "not found."' }),
  c('番号や 名前を ぴったり 探すとき、VLOOKUP の 4つ目は？', ['FALSE', 'TRUE', '0以上', '"完全"'], 'FALSE', 'FALSE で 完全一致。書き忘れると 近似一致に なって、思わぬ 値が 出ることも。', { q: 'When looking up an exact number or name, what\'s the 4th part of VLOOKUP?', choices: ['FALSE', 'TRUE', '0 or more', '"exact"'], answer: 'FALSE', explain: 'FALSE means an exact match. Forget it, and you get an approximate match that can return surprising values.' }),
  G.genVlookupPick,
  G.genVlookupPick,
  G.genColIndex,
  G.genColIndex,
  G.genFormulaVlookup,
]
const SEARCHES: QuestionSrc[] = [
  c('=IFERROR(VLOOKUP(…),"なし") の 役割は？', ['見つからない ときだけ "なし" に する', 'いつも "なし" に する', 'エラーの 数を 数える', '"なし" を 探す'], '見つからない ときだけ "なし" に する', 'IFERROR は エラーの ときだけ 2つ目の 値を 出す。', { q: 'What does =IFERROR(VLOOKUP(…),"None") do?', choices: ['Shows "None" only when not found', 'Always shows "None"', 'Counts the errors', 'Searches for "None"'], answer: 'Shows "None" only when not found', explain: 'IFERROR shows the 2nd value only when there\'s an error.' }),
  c('XLOOKUP の 4つ目の 引数は？', ['見つからない ときの 値', '列番号', '完全一致か どうか', '探す 行数'], '見つからない ときの 値', '=XLOOKUP(探す値, 探す列, 取り出す列, "なし")', { q: 'What\'s the 4th argument of XLOOKUP?', choices: ['The value if not found', 'The column number', 'Whether to match exactly', 'The number of rows to search'], answer: 'The value if not found', explain: '=XLOOKUP(value to find, column to search, column to return, "None")' }),
  c('近似一致（TRUE）で 使う 区切りの 表は どう 並べる？', ['小さい順', '大きい順', 'バラバラで よい', '五十音順'], '小さい順', '近似一致は「探す値 以下で いちばん 大きい 値」を 選ぶので、小さい順に 並べておく。', { q: 'How do you sort a cutoff table used with approximate match (TRUE)?', choices: ['Smallest first', 'Largest first', 'Any order', 'Alphabetical'], answer: 'Smallest first', explain: 'Approximate match picks "the largest value at or below the one you\'re looking for," so sort it smallest first.' }),
  G.genApproxPick,
  G.genApproxPick,
  G.genFormulaXlookup,
  G.genFormulaIferror,
  G.genFormulaVlookup,
]

const TALLIES: QuestionSrc[] = [
  c('条件を 2つ 以上 つけて 数える 関数は？', ['COUNTIFS', 'COUNTIF', 'COUNT', 'COUNTA'], 'COUNTIFS', 'COUNTIF は 条件 1つ。最後に S が つくと 条件を いくつも 並べられる。', { q: 'Which function counts with two or more conditions?', explain: 'COUNTIF takes one condition. With an S at the end, you can line up as many as you like.' }),
  c('=COUNTIFS(A2:A9,"北",B2:B9,"夜") が 数えるのは？', ['北 で、しかも 夜 の 行', '北 か 夜 の どちらかの 行', '北 の 行と 夜 の 行の 合計', '夜 の 行だけ'], '北 で、しかも 夜 の 行', 'COUNTIFS は すべての 条件を 満たす（AND の）行を 数える。', { q: 'What does =COUNTIFS(A2:A9,"North",B2:B9,"Night") count?', choices: ['Rows that are North AND Night', 'Rows that are either North or Night', 'North rows plus Night rows', 'Only Night rows'], answer: 'Rows that are North AND Night', explain: 'COUNTIFS counts the rows that meet every condition (AND).' }),
  G.genCountifsPick,
  G.genCountifsPick,
  G.genIfsFunction,
  G.genSumifsOrder,
  G.genFormulaCountifs,
  G.genFormulaSumifs,
]
const TABLES: QuestionSrc[] = [
  c('=AVERAGEIF(A2:A8,"赤組",B2:B8) の B2:B8 は？', ['平均する 範囲', '条件の 範囲', '条件', '答えの セル'], '平均する 範囲', 'AVERAGEIF は SUMIF と 同じ 並び（条件の範囲, 条件, 平均する範囲）。', { q: 'In =AVERAGEIF(A2:A8,"Red",B2:B8), what is B2:B8?', choices: ['The range to average', 'The range to check', 'The condition', 'The answer cell'], answer: 'The range to average', explain: 'AVERAGEIF uses the same order as SUMIF (range to check, condition, range to average).' }),
  c('地区ごとの 集計表で、条件に 地区の セル E2 を 使う 理由は？', ['コピーすると 地区が 自動で 変わる', '計算が 速い', '" が いらない だけ', 'エラーが 出ない'], 'コピーすると 地区が 自動で 変わる', '見出しの セルを 条件に すれば、1つの 式を コピーするだけで 表が 埋まる。', { q: 'In a totals-by-district table, why use the district cell E2 as the condition?', choices: ['The district changes automatically when copied', 'It calculates faster', 'You just skip typing "', 'No errors appear'], answer: 'The district changes automatically when copied', explain: 'Use the heading cell as the condition, and copying one formula fills the whole table.' }),
  G.genPivotArea,
  G.genPivotArea,
  G.genCrossRef,
  G.genIfsFunction,
  G.genFormulaAvgif,
  G.genFormulaSumifs,
]

const SPACES: QuestionSrc[] = [
  c('文字と 文字を つなぐ 記号は？', ['&', '+', ',', ':'], '&', '=A1&B1 のように 使う。', { q: 'Which symbol joins text to text?', explain: 'Use it like =A1&B1.' }),
  c('=A1&" "&B1 の " " は 何？', ['空白 1文字', '何も ない 文字', 'エラー', '改行'], '空白 1文字', '" " は 空白 1文字の 文字列。名字と 名前の 間に はさむ。', { q: 'In =A1&" "&B1, what is " "?', choices: ['One space character', 'Empty text', 'An error', 'A line break'], answer: 'One space character', explain: '" " is text made of one space. Put it between the first and last names.' }),
  c('よけいな 空白を 消す 関数は？', ['TRIM', 'LEN', 'CLEAN', 'SUBSTITUTE'], 'TRIM', 'TRIM は 前後の 空白を 消し、間の 空白を 1つに そろえる。', { q: 'Which function removes extra spaces?', explain: 'TRIM removes the spaces at both ends and squeezes the spaces in between down to one.' }),
  G.genJoinPick,
  G.genJoinPick,
  G.genLenPick,
  G.genFormulaJoin,
  G.genFormulaLeftRight,
]
const FRAGMENTS: QuestionSrc[] = [
  c('=MID(文字列, 4, 2) の 4 は？', ['何文字目から', '何文字', '何回', '何行目'], '何文字目から', 'MID(文字列, 何文字目から, 何文字)。', { q: 'In =MID(text, 4, 2), what is the 4?', choices: ['Where to start', 'How many characters', 'How many times', 'Which row'], answer: 'Where to start', explain: 'MID(text, start position, count).' }),
  c('「@」が 何文字目に あるかを 調べる 関数は？', ['FIND', 'LEN', 'MID', 'COUNTIF'], 'FIND', '=FIND("@",A1)。LEFT や MID と 組み合わせて 使う。', { q: 'Which function finds which character the "@" is?', explain: '=FIND("@",A1). Use it together with LEFT or MID.' }),
  G.genLeftRightPick,
  G.genLeftRightPick,
  G.genMidPick,
  G.genTextFunction,
  G.genFormulaMid,
  G.genFormulaFind,
]

const CALENDARS: QuestionSrc[] = [
  c('日付「2026/10/1」に 7 を 足すと？', ['2026/10/8', '2026/10/17', '2026/17/1', 'エラー'], '2026/10/8', '日付は「1日 ＝ 1」の 数。7 を 足せば 7日後。', { q: 'What do you get if you add 7 to the date "2026/10/1"?', choices: ['2026/10/8', '2026/10/17', '2026/17/1', 'An error'], answer: '2026/10/8', explain: 'A date is a number where 1 day = 1. Add 7, and you get 7 days later.' }),
  c('日付から「月」を 取り出す 関数は？', ['MONTH', 'MID', 'DAY', 'MON'], 'MONTH', '年 YEAR、月 MONTH、日 DAY。', { q: 'Which function pulls the "month" out of a date?', explain: 'Year is YEAR, month is MONTH, and day is DAY.' }),
  G.genDateAddPick,
  G.genDateDiffPick,
  G.genDateFunction,
  G.genFormulaDateAdd,
  G.genFormulaDatePart,
  G.genFormulaDateDiff,
]
const CLOCKS: QuestionSrc[] = [
  c('=WEEKDAY(A1,2) の 2 の 意味は？', ['月曜を 1 として 数える', '2日後の 曜日', '2週目', '火曜を 1 として 数える'], '月曜を 1 として 数える', '2 を 書くと 月曜 1 〜 日曜 7。', { q: 'What does the 2 in =WEEKDAY(A1,2) mean?', choices: ['Count Monday as 1', 'The weekday 2 days later', 'The 2nd week', 'Count Tuesday as 1'], answer: 'Count Monday as 1', explain: 'With 2, Monday is 1 through Sunday 7.' }),
  c('3か月後の 同じ日を 出す 関数は？', ['EDATE', 'EOMONTH', 'DATEDIF', 'MONTH'], 'EDATE', '=EDATE(日付, 3)。', { q: 'Which function gives the same day 3 months later?', explain: '=EDATE(date, 3).' }),
  G.genWeekdayPick,
  G.genWeekdayPick,
  G.genDateFunction,
  G.genFormulaEdate,
  G.genFormulaDateDiff,
  G.genFormulaDatePart,
]

const ZEROS: QuestionSrc[] = [
  c('0 で 割ったときに 出る エラーは？', ['#DIV/0!', '#VALUE!', '#N/A', '#REF!'], '#DIV/0!', 'DIV は 割る。0 では 割れない。', { q: 'Which error appears when you divide by 0?', explain: 'DIV means divide. You can\'t divide by 0.' }),
  c('=IFERROR(A1/B1,0) の 0 は？', ['エラーの ときに 出す 値', '割る数', '小数点の けた', '最初に 出る 値'], 'エラーの ときに 出す 値', 'IFERROR(計算, エラーの ときの 値)。', { q: 'In =IFERROR(A1/B1,0), what is the 0?', choices: ['The value to show if there\'s an error', 'The divisor', 'The number of decimal places', 'The value shown first'], answer: 'The value to show if there\'s an error', explain: 'IFERROR(calculation, value if error).' }),
  G.genErrorCause,
  G.genErrorMeaning,
  G.genFormulaSafeDivide,
  G.genFormulaFixSum,
  G.genFormulaSumIf,
  G.genFormulaVlookup,
]
const NAMELESS: QuestionSrc[] = [
  c('文字に " を 付け忘れると 出る エラーは？', ['#NAME?', '#VALUE!', '#DIV/0!', '#REF!'], '#NAME?', '" が ないと、表計算ソフトは その 文字を 名前だと 思ってしまう。', { q: 'Which error appears when you forget the " around text?', explain: 'Without ", the spreadsheet thinks the text is a name.' }),
  c('参照先の セルを 削除すると 出る エラーは？', ['#REF!', '#N/A', '#NAME?', '#VALUE!'], '#REF!', 'REF は reference（参照）。', { q: 'Which error appears when you delete a referenced cell?', explain: 'REF stands for reference.' }),
  G.genErrorCause,
  G.genErrorMeaning,
  G.genFormulaFixSum,
  G.genFormulaJoin,
  G.genFormulaEdate,
  G.genFormulaCountifs,
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
  zerowarin: { id: 'zerowarin', name: 'ゼロワリン', sprite: 'zerowarin', hp: 222, attack: [37, 43], exp: 190, gold: 140, intro: [], questions: ZEROS },
  nanashi: { id: 'nanashi', name: 'ナナシ', sprite: 'nanashi', hp: 240, attack: [39, 45], exp: 205, gold: 150, intro: [], questions: NAMELESS },
  karendaru: { id: 'karendaru', name: 'カレンダル', sprite: 'karendaru', hp: 190, attack: [33, 39], exp: 160, gold: 120, intro: [], questions: CALENDARS },
  tokeidori: { id: 'tokeidori', name: 'トケイドリ', sprite: 'tokeidori', hp: 206, attack: [35, 41], exp: 174, gold: 130, intro: [], questions: CLOCKS },
  kuuhaku: { id: 'kuuhaku', name: 'クウハクン', sprite: 'kuuhaku', hp: 160, attack: [29, 35], exp: 132, gold: 100, intro: [], questions: SPACES },
  kirehashi: { id: 'kirehashi', name: 'キレハシ', sprite: 'kirehashi', hp: 176, attack: [31, 37], exp: 146, gold: 110, intro: [], questions: FRAGMENTS },
  dupli: { id: 'dupli', name: 'ダブリン', sprite: 'dupli', hp: 132, attack: [25, 31], exp: 104, gold: 80, intro: [], questions: TALLIES },
  chirakari: { id: 'chirakari', name: 'チラカリス', sprite: 'chirakari', hp: 146, attack: [27, 33], exp: 118, gold: 90, intro: [], questions: TABLES },
  shiori: { id: 'shiori', name: 'シオリムシ', sprite: 'shiori', hp: 118, attack: [23, 29], exp: 90, gold: 70, intro: [], questions: SEARCHES },
}

export const ENEMIES: Record<string, BossDef> = { ...BOSSES, ...FIELD_ENEMIES }
