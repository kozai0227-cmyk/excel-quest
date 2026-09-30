import { SpriteView } from './SpriteView'
import { PLAYER_SPEC, SPEAKER_LOOKS } from '../data/maps'
import type { Dir } from '../game/types'

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
          {(['slime', 'golem', 'celime', 'frog', 'bat', 'ghost', 'sheep', 'cat', 'dog'] as const).map((c) => (
            <SpriteView key={c} creature={c} />
          ))}
        </div>
        <span>モンスター・動物</span>
      </div>
    </div>
  )
}
