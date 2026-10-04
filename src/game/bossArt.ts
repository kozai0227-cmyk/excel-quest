/**
 * ボス戦用の 高解像度ドット絵（64×64）。
 * 図形を 1ドットずつ はっきり 塗り、最後に 陰影（左上から 光）と 輪郭線を 自動で つける。
 * フィールドの 小さな 絵（16×16）は spriteParts.ts のまま。
 */

export const BOSS_SIZE = 64
const N = BOSS_SIZE

type G = CanvasRenderingContext2D
type Pt = [number, number]

// ---------------------------------------------------------------- くっきり塗る 道具
/** パスの 内側の ドットだけを 塗る（アンチエイリアスの 中間色を 出さない） */
function fill(g: G, path: Path2D, col: string | null) {
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (!g.isPointInPath(path, x + 0.5, y + 0.5)) continue
      if (col === null) g.clearRect(x, y, 1, 1)
      else {
        g.fillStyle = col
        g.fillRect(x, y, 1, 1)
      }
    }
}
const ellipse = (cx: number, cy: number, rx: number, ry: number) => {
  const p = new Path2D()
  p.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  return p
}
const polygon = (pts: Pt[]) => {
  const p = new Path2D()
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)))
  p.closePath()
  return p
}
const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
  const p = new Path2D()
  p.roundRect(x, y, w, h, r)
  return p
}

function painter(g: G) {
  return {
    ell: (cx: number, cy: number, rx: number, ry: number, col: string | null) => fill(g, ellipse(cx, cy, rx, ry), col),
    poly: (pts: Pt[], col: string | null) => fill(g, polygon(pts), col),
    box: (x: number, y: number, w: number, h: number, col: string, r = 0) => (r ? fill(g, roundRect(x, y, w, h, r), col) : rect(x, y, w, h, col)),
    path: (p: Path2D, col: string | null) => fill(g, p, col),
    px: (x: number, y: number, col: string) => rect(x, y, 1, 1, col),
    line: (x0: number, y0: number, x1: number, y1: number, col: string, w = 1) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
      for (let i = 0; i <= n; i++) rect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), w, w, col)
    },
  }
  function rect(x: number, y: number, w: number, h: number, col: string) {
    g.fillStyle = col
    g.fillRect(Math.round(x), Math.round(y), w, h)
  }
}
type Paint = ReturnType<typeof painter>

// ---------------------------------------------------------------- 仕上げ（陰影・輪郭）
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

/**
 * 輪郭と 陰影を つける。glow の 色は 光っている 部分なので 陰影を つけない。
 */
function finish(g: G, glow: string[]) {
  const img = g.getImageData(0, 0, N, N)
  const src = new Uint8ClampedArray(img.data)
  const d = img.data
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N ? -1 : (y * N + x) * 4)
  const key = (i: number) => (i < 0 || src[i + 3] < 128 ? 'none' : `${src[i]},${src[i + 1]},${src[i + 2]}`)
  const glowKeys = new Set(
    glow.map((h) => {
      const n = parseInt(h.slice(1), 16)
      return `${n >> 16},${(n >> 8) & 255},${n & 255}`
    }),
  )
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = at(x, y)
      const k = key(i)
      if (k === 'none') {
        d[i + 3] = 0
        continue
      }
      d[i + 3] = 255
      if (glowKeys.has(k)) continue
      let f = 1
      // 左上が ちがう色（ふち）なら 明るく、右下が ちがう色なら 暗く
      if (key(at(x, y - 1)) !== k || key(at(x - 1, y)) !== k) f = 1.25
      else if (key(at(x, y + 1)) !== k || key(at(x + 1, y)) !== k) f = 0.7
      // 全体に 左上から 光が 当たる（ドットの ディザで 段階を つける）
      const t = (x * 0.35 + y * 0.65) / N + (BAYER[y & 3][x & 3] / 16 - 0.5) * 0.22
      if (t > 0.74) f *= 0.8
      else if (t < 0.24) f *= 1.1
      d[i] = src[i] * f
      d[i + 1] = src[i + 1] * f
      d[i + 2] = src[i + 2] * f
    }
  // 輪郭：となりの 色を 暗くした 線（黒一色より やわらかい）
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = at(x, y)
      if (src[i + 3] >= 128) continue
      const nb = [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)].find((j) => j >= 0 && src[j + 3] >= 128)
      if (nb === undefined) continue
      d[i] = src[nb] * 0.22
      d[i + 1] = src[nb + 1] * 0.2
      d[i + 2] = src[nb + 2] * 0.28 + 8
      d[i + 3] = 255
    }
  g.putImageData(img, 0, 0)
}

// ---------------------------------------------------------------- 各ボス
/** 表計算の セル（散らかりセルイムの 体に 刺さっている） */
function cell(p: Paint, x: number, y: number, w: number, h: number) {
  p.box(x, y, w, h, '#f4f8f4')
  p.box(x, y, w, 2, '#4caf6a')
  for (let i = x + 3; i < x + w; i += 3) p.line(i, y, i, y + h - 1, '#9ab0a0')
  p.line(x, y + Math.floor(h / 2) + 1, x + w - 1, y + Math.floor(h / 2) + 1, '#9ab0a0')
}

const DRAW: Record<string, { glow: string[]; draw(p: Paint): void }> = {
  // 散らかりセルイム：表の セルの 形を した 巨大な ゼリー。まわりに セルを 散らかしている
  slime: {
    glow: ['#ffffff', '#141018', '#c8ffd8', '#ff5070'],
    draw(p) {
      // たれた しずく（足もと）
      p.ell(14, 58, 5, 3.5, '#2f9e47')
      p.ell(44, 59, 6, 3.5, '#2f9e47')
      // 奥行き：上の面と 右の面
      p.poly([[9, 15], [49, 15], [57, 8], [17, 8]], '#8ee89a')
      p.poly([[49, 15], [57, 8], [57, 50], [49, 58]], '#23853a')
      // 正面（四角い ゼリー）
      p.box(7, 15, 43, 43, '#36b450', 5)
      p.ell(28, 50, 18, 6, '#4fcf68')
      p.box(11, 19, 4, 13, '#c8ffd8', 2)
      p.box(11, 34, 3, 3, '#c8ffd8')
      // セルの 区切り線（2×2 の マス目）
      p.line(28, 16, 28, 57, '#1f7a36')
      p.line(8, 36, 49, 36, '#1f7a36')
      // 目と 怒った まゆ
      p.ell(19, 28, 6, 6.5, '#ffffff')
      p.ell(38, 28, 6, 6.5, '#ffffff')
      p.ell(20.5, 30, 2.8, 3.6, '#141018')
      p.ell(36.5, 30, 2.8, 3.6, '#141018')
      p.box(19, 28, 2, 2, '#ffffff')
      p.box(35, 28, 2, 2, '#ffffff')
      p.poly([[10, 19], [26, 23], [25, 26], [11, 22]], '#16502a')
      p.poly([[47, 19], [31, 23], [32, 26], [46, 22]], '#16502a')
      // 口と きば
      p.box(17, 42, 23, 9, '#5a1020', 3)
      p.box(22, 47, 13, 3, '#ff5070', 1)
      p.poly([[19, 42], [23, 42], [21, 47]], '#ffffff')
      p.poly([[34, 42], [38, 42], [36, 47]], '#ffffff')
      // 散らかった セル
      cell(p, 0, 40, 7, 6)
      cell(p, 56, 52, 8, 6)
      cell(p, 2, 2, 8, 6)
      cell(p, 54, 0, 9, 6)
      cell(p, 33, 1, 7, 5)
    },
  },

  // 手計算ゴーレム：胸に そろばんを 埋めこんだ 石の 巨人
  golem: {
    glow: ['#ff3020', '#ffd0a0'],
    draw(p) {
      p.box(19, 46, 11, 16, '#857560', 2)
      p.box(34, 46, 11, 16, '#857560', 2)
      p.box(13, 20, 38, 31, '#a8977a', 5)
      p.box(1, 22, 14, 26, '#9a8a6e', 4)
      p.box(49, 22, 14, 26, '#9a8a6e', 4)
      p.ell(8, 49, 7.5, 6.5, '#857560')
      p.ell(56, 49, 7.5, 6.5, '#857560')
      p.ell(13, 22, 8, 6, '#b8a888')
      p.ell(51, 22, 8, 6, '#b8a888')
      p.box(21, 3, 22, 19, '#a8977a', 4)
      // 顔
      p.box(23, 9, 18, 3, '#6e5e48')
      p.box(25, 12, 5, 3, '#ff3020')
      p.box(34, 12, 5, 3, '#ff3020')
      p.box(26, 13, 2, 1, '#ffd0a0')
      p.box(35, 13, 2, 1, '#ffd0a0')
      p.box(27, 17, 10, 2, '#3a2a1a')
      // こけ
      p.ell(9, 20, 3, 1.5, '#5a8a3a')
      p.ell(52, 19, 4, 1.5, '#5a8a3a')
      p.ell(31, 4, 4, 1.2, '#5a8a3a')
      // ひび
      p.line(4, 30, 8, 36, '#5a4a36')
      p.line(8, 36, 6, 41, '#5a4a36')
      p.line(57, 28, 54, 34, '#5a4a36')
      p.line(39, 5, 37, 9, '#5a4a36')
      // 胸の そろばん
      p.box(19, 27, 26, 18, '#6a3a1a', 1)
      p.box(21, 29, 22, 14, '#2a1a10')
      p.line(21, 34, 42, 34, '#7a5030')
      for (const y of [31, 37, 40]) p.line(21, y, 42, y, '#c09060')
      const beads: [number, number, string][] = [
        [24, 31, '#e04030'], [28, 31, '#e04030'], [37, 31, '#e04030'],
        [23, 37, '#f0c040'], [32, 37, '#f0c040'], [36, 37, '#f0c040'], [40, 37, '#f0c040'],
        [26, 40, '#40a0e0'], [30, 40, '#40a0e0'], [39, 40, '#40a0e0'],
      ]
      for (const [x, y, c] of beads) p.ell(x, y + 0.5, 1.6, 1.4, c)
    },
  },

  // ズレズレ・ミラージュ：映った 顔が ずれて 見える 呪いの 大鏡
  mirage: {
    glow: ['#ffffff', '#ff4080', '#2a0a3a', '#e8fbff'],
    draw(p) {
      p.poly([[32, 0], [36, 5], [32, 9], [28, 5]], '#f0c840')
      p.ell(32, 5, 1.6, 1.6, '#e03060')
      p.poly([[11, 22], [1, 32], [11, 42]], '#d8a830')
      p.poly([[53, 22], [63, 32], [53, 42]], '#d8a830')
      p.poly([[25, 57], [39, 57], [32, 63]], '#d8a830')
      p.ell(32, 32, 22, 28.5, '#d8a830')
      p.ell(32, 32, 19.5, 26, '#a87a18')
      for (const [x, y] of [[32, 5], [12, 18], [52, 18], [12, 46], [52, 46], [32, 59]] as Pt[]) p.ell(x, y, 1.5, 1.5, '#5ac0e0')
      p.ell(32, 32, 17, 23.5, '#a8def4')
      p.ell(32, 42, 15, 13, '#86c4ea')
      // ずれた 顔（残像）
      p.ell(28, 30, 3, 4, '#b48ce0')
      p.ell(42, 30, 3, 4, '#b48ce0')
      const ghost = new Path2D()
      ghost.moveTo(23, 41)
      ghost.quadraticCurveTo(35, 52, 46, 41)
      ghost.quadraticCurveTo(35, 47, 23, 41)
      p.path(ghost, '#b48ce0')
      // 本体の 顔
      p.poly([[21, 23], [29, 27], [28, 31], [21, 28]], '#2a0a3a')
      p.poly([[43, 23], [35, 27], [36, 31], [43, 28]], '#2a0a3a')
      p.box(25, 27, 2, 2, '#ff4080')
      p.box(38, 27, 2, 2, '#ff4080')
      const grin = new Path2D()
      grin.moveTo(20, 37)
      grin.quadraticCurveTo(32, 50, 44, 37)
      grin.quadraticCurveTo(32, 43, 20, 37)
      p.path(grin, '#2a0a3a')
      for (const x of [25, 29, 33, 37]) p.poly([[x, 40], [x + 3, 40.5], [x + 1.5, 43]], '#ffffff')
      // 光の 反射と 鏡の かけら
      p.line(18, 20, 23, 13, '#e8fbff', 2)
      p.line(19, 26, 20, 24, '#e8fbff')
      p.poly([[2, 6], [8, 4], [5, 11]], '#c8f0ff')
      p.poly([[56, 4], [62, 9], [56, 11]], '#c8f0ff')
      p.poly([[57, 52], [62, 55], [58, 60]], '#c8f0ff')
    },
  },

  // モシナラバ：「もしも」に とりつかれた 幽霊船の 船長
  captain: {
    glow: ['#60ff90', '#f0c040', '#ffffff'],
    draw(p) {
      // 幽霊の 体（下は ゆらゆら）
      const tail = new Path2D()
      tail.moveTo(13, 34)
      tail.lineTo(51, 34)
      tail.quadraticCurveTo(56, 48, 53, 56)
      for (let i = 0; i < 6; i++) {
        const x = 53 - i * 7
        tail.quadraticCurveTo(x - 1.5, 63, x - 3.5, 57)
        tail.quadraticCurveTo(x - 5.5, 52, x - 7, 57)
      }
      tail.quadraticCurveTo(8, 48, 13, 34)
      p.path(tail, '#a8e8e0')
      // 上着
      p.poly([[15, 33], [49, 33], [53, 52], [11, 52]], '#2c4a7a')
      p.poly([[28, 33], [36, 33], [32, 45]], '#d8f0ea')
      p.line(28, 33, 32, 45, '#f0c040')
      p.line(36, 33, 32, 45, '#f0c040')
      for (const y of [40, 46]) {
        p.ell(24, y, 1.5, 1.5, '#f0c040')
        p.ell(40, y, 1.5, 1.5, '#f0c040')
      }
      p.box(11, 49, 42, 3, '#1a1420')
      p.box(30, 48, 5, 5, '#f0c040')
      p.box(31, 49, 3, 3, '#1a1420')
      // 腕と かぎ爪
      p.box(5, 34, 9, 12, '#2c4a7a', 3)
      p.ell(8, 48, 3.5, 3, '#a8e8e0')
      p.box(50, 34, 9, 11, '#2c4a7a', 3)
      p.box(53, 45, 4, 3, '#8a6a3a')
      p.ell(56.5, 53, 4.5, 4.5, '#c0c8d0')
      p.ell(55.5, 52, 2.5, 2.5, null)
      p.poly([[51, 51], [55, 51], [55, 54], [51, 54]], null)
      // 顔
      p.ell(32, 25, 12, 10, '#d8f4f0')
      p.ell(27, 24, 3.5, 3.5, '#102018')
      p.ell(37, 24, 3.5, 3.5, '#102018')
      p.box(26, 23, 2, 2, '#60ff90')
      p.box(36, 23, 2, 2, '#60ff90')
      p.poly([[31, 27], [33, 27], [32, 29]], '#102018')
      const beard = new Path2D()
      beard.moveTo(22, 29)
      beard.quadraticCurveTo(32, 36, 42, 29)
      beard.quadraticCurveTo(40, 40, 32, 40)
      beard.quadraticCurveTo(24, 40, 22, 29)
      p.path(beard, '#bfe4de')
      p.box(28, 31, 8, 1, '#5a8a84')
      // 三角帽と どくろ
      p.poly([[4, 17], [32, 3], [60, 17], [50, 21], [14, 21]], '#1a1420')
      p.line(10, 19, 54, 19, '#f0c040')
      p.line(26, 9, 38, 15, '#f4f0e0')
      p.line(26, 15, 38, 9, '#f4f0e0')
      p.ell(32, 11, 3.5, 3.2, '#f4f0e0')
      p.box(30, 10, 1, 2, '#1a1420')
      p.box(33, 10, 1, 2, '#1a1420')
      p.ell(59, 6, 3, 3, '#ffffff')
      p.box(58, 4, 2, 2, '#60ff90')
    },
  },

  // ミツカラーヌ：大書庫を 呑みこんだ 一つ目の 魔導書
  mitsukaranu: {
    glow: ['#ffffff', '#d02040', '#ff5060', '#100008'],
    draw(p) {
      // しおりの リボン
      p.poly([[17, 54], [22, 54], [22, 63], [19.5, 60], [17, 63]], '#c01838')
      p.poly([[40, 54], [45, 54], [45, 62], [42.5, 59], [40, 62]], '#e0b040')
      // 本体
      p.box(12, 5, 46, 52, '#3a1a5a', 4)
      p.box(51, 8, 7, 47, '#f0e8d0')
      for (let y = 10; y < 54; y += 3) p.line(51, y, 57, y, '#c8bca0')
      p.box(6, 3, 46, 52, '#6a2a9a', 4)
      p.box(9, 6, 40, 46, '#7a3aaa', 2)
      // 金の 縁どり
      for (const [x, y, w, h] of [[9, 6, 40, 2], [9, 50, 40, 2], [9, 6, 2, 46], [47, 6, 2, 46]] as [number, number, number, number][]) p.box(x, y, w, h, '#e0b040')
      for (const [x, y] of [[10, 7], [48, 7], [10, 51], [48, 51]] as Pt[]) p.poly([[x, y - 3], [x + 3, y], [x, y + 3], [x - 3, y]], '#f0d070')
      // 大きな 目
      p.ell(29, 28, 15, 11, '#f4f0e0')
      p.ell(29, 28, 7.5, 8.5, '#d02040')
      p.ell(29, 28, 5, 6, '#ff5060')
      p.box(28, 21, 2, 14, '#100008')
      p.box(25, 24, 2, 2, '#ffffff')
      p.line(14, 28, 10, 25, '#d02040')
      p.line(44, 28, 48, 31, '#d02040')
      p.line(18, 21, 15, 17, '#d02040')
      // 鎖
      for (let i = 0; i < 12; i++) {
        p.box(3 + i * 4.5, 41 + i * 1.1, 3, 2, i % 2 ? '#c0c4d0' : '#7a8090')
        p.box(3 + i * 4.5, 54 - i * 1.1, 3, 2, i % 2 ? '#7a8090' : '#c0c4d0')
      }
      // 「#N/A」の 紙片
      p.box(54, 1, 9, 6, '#f8f0e0')
      p.line(55, 3, 61, 3, '#d02040')
      p.line(55, 5, 59, 5, '#d02040')
      p.box(0, 56, 7, 6, '#f8f0e0')
      p.line(1, 58, 5, 58, '#d02040')
    },
  },

  // バラバラン：散らかった 伝票が 積み上がった 王
  barabaran: {
    glow: ['#ffffff', '#e02020', '#ffd040'],
    draw(p) {
      // 紙の 腕（扇）
      p.poly([[1, 30], [11, 26], [13, 35], [3, 39]], '#f4ecd8')
      p.poly([[0, 37], [10, 35], [11, 44], [2, 46]], '#e8dcc0')
      p.poly([[63, 30], [53, 26], [51, 35], [61, 39]], '#f4ecd8')
      p.poly([[64, 37], [54, 35], [53, 44], [62, 46]], '#e8dcc0')
      // 積み上がった 伝票
      p.poly([[3, 49], [61, 45], [63, 61], [1, 62]], '#e8dcc0')
      p.poly([[7, 37], [57, 35], [59, 50], [5, 52]], '#f4ecd8')
      p.poly([[10, 24], [54, 26], [52, 40], [11, 40]], '#e8dcc0')
      p.poly([[14, 12], [50, 14], [50, 30], [14, 28]], '#f4ecd8')
      for (const [x0, y0, x1, y1] of [
        [6, 53, 58, 50], [6, 57, 59, 55],
        [10, 41, 54, 39], [10, 45, 55, 43],
        [14, 30, 50, 32], [14, 35, 50, 36],
        [17, 18, 47, 19], [17, 22, 47, 23],
      ] as [number, number, number, number][])
        p.line(x0, y0, x1, y1, '#8a9ac0')
      p.line(13, 14, 14, 27, '#d08080')
      // 顔
      p.poly([[17, 25], [27, 28], [26, 33], [18, 31]], '#ffffff')
      p.poly([[47, 25], [37, 28], [38, 33], [46, 31]], '#ffffff')
      p.box(22, 28, 3, 3, '#e02020')
      p.box(39, 28, 3, 3, '#e02020')
      p.line(16, 23, 27, 27, '#2a1a10', 2)
      p.line(47, 23, 36, 27, '#2a1a10', 2)
      p.poly([[16, 41], [48, 40], [44, 50], [20, 50]], '#3a0a10')
      for (const x of [20, 26, 32, 38]) p.poly([[x, 40.5], [x + 5, 40.5], [x + 2.5, 45]], '#f4ecd8')
      for (const x of [23, 30, 37]) p.poly([[x, 50], [x + 4, 50], [x + 2, 46]], '#f4ecd8')
      // 王冠
      p.poly([[17, 13], [17, 3], [23, 8], [27, 1], [32, 7], [37, 1], [41, 8], [47, 3], [47, 13]], '#f0c040')
      p.box(17, 11, 30, 2, '#c08a20')
      p.ell(32, 9, 2, 2, '#e02020')
      p.ell(23.5, 10, 1.5, 1.5, '#3080e0')
      p.ell(40.5, 10, 1.5, 1.5, '#3080e0')
      // 舞い散る 伝票
      p.poly([[2, 4], [9, 2], [10, 8], [3, 10]], '#f4ecd8')
      p.poly([[54, 2], [61, 5], [58, 11], [52, 8]], '#e8dcc0')
      p.poly([[56, 16], [62, 15], [62, 21], [57, 21]], '#f4ecd8')
    },
  },
}

/** 文字化けした 字（3×5 の ドットで 意味の ない 形） */
const GLYPHS = ['111101111101111', '110101110101110', '011100100100011', '101101111001001', '111010010010111', '100111101111001']
function glyph(p: Paint, x: number, y: number, k: number, col: string) {
  const g = GLYPHS[k % GLYPHS.length]
  for (let i = 0; i < 15; i++) if (g[i] === '1') p.px(x + (i % 3), y + Math.floor(i / 3), col)
}

Object.assign(DRAW, {
  // モジバケーラ：化けた 文字で できた 黒い 頭巾の 怪人
  mojibake: {
    glow: ['#60ff90', '#ffe040', '#ff3060', '#ffffff', '#c8a0ff'],
    draw(p: Paint) {
      // 紙テープの 腕
      p.poly([[12, 30], [2, 44], [5, 47], [15, 35]], '#f4ead0')
      p.poly([[52, 30], [62, 44], [59, 47], [49, 35]], '#f4ead0')
      for (const [x, y] of [[6, 41], [9, 37], [56, 41], [53, 37]] as Pt[]) p.box(x, y, 2, 1, '#8a8070')
      // 頭巾と マント（すそは ギザギザ）
      const cloak = new Path2D()
      cloak.moveTo(32, 3)
      cloak.quadraticCurveTo(50, 6, 52, 26)
      cloak.lineTo(58, 56)
      for (let i = 0; i < 6; i++) {
        const x = 58 - i * 9
        cloak.lineTo(x - 4.5, 62)
        cloak.lineTo(x - 9, 56)
      }
      cloak.lineTo(12, 26)
      cloak.quadraticCurveTo(14, 6, 32, 3)
      p.path(cloak, '#4a2a8a')
      p.poly([[22, 30], [42, 30], [48, 56], [16, 56]], '#3a1e70')
      // 顔の 闇
      p.ell(32, 22, 13, 13, '#1a0a30')
      // ちぐはぐな 目と ギザギザの 口
      p.ell(26, 20, 3.5, 3.5, '#ff3060')
      p.box(25, 19, 2, 2, '#ffffff')
      p.box(35, 17, 6, 6, '#60ff90')
      p.box(37, 19, 2, 2, '#1a0a30')
      const mouth: Pt[] = [[23, 28], [26, 31], [29, 28], [32, 31], [35, 28], [38, 31], [41, 28]]
      mouth.slice(1).forEach(([x, y], i) => p.line(mouth[i][0], mouth[i][1], x, y, '#ffe040'))
      // マントに 浮かぶ 化けた 文字
      let k = 0
      for (const [x, y] of [[20, 36], [28, 40], [36, 36], [42, 44], [24, 48], [33, 50], [17, 44]] as Pt[]) glyph(p, x, y, k++, k % 2 ? '#60ff90' : '#ffe040')
      // まわりを 舞う 化けた 文字
      for (const [x, y] of [[2, 4], [57, 6], [2, 22], [59, 22], [4, 54]] as Pt[]) {
        p.box(x - 1, y - 1, 5, 7, '#2a1450')
        glyph(p, x, y, k++, '#c8a0ff')
      }
    },
  },
})

Object.assign(DRAW, {
  // シメキリス：歯車と 針で できた、時を 喰らう 時計の 怪物
  shimekiris: {
    glow: ['#ff2a2a', '#ffe060', '#ffffff', '#80d0ff'],
    draw(p: Paint) {
      // うしろの 歯車
      for (const [cx, cy, r] of [[10, 14, 8], [54, 12, 7], [52, 50, 8]] as [number, number, number][]) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          p.box(cx + Math.cos(a) * r - 1.5, cy + Math.sin(a) * r - 1.5, 3, 3, '#7a5a28')
        }
        p.ell(cx, cy, r - 1, r - 1, '#9a7434')
        p.ell(cx, cy, 2, 2, '#4a3418')
      }
      // 振り子
      p.line(32, 46, 32, 58, '#c0a050', 2)
      p.ell(32, 59, 4, 4, '#e0b040')
      // 針の 腕
      p.poly([[14, 30], [2, 22], [1, 25], [12, 34]], '#c8c8d8')
      p.poly([[50, 30], [62, 40], [60, 43], [48, 34]], '#c8c8d8')
      p.poly([[0, 21], [5, 20], [3, 26]], '#e8e8f8')
      p.poly([[63, 41], [60, 46], [57, 41]], '#e8e8f8')
      // 本体（文字盤と 歯の ついた ふち）
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        p.box(32 + Math.cos(a) * 21 - 2, 29 + Math.sin(a) * 21 - 2, 4, 4, '#a07830')
      }
      p.ell(32, 29, 20, 20, '#c0903a')
      p.ell(32, 29, 16.5, 16.5, '#f0e8d0')
      // 目盛り
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        p.box(32 + Math.cos(a) * 14.5 - 0.5, 29 + Math.sin(a) * 14.5 - 0.5, i % 3 ? 1 : 2, i % 3 ? 1 : 2, '#4a3a2a')
      }
      // 顔
      p.poly([[21, 21], [29, 24], [28, 28], [21, 26]], '#2a0a0a')
      p.poly([[43, 21], [35, 24], [36, 28], [43, 26]], '#2a0a0a')
      p.box(24, 24, 2, 2, '#ff2a2a')
      p.box(38, 24, 2, 2, '#ff2a2a')
      p.box(23, 33, 18, 6, '#3a0a0a')
      for (const x of [24, 28, 32, 36]) p.poly([[x, 33], [x + 4, 33], [x + 2, 36]], '#ffffff')
      for (const x of [26, 30, 34]) p.poly([[x, 39], [x + 4, 39], [x + 2, 36]], '#ffffff')
      // 針（中心から）
      p.line(32, 29, 32, 17, '#202020', 2)
      p.line(32, 29, 40, 31, '#202020')
      p.ell(32, 29, 1.5, 1.5, '#ffe060')
      // 舞う 砂時計の 砂と 光
      for (const [x, y] of [[3, 44], [6, 52], [58, 22], [61, 28], [26, 2], [38, 3]] as Pt[]) p.box(x, y, 2, 2, '#80d0ff')
    },
  },
})

/** 3×5 の 文字（#REF! を 浮かべる） */
const FONT: Record<string, string> = {
  '#': '101111101111101',
  R: '110101110101101',
  E: '111100110100111',
  F: '111100110100100',
  '!': '010010010000010',
}
function letter(p: Paint, ch: string, x: number, y: number, col: string) {
  const f = FONT[ch]
  for (let i = 0; i < 15; i++) if (f[i] === '1') p.px(x + (i % 3), y + Math.floor(i / 3), col)
}

Object.assign(DRAW, {
  // 魔王レフエラー：世界の 参照を 断ち切る、エラーの 魔王
  refera: {
    glow: ['#ff2020', '#ff4060', '#ffe080'],
    draw(p: Paint) {
      // 翼のような マント
      p.poly([[32, 16], [3, 22], [0, 58], [14, 50], [22, 62], [32, 54], [42, 62], [50, 50], [64, 58], [61, 22]], '#5a0a22')
      p.poly([[32, 22], [8, 28], [6, 52], [16, 46], [24, 56], [32, 50], [40, 56], [48, 46], [58, 52], [56, 28]], '#8a1434')
      // 鎧の 体
      p.box(19, 28, 26, 30, '#262640', 4)
      p.poly([[22, 30], [42, 30], [38, 46], [26, 46]], '#3a3a5c')
      p.ell(32, 37, 3, 3.5, '#ff4060')
      p.box(31, 35, 1, 2, '#ffe080')
      p.box(20, 50, 24, 3, '#16162a')
      // 肩の とげ
      p.poly([[12, 30], [21, 24], [24, 34]], '#4a4a6e')
      p.poly([[52, 30], [43, 24], [40, 34]], '#4a4a6e')
      p.poly([[10, 26], [14, 22], [16, 30]], '#8a8aa8')
      p.poly([[54, 26], [50, 22], [48, 30]], '#8a8aa8')
      // かぎ爪の 手
      p.ell(13, 50, 4, 4, '#3a3a5c')
      p.ell(51, 50, 4, 4, '#3a3a5c')
      for (const [x, y] of [[9, 53], [12, 55], [15, 54], [49, 54], [52, 55], [55, 53]] as Pt[]) p.box(x, y, 1, 3, '#c8c8d8')
      // 角
      p.poly([[25, 15], [10, 2], [14, 2], [28, 12]], '#c8c8d8')
      p.poly([[39, 15], [54, 2], [50, 2], [36, 12]], '#c8c8d8')
      // 顔
      p.ell(32, 21, 9.5, 9, '#2a1a3a')
      p.poly([[24, 18], [30, 21], [29, 23], [24, 21]], '#ff2020')
      p.poly([[40, 18], [34, 21], [35, 23], [40, 21]], '#ff2020')
      p.box(26, 26, 12, 3, '#100008')
      for (const x of [27, 31, 35]) p.poly([[x, 26], [x + 2, 26], [x + 1, 29]], '#e8e8f0')
      // 王冠
      p.poly([[23, 13], [23, 7], [26, 10], [29, 4], [32, 9], [35, 4], [38, 10], [41, 7], [41, 13]], '#f0c040')
      p.ell(32, 11, 1.5, 1.5, '#ff2040')
      // 浮かぶ「#REF!」
      ;['#', 'R', 'E', 'F', '!'].forEach((ch, i) => {
        const x = [1, 6, 53, 58, 60][i]
        const y = [36, 30, 30, 36, 44][i]
        letter(p, ch, x, y, '#ff4060')
      })
    },
  },
})

export const hasBossArt = (id: string) => id in DRAW

const cache = new Map<string, HTMLCanvasElement>()
export function bossArt(id: string): HTMLCanvasElement {
  let c = cache.get(id)
  if (c) return c
  c = document.createElement('canvas')
  c.width = c.height = N
  const g = c.getContext('2d', { willReadFrequently: true })!
  const def = DRAW[id]
  def.draw(painter(g))
  finish(g, def.glow)
  cache.set(id, c)
  return c
}

/** ボスごとの オーラの 色（芯 → 炎 → 外側） */
export const AURA: Record<string, [string, string, string]> = {
  slime: ['#f0ffb8', '#7cff5a', '#1a7a34'],
  golem: ['#fff0a0', '#ff8a30', '#a02010'],
  mirage: ['#ffffff', '#80e0ff', '#7040c0'],
  captain: ['#e0fff0', '#60ffb0', '#0c5a48'],
  mitsukaranu: ['#ffd8ff', '#c060ff', '#3a0c6a'],
  barabaran: ['#fff8c0', '#ffc040', '#8a1810'],
  mojibake: ['#e0ffe8', '#60ff90', '#4a1a8a'],
  shimekiris: ['#fff4c0', '#ffb030', '#7a1010'],
  refera: ['#ffd0e0', '#ff3060', '#3a0018'],
}
