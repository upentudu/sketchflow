import { useState, useRef, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'
import type { Element, Stroke, Shape, Frame, Point, Tool, ShapeType } from '../../types/canvas'

// ── SVG path from perfect-freehand output ─────────────────────────────
function svgPath(stroke: number[][]): string {
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

let strokeCount = 0, shapeCount = 0, frameCount = 0

const SHAPE_TOOLS: Tool[] = [
  'rect', 'rounded-rect', 'circle', 'line', 'arrow',
  'triangle', 'star', 'diamond', 'cross',
  'hexagon', 'pentagon', 'heart', 'speech-bubble', 'cloud',
]
export const isShapeTool = (t: Tool) => SHAPE_TOOLS.includes(t)

export function useCanvas() {
  const [elements, setElements] = useState<Element[]>([])
  const [redoStack, setRedoStack] = useState<Element[][]>([])

  // ── Stroke: ref holds real data, state is for rendering only ─────────
  // This prevents nested-setState bugs that caused the double-tap undo issue
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const currentStrokeRef = useRef<Point[]>([])
  const isDrawing = useRef(false)

  // ── Shape/frame drag ──────────────────────────────────────────────────
  const [shapePreview, setShapePreview] = useState<Shape | Frame | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#ffffff')
  const [size, setSize] = useState(4)         // pen stroke width
  const [eraserSize, setEraserSize] = useState(20) // eraser radius (separate)

  // Load a page's elements when switching pages
  const loadElements = useCallback((els: Element[]) => {
    setElements(els)
    setRedoStack([])
    setCurrentStroke([])
    setShapePreview(null)
    currentStrokeRef.current = []
    isDrawing.current = false
    dragStartRef.current = null
  }, [])

  // ── Pen ───────────────────────────────────────────────────────────────
  const startStroke = useCallback((x: number, y: number, pressure: number) => {
    if (tool !== 'pen') return
    const p = { x, y, pressure }
    isDrawing.current = true
    currentStrokeRef.current = [p]
    setCurrentStroke([p])
  }, [tool])

  const continueStroke = useCallback((x: number, y: number, pressure: number) => {
    if (!isDrawing.current) return
    const p = { x, y, pressure }
    currentStrokeRef.current.push(p)
    setCurrentStroke(prev => [...prev, p])
  }, [])

  // endStroke: reads from ref directly — no nested setState, fixes undo bug
  const endStroke = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    const points = [...currentStrokeRef.current]
    currentStrokeRef.current = []
    setCurrentStroke([])
    if (points.length < 2) return
    strokeCount++
    const s: Stroke = {
      id: crypto.randomUUID(), kind: 'stroke',
      points, color, size, opacity: 1, visible: true,
      name: `Stroke ${strokeCount}`,
    }
    setElements(els => { setRedoStack([]); return [...els, s] })
  }, [color, size])

  // cancelStroke: discards current stroke without committing — fixes dot-on-zoom
  const cancelStroke = useCallback(() => {
    isDrawing.current = false
    currentStrokeRef.current = []
    setCurrentStroke([])
  }, [])

  // ── Eraser (partial) ──────────────────────────────────────────────────
  // Strokes are split at erased points — only the erased portion disappears
  // Shapes are removed if the eraser center is inside their bounding box
  const eraseAt = useCallback((x: number, y: number, radius: number) => {
    setElements(prev => {
      const next: Element[] = []
      for (const el of prev) {
        // Frames: never erased by brush
        if (el.kind === 'frame') { next.push(el); continue }

        // Shapes: erase whole shape if eraser is inside bounding box
        if (el.kind === 'shape') {
          const { x: sx, y: sy, width: sw, height: sh } = el
          const inside =
            x >= Math.min(sx, sx + sw) && x <= Math.max(sx, sx + sw) &&
            y >= Math.min(sy, sy + sh) && y <= Math.max(sy, sy + sh)
          if (!inside) next.push(el)
          continue
        }

        // Strokes: partial erase — split into segments around the erased region
        let segment: Point[] = []
        for (const p of el.points) {
          if (Math.hypot(p.x - x, p.y - y) < radius) {
            // Point is inside eraser radius — end current segment
            if (segment.length >= 2) {
              next.push({ ...el, id: crypto.randomUUID(), points: segment })
            }
            segment = []
          } else {
            segment.push(p)
          }
        }
        // Push any remaining segment
        if (segment.length >= 2) {
          next.push({ ...el, points: segment })
        }
      }
      return next
    })
  }, [])

  // ── Shapes & Frames drag ──────────────────────────────────────────────
  const startDrag = useCallback((x: number, y: number) => {
    dragStartRef.current = { x, y }
  }, [])

  const previewDrag = useCallback((x: number, y: number) => {
    if (!dragStartRef.current) return
    const { x: sx, y: sy } = dragStartRef.current
    const w = x - sx, h = y - sy
    if (tool === 'frame') {
      setShapePreview({
        id: 'preview', kind: 'frame', name: '',
        x: sx, y: sy, width: w, height: h,
        background: '#1e293b', visible: true,
      })
    } else {
      setShapePreview({
        id: 'preview', kind: 'shape',
        type: tool as ShapeType,
        x: sx, y: sy, width: w, height: h,
        color, strokeWidth: size, opacity: 0.6, visible: true, name: '',
      })
    }
  }, [tool, color, size])

  const endDrag = useCallback((x: number, y: number) => {
    if (!dragStartRef.current) return
    const { x: sx, y: sy } = dragStartRef.current
    dragStartRef.current = null
    setShapePreview(null)
    const w = x - sx, h = y - sy
    if (Math.abs(w) < 4 && Math.abs(h) < 4) return

    if (tool === 'frame') {
      frameCount++
      const f: Frame = {
        id: crypto.randomUUID(), kind: 'frame',
        name: `Frame ${frameCount}`,
        x: sx, y: sy, width: w, height: h,
        background: '#1e293b', visible: true,
      }
      setElements(els => { setRedoStack([]); return [f, ...els] })
    } else {
      shapeCount++
      const label = tool.replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
      const s: Shape = {
        id: crypto.randomUUID(), kind: 'shape',
        type: tool as ShapeType,
        x: sx, y: sy, width: w, height: h,
        color, strokeWidth: size, opacity: 1, visible: true,
        name: `${label} ${shapeCount}`,
      }
      setElements(els => { setRedoStack([]); return [...els, s] })
    }
  }, [tool, color, size])

  // cancelDrag: discards shape/frame without committing — fixes shape-on-zoom
  const cancelDrag = useCallback(() => {
    dragStartRef.current = null
    setShapePreview(null)
  }, [])

  // Place a frame preset at canvas center
  const placeFramePreset = useCallback((
    width: number, height: number, label: string, cx: number, cy: number
  ) => {
    frameCount++
    const f: Frame = {
      id: crypto.randomUUID(), kind: 'frame',
      name: `${label} ${frameCount}`,
      x: cx - width / 2, y: cy - height / 2,
      width, height, background: '#1e293b', visible: true,
    }
    setElements(els => { setRedoStack([]); return [f, ...els] })
  }, [])

  // ── Undo / Redo ───────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setElements(prev => {
      if (!prev.length) return prev
      setRedoStack(r => [...r, prev])
      return prev.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (!prev.length) return prev
      const last = prev[prev.length - 1]
      setElements(last)
      return prev.slice(0, -1)
    })
  }, [])

  // ── Layer controls ────────────────────────────────────────────────────
  const toggleVisibility = useCallback((id: string) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, visible: !el.visible } : el))
  }, [])

  const deleteElement = useCallback((id: string) => {
    setElements(prev => prev.filter(el => el.id !== id))
  }, [])

  const clearCanvas = useCallback(() => {
    setRedoStack([])
    setElements([])
    setCurrentStroke([])
    setShapePreview(null)
    currentStrokeRef.current = []
    isDrawing.current = false
    dragStartRef.current = null
    strokeCount = 0
    shapeCount = 0
    frameCount = 0
  }, [])

  // ── Rendering ─────────────────────────────────────────────────────────
  const getPath = useCallback((points: Point[], strokeSize: number) => {
    const s = getStroke(
      points.map(p => [p.x, p.y, p.pressure]),
      { size: strokeSize, thinning: 0.5, smoothing: 0.5, streamline: 0.5 }
    )
    return svgPath(s)
  }, [])

  return {
    elements, currentStroke, shapePreview,
    tool, color, size, eraserSize,
    setTool, setColor, setSize, setEraserSize,
    loadElements,
    startStroke, continueStroke, endStroke, cancelStroke,
    eraseAt,
    startDrag, previewDrag, endDrag, cancelDrag,
    placeFramePreset,
    undo, redo,
    toggleVisibility, deleteElement, clearCanvas,
    getPath,
  }
}
