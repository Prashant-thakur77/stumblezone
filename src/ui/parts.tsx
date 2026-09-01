// The HUD's building blocks: pills, cards, chunky text, life dots.
//
// The same layout rules as hud.tsx: every Label has explicit width and height, no emoji, and
// none of these carry a pointer handler.

import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { C, R } from './theme'

/** The SDK's position values are a template-literal union, so a plain `string` is too wide. */
export type PosUnit = number | `${number}px` | `${number}%`
export type Position = { top?: PosUnit; left?: PosUnit; right?: PosUnit; bottom?: PosUnit }

type ChunkyProps = {
  text: string
  fontSize: number
  width: number | `${number}%`
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
  text: string
  width: number
  /** Absent means the pill flows inside its parent (used for the centred top stack). */
  position?: Position
  height?: number
  fontSize?: number
  color?: Color4
  textColor?: Color4
  show?: boolean
}

/** A rounded, bordered plate with one line of chunky text. The HUD's readout unit. */
export function Pill(props: PillProps) {
  const height = props.height ?? 48
  return (
    <UiEntity
      uiTransform={{
        positionType: props.position ? 'absolute' : 'relative',
        position: props.position,
        margin: props.position ? undefined : { bottom: 6 },
        width: props.width,
        height,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: R.pill,
        borderWidth: 3,
        borderColor: C.shadow,
        display: props.show === false ? 'none' : 'flex'
      }}
      uiBackground={{ color: props.color ?? C.plate }}
    >
      <ChunkyText text={props.text} fontSize={props.fontSize ?? 22} width="100%" height={height - 6} color={props.textColor} />
    </UiEntity>
  )
}

type CardProps = {
  width: number | `${number}%`
  height: number
  position: Position
  color?: Color4
  show?: boolean
  children?: ReactEcs.JSX.Element | ReactEcs.JSX.Element[]
}

/** A big rounded plate that stacks its children vertically, centred. The intro card and splashes. */
export function Card(props: CardProps) {
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: props.position,
        width: props.width,
        height: props.height,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: R.card,
        borderWidth: 4,
        borderColor: C.shadow,
        padding: 12,
        display: props.show === false ? 'none' : 'flex'
      }}
      uiBackground={{ color: props.color ?? C.plate }}
    >
      {props.children}
    </UiEntity>
  )
}

type DotsProps = { count: number; max: number; position: Position; show?: boolean }

/** Lives as drawn circles. No glyphs: the Unity client has no heart character to draw. */
export function Dots(props: DotsProps) {
  const dots: ReactEcs.JSX.Element[] = []
  for (let i = 0; i < props.max; i++) {
    dots.push(
      <UiEntity
        key={'life' + i}
        uiTransform={{
          width: 18,
          height: 18,
          margin: { left: 4, right: 4 },
          borderRadius: 9,
          borderWidth: 2,
          borderColor: C.shadow
        }}
        uiBackground={{ color: i < props.count ? C.pink : C.dim }}
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
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: R.pill,
        borderWidth: 3,
        borderColor: C.shadow,
        display: props.show === false ? 'none' : 'flex'
      }}
      uiBackground={{ color: C.plate }}
    >
      {dots}
    </UiEntity>
  )
}
