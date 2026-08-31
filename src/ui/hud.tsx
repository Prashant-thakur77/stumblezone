// The heads-up display.
//
// Mobile-first layout rules this obeys, from the mobile safe-area and UI guidance:
//   - Nothing near the bottom edge: that is where the joystick and the jump button live.
//   - Nothing in the extreme corners: notches and rounded corners eat them.
//   - The countdown is very large. It is the one thing a player must read while moving.
//   - Text is white on a dark translucent plate, so it survives any background the arena throws up.

import ReactEcs, { ReactEcsRenderer, UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { hud } from './state'

/** Kept clear of the device edges and of the client's own on-screen controls. */
const SAFE_TOP = 24
const SAFE_SIDE = 24

const plate = Color4.create(0, 0, 0, 0.45)

function Hud() {
  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%', positionType: 'absolute' }}>
      {/* Round name, top centre. */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: SAFE_TOP, left: '25%' },
          width: '50%',
          height: 40,
          justifyContent: 'center',
          alignItems: 'center'
        }}
        uiBackground={{ color: plate }}
      >
        <Label value={hud.roundName} fontSize={22} color={Color4.White()} />
      </UiEntity>

      {/* Lives, top left. Hidden once eliminated - it would only rub it in. */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: SAFE_TOP, left: SAFE_SIDE },
          width: 120,
          height: 36,
          justifyContent: 'center',
          alignItems: 'center',
          display: hud.out ? 'none' : 'flex'
        }}
        uiBackground={{ color: plate }}
      >
        <Label value={'Lives ' + '*'.repeat(Math.max(0, hud.lives))} fontSize={18} color={Color4.White()} />
      </UiEntity>

      {/* Players still alive, top right. */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: SAFE_TOP, right: SAFE_SIDE },
          width: 120,
          height: 36,
          justifyContent: 'center',
          alignItems: 'center'
        }}
        uiBackground={{ color: plate }}
      >
        <Label value={hud.alive + ' alive'} fontSize={18} color={Color4.White()} />
      </UiEntity>

      {/* The big centre line. Sits above true centre so it never fights the on-screen controls. */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: '28%', left: '10%' },
          width: '80%',
          height: 100,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          display: hud.banner || hud.subtitle ? 'flex' : 'none'
        }}
      >
        <Label value={hud.banner} fontSize={64} color={Color4.White()} />
        <Label value={hud.subtitle} fontSize={22} color={Color4.White()} />
      </UiEntity>

      {/* Spectator prompt. The only thing an eliminated player can do, so it is spelled out. */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: '52%', left: '20%' },
          width: '60%',
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
          display: hud.out ? 'flex' : 'none'
        }}
        uiBackground={{ color: plate }}
      >
        <Label value="Press E to cheer them on" fontSize={20} color={Color4.White()} />
      </UiEntity>
    </UiEntity>
  )
}

export function setupHud(): void {
  ReactEcsRenderer.setUiRenderer(Hud)
}
