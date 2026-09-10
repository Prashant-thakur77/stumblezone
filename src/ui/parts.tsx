// The HUD's building blocks: plates, pills, cards, chunky text, life dots.
//
// The same layout rules as hud.tsx: every Label has explicit width and height, no emoji, and
// none of these carry a pointer handler.
//
// Every rounded shape here is a tinted white PNG (tools/make-ui.mjs), never `borderRadius`: the
// mobile client ignores that property, so a plate drawn from layout props comes out as a hard
// rectangle on the very device this scene is built for. A stretched texture with a colour tint
// looks the same on every client.

import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { C } from './theme'

/** The SDK's position values are a template-literal union, so a plain `string` is too wide. */
export type PosUnit = number | `${number}px` | `${number}%`
export type Position = { top?: PosUnit; left?: PosUnit; right?: PosUnit; bottom?: PosUnit }
export type Size = number | `${number}%`

export const UI_TEX = {
  pill: 'images/ui/pill.png',
  card: 'images/ui/card.png',
  dot: 'images/ui/dot.png'
}

export function shape(tex: string, color: Color4) {
  return { texture: { src: tex }, textureMode: 'stretch' as const, color }
}

type PlateProps = {
  tex: string
  color: Color4
  width: Size
  height: Size
  /** Absent means the plate flows inside its parent (used for the centred top stack). */
  position?: Position
  margin?: { bottom?: number }
  show?: boolean
  children?: ReactEcs.JSX.Element | ReactEcs.JSX.Element[]
}

/**
 * A tinted plate over a dark copy offset 3px down-right: the outline plus drop shadow that stands
 * in for Fall Guys' chubby bordered plates. The outer box is the hit area; both textures sit
 * absolute inside it, and the content is a centred column on top.
 */
export function Plate(props: PlateProps) {
  return (
    <UiEntity
      uiTransform={{
        positionType: props.position ? 'absolute' : 'relative',
        position: props.position,
        margin: props.margin,
        width: props.width,
        height: props.height,
        display: props.show === false ? 'none' : 'flex'
      }}
    >
      <UiEntity
        uiTransform={{ positionType: 'absolute', position: { top: 3, left: 3 }, width: '100%', height: '100%' }}
        uiBackground={shape(props.tex, C.shadow)}
      />
      <UiEntity
        uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%' }}
        uiBackground={shape(props.tex, props.color)}
      />
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {props.children}
      </UiEntity>
    </UiEntity>
  )
}

type ChunkyProps = {
  key?: number | string
  text: string
  fontSize: number
  width: Size
  height: number
  color?: Color4
}

/**
 * A label with a hard drop shadow: the same text twice, the dark copy offset down-right. It is
 * what stands in for the outlined, chubby display type the real thing uses.
 */
export function ChunkyText(props: ChunkyProps) {
  const offset = Math.max(2, Math.round(props.fontSize / 22))
  return (
    <UiEntity uiTransform={{ width: props.width, height: props.height, positionType: 'relative' }}>
      <Label
        value={props.text}
        fontSize={props.fontSize}
        color={C.shadow}
        textAlign="middle-center"
        uiTransform={{ positionType: 'absolute', position: { top: offset, left: offset }, width: '100%', height: '100%' }}
      />
      <Label
        value={props.text}
        fontSize={props.fontSize}
        color={props.color ?? C.white}
        textAlign="middle-center"
        uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%' }}
      />
    </UiEntity>
  )
}

type PillProps = {
  /** Set when pills are rendered from a list, so react-ecs can keep entities stable. */
  key?: number | string
  text: string
  width: number
  position?: Position
  height?: number
  fontSize?: number
  color?: Color4
  textColor?: Color4
  show?: boolean
}

/** A pill plate with one line of chunky text. The HUD's readout unit. */
export function Pill(props: PillProps) {
  const height = props.height ?? 48
  return (
    <Plate
      tex={UI_TEX.pill}
      color={props.color ?? C.plate}
      width={props.width}
      height={height}
      position={props.position}
      margin={props.position ? undefined : { bottom: 6 }}
      show={props.show}
    >
      <ChunkyText text={props.text} fontSize={props.fontSize ?? 22} width="100%" height={height} color={props.textColor} />
    </Plate>
  )
}

type CardProps = {
  width: Size
  height: number
  position: Position
  color?: Color4
  show?: boolean
  children?: ReactEcs.JSX.Element | ReactEcs.JSX.Element[]
}

/** The big centre plate for the intro card and the results splash. */
export function Card(props: CardProps) {
  return (
    <Plate tex={UI_TEX.card} color={props.color ?? C.plate} width={props.width} height={props.height} position={props.position} show={props.show}>
      {props.children}
    </Plate>
  )
}

type DotsProps = {
  count: number
  max: number
  position: Position
  show?: boolean
}

/** Lives as filled and dim dots on a small pill plate. Three dots read faster than "x3". */
export function Dots(props: DotsProps) {
  const dots: ReactEcs.JSX.Element[] = []
  for (let i = 0; i < props.max; i++) {
    dots.push(
      <UiEntity
        key={i}
        uiTransform={{ width: 18, height: 18, margin: { left: 5, right: 5 } }}
        uiBackground={shape(UI_TEX.dot, i < props.count ? C.pink : C.dim)}
      />
    )
  }
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: props.position,
        width: 150,
        height: 48,
        display: props.show === false ? 'none' : 'flex'
      }}
    >
      <UiEntity
        uiTransform={{ positionType: 'absolute', position: { top: 3, left: 3 }, width: '100%', height: '100%' }}
        uiBackground={shape(UI_TEX.pill, C.shadow)}
      />
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          width: '100%',
          height: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        uiBackground={shape(UI_TEX.pill, C.plate)}
      >
        {dots}
      </UiEntity>
    </UiEntity>
  )
}
