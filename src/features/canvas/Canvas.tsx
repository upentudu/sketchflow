import { useRef, useCallback, useEffect, useState } from 'react'
import { useCanvas } from './useCanvas'
import { useViewport } from './useViewport'

// Icons as simple SVG components — no extra library needed
const PenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    <path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
  </svg>
)

const EraserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><path d="M6.0001 17.0001L17 6"/>
  </svg>
)

const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v6h6"/><path d="M3 13C5 6 13 3 20 7"/>
  </svg>
)

const RedoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 7v6h-6"/><path d="M21 13C19 6 11 3 4 7"/>
  </svg>
)

export default function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const activePointers = useRef<Set<number>>(new Set())

  const {
    strokes, currentStroke, color, size, tool,
    startStroke, continueStroke, endStroke,
    eraseAt, undo, redo,
    clearCanvas, setColor, setSize, setTool, getPath,
  } = useCanvas()

  const {
    viewport, screenToCanvas,
    handleWheel, startPan, movePan,
    endPan, handlePinch, endPinch,
    resetView, isPanning,
  } = useViewport()

  // Mouse wheel zoom
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      handleWheel(e, svg.getBoundingClientRect())
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [handleWheel])

  // Keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); setSpaceHeld(true) }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ') { e.preventDefault(); redo() }
      else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); undo() }
      if (e.code === 'KeyP') setTool('pen')
      if (e.code === 'KeyE') setTool('eraser')
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [undo, redo, setTool])

  const getSVGPoint = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0, pressure: 0.5 }
    const rect = svg.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const canvas = screenToCanvas(sx, sy, viewport)
    return { ...canvas, pressure: e.pressure || 0.5 }
  }, [viewport, screenToCanvas])

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointers.current.add(e.pointerId)

    if (activePointers.current.size >= 2) {
      endStroke()
      startPan(e.clientX, e.clientY)
      return
    }

    if (spaceHeld) {
      startPan(e.clientX, e.clientY)
      return
    }

    const { x, y, pressure } = getSVGPoint(e)
    if (tool === 'eraser') {
      eraseAt(x, y)
    } else {
      startStroke(x, y, pressure)
    }
  }, [spaceHeld, tool, getSVGPoint, startStroke, startPan, endStroke, eraseAt])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointers.current.size >= 2) {
      movePan(e.clientX, e.clientY)
      return
    }
    if (isPanning.current) {
      movePan(e.clientX, e.clientY)
      return
    }
    const { x, y, pressure } = getSVGPoint(e)
    if (tool === 'eraser') {
      if (e.buttons > 0) eraseAt(x, y)
    } else {
      continueStroke(x, y, pressure)
    }
  }, [isPanning, tool, getSVGPoint, continueStroke, movePan, eraseAt])

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.delete(e.pointerId)
    endPan()
    if (activePointers.current.size === 0) {
      endStroke()
    }
  }, [endPan, endStroke])

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const svg = svgRef.current
      if (!svg) return
      handlePinch(e.touches, svg.getBoundingClientRect())
    }
  }, [handlePinch])

  const transform = `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`

  const getCursor = () => {
    if (spaceHeld) return 'cursor-grab'
    if (tool === 'eraser') return 'cursor-cell'
    return 'cursor-crosshair'
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 select-none overflow-hidden">

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 z-10">
        <span className="text-white font-semibold text-sm tracking-wide">SketchFlow</span>
        <div className="flex items-center gap-2">
          <button
            onClick={resetView}
            className="text-xs text-gray-400 hover:text-white font-mono bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
          >
            {Math.round(viewport.zoom * 100)}%
          </button>
          <button
            onClick={clearCanvas}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Canvas */}
      <svg
        ref={svgRef}
        className={`flex-1 w-full touch-none ${getCursor()}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={(e) => {
          activePointers.current.delete(e.pointerId)
          endPan()
          endStroke()
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={endPinch}
      >
        <g transform={transform}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="0.8" fill="#374151" />
            </pattern>
          </defs>
          <rect x="-50000" y="-50000" width="100000" height="100000" fill="url(#grid)" />

          {strokes.map(stroke => (
            <path
              key={stroke.id}
              d={getPath(stroke.points, stroke.size)}
              fill={stroke.color}
              opacity={stroke.opacity}
            />
          ))}

          {currentStroke.length > 0 && (
            <path
              d={getPath(currentStroke, size)}
              fill={color}
              opacity={1}
            />
          )}
        </g>
      </svg>

      {/* Bottom Toolbar */}
      <div className="flex items-center justify-around px-4 py-3 bg-gray-900 border-t border-gray-800">

        {/* Pen Tool */}
        <button
          onClick={() => setTool('pen')}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
            tool === 'pen'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <PenIcon />
          <span className="text-xs">Pen</span>
        </button>

        {/* Eraser Tool */}
        <button
          onClick={() => setTool('eraser')}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
            tool === 'eraser'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <EraserIcon />
          <span className="text-xs">Eraser</span>
        </button>

        {/* Color */}
        <div className="flex flex-col items-center gap-1">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent"
          />
          <span className="text-xs text-gray-500">Color</span>
        </div>

        {/* Size */}
        <div className="flex flex-col items-center gap-1 flex-1 max-w-24">
          <span className="text-xs text-gray-500">Size: {size}</span>
          <input
            type="range" min={2} max={32} value={size}
            onChange={e => setSize(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        {/* Undo */}
        <button
          onClick={undo}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
        >
          <UndoIcon />
          <span className="text-xs">Undo</span>
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
        >
          <RedoIcon />
          <span className="text-xs">Redo</span>
        </button>

      </div>
    </div>
  )
}