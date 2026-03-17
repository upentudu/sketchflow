import { useState, useRef, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'
import type { Stroke, Point, Tool } from '../../types/canvas'

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

export function useCanvas() {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [redoStack, setRedoStack] = useState<Stroke[][]>([])
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#ffffff')
  const [size, setSize] = useState(4)
  const isDrawing = useRef(false)

  const startStroke = useCallback((x: number, y: number, pressure: number) => {
    if (tool === 'eraser') return
    isDrawing.current = true
    setCurrentStroke([{ x, y, pressure }])
  }, [tool])

  const continueStroke = useCallback((x: number, y: number, pressure: number) => {
    if (tool === 'eraser') return
    if (!isDrawing.current) return
    setCurrentStroke(prev => [...prev, { x, y, pressure }])
  }, [tool])

  const endStroke = useCallback(() => {
    if (tool === 'eraser') return
    if (!isDrawing.current) return
    isDrawing.current = false
    setCurrentStroke(prev => {
      if (prev.length > 0) {
        const newStroke: Stroke = {
          id: crypto.randomUUID(),
          points: prev,
          color,
          size,
          opacity: 1,
        }
        setStrokes(s => {
          setRedoStack([]) // clear redo on new stroke
          return [...s, newStroke]
        })
      }
      return []
    })
  }, [tool, color, size])

  // Eraser — removes any stroke whose points are near the touch point
  const eraseAt = useCallback((x: number, y: number) => {
    const ERASE_RADIUS = 20
    setStrokes(prev =>
      prev.filter(stroke => {
        const hit = stroke.points.some(
          p => Math.hypot(p.x - x, p.y - y) < ERASE_RADIUS
        )
        return !hit
      })
    )
  }, [])

  // Undo — pop last stroke, push to redo stack
  const undo = useCallback(() => {
    setStrokes(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setRedoStack(r => [...r, [...prev]])
      return prev.slice(0, -1)
    })
  }, [])

  // Redo — restore last undone state
  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setStrokes(last)
      return prev.slice(0, -1)
    })
  }, [])

  const clearCanvas = useCallback(() => {
    setRedoStack([])
    setStrokes([])
    setCurrentStroke([])
  }, [])

  const getPath = useCallback((points: Point[], strokeSize: number) => {
    const stroke = getStroke(
      points.map(p => [p.x, p.y, p.pressure]),
      {
        size: strokeSize,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      }
    )
    return getSvgPathFromStroke(stroke)
  }, [])

  return {
    strokes,
    currentStroke,
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
    undo,
    redo,
    clearCanvas,
    getPath,
  }
}