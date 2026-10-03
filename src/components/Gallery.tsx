import { SpriteView } from './SpriteView'
import { PLAYER_SPEC, SPEAKER_LOOKS } from '../data/maps'
import type { Dir } from '../game/types'
import { SFX_NAMES, bgm, jingle, sfx } from '../game/sound'
import { SONGS, type SongName } from '../data/music'

/** 開発用：キャラクター一覧（?gallery） */
export function Gallery() {
  const list = [['主人公', PLAYER_SPEC] as const, ...Object.entries(SPEAKER_LOOKS)]
  const dirs: Dir[] = ['down', 'left', 'right', 'up']
  return (
    <div className="gallery">
      {list.map(([name, spec]) => (
        <div key={name} className="gallery-item">
          <div>
            {dirs.map((d) => (
              <SpriteView key={d} spec={spec} dir={d} />
            ))}
          </div>
          <span>{name}</span>
        </div>
      ))}
      <div className="gallery-item">
        <div>
          {(['slime', 'golem', 'celime', 'frog', 'bat', 'ghost', 'nainai', 'shiori', 'mitsukaranu', 'dupli', 'chirakari', 'barabaran', 'kuuhaku', 'kirehashi', 'mojibake', 'sheep', 'cat', 'dog'] as const).map((c) => (
            <SpriteView key={c} creature={c} />
          ))}
        </div>
        <span>モンスター・動物</span>
      </div>
    </div>
  )
}

const SONG_LABEL: Record<SongName, string> = {
  title: 'タイトル',
  office: 'プロローグ（昼の オフィス）',
  night: 'プロローグ（夜）',
  town: '町',
  field: 'フィールド',
  dungeon: 'ダンジョン',
  battle: '戦闘',
  boss: 'ボス戦',
  quest: '依頼・謎解き',
  ending: '章の おわり',
  victory: '勝利',
  levelup: 'レベルアップ',
  clear: '依頼を 解決',
  item: 'アイテム 入手',
  inn: '宿屋',
  save: 'セーブ',
  lose: '全滅',
}

/** 開発用：サウンドテスト（?soundtest） */
export function SoundTest() {
  const names = Object.keys(SONGS) as SongName[]
  return (
    <div className="gallery soundtest">
      <h2>サウンドテスト</h2>
      <p>BGM</p>
      <div className="st-list">
        {names
          .filter((n) => SONGS[n].loop)
          .map((n) => (
            <button key={n} className="btn" onClick={() => bgm(n)}>
              {SONG_LABEL[n]}
            </button>
          ))}
        <button className="btn" onClick={() => bgm(null)}>
          ■ とめる
        </button>
      </div>
      <p>ジングル</p>
      <div className="st-list">
        {names
          .filter((n) => !SONGS[n].loop)
          .map((n) => (
            <button key={n} className="btn" onClick={() => jingle(n)}>
              {SONG_LABEL[n]}
            </button>
          ))}
      </div>
      <p>効果音</p>
      <div className="st-list">
        {SFX_NAMES.map((n) => (
          <button key={n} className="btn" data-nosfx onClick={() => sfx(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
