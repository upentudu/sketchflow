import { useRef, useCallback, useEffect, useState } from 'react'
import { useCanvas } from './useCanvas'
import { useViewport } from './useViewport'

export default function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const activePointers = useRef<Set<number>>(new Set())

  const {
    strokes, currentStroke, color, size,
    startStroke, continueStroke, endStroke,
    clearCanvas, setColor, setSize, getPath,
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

  // Space key for pan mode
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); setSpaceHeld(true) } }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

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

    // If 2+ fingers, stop drawing and switch to pan mode
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
    startStroke(x, y, pressure)
  }, [spaceHeld, getSVGPoint, startStroke, startPan, endStroke])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // If 2+ fingers, only pan — never draw
    if (activePointers.current.size >= 2) {
      movePan(e.clientX, e.clientY)
      return
    }

    if (isPanning.current) {
      movePan(e.clientX, e.clientY)
      return
    }

    const { x, y, pressure } = getSVGPoint(e)
    continueStroke(x, y, pressure)
  }, [isPanning, getSVGPoint, continueStroke, movePan])

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.delete(e.pointerId)
    endPan()

    // Only finalize stroke when all fingers are lifted
    if (activePointers.current.size === 0) {
      endStroke()
    }
  }, [endPan, endStroke])

  // Touch pinch zoom
  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const svg = svgRef.current
      if (!svg) return
      handlePinch(e.touches, svg.getBoundingClientRect())
    }
  }, [handlePinch])

  const transform = `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`

  return (
    <div className="flex flex-col h-screen bg-gray-950 select-none overflow-hidden">

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 z-10">
        <span className="text-white font-semibold text-sm tracking-wide">SketchFlow</span>
        <div className="flex items-center gap-3">
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
        className={`flex-1 w-full touch-none ${spaceHeld ? 'cursor-grab' : 'cursor-crosshair'}`}
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
          {/* Grid dots for infinite feel */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="0.8" fill="#374151" />
            </pattern>
          </defs>
          <rect x="-50000" y="-50000" width="100000" height="100000" fill="url(#grid)" />

          {/* Completed strokes */}
          {strokes.map(stroke => (
            <path
              key={stroke.id}
              d={getPath(stroke.points, stroke.size)}
              fill={stroke.color}
              opacity={stroke.opacity}
            />
          ))}

          {/* Active stroke */}
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
        <div className="flex flex-col items-center gap-1">
          <label className="text-xs text-gray-500">Color</label>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent"
          />
        </div>
        <div className="flex flex-col items-center gap-1 flex-1 max-w-32">
          <label className="text-xs text-gray-500">Size: {size}</label>
          <input
            type="range" min={2} max={32} value={size}
            onChange={e => setSize(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">Strokes</span>
          <span className="text-white font-mono text-sm">{strokes.length}</span>
        </div>
      </div>

    </div>
  )
}