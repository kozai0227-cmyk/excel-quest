import { FUNC_GUIDES } from '../data/funcGuides'
import { SKILLS } from '../data/skills'
import { useKeys } from '../game/keys'
import { sfx } from '../game/sound'

/** 文の 中の 数式（= で 始まる 部分）を 目立たせる */
const withCode = (text: string) =>
  text.split(/(=[^\s　「」（）]+(?:\([^　]*?\))?)/).map((part, i) => (part.startsWith('=') ? <code key={i}>{part}</code> : part))

/** 例の 1行：「　→」の 左が 数式や 操作、右が 結果の 説明 */
function Example({ line }: { line: string }) {
  const [left, right] = line.split('　→')
  return (
    <li>
      {withCode(left)}
      {right !== undefined && <span className="fc-arrow"> → {right.trim()}</span>}
    </li>
  )
}

/** 教会の「関数の 相談」：1つの 関数・技の 解説カード */
export function FuncCard({ id, learned, onClose }: { id: string; learned: boolean; onClose(): void }) {
  const skill = SKILLS[id]
  const g = FUNC_GUIDES[id]
  useKeys((k) => {
    if (k === 'ok' || k === 'cancel') {
      sfx('cancel')
      onClose()
    }
  })
  return (
    <div className="func-card-layer">
      <div className="win func-card">
        <div className="fc-head">
          <h3>{skill.name}</h3>
          <span className={`fc-badge ${learned ? 'on' : ''}`}>{learned ? '習得ずみ' : 'この町で 覚えられる'}</span>
        </div>
        <p className="fc-use">{g.use}</p>
        <h4>書き方</h4>
        <code className="fc-form">{g.form}</code>
        <h4>例</h4>
        <ul className="fc-ex">
          {g.ex.map((e) => (
            <Example key={e} line={e} />
          ))}
        </ul>
        <h4>ポイント</h4>
        <p className="fc-tip">{g.tip}</p>
        <button
          type="button"
          className="btn"
          data-nosfx
          onClick={() => {
            sfx('cancel')
            onClose()
          }}
        >
          とじる
        </button>
      </div>
    </div>
  )
}
