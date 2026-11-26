import { useRef, type PointerEvent as RPointerEvent } from 'react'
import { isEn, tr } from '../game/lang'
import { isTouchDevice } from '../game/layout'
import { isNative } from '../game/native'
import { VOLUME_MAX, sfx, type Volume } from '../game/sound'
import './SettingsPanel.css'

export type SetRow = 'lang' | 'lic' | 'privacy' | 'unlock'

interface Props {
  volume: Volume
  /** 音量の 行（BGM・効果音） */
  volRows: [keyof Volume, () => string][]
  /** 音量より 下の 行 */
  rows: SetRow[]
  /** キー操作で 選んでいる 行（音量の 行から 通し番号） */
  cur: number
  /** キー操作の ときだけ 金色の 枠を 出す */
  ring: boolean
  unlocked: boolean
  freeChapters: number
  onPick(i: number): void
  onVolume(kind: keyof Volume, v: number): void
  onLang(): void
  onLicenses(): void
  onPrivacy(): void
  onUnlock(): void
}

const VOL_ICON: Record<keyof Volume, [string, string]> = {
  bgm: ['🎵', '🔇'],
  sfx: ['🔔', '🔕'],
}

/** 音量スライダー：つまみを 指で 動かすか、線の 好きな 場所を 押す */
function VolSlider({ value, label, onChange }: { value: number; label: string; onChange(v: number): void }) {
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const at = (e: RPointerEvent) => {
    const r = track.current?.getBoundingClientRect()
    if (!r || !r.width) return value
    return Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * VOLUME_MAX)
  }
  const set = (v: number) => v !== value && onChange(v)
  const pct = (value / VOLUME_MAX) * 100
  return (
    <div
      ref={track}
      className="stg-slider"
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={VOLUME_MAX}
      aria-valuenow={value}
      data-nosfx
      onPointerDown={(e) => {
        drag.current = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
        set(at(e))
      }}
      onPointerMove={(e) => drag.current && set(at(e))}
      onPointerUp={() => (drag.current = false)}
      onPointerCancel={() => (drag.current = false)}
    >
      <div className="stg-track">
        <div className="stg-fill" style={{ width: `${pct}%` }} />
        {Array.from({ length: VOLUME_MAX - 1 }, (_, n) => (
          <i key={n} className={n + 1 <= value ? 'lit' : ''} style={{ left: `${((n + 1) / VOLUME_MAX) * 100}%` }} />
        ))}
      </div>
      <div className="stg-knob" style={{ left: `${pct}%` }} />
    </div>
  )
}

export function SettingsPanel({ volume, volRows, rows, cur, ring, unlocked, freeChapters, onPick, onVolume, onLang, onLicenses, onPrivacy, onUnlock }: Props) {
  const base = volRows.length
  const rowCls = (i: number) => `stg-row ${i === cur ? 'on' : ''}`
  const go = (i: number, f: () => void) => () => {
    sfx('select')
    onPick(i)
    f()
  }
  // 全章解放の 札は アプリ版だけ（購入ずみ／第◯章〜）
  const unlockNote = !isNative ? null : unlocked ? [tr('購入ずみ', 'Purchased'), 'ok'] : [tr(`第${freeChapters + 1}章〜`, `Ch. ${freeChapters + 1}+`), 'gold']
  const other = rows.filter((r) => r !== 'lang')
  const langI = rows.indexOf('lang')

  return (
    <div className={`stg ${ring ? 'ring' : ''}`}>
      <section className="stg-group" style={{ animationDelay: '0ms' }}>
        <h4 className="stg-cap">{tr('サウンド', 'Sound')}</h4>
        <div className="stg-card">
          {volRows.map(([kind, labelOf], i) => {
            const label = labelOf()
            const v = volume[kind]
            return (
              <div key={kind} className={`${rowCls(i)} stg-vol ${v === 0 ? 'off' : ''}`} onPointerDown={() => onPick(i)}>
                <span className={`stg-ico i-${kind}`} aria-hidden>
                  {VOL_ICON[kind][v === 0 ? 1 : 0]}
                </span>
                <span className="stg-label">{label}</span>
                <button type="button" className="stg-step minus" data-nosfx disabled={v === 0} onClick={() => onVolume(kind, v - 1)} aria-label={tr(`${label}を 小さく`, `${label} down`)} />
                <VolSlider value={v} label={label} onChange={(n) => onVolume(kind, n)} />
                <button type="button" className="stg-step plus" data-nosfx disabled={v === VOLUME_MAX} onClick={() => onVolume(kind, v + 1)} aria-label={tr(`${label}を 大きく`, `${label} up`)} />
                <span className="stg-val" key={v}>
                  {v === 0 ? 'OFF' : v}
                </span>
              </div>
            )
          })}
        </div>
        <p className="stg-foot">
          {isTouchDevice ? tr('つまみを 動かすか 左右の ボタンで 調整。', 'Drag the knob or tap the buttons. ') : tr('← → キーか つまみで 調整。', 'Adjust with ← → or drag the knob. ')}
          {tr('左はしで 消える。', 'All the way left turns it off.')}
        </p>
      </section>

      {langI >= 0 && (
        <section className="stg-group" style={{ animationDelay: '60ms' }}>
          <h4 className="stg-cap">{tr('言語', 'Language')}</h4>
          <div className={`stg-card ${rowCls(base + langI)} stg-lang`} role="radiogroup" aria-label={tr('言語', 'Language')}>
            <span className={`stg-seg-pill ${isEn() ? 'r' : ''}`} aria-hidden />
            {(['ja', 'en'] as const).map((l) => {
              const on = (l === 'en') === isEn()
              return (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-nosfx
                  className={`stg-seg ${on ? 'cur' : ''}`}
                  onClick={() => {
                    onPick(base + langI)
                    if (on) return
                    sfx('select')
                    onLang()
                  }}
                >
                  {l === 'ja' ? '日本語' : 'English'}
                </button>
              )
            })}
          </div>
          <p className="stg-foot">{tr('切りかえると セーブして 読みなおします。', 'Switching saves your game and reloads.')}</p>
        </section>
      )}

      <section className="stg-group" style={{ animationDelay: '120ms' }}>
        <h4 className="stg-cap">{tr('そのほか', 'Other')}</h4>
        <div className="stg-card">
          {other.map((row) => {
            const i = base + rows.indexOf(row)
            const [ico, cls, label, act] =
              row === 'lic'
                ? ['📄', 'i-lic', tr('ライセンス表記', 'License Notices'), onLicenses]
                : row === 'privacy'
                  ? ['🔒', 'i-pri', tr('プライバシーポリシー', 'Privacy Policy'), onPrivacy]
                  : ['🗝️', 'i-unl', tr('全章解放', 'Unlock All Chapters'), onUnlock]
            return (
              <button key={row} type="button" data-nosfx className={`${rowCls(i)} stg-link`} onClick={go(i, act)}>
                <span className={`stg-ico ${cls}`} aria-hidden>
                  {ico}
                </span>
                <span className="stg-label">{label}</span>
                {row === 'unlock' && unlockNote && <span className={`stg-pill p-${unlockNote[1]}`}>{unlockNote[0]}</span>}
                <span className="stg-chev" aria-hidden>
                  ›
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
