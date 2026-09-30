import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { DialogBox, type DialogReq } from './DialogBox'

type Scene = 'day' | 'night' | 'monitor'
type Mood = 'nervous' | 'flat' | 'tired'

interface Step {
  scene?: Scene
  speaker?: 'senior' | 'me'
  text?: string
  mood?: Mood
  fx?: 'corrupt' | 'storm' | 'white'
  auto?: number
}

const SENIOR = '神崎 先輩'
const SENIOR_COLOR = '#2d4f86'
const ME_COLOR = '#c8283c'

const STEPS: Step[] = [
  { scene: 'day', text: '――株式会社ミライ商事、営業企画部。月曜日の夕方。', mood: 'flat' },
  { speaker: 'senior', text: '{name}、ちょっといいか。' },
  { speaker: 'me', text: 'は、はいっ！', mood: 'nervous' },
  { speaker: 'senior', text: '今朝の売上集計。これ、電卓で 手打ちしただろ。' },
  { speaker: 'senior', text: '合計が 三か所 ずれてる。……別に、責めてるわけじゃない。' },
  { speaker: 'senior', text: 'ただな。エクセルくらい、ある程度 使えるようになれよ。' },
  { speaker: 'senior', text: 'お前の時間が、もったいない。' },
  { speaker: 'me', text: '（……エクセルなんて、使えなくても 仕事は回るし）', mood: 'flat' },
  { speaker: 'me', text: '（必要になったら、そのとき 覚えればいいや）' },
  { scene: 'night', text: '――その夜。23時47分。', mood: 'tired' },
  { text: 'フロアに残っているのは、自分ひとりだけだった。' },
  { speaker: 'me', text: '明日の朝までに、この集計を 直さないと……。' },
  { scene: 'monitor', text: '集計ファイルを開いた、その瞬間――' },
  { fx: 'corrupt', speaker: 'me', text: 'え……？ 数字が、消えて……' },
  { speaker: 'me', text: '#REF!……？ な、なんだこれ……！ 画面から、光が――！' },
  { fx: 'storm', auto: 4400 },
  { fx: 'white', auto: 1300 },
]

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ================================================================ オフィス（SVG）
const SKYLINE: [number, number, number][] = [
  [44, 72, 150],
  [118, 48, 214],
  [168, 80, 128],
  [250, 60, 238],
  [312, 86, 172],
  [400, 54, 222],
  [456, 76, 146],
  [534, 62, 198],
]

function Clock({ h, m, night }: { h: number; m: number; night: boolean }) {
  const ha = ((h % 12) + m / 60) * 30
  const ma = m * 6
  return (
    <g transform="translate(625 128)">
      <circle r="22" fill={night ? '#1d2433' : '#ffffff'} stroke={night ? '#3a4254' : '#8d96a1'} strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x="-0.8" y="-19" width="1.6" height="4" fill={night ? '#6a7488' : '#555d68'} transform={`rotate(${i * 30})`} />
      ))}
      <rect x="-1.6" y="-11" width="3.2" height="12" rx="1.5" fill={night ? '#c8d0dc' : '#2a3038'} transform={`rotate(${ha})`} />
      <rect x="-1" y="-17" width="2" height="18" rx="1" fill={night ? '#c8d0dc' : '#2a3038'} transform={`rotate(${ma})`} />
      <circle r="2.2" fill="#c8283c" />
    </g>
  )
}

function Protagonist({ mood, night }: { mood: Mood; night: boolean }) {
  const skin = night ? '#d9c0b4' : '#f6d3b3'
  return (
    <g>
      {/* 椅子 */}
      <rect x="316" y="316" width="128" height="176" rx="20" fill={night ? '#16181e' : '#25282f'} />
      <rect x="322" y="322" width="10" height="160" rx="5" fill={night ? '#20232b' : '#353942'} />
      {/* 首・シャツ */}
      <path d="M367,330 L393,330 L394,366 L366,366 Z" fill={night ? '#c2a598' : '#e8b894'} />
      <path d="M366,360 L394,360 Q398,420 404,492 L356,492 Q362,420 366,360 Z" fill={night ? '#c9ced8' : '#f6f7f9'} />
      {/* ジャケット（前を開けたスーツ） */}
      <path d="M314,414 Q318,378 348,368 L368,360 Q362,420 356,492 L310,492 Z" fill="url(#meSuit)" />
      <path d="M446,414 Q442,378 412,368 L392,360 Q398,420 404,492 L450,492 Z" fill="url(#meSuitR)" />
      <path d="M368,360 L350,370 L360,400 L352,406 L362,440 Q364,400 368,360 Z" fill={night ? '#151b2c' : '#212b45'} />
      <path d="M392,360 L410,370 L400,400 L408,406 L398,440 Q396,400 392,360 Z" fill={night ? '#151b2c' : '#212b45'} />
      <path d="M366,358 L377,366 L370,380 Z" fill={night ? '#d6dae2' : '#ffffff'} />
      <path d="M394,358 L383,366 L390,380 Z" fill={night ? '#d6dae2' : '#ffffff'} />
      {/* 赤いネクタイ */}
      <path d="M375,366 L385,366 L384,378 L376,378 Z" fill={night ? '#a42233' : '#d42a3c'} />
      <path d="M376,378 L384,378 L389,450 L380,462 L371,450 Z" fill={night ? '#a42233' : '#d42a3c'} />
      <path d="M380,378 L384,378 L389,450 L380,462 Z" fill="#8c1424" opacity="0.45" />
      {/* 腕 */}
      <path d="M330,394 Q308,432 320,468 L356,480" stroke="url(#meSuit)" strokeWidth="28" fill="none" strokeLinecap="round" />
      <path d="M430,394 Q452,432 440,466 L424,472" stroke="url(#meSuitR)" strokeWidth="28" fill="none" strokeLinecap="round" />
      <ellipse cx="362" cy="480" rx="14" ry="8" fill={skin} />
      <ellipse cx="428" cy="470" rx="13" ry="8" fill={skin} />
      {/* 顔 */}
      <ellipse cx="344" cy="304" rx="7" ry="11" fill={skin} />
      <ellipse cx="416" cy="304" rx="7" ry="11" fill={skin} />
      <path d="M344,296 Q344,254 380,250 Q416,254 416,296 L414,314 Q410,344 380,352 Q350,344 346,314 Z" fill={skin} />
      {night && <path d="M344,296 Q344,254 380,250 Q390,300 370,352 Q350,344 346,314 Z" fill="#7fb0ff" opacity="0.18" />}
      {/* 髪（新人らしい短髪＋アホ毛） */}
      <path d="M338,304 Q328,246 380,238 Q434,242 422,306 L418,286 Q410,272 398,272 Q380,284 358,276 Q348,282 344,300 Z" fill="#22232b" />
      <path d="M390,240 Q398,218 412,224 Q398,228 396,242 Z" fill="#22232b" />
      <path d="M356,256 Q370,248 390,250" stroke="#4a4d5c" strokeWidth="3" fill="none" opacity="0.7" />
      <path d="M372,243 Q366,262 358,276" stroke="#3a3c48" strokeWidth="2.5" fill="none" />
      {/* 表情 */}
      {mood === 'nervous' && (
        <g>
          <path d="M355,289 L372,282" stroke="#2a2a33" strokeWidth="3" strokeLinecap="round" />
          <path d="M388,282 L405,289" stroke="#2a2a33" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="364" cy="303" rx="5" ry="7" fill="#2a2a33" />
          <ellipse cx="396" cy="303" rx="5" ry="7" fill="#2a2a33" />
          <circle cx="366" cy="300" r="1.8" fill="#fff" />
          <circle cx="398" cy="300" r="1.8" fill="#fff" />
          <path d="M371,331 Q376,327 380,331 Q384,335 389,331" stroke="#9a5040" strokeWidth="2.4" fill="none" />
          <path d="M428,268 Q436,282 428,290 Q420,282 428,268 Z" fill="#8fd0ff" />
        </g>
      )}
      {mood === 'flat' && (
        <g>
          <path d="M355,287 L372,286" stroke="#2a2a33" strokeWidth="3" strokeLinecap="round" />
          <path d="M388,286 L405,287" stroke="#2a2a33" strokeWidth="3" strokeLinecap="round" />
          <path d="M358,303 Q364,300 370,303 L370,306 Q364,309 358,306 Z" fill="#2a2a33" />
          <path d="M390,303 Q396,300 402,303 L402,306 Q396,309 390,306 Z" fill="#2a2a33" />
          <path d="M356,301 L372,301" stroke="#2a2a33" strokeWidth="2" />
          <path d="M388,301 L404,301" stroke="#2a2a33" strokeWidth="2" />
          <path d="M373,332 L387,331" stroke="#9a5040" strokeWidth="2.4" />
        </g>
      )}
      {mood === 'tired' && (
        <g>
          <path d="M355,289 L372,285" stroke="#2a2a33" strokeWidth="3" strokeLinecap="round" />
          <path d="M388,285 L405,289" stroke="#2a2a33" strokeWidth="3" strokeLinecap="round" />
          <path d="M358,304 Q364,302 370,304 L370,306 Q364,308 358,306 Z" fill="#2a2a33" />
          <path d="M390,304 Q396,302 402,304 L402,306 Q396,308 390,306 Z" fill="#2a2a33" />
          <path d="M357,302 L371,302" stroke="#2a2a33" strokeWidth="2.4" />
          <path d="M389,302 L403,302" stroke="#2a2a33" strokeWidth="2.4" />
          <path d="M358,312 Q364,315 370,312" stroke="#9a7fa8" strokeWidth="2" fill="none" />
          <path d="M390,312 Q396,315 402,312" stroke="#9a7fa8" strokeWidth="2" fill="none" />
          <path d="M374,334 Q380,332 386,334" stroke="#8a5040" strokeWidth="2.2" fill="none" />
        </g>
      )}
    </g>
  )
}

function Senior() {
  return (
    <g>
      <ellipse cx="776" cy="700" rx="100" ry="12" fill="rgba(0,0,0,0.16)" />
      {/* 脚 */}
      <path d="M716,480 L768,480 L757,690 L729,692 Z" fill="#161d33" />
      <path d="M774,480 L832,480 L823,690 L797,692 Z" fill="#1b2340" />
      <path d="M741,500 L740,686" stroke="#232c4a" strokeWidth="2" />
      <path d="M808,500 L812,686" stroke="#28325a" strokeWidth="2" />
      <path d="M716,686 L760,686 Q766,700 752,703 L706,703 Q702,693 716,686 Z" fill="#0e0f12" />
      <path d="M794,686 L834,686 Q844,700 830,703 L786,703 Q782,693 794,686 Z" fill="#0e0f12" />
      {/* 奥の腕（ポケットに手） */}
      <path d="M832,288 Q856,330 852,392 Q848,432 830,456 L810,448 Q824,420 826,388 Q826,340 814,300 Z" fill="#141a2e" />
      {/* 胴体 */}
      <path d="M704,292 Q712,266 752,254 L770,248 L792,254 Q832,266 842,292 Q848,360 830,424 L838,498 L710,498 L716,424 Q700,360 704,292 Z" fill="url(#seniorSuit)" />
      <path d="M754,254 L790,252 L772,376 Z" fill="#f4f6f9" />
      {/* ネクタイ（細身・ダークネイビー）とタイバー */}
      <path d="M765,258 L779,257 L777,271 L767,271 Z" fill="#262c3c" />
      <path d="M767,271 L777,271 L782,354 L772,367 L763,354 Z" fill="#262c3c" />
      {[284, 300, 316, 332, 348].map((y) => (
        <path key={y} d={`M766,${y} L780,${y - 6}`} stroke="#3c4458" strokeWidth="2" />
      ))}
      <rect x="761" y="318" width="22" height="3" rx="1" fill="#d4dae3" />
      {/* 襟 */}
      <path d="M754,254 L736,268 L750,298 L740,306 L770,376 Z" fill="#101629" />
      <path d="M790,252 L806,264 L794,296 L804,302 L774,376 Z" fill="#101629" />
      <path d="M736,268 L750,298 L740,306 L770,376" stroke="#34436a" strokeWidth="1.5" fill="none" />
      <path d="M806,264 L794,296 L804,302 L774,376" stroke="#34436a" strokeWidth="1.5" fill="none" />
      <path d="M752,254 L768,262 L758,274 Z" fill="#ffffff" />
      <path d="M792,252 L778,262 L790,272 Z" fill="#ffffff" />
      <path d="M808,320 L828,317 L819,328 Z" fill="#e9eef5" />
      <circle cx="773" cy="396" r="3.2" fill="#0a0e1a" />
      <path d="M706,290 Q716,268 752,256" stroke="#3a4a74" strokeWidth="2" fill="none" />
      {/* 手前の腕（コーヒーを持つ） */}
      <path d="M712,294 Q688,340 692,394 Q694,408 710,408 L718,398 Q708,352 730,304 Z" fill="#1d2744" />
      <path d="M698,392 Q716,364 738,338 L754,350 Q732,380 714,410 Z" fill="#1d2744" />
      <path d="M735,334 L756,348 L752,355 L731,341 Z" fill="#f4f6f9" />
      <path d="M728,346 L742,356 L739,361 L725,351 Z" fill="#c9d0da" />
      <path d="M738,298 L770,298 L765,348 L743,348 Z" fill="#fafafa" stroke="#d6dbe2" strokeWidth="1.5" />
      <path d="M739,314 L769,314 L767,332 L741,332 Z" fill="#7a4e30" />
      <path d="M734,292 L774,292 L772,300 L736,300 Z" fill="#e6e6e6" />
      <ellipse cx="749" cy="338" rx="13" ry="10" fill="#f0c6a2" />
      <path d="M740,334 Q749,330 758,334" stroke="#d6a582" strokeWidth="1.5" fill="none" />
      {/* 首・顔（頭身を高めに見せるため少し小さく） */}
      <g transform="translate(772 252) scale(0.86) translate(-772 -252)">
      <path d="M758,226 L786,224 L789,258 L756,260 Z" fill="#e0ad89" />
      <path d="M734,176 Q734,146 766,144 Q798,146 800,178 L798,206 Q794,230 772,240 Q750,236 740,222 Q733,206 734,176 Z" fill="#f1c9a6" />
      <path d="M786,160 Q800,170 798,206 Q794,228 776,238 Q790,210 786,160 Z" fill="#d7a883" opacity="0.6" />
      <ellipse cx="798" cy="196" rx="6" ry="11" fill="#e6b692" />
      {/* 髪（ツーブロック＋かき上げ） */}
      <path d="M728,190 Q716,138 758,126 Q806,116 816,160 Q820,184 806,202 L802,176 Q796,160 778,158 Q758,164 744,172 Q736,178 734,198 Z" fill="#1a1c23" />
      <path d="M800,168 Q810,178 806,202 L799,196 Z" fill="#2c303b" />
      <path d="M733,172 Q736,128 788,130 Q810,134 816,152 Q794,140 772,146 Q752,152 740,178 Z" fill="#252932" />
      <path d="M746,146 Q768,134 794,138" stroke="#586074" strokeWidth="3" fill="none" opacity="0.8" />
      {/* 顔のパーツ */}
      <path d="M741,181 L758,176" stroke="#1a1c23" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M768,176 L787,179" stroke="#1a1c23" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M744,191 Q751,185 759,190 Q751,194 744,191 Z" fill="#1a1c23" />
      <path d="M768,190 Q776,185 785,190 Q776,194 768,190 Z" fill="#1a1c23" />
      <circle cx="753" cy="189" r="1.2" fill="#fff" />
      <circle cx="778" cy="189" r="1.2" fill="#fff" />
      <path d="M760,193 Q756,204 755,211 L761,212" stroke="#c38c68" strokeWidth="2" fill="none" />
      <path d="M752,223 Q761,226 771,219" stroke="#9a5a48" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
    </g>
  )
}

function OfficeScene({ night, senior, mood }: { night: boolean; senior: boolean; mood: Mood }) {
  const windows = useMemo(() => {
    const r = rng(7)
    return SKYLINE.flatMap(([x, w, h], bi) => {
      const out: { x: number; y: number; lit: boolean; key: string }[] = []
      for (let yy = 342 - h + 10; yy < 334; yy += 16)
        for (let xx = x + 6; xx < x + w - 6; xx += 12) out.push({ x: xx, y: yy, lit: r() < 0.32, key: `${bi}-${xx}-${yy}` })
      return out
    })
  }, [])

  return (
    <svg viewBox="0 0 960 704" className="office-svg" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#18202f' : '#f2f4f7'} />
          <stop offset="1" stopColor={night ? '#0f141e' : '#dce1e7'} />
        </linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#050a1c' : '#7fbde9'} />
          <stop offset="1" stopColor={night ? '#1b2a52' : '#e2f2ff'} />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#252b35' : '#b4bbc3'} />
          <stop offset="1" stopColor={night ? '#14181f' : '#949ca5'} />
        </linearGradient>
        <linearGradient id="meSuit" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={night ? '#1a2238' : '#2e3a5c'} />
          <stop offset="1" stopColor={night ? '#222c48' : '#3a4870'} />
        </linearGradient>
        <linearGradient id="meSuitR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={night ? '#1c243a' : '#34426a'} />
          <stop offset="1" stopColor={night ? '#121828' : '#26304e'} />
        </linearGradient>
        <linearGradient id="seniorSuit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#26345a" />
          <stop offset="0.55" stopColor="#1b2542" />
          <stop offset="1" stopColor="#11172a" />
        </linearGradient>
        <radialGradient id="vignette" cx="0.38" cy="0.52" r="0.72">
          <stop offset="0" stopColor="#050814" stopOpacity="0" />
          <stop offset="0.45" stopColor="#050814" stopOpacity="0.35" />
          <stop offset="1" stopColor="#050814" stopOpacity="0.88" />
        </radialGradient>
        <filter id="blur6">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="blur14">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* 壁・天井 */}
      <rect width="960" height="470" fill="url(#wall)" />
      <rect width="960" height="48" fill={night ? '#121826' : '#f8f9fb'} />
      <rect y="46" width="960" height="3" fill={night ? '#0a0e16' : '#cdd3da'} />
      {!night &&
        [110, 410, 710].map((x) => (
          <g key={x}>
            <rect x={x} y="16" width="160" height="10" rx="2" fill="#ffffff" />
            <ellipse cx={x + 80} cy="46" rx="120" ry="16" fill="#ffffff" opacity="0.55" filter="url(#blur6)" />
          </g>
        ))}

      {/* 窓と街並み */}
      <rect x="40" y="72" width="560" height="270" fill="url(#sky)" />
      {!night && <ellipse cx="480" cy="120" rx="160" ry="40" fill="#ffffff" opacity="0.35" filter="url(#blur14)" />}
      {SKYLINE.map(([x, w, h], i) => (
        <rect key={x} x={x} y={342 - h} width={w} height={h} fill={night ? (i % 2 ? '#161f38' : '#1c2746') : i % 2 ? '#9fb4ca' : '#b3c4d6'} />
      ))}
      {windows.map((w) => (
        <rect key={w.key} x={w.x} y={w.y} width="6" height="8" fill={night ? (w.lit ? '#ffd88a' : '#243152') : '#dfe9f3'} opacity={night ? 1 : 0.75} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x="40" y={74 + i * 6} width="560" height="2" fill={night ? '#2c3548' : '#d7dde4'} opacity="0.9" />
      ))}
      {[180, 320, 460].map((x) => (
        <rect key={x} x={x} y="72" width="7" height="270" fill={night ? '#262e40' : '#aab3bd'} />
      ))}
      <rect x="40" y="72" width="560" height="270" fill="none" stroke={night ? '#2a3244' : '#b6bec8'} strokeWidth="10" />

      <Clock h={night ? 23 : 18} m={night ? 47 : 5} night={night} />

      {/* ホワイトボード */}
      <rect x="660" y="96" width="250" height="190" rx="4" fill={night ? '#252c3a' : '#fbfcfd'} stroke={night ? '#3a4254' : '#a9b1ba'} strokeWidth="6" />
      {!night && (
        <g>
          <text x="680" y="126" fontSize="17" fill="#2a4a8a" fontFamily="sans-serif" fontWeight="bold">
            Q1 売上目標
          </text>
          {[[690, 60], [718, 88], [746, 72], [774, 110], [802, 96], [830, 128]].map(([x, h], i) => (
            <rect key={x} x={x} y={262 - h} width="18" height={h} fill={i === 5 ? '#d8404c' : '#4a78c8'} opacity="0.8" />
          ))}
          <path d="M690,196 L730,180 L770,188 L810,160 L866,142" stroke="#d8404c" strokeWidth="3" fill="none" />
          <text x="846" y="136" fontSize="14" fill="#d8404c" fontFamily="sans-serif">
            ↑
          </text>
        </g>
      )}
      <rect x="690" y="286" width="190" height="6" rx="2" fill={night ? '#2a3140' : '#9aa3ad'} />
      {/* 観葉植物 */}
      <g opacity={night ? 0.55 : 1}>
        <path d="M912,470 L948,470 L944,420 L916,420 Z" fill={night ? '#2a2e36' : '#e9e5df'} />
        {[[-40, 330], [-10, 300], [20, 320], [-30, 370], [10, 360], [30, 390], [-20, 400]].map(([dx, y], i) => (
          <ellipse key={i} cx={930 + dx * 0.6} cy={y + 20} rx="18" ry="34" fill={i % 2 ? '#3f8a4c' : '#2f7340'} transform={`rotate(${dx} ${930 + dx * 0.6} ${y + 20})`} />
        ))}
      </g>

      {/* 床 */}
      <rect y="470" width="960" height="234" fill="url(#floor)" />
      {[510, 560, 626].map((y) => (
        <rect key={y} y={y} width="960" height="1.5" fill={night ? '#1d222b' : '#a4acb5'} />
      ))}

      {/* 奥の島（パーティションと同僚） */}
      <rect x="0" y="392" width="640" height="78" fill={night ? '#1a2030' : '#c6cdd5'} />
      <rect x="0" y="388" width="640" height="8" fill={night ? '#232a3b' : '#aeb7c1'} />
      <rect x="140" y="328" width="78" height="56" rx="3" fill="#2b2f36" />
      <rect x="145" y="333" width="68" height="44" fill={night ? '#0f1320' : '#dce8f4'} />
      <rect x="172" y="384" width="12" height="8" fill="#2b2f36" />
      <rect x="566" y="326" width="80" height="58" rx="3" fill="#2b2f36" />
      <rect x="571" y="331" width="70" height="46" fill={night ? '#0f1320' : '#e4ecf5'} />
      <rect x="600" y="384" width="12" height="8" fill="#2b2f36" />
      {!night && (
        <g>
          {[340, 348, 356, 364].map((y) => (
            <rect key={y} x="150" y={y} width={y === 356 ? 40 : 56} height="3" fill="#9ab0c8" />
          ))}
          <rect x="578" y="338" width="56" height="30" fill="#bcd6b8" />
          {/* 同僚A */}
          <path d="M64,392 Q68,368 98,366 Q128,368 132,392 Z" fill="#8fb4d8" />
          <circle cx="98" cy="348" r="19" fill="#f2cdb0" />
          <path d="M79,350 Q76,322 100,322 Q122,324 118,346 Q110,334 96,336 Q86,338 79,350 Z" fill="#5a3a2a" />
          <circle cx="112" cy="326" r="9" fill="#5a3a2a" />
          {/* 同僚B */}
          <path d="M508,392 Q512,366 542,364 Q572,366 576,392 Z" fill="#eef1f4" />
          <path d="M538,368 L546,368 L548,392 L536,392 Z" fill="#2a3e6a" />
          <circle cx="542" cy="344" r="20" fill="#eec7a6" />
          <path d="M522,344 Q520,318 544,318 Q566,320 562,342 Q552,330 540,332 Q528,334 522,344 Z" fill="#1c1c22" />
        </g>
      )}

      {senior && <Senior />}

      {/* 主人公とデスク */}
      <Protagonist mood={mood} night={night} />
      <path d="M96,472 L614,472 L628,490 L82,490 Z" fill={night ? '#2a303b' : '#eef0f3'} />
      <path d="M82,490 L628,490 L628,494 L82,494 Z" fill={night ? '#1b2029' : '#c9ced5'} />
      <rect x="96" y="494" width="518" height="120" fill={night ? '#1d222b' : '#dfe3e8'} />
      {/* モニター（背面） */}
      <rect x="128" y="320" width="176" height="134" rx="8" fill={night ? '#20242c' : '#3a3f48'} />
      <rect x="136" y="328" width="160" height="118" rx="5" fill={night ? '#262a33' : '#444a54'} />
      {night && <rect x="124" y="316" width="184" height="142" rx="10" fill="none" stroke="#8fb8ff" strokeWidth="4" opacity="0.35" filter="url(#blur6)" />}
      <rect x="206" y="454" width="20" height="18" fill={night ? '#1a1e25' : '#2f343c'} />
      <ellipse cx="216" cy="473" rx="34" ry="5" fill={night ? '#1a1e25' : '#2f343c'} />
      <rect x="282" y="330" width="16" height="16" fill="#f7e36a" transform="rotate(8 290 338)" />
      <rect x="283" y="350" width="16" height="16" fill="#ffb3c6" transform="rotate(-6 291 358)" />
      {/* 電卓・書類・マグ */}
      <rect x="404" y="456" width="48" height="22" rx="3" fill="#2c2f36" transform="rotate(-4 428 467)" />
      <rect x="408" y="459" width="40" height="6" fill="#b8d0a8" transform="rotate(-4 428 467)" />
      <rect x="470" y="466" width="62" height="8" fill="#ffffff" transform="rotate(3 500 470)" />
      <rect x="468" y="460" width="62" height="8" fill="#f4f4f4" transform="rotate(-2 500 464)" />
      <rect x="540" y="438" width="28" height="36" rx="4" fill="#ffffff" stroke="#cfd4da" strokeWidth="1.5" />
      <path d="M568,446 Q580,452 568,464" stroke="#cfd4da" strokeWidth="4" fill="none" />
      <circle cx="554" cy="454" r="5" fill="#3a9a6a" />
      {!night && <path d="M550,432 Q546,422 552,414 M558,432 Q554,420 560,410" stroke="#c8cdd4" strokeWidth="2" fill="none" opacity="0.8" />}
      <rect x="582" y="438" width="18" height="36" rx="3" fill={night ? '#2a2f38' : '#6a7380'} />
      <rect x="585" y="424" width="3" height="18" fill="#3a6ad0" />
      <rect x="591" y="428" width="3" height="14" fill="#d8404c" />

      {night && (
        <g>
          <ellipse cx="300" cy="360" rx="190" ry="150" fill="#6f9fff" opacity="0.12" filter="url(#blur14)" />
          <rect width="960" height="704" fill="url(#vignette)" />
        </g>
      )}
    </svg>
  )
}

// ================================================================ モニター（Excel画面）
const PEOPLE = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田']
const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

function useSheet() {
  return useMemo(() => {
    const r = rng(42)
    const rows = PEOPLE.map((p) => {
      const m = [0, 0, 0].map(() => 180 + Math.floor(r() * 320))
      return [p, ...m, m[0] + m[1] + m[2], `${92 + Math.floor(r() * 20)}%`]
    })
    const tot = [1, 2, 3, 4].map((i) => rows.reduce((s, row) => s + (row[i] as number), 0))
    return [...rows, ['合計', ...tot, '104%']]
  }, [])
}

function MonitorScene({ corrupt }: { corrupt: number }) {
  const data = useSheet()
  // 壊れていく順番：合計セルから広がる
  const order = useMemo(() => {
    const r = rng(3)
    const cells: { key: string; d: number }[] = []
    for (let row = 0; row < data.length; row++)
      for (let c = 0; c < 6; c++) cells.push({ key: `${row}-${c}`, d: Math.hypot(row - 12, (c - 4) * 1.4) + r() * 3 })
    cells.sort((a, b) => a.d - b.d)
    return new Map(cells.map((c, i) => [c.key, i / cells.length]))
  }, [data])
  const broken = (row: number, c: number) => (order.get(`${row}-${c}`) ?? 1) < corrupt
  const fmt = (v: string | number) => (typeof v === 'number' ? v.toLocaleString() : v)

  return (
    <div className={`monitor-scene ${corrupt > 0.45 ? 'glitch' : ''}`}>
      <div className="monitor">
        <div className="xlm">
          <div className="xlm-title">
            <span className="xlm-dots">● ● ●</span>
            <span>2025年度_第1四半期_売上集計_最終版(2).xlsx ― Excel</span>
            <span />
          </div>
          <div className="xlm-tabs">
            {['ファイル', 'ホーム', '挿入', '描画', 'ページ レイアウト', '数式', 'データ', '校閲', '表示'].map((t, i) => (
              <span key={t} className={i === 1 ? 'on' : ''}>
                {t}
              </span>
            ))}
          </div>
          <div className="xlm-ribbon">
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} className={i % 4 === 3 ? 'sep' : ''} />
            ))}
          </div>
          <div className="xlm-fbar">
            <span className="nb">F16</span>
            <span className="fx">fx</span>
            <span className={`fm ${corrupt > 0.15 ? 'bad' : ''}`}>{corrupt > 0.15 ? '=#REF!+#REF!+#REF!+#REF!' : '=SUM(F4:F15)'}</span>
          </div>
          <div className="xlm-grid">
            <div className="h corner" />
            {COLS.map((c) => (
              <div key={c} className="h">
                {c}
              </div>
            ))}
            {Array.from({ length: 17 }, (_, i) => {
              const rowNo = i + 1
              const cells: (string | number)[] = Array(8).fill('')
              if (rowNo === 1) cells[1] = '第1四半期 売上集計（営業企画部）'
              if (rowNo === 3) ['', '担当', '4月', '5月', '6月', '合計', '前年比', ''].forEach((v, k) => (cells[k] = v))
              const di = rowNo - 4
              if (di >= 0 && di < data.length) data[di].forEach((v, k) => (cells[k + 1] = v))
              return [
                <div key={`r${i}`} className="h">
                  {rowNo}
                </div>,
                ...cells.map((v, k) => {
                  const isData = di >= 0 && di < data.length && k >= 1 && k <= 6
                  const bad = isData && broken(di, k - 1)
                  const cls = [
                    'c',
                    typeof v === 'number' ? 'num' : '',
                    rowNo === 3 ? 'head' : '',
                    rowNo === 1 ? 'title' : '',
                    di === 12 ? 'total' : '',
                    bad ? 'ref' : '',
                    rowNo === 16 && k === 5 ? 'sel' : '',
                  ].join(' ')
                  return (
                    <div key={`${i}-${k}`} className={cls}>
                      {bad ? '#REF!' : fmt(v)}
                    </div>
                  )
                }),
              ]
            })}
          </div>
          <div className="xlm-sheets">
            <span className="on">集計</span>
            <span>明細</span>
            <span>前年</span>
            <span className="status">{corrupt > 0 ? '⚠ 参照が無効です' : '準備完了'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ================================================================ #REF! の嵐
function RefStorm() {
  const items = useMemo(() => {
    const r = rng(99)
    return Array.from({ length: 170 }, (_, i) => {
      const x = r() * 104 - 2
      const y = r() * 104 - 2
      return {
        x,
        y,
        size: 1.4 + r() * 5.6,
        rot: (r() - 0.5) * 50,
        d: (i / 170) * 2.8 + r() * 0.25,
        fx: 50 - x,
        fy: (44 - y) * (176 / 240),
      }
    })
  }, [])
  return (
    <div className="ref-storm">
      <div className="ref-glow" />
      {items.map((it, i) => (
        <span
          key={i}
          style={
            {
              left: `${it.x}%`,
              top: `${it.y}%`,
              fontSize: `${it.size}cqw`,
              '--rot': `${it.rot}deg`,
              '--fx': `${it.fx}cqw`,
              '--fy': `${it.fy}cqw`,
              '--d': `${it.d}s`,
            } as CSSProperties
          }
        >
          #REF!
        </span>
      ))}
    </div>
  )
}

// ================================================================ 本体
export function Prologue({ name, onDone }: { name: string; onDone(): void }) {
  const [i, setI] = useState(0)
  const [corrupt, setCorrupt] = useState(0)
  const doneRef = useRef(false)
  const step = STEPS[i]
  const scene = STEPS.slice(0, i + 1).reduce<Scene>((s, st) => st.scene ?? s, 'day')
  const mood = STEPS.slice(0, i + 1).reduce<Mood>((m, st) => st.mood ?? m, 'flat')
  const corrupting = STEPS.slice(0, i + 1).some((s) => s.fx === 'corrupt')
  const storm = STEPS.slice(0, i + 1).some((s) => s.fx === 'storm')

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }
  const next = () => (i + 1 < STEPS.length ? setI(i + 1) : finish())

  // セルが次々と #REF! に変わっていく
  useEffect(() => {
    if (!corrupting) return
    const t = setInterval(() => setCorrupt((c) => Math.min(1, c + 0.012)), 40)
    return () => clearInterval(t)
  }, [corrupting])

  // 自動で進む演出
  useEffect(() => {
    if (!step.auto) return
    const t = setTimeout(next, step.auto)
    return () => clearTimeout(t)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const speaker = step.speaker === 'senior' ? SENIOR : step.speaker === 'me' ? name : undefined
  const req: DialogReq | null = step.text
    ? {
        id: i,
        speaker,
        pages: [step.text.replace('{name}', name)],
        variant: 'modern',
        tagColor: step.speaker === 'senior' ? SENIOR_COLOR : ME_COLOR,
        resolve: next,
      }
    : null

  return (
    <div className={`prologue ${storm ? 'storming' : ''}`}>
      {scene === 'monitor' ? (
        <MonitorScene corrupt={corrupt} />
      ) : (
        <OfficeScene night={scene === 'night'} senior={scene === 'day'} mood={mood} />
      )}
      {storm && <RefStorm />}
      {step.fx === 'white' && <div className="white-out" />}
      {req && <DialogBox key={i} req={req} />}
      <button className="skip" onClick={finish}>
        SKIP ▶▶
      </button>
    </div>
  )
}
