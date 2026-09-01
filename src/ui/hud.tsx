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
//
// The look is a game show's (docs/FALLGUYS-PRESENTATION.md): rounded bordered pills for readouts, a
// category-tagged intro card, a countdown that flips colour each second, and a full splash for
// QUALIFIED / ELIMINATED. Every plate is a tinted PNG (see parts.tsx): the mobile client does not
// render `borderRadius`, and this HUD has to look right on a phone first.

import ReactEcs, { ReactEcsRenderer, UiEntity, Label, Button } from '@dcl/sdk/react-ecs'
import { hud } from './state'
import { cheer, react } from '../systems/spectator'
import { Color4 } from '@dcl/sdk/math'
import { C, countdownColor } from './theme'
import { Pill, Card, ChunkyText, Dots, shape, UI_TEX } from './parts'
import { LIVES_PER_ROUND } from '../config'

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m + ':' + (s < 10 ? '0' : '') + s
}

/** The intro card: tag, name, three-word hint. Gold when it is the final. */
function IntroCard() {
  return (
    <Card width="60%" height={250} position={{ top: '20%', left: '20%' }} color={hud.finale ? C.yellow : C.plate} show={hud.phase === 'card'}>
      <ChunkyText text={hud.roundTag} fontSize={28} width="100%" height={40} color={hud.finale ? C.navy : C.cyan} />
      <ChunkyText text={hud.roundName.toUpperCase()} fontSize={86} width="100%" height={110} />
      <ChunkyText text={hud.subtitle} fontSize={32} width="100%" height={50} color={hud.finale ? C.navy : C.yellow} />
    </Card>
  )
}

/** 3 - 2 - 1 in three colours. The banner carries the numeral; nothing else is on screen. */
function Countdown() {
  const n = parseInt(hud.banner, 10)
  const isNumber = !isNaN(n)
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '18%', left: '20%' },
        width: '60%',
        height: 300,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        display: hud.phase === 'countdown' ? 'flex' : 'none'
      }}
    >
      <ChunkyText text={hud.banner} fontSize={isNumber ? 200 : 96} width="100%" height={230} color={isNumber ? countdownColor(n) : C.white} />
      <ChunkyText text={hud.subtitle.toUpperCase()} fontSize={34} width="100%" height={50} color={C.yellow} />
    </UiEntity>
  )
}

/** The in-play centre line: the round's instruction, above true centre so it never fights the controls. */
function PlayBanner() {
  const show = hud.phase === 'play' && (hud.banner !== '' || hud.subtitle !== '')
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '22%', left: '15%' },
        width: '70%',
        height: 150,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        display: show ? 'flex' : 'none'
      }}
    >
      <ChunkyText text={hud.banner} fontSize={76} width="100%" height={96} />
      <ChunkyText text={hud.subtitle} fontSize={28} width="100%" height={44} color={C.yellow} />
    </UiEntity>
  )
}

/** QUALIFIED! in pink and gold, ELIMINATED in slate. The whole centre of the screen, for 15 seconds. */
function Splash() {
  const out = hud.out
  return (
    <Card width="64%" height={230} position={{ top: '20%', left: '18%' }} color={out ? C.slate : C.pink} show={hud.phase === 'results'}>
      <ChunkyText text={hud.banner} fontSize={110} width="100%" height={130} color={out ? C.white : C.yellow} />
      <ChunkyText text={hud.subtitle} fontSize={28} width="100%" height={44} />
    </Card>
  )
}

/** The corner feed. Newest on top, each line gone four seconds after it arrives. */
function Toasts() {
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { bottom: 24, left: 16 },
        width: 420,
        height: 150,
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      {hud.toasts.map((t, i) => (
        <Pill key={i} text={t} width={400} height={40} fontSize={20} color={C.plate} />
      ))}
    </UiEntity>
  )
}

/**
 * Three reactions on the results card. Fifteen seconds of standings is dead air otherwise, and a
 * room that can react to a result together is the difference between a scoreboard and a party.
 */
function Reactions() {
  const buttons: { label: string; emote: 'disco' | 'clap' | 'shrug'; color: Color4 }[] = [
    { label: 'DANCE', emote: 'disco', color: C.cyan },
    { label: 'CLAP', emote: 'clap', color: C.yellow },
    { label: 'SHRUG', emote: 'shrug', color: C.pink }
  ]
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '50%', left: '25%' },
        width: '50%',
        height: 70,
        flexDirection: 'row',
        justifyContent: 'space-around',
        display: hud.phase === 'results' ? 'flex' : 'none'
      }}
    >
      {buttons.map((b) => (
        <Button
          key={b.label}
          value={b.label}
          variant="primary"
          fontSize={24}
          color={C.navy}
          onMouseDown={() => react(b.emote)}
          uiTransform={{ width: '30%', height: 60 }}
          uiBackground={shape(UI_TEX.pill, b.color)}
        />
      ))}
    </UiEntity>
  )
}

function Hud() {
  const tense = hud.roundClock > 0 && hud.roundClock <= 15
  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%', positionType: 'absolute' }}>
      {/* Top centre: what round this is, and how long is left in it. A full-width row that
          centres its children, because an absolute `left: 50%` puts the left EDGE at centre. */}
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 10, left: 0 },
          width: '100%',
          height: 150,
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Pill text={hud.roundTag} width={300} height={36} fontSize={18} color={hud.finale ? C.yellow : C.plate} textColor={hud.finale ? C.navy : C.white} show={hud.roundTag !== ''} />
        <Pill text={hud.roundName.toUpperCase()} width={360} color={C.pink} fontSize={24} />
        <Pill
          text={formatClock(hud.roundClock)}
          width={150}
          color={tense ? C.yellow : C.cyan}
          textColor={C.navy}
          fontSize={26}
          show={hud.roundClock > 0}
        />
      </UiEntity>

      {/* Top left: your lives, as dots. */}
      <Dots count={Math.max(0, hud.lives)} max={LIVES_PER_ROUND} position={{ top: 16, left: 16 }} show={!hud.out} />
      <Pill text="SPECTATING" width={170} position={{ top: 16, left: 16 }} color={C.slate} fontSize={20} show={hud.out} />

      {/* The crowd meter. Bars, not a gauge - a gauge needs a texture per state, bars need none. */}
      <Pill
        text={'HYPE ' + '|'.repeat(Math.max(1, Math.round(hud.hype * 5)))}
        width={170}
        position={{ top: 72, left: 16 }}
        color={hud.hype >= 1 ? C.pink : C.plate}
        fontSize={20}
        show={hud.hype > 0}
      />

      {/* Top right: the field, and your standing in the show. */}
      <Pill
        text={hud.fieldLine || hud.alive + ' IN'}
        width={340}
        position={{ top: 16, right: 16 }}
        color={C.cyan}
        textColor={C.navy}
        fontSize={20}
      />
      <Pill text={hud.showLine} width={200} position={{ top: 72, right: 16 }} color={C.yellow} textColor={C.navy} fontSize={20} show={hud.showLine !== ''} />

      <IntroCard />
      <Countdown />
      <PlayBanner />
      <Splash />
      <Toasts />
      <Reactions />

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
          fontSize={28}
          color={C.navy}
          onMouseDown={cheer}
          uiTransform={{ width: '100%', height: 64 }}
          uiBackground={shape(UI_TEX.pill, C.yellow)}
        />
        <Label
          value="Watching from the ledge"
          fontSize={18}
          color={C.white}
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
