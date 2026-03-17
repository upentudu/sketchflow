import { useRef, useCallback } from 'react'
import { useCanvas } from './useCanvas'

export default function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null)
  const {
    strokes,
    currentStroke,
    color,
    size,
    startStroke,
    continueStroke,
    endStroke,
    clearCanvas,
    setColor,
    setSize,
    getPath,
  } = useCanvas()

  const getPointerPos = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0, pressure: 0.5 }
    const rect = svg.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y, pressure } = getPointerPos(e)
    startStroke(x, y, pressure)
  }, [getPointerPos, startStroke])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const { x, y, pressure } = getPointerPos(e)
    continueStroke(x, y, pressure)
  }, [getPointerPos, continueStroke])

  return (
    <div className="flex flex-col h-screen bg-gray-950 select-none">

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <span className="text-white font-semibold text-sm tracking-wide">
          SketchFlow
        </span>
        <button
          onClick={clearCanvas}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
        >
          Clear
        </button>
      </div>

      {/* Canvas */}
      <svg
        ref={svgRef}
        className="flex-1 w-full touch-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
      >
        {/* Completed strokes */}
        {strokes.map(stroke => (
          <path
            key={stroke.id}
            d={getPath(stroke.points, stroke.size)}
            fill={stroke.color}
            opacity={stroke.opacity}
          />
        ))}

        {/* Current stroke being drawn */}
        {currentStroke.length > 0 && (
          <path
            d={getPath(currentStroke, size)}
            fill={color}
            opacity={1}
          />
        )}
      </svg>

      {/* Bottom Toolbar — Mobile First */}
      <div className="flex items-center justify-around px-4 py-3 bg-gray-900 border-t border-gray-800 safe-area-bottom">

        {/* Color Picker */}
        <div className="flex flex-col items-center gap-1">
          <label className="text-xs text-gray-500">Color</label>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent"
          />
        </div>

        {/* Brush Size */}
        <div className="flex flex-col items-center gap-1 flex-1 max-w-32">
          <label className="text-xs text-gray-500">Size: {size}</label>
          <input
            type="range"
            min={2}
            max={32}
            value={size}
            onChange={e => setSize(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        {/* Stroke count */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">Strokes</span>
          <span className="text-white font-mono text-sm">{strokes.length}</span>
        </div>

      </div>
    </div>
  )
}