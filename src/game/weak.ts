/**
 * まちがえた 問題（苦手）の 記録。セーブとは 別に 保存するので、
 * タイトル画面の 復習モードからも 使える。
 * 問題は「敵ID#番号」で 記録する（自動生成の 問題なら、出すたびに 数値が 変わる＝類題に なる）
 */
const KEY = 'excel-quest-weak-v1'
const MAX = 80

export const questionKey = (enemyId: string, i: number) => `${enemyId}#${i}`

export function getWeak(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function setWeak(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)))
  } catch {
    /* 保存できない環境では 何もしない */
  }
}

/** まちがえたら 苦手に 入れ、正解したら 外す */
export function markWeak(key: string, ok: boolean) {
  const list = getWeak()
  if (ok) {
    if (list.includes(key)) setWeak(list.filter((k) => k !== key))
  } else if (!list.includes(key)) setWeak([...list, key])
}
