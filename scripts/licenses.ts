/**
 * アプリに 同梱する 部品の ライセンス表記を public/licenses.txt に まとめる。
 * 部品を 足したり 更新したら `npm run licenses` で 作り直す。
 */
import { readFileSync, writeFileSync } from 'node:fs'

const PARTS: [string, string][] = [
  ['DotGothic16（フォント）', '@fontsource/dotgothic16'],
  ['React', 'react'],
  ['React DOM', 'react-dom'],
  ['scheduler', 'scheduler'],
  ['Capacitor Core', '@capacitor/core'],
  ['Capacitor iOS', '@capacitor/ios'],
  ['Capacitor Preferences', '@capacitor/preferences'],
]

const out = [
  'イコール・クエスト',
  'Copyright (c) 2026 kozai0227-cmyk. All rights reserved.',
  '',
  'このアプリは、次の オープンソースの 部品を 使っています。',
  '',
]
for (const [label, pkg] of PARTS) {
  const meta = JSON.parse(readFileSync(`node_modules/${pkg}/package.json`, 'utf8'))
  out.push('='.repeat(60), `${label}  (${pkg} ${meta.version} / ${meta.license})`, '='.repeat(60), readFileSync(`node_modules/${pkg}/LICENSE`, 'utf8').trim(), '')
}
writeFileSync('public/licenses.txt', out.join('\n'))
console.log('public/licenses.txt', PARTS.length, '件')
