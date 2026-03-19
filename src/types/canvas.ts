export interface Point {
  x: number
  y: number
  pressure: number
}

export type ShapeType =
  | 'rect' | 'rounded-rect' | 'circle' | 'line' | 'arrow'
  | 'triangle' | 'star' | 'diamond' | 'cross'
  | 'hexagon' | 'pentagon' | 'heart' | 'speech-bubble' | 'cloud'

export interface Stroke {
  id: string
  kind: 'stroke'
  points: Point[]
  color: string
  size: number
  opacity: number
  visible: boolean
  name: string
}

export interface Shape {
  id: string
  kind: 'shape'
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  color: string
  strokeWidth: number
  opacity: number
  visible: boolean
  name: string
}

export interface Frame {
  id: string
  kind: 'frame'
  name: string
  x: number
  y: number
  width: number
  height: number
  background: string
  visible: boolean
}

export type Element = Stroke | Shape | Frame

export type Tool =
  | 'select' | 'pan' | 'lasso'
  | 'pen' | 'eraser' | 'frame'
  | ShapeType

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface Page {
  id: string
  name: string
  elements: Element[]
}
