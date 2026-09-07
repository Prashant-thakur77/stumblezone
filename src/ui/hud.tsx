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
import { cheer, boo, react } from '../systems/spectator'
import { setSpectatorCam, spectatorCamOn } from '../systems/camera'
import { wearHat } from '../systems/hats'
import { pickWinner, sendGG } from '../systems/scheduler'
import { performPose } from '../arena/rounds/copycat'
import { POSES, Pose } from '../lib/copycat'
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
    <Card width="60%" height={250} position={{ top: '20%', left: '20%' }} color={hud.finale || hud.golden ? C.yellow : C.plate} show={hud.phase === 'card' && !hud.welcome}>
      <ChunkyText text={hud.roundTag} fontSize={24} width="100%" height={40} color={hud.finale || hud.golden ? C.navy : C.cyan} />
      <ChunkyText text={hud.roundName.toUpperCase()} fontSize={86} width="100%" height={110} />
      <ChunkyText text={hud.subtitle} fontSize={26} width="100%" height={50} color={hud.finale || hud.golden ? C.navy : C.yellow} />
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
    <Card width="64%" height={230} position={{ top: '20%', left: '18%' }} color={out ? C.slate : C.pink} show={hud.phase === 'results' && !hud.welcome}>
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
        display: hud.phase === 'results' || hud.dance ? 'flex' : 'none'
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
          uiTransform={{ width: '22%', height: 60 }}
          uiBackground={shape(UI_TEX.pill, b.color)}
        />
      ))}
      {/* GG to the rival named on the card. It is the one button that reaches one specific person. */}
      <Button
        value={hud.ggSent ? 'GG SENT' : 'GG ' + hud.ggTo}
        variant="primary"
        fontSize={20}
        color={C.navy}
        onMouseDown={sendGG}
        uiTransform={{ width: '28%', height: 60, display: hud.phase === 'results' && hud.ggTo !== '' ? 'flex' : 'none' }}
        uiBackground={shape(UI_TEX.pill, hud.ggSent ? C.slate : C.green)}
      />
    </UiEntity>
  )
}

/**
 * The Hat Market panel. Every hat is a button: earned ones wear on tap, locked ones say what to go
 * and do. Two rows of four so it fits a phone in landscape without covering the joystick.
 */
function HatShop() {
  const rows: ReactEcs.JSX.Element[] = hud.hats.map((h) => (
    <Button
      key={h.id}
      value={h.wearing ? h.name + ' - ON' : h.locked ? h.name + '\n' + h.unlock : 'WEAR ' + h.name}
      variant="primary"
      fontSize={h.locked ? 16 : 20}
      color={h.locked ? C.white : C.navy}
      onMouseDown={() => {
        if (!h.locked) wearHat(h.wearing ? '' : h.id)
      }}
      uiTransform={{ width: '23%', height: 64, margin: { bottom: 8 } }}
      uiBackground={shape(UI_TEX.pill, h.wearing ? C.green : h.locked ? C.slate : C.yellow)}
    />
  ))
  return (
    <UiEntity
      uiTransform={{
        // The bottom band, clear of the intro card and the results splash, which own the top.
        positionType: 'absolute',
        position: { bottom: 20, left: '28%' },
        width: '60%',
        height: 150,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        alignContent: 'flex-end',
        display: hud.shop && hud.phase !== 'play' ? 'flex' : 'none'
      }}
    >
      {rows}
      <Button
        value="NO HAT"
        variant="primary"
        fontSize={20}
        color={C.navy}
        onMouseDown={() => wearHat('')}
        uiTransform={{ width: '23%', height: 64, margin: { bottom: 8 } }}
        uiBackground={shape(UI_TEX.pill, C.cyan)}
      />
    </UiEntity>
  )
}

/** The last five seconds of a round, as big numerals. A clock in a pill is information; this is drama. */
function LastSeconds() {
  const show = hud.phase === 'play' && hud.roundClock > 0 && hud.roundClock <= 5
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '10%', left: '35%' },
        width: '30%',
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        display: show ? 'flex' : 'none'
      }}
    >
      <ChunkyText text={String(hud.roundClock)} fontSize={150} width="100%" height={160} color={countdownColor(hud.roundClock)} />
    </UiEntity>
  )
}

/** Copycat's six poses, two rows of three, only while it is your turn. */
function PoseRow() {
  const label: Record<Pose, string> = { dance: 'DANCE', clap: 'CLAP', wave: 'WAVE', dab: 'DAB', robot: 'ROBOT', fistpump: 'FIST PUMP' }
  const colors = [C.pink, C.yellow, C.cyan, C.green, C.pink, C.yellow]
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        // Right of the feed's corner, left of the joystick's reserved zone.
        position: { bottom: 20, left: '28%' },
        width: '50%',
        height: 150,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        alignContent: 'flex-end',
        display: hud.poses || (hud.dance && hud.phase !== 'play') ? 'flex' : 'none'
      }}
    >
      {POSES.map((p, i) => (
        <Button
          key={p}
          value={label[p]}
          variant="primary"
          fontSize={22}
          color={C.navy}
          onMouseDown={() => performPose(p)}
          uiTransform={{ width: '31%', height: 64, margin: { bottom: 8 } }}
          uiBackground={shape(UI_TEX.pill, colors[i])}
        />
      ))}
    </UiEntity>
  )
}

/** Three lines and a button, once. For the judge who reads nothing else. */
function Welcome() {
  return (
    <Card width="64%" height={270} position={{ top: '14%', left: '18%' }} color={C.plate} show={hud.welcome && hud.phase !== 'play'}>
      <ChunkyText text="STUMBLEZONE" fontSize={60} width="100%" height={72} color={C.yellow} />
      <ChunkyText text="A new round every 2 minutes. Walk and jump - that is all." fontSize={26} width="100%" height={38} />
      <ChunkyText text="Fall, and you cheer from the ledge. Five cheers and the crowd goes wild." fontSize={26} width="100%" height={38} />
      <ChunkyText text="Four rounds make a show. Win crowns, earn hats, walk the village." fontSize={26} width="100%" height={38} />
      <Button
        value="GOT IT"
        variant="primary"
        fontSize={26}
        color={C.navy}
        onMouseDown={() => (hud.welcome = false)}
        uiTransform={{ width: 220, height: 56, margin: { top: 10 } }}
        uiBackground={shape(UI_TEX.pill, C.yellow)}
      />
    </Card>
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
        <Pill
          text={hud.roundTag}
          width={420}
          height={36}
          fontSize={18}
          color={hud.finale || hud.golden ? C.yellow : C.plate}
          textColor={hud.finale || hud.golden ? C.navy : C.white}
          show={hud.roundTag !== ''}
        />
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

      {/* A power-up in hand. */}
      <Pill
        text={hud.boost > 0 ? 'BOOST ' + hud.boost + 's' : 'SHIELD'}
        width={170}
        position={{ top: 128, left: 16 }}
        color={hud.boost > 0 ? C.yellow : C.cyan}
        textColor={C.navy}
        fontSize={20}
        show={!hud.out && (hud.shield || hud.boost > 0)}
      />

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
      <Pill text={hud.showLine} width={300} position={{ top: 72, right: 16 }} color={C.yellow} textColor={C.navy} fontSize={20} show={hud.showLine !== ''} />

      {/* Today's challenge. It is the one line on this HUD that is about tomorrow. */}
      <Pill
        text={hud.daily}
        width={340}
        position={{ top: 128, right: 16 }}
        color={hud.daily === 'DAILY: DONE' ? C.green : C.plate}
        textColor={hud.daily === 'DAILY: DONE' ? C.navy : C.white}
        fontSize={18}
        show={hud.daily !== '' && hud.phase !== 'play'}
      />

      <IntroCard />
      <Countdown />
      <LastSeconds />
      <PlayBanner />
      <Splash />
      <Toasts />
      <Reactions />
      <HatShop />
      <PoseRow />
      <Welcome />

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
        <UiEntity uiTransform={{ width: '100%', height: 64, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Button
            value="CHEER"
            variant="primary"
            fontSize={26}
            color={C.navy}
            onMouseDown={cheer}
            uiTransform={{ width: '62%', height: 64 }}
            uiBackground={shape(UI_TEX.pill, C.yellow)}
          />
          <Button
            value="BOO"
            variant="primary"
            fontSize={26}
            color={C.white}
            onMouseDown={boo}
            uiTransform={{ width: '34%', height: 64 }}
            uiBackground={shape(UI_TEX.pill, C.slate)}
          />
        </UiEntity>
        {/* One tap to point the camera at the arena. On a phone, dragging a third-person camera
            round to face the round you were just knocked out of is the friction that makes people
            close the app instead of staying to watch the finish. */}
        <Button
          value={spectatorCamOn() ? 'BACK TO ME' : 'WATCH ARENA'}
          variant="primary"
          fontSize={22}
          color={C.navy}
          onMouseDown={() => setSpectatorCam(!spectatorCamOn())}
          uiTransform={{ width: '100%', height: 48, margin: { top: 8 } }}
          uiBackground={shape(UI_TEX.pill, spectatorCamOn() ? C.green : C.cyan)}
        />
        {/* A stake in the round: pick who wins. One tap, then it is a watch. */}
        <Pill text={'PICK: ' + hud.pick} width={260} height={40} fontSize={20} color={C.pink} show={hud.pick !== ''} />
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 100,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            margin: { top: 6 },
            display: hud.pick === '' && hud.phase === 'play' && hud.candidates.length > 0 ? 'flex' : 'none'
          }}
        >
          {hud.candidates.map((c) => (
            <Button
              key={c.address}
              value={'PICK ' + c.name}
              variant="primary"
              fontSize={18}
              color={C.navy}
              onMouseDown={() => pickWinner(c.address)}
              uiTransform={{ width: '48%', height: 42, margin: { bottom: 6, left: 2, right: 2 } }}
              uiBackground={shape(UI_TEX.pill, C.pink)}
            />
          ))}
        </UiEntity>
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
