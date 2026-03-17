export interface Point {
  x: number
  y: number
  pressure: number
}

export interface Stroke {
  id: string
  points: Point[]
  color: string
  size: number
  opacity: number
}

export type Tool = 'pen' | 'eraser'

export interface Viewport {
  x: number
  y: number
  zoom: number
}