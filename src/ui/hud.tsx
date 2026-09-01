// The heads-up display.
//
// Layout rules this obeys, all from the SDK's own UI guidance:
//
//   - EVERY Label carries an explicit width and height. Text intrinsic sizing is engine-dependent:
//     the Bevy explorer measures glyphs and lays out correctly, the Unity explorer gives an unset
//     dimension ~0 while still drawing the text, so stacked labels collide and their parent
//     collapses. A preview that looks right in one client proves nothing about the others.
//   - Containers that stack labels carry explicit heights too, for the same reason.
//   - No emoji anywhere. The Unity explorer ships no emoji glyphs, so they render as missing-glyph
//     boxes or vanish silently.
//   - `screenInset: 'interactable'` keeps the whole HUD clear of both the device notch and the
//     client's own controls - the joystick, jump button and chat. No hand-rolled safe-area padding,
//     which would double up on top of it.
//   - Only the cheer Button carries a pointer handler. A handler on the full-screen wrapper would
//     capture every click on screen and make the entire game unclickable while still looking fine.

import ReactEcs, { ReactEcsRenderer, UiEntity, Label, Button } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { hud } from './state'
import { cheer } from '../systems/spectator'

const plate = Color4.create(0, 0, 0, 0.45)
const white = Color4.White()

/** The SDK's position values are a template-literal union, so a plain `string` is too wide. */
type PosUnit = number | `${number}px` | `${number}%`

type ChipProps = {
  text: string
  width: number
  /** Passed through whole, so an absent edge stays absent rather than becoming `undefined`. */
  position: { top?: PosUnit; left?: PosUnit; right?: PosUnit }
  show?: boolean
}

/** A dark plate with a single line of centred text. */
function Chip(props: ChipProps) {
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: props.position,
        width: props.width,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        display: props.show === false ? 'none' : 'flex'
      }}
      uiBackground={{ color: plate }}
    >
      <Label value={props.text} fontSize={20} color={white} textAlign="middle-center" uiTransform={{ width: '100%', height: '100%' }} />
    </UiEntity>
  )
}

function Hud() {
  const showBanner = hud.banner !== '' || hud.subtitle !== ''
  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%', positionType: 'absolute' }}>
      <Chip text={hud.roundName} width={360} position={{ top: 16, left: '50%' }} />
      <Chip
        text={'Lives ' + '*'.repeat(Math.max(0, hud.lives))}
        width={150}
        position={{ top: 16, left: 16 }}
        show={!hud.out}
      />
      <Chip text={hud.alive + ' alive'} width={150} position={{ top: 16, right: 16 }} />

      {/* The big centre line. Above true centre so it never fights the on-screen controls. */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: '24%', left: '15%' },
          width: '70%',
          height: 150,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          display: showBanner ? 'flex' : 'none'
        }}
      >
        <Label
          value={hud.banner}
          fontSize={72}
          color={white}
          textAlign="middle-center"
          uiTransform={{ width: '100%', height: 90 }}
        />
        <Label
          value={hud.subtitle}
          fontSize={24}
          color={white}
          textAlign="middle-center"
          uiTransform={{ width: '100%', height: 40 }}
        />
      </UiEntity>

      {/* Spectator cheer. A real on-screen button, not a "press E" instruction - a thumb needs
          something to hit, and this is the only thing an eliminated player can do. */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: '58%', left: '35%' },
          width: '30%',
          height: 110,
          flexDirection: 'column',
          alignItems: 'center',
          display: hud.out ? 'flex' : 'none'
        }}
      >
        <Button
          value="CHEER"
          variant="primary"
          fontSize={26}
          onMouseDown={cheer}
          uiTransform={{ width: '100%', height: 64 }}
        />
        <Label
          value="Watching from the ledge"
          fontSize={18}
          color={white}
          textAlign="middle-center"
          uiTransform={{ width: '100%', height: 34 }}
        />
      </UiEntity>
    </UiEntity>
  )
}

export function setupHud(): void {
  ReactEcsRenderer.setUiRenderer(Hud, {
    virtualWidth: 1920,
    virtualHeight: 1080,
    // Keeps the HUD out of the client's own reserved zones as well as the device safe area.
    screenInset: 'interactable'
  })
}
