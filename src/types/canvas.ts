export interface Point {
  x: number
  y: number
  pressure: number
}

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
  type: 'rect' | 'circle' | 'line'
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

export type Element = Stroke | Shape

export type Tool = 'pen' | 'eraser' | 'rect' | 'circle' | 'line'

export interface Viewport {
  x: number
  y: number
  zoom: number
}