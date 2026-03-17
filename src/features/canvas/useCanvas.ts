import { useState, useRef, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'
import type { Element, Stroke, Shape, Point, Tool } from '../../types/canvas'

function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return ''
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )
  d.push('Z')
  return d.join(' ')
}

let strokeCount = 0
let shapeCount = 0

export function useCanvas() {
  const [elements, setElements] = useState<Element[]>([])
  const [redoStack, setRedoStack] = useState<Element[][]>([])
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const [shapePreview, setShapePreview] = useState<Shape | null>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#ffffff')
  const [size, setSize] = useState(4)
  const isDrawing = useRef(false)
  const shapeStart = useRef<{ x: number; y: number } | null>(null)

  // ── Pen ──────────────────────────────────────────────
  const startStroke = useCallback((x: number, y: number, pressure: number) => {
    if (tool !== 'pen') return
    isDrawing.current = true
    setCurrentStroke([{ x, y, pressure }])
  }, [tool])

  const continueStroke = useCallback((x: number, y: number, pressure: number) => {
    if (tool !== 'pen' || !isDrawing.current) return
    setCurrentStroke(prev => [...prev, { x, y, pressure }])
  }, [tool])

  const endStroke = useCallback(() => {
    if (tool !== 'pen' || !isDrawing.current) return
    isDrawing.current = false
    setCurrentStroke(prev => {
      if (prev.length > 0) {
        strokeCount++
        const newStroke: Stroke = {
          id: crypto.randomUUID(),
          kind: 'stroke',
          points: prev,
          color,
          size,
          opacity: 1,
          visible: true,
          name: `Stroke ${strokeCount}`,
        }
        setElements(els => {
          setRedoStack([])
          return [...els, newStroke]
        })
      }
      return []
    })
  }, [tool, color, size])

  // ── Eraser ───────────────────────────────────────────
  const eraseAt = useCallback((x: number, y: number) => {
    const RADIUS = 20
    setElements(prev =>
      prev.filter(el => {
        if (el.kind === 'stroke') {
          return !el.points.some(p => Math.hypot(p.x - x, p.y - y) < RADIUS)
        }
        // For shapes, erase if click is inside bounding box
        const { x: sx, y: sy, width: sw, height: sh } = el
        const minX = Math.min(sx, sx + sw)
        const minY = Math.min(sy, sy + sh)
        const maxX = Math.max(sx, sx + sw)
        const maxY = Math.max(sy, sy + sh)
        return !(x >= minX && x <= maxX && y >= minY && y <= maxY)
      })
    )
  }, [])

  // ── Shapes ───────────────────────────────────────────
  const startShape = useCallback((x: number, y: number) => {
    if (tool === 'pen' || tool === 'eraser') return
    shapeStart.current = { x, y }
  }, [tool])

  const previewShape = useCallback((x: number, y: number) => {
    if (!shapeStart.current || tool === 'pen' || tool === 'eraser') return
    const { x: sx, y: sy } = shapeStart.current
    setShapePreview({
      id: 'preview',
      kind: 'shape',
      type: tool as Shape['type'],
      x: sx,
      y: sy,
      width: x - sx,
      height: y - sy,
      color,
      strokeWidth: size,
      opacity: 0.7,
      visible: true,
      name: '',
    })
  }, [tool, color, size])

  const endShape = useCallback((x: number, y: number) => {
    if (!shapeStart.current || tool === 'pen' || tool === 'eraser') return
    const { x: sx, y: sy } = shapeStart.current
    shapeStart.current = null
    setShapePreview(null)
    const w = x - sx
    const h = y - sy
    if (Math.abs(w) < 4 && Math.abs(h) < 4) return // too small, ignore
    shapeCount++
    const newShape: Shape = {
      id: crypto.randomUUID(),
      kind: 'shape',
      type: tool as Shape['type'],
      x: sx,
      y: sy,
      width: w,
      height: h,
      color,
      strokeWidth: size,
      opacity: 1,
      visible: true,
      name: `${tool.charAt(0).toUpperCase() + tool.slice(1)} ${shapeCount}`,
    }
    setElements(els => {
      setRedoStack([])
      return [...els, newShape]
    })
  }, [tool, color, size])

  // ── Undo / Redo ──────────────────────────────────────
  const undo = useCallback(() => {
    setElements(prev => {
      if (prev.length === 0) return prev
      setRedoStack(r => [...r, prev])
      return prev.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setElements(last)
      return prev.slice(0, -1)
    })
  }, [])

  // ── Layer controls ───────────────────────────────────
  const toggleVisibility = useCallback((id: string) => {
    setElements(prev =>
      prev.map(el => el.id === id ? { ...el, visible: !el.visible } : el)
    )
  }, [])

  const deleteElement = useCallback((id: string) => {
    setElements(prev => prev.filter(el => el.id !== id))
  }, [])

  const clearCanvas = useCallback(() => {
    setRedoStack([])
    setElements([])
    setCurrentStroke([])
    setShapePreview(null)
    strokeCount = 0
    shapeCount = 0
  }, [])

  // ── Rendering ────────────────────────────────────────
  const getPath = useCallback((points: Point[], strokeSize: number) => {
    const stroke = getStroke(
      points.map(p => [p.x, p.y, p.pressure]),
      { size: strokeSize, thinning: 0.5, smoothing: 0.5, streamline: 0.5 }
    )
    return getSvgPathFromStroke(stroke)
  }, [])

  return {
    elements,
    currentStroke,
    shapePreview,
    tool,
    color,
    size,
    setTool,
    setColor,
    setSize,
    startStroke,
    continueStroke,
    endStroke,
    eraseAt,
    startShape,
    previewShape,
    endShape,
    undo,
    redo,
    toggleVisibility,
    deleteElement,
    clearCanvas,
    getPath,
  }
}