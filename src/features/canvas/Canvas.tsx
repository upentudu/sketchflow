import { useRef, useCallback, useEffect, useState } from 'react'
import { useCanvas } from './useCanvas'
import { useViewport } from './useViewport'
import type { Shape } from '../../types/canvas'

// ── Icons ─────────────────────────────────────────────
const PenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
  </svg>
)
const EraserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><path d="M6 17L17 6"/>
  </svg>
)
const RectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>
)
const CircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9"/>
  </svg>
)
const LineIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="19" x2="19" y2="5"/>
  </svg>
)
const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v6h6"/><path d="M3 13C5 6 13 3 20 7"/>
  </svg>
)
const RedoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 7v6h-6"/><path d="M21 13C19 6 11 3 4 7"/>
  </svg>
)
const LayersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
)
const ExportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const EyeIcon = ({ visible }: { visible: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity={visible ? 1 : 0.3}>
    {visible
      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    }
  </svg>
)

// ── Render a shape as SVG ─────────────────────────────
function renderShape(shape: Shape, getPath: any) {
  const { id, type, x, y, width, height, color, strokeWidth, opacity } = shape
  if (type === 'rect') {
    const rx = Math.min(x, x + width)
    const ry = Math.min(y, y + height)
    return <rect key={id} x={rx} y={ry} width={Math.abs(width)} height={Math.abs(height)}
      fill="none" stroke={color} strokeWidth={strokeWidth} opacity={opacity} />
  }
  if (type === 'circle') {
    const cx = x + width / 2
    const cy = y + height / 2
    const rx = Math.abs(width / 2)
    const ry = Math.abs(height / 2)
    return <ellipse key={id} cx={cx} cy={cy} rx={rx} ry={ry}
      fill="none" stroke={color} strokeWidth={strokeWidth} opacity={opacity} />
  }
  if (type === 'line') {
    return <line key={id} x1={x} y1={y} x2={x + width} y2={y + height}
      stroke={color} strokeWidth={strokeWidth} opacity={opacity} strokeLinecap="round" />
  }
  return null
}

// ── Main Component ────────────────────────────────────
export default function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const activePointers = useRef<Set<number>>(new Set())

  const {
    elements, currentStroke, shapePreview,
    color, size, tool,
    startStroke, continueStroke, endStroke,
    eraseAt, startShape, previewShape, endShape,
    undo, redo, toggleVisibility, deleteElement,
    clearCanvas, setColor, setSize, setTool, getPath,
  } = useCanvas()

  const {
    viewport, screenToCanvas,
    handleWheel, startPan, movePan,
    endPan, handlePinch, endPinch,
    resetView, isPanning,
  } = useViewport()

  // Wheel zoom
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => handleWheel(e, svg.getBoundingClientRect())
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
      if (e.code === 'KeyR') setTool('rect')
      if (e.code === 'KeyC') setTool('circle')
      if (e.code === 'KeyL') setTool('line')
    }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [undo, redo, setTool])

  const getSVGPoint = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0, pressure: 0.5 }
    const rect = svg.getBoundingClientRect()
    const canvas = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, viewport)
    return { ...canvas, pressure: e.pressure || 0.5 }
  }, [viewport, screenToCanvas])

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointers.current.add(e.pointerId)
    if (activePointers.current.size >= 2) { endStroke(); startPan(e.clientX, e.clientY); return }
    if (spaceHeld) { startPan(e.clientX, e.clientY); return }
    const { x, y, pressure } = getSVGPoint(e)
    if (tool === 'eraser') eraseAt(x, y)
    else if (tool === 'pen') startStroke(x, y, pressure)
    else startShape(x, y)
  }, [spaceHeld, tool, getSVGPoint, startStroke, startPan, endStroke, eraseAt, startShape])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointers.current.size >= 2) { movePan(e.clientX, e.clientY); return }
    if (isPanning.current) { movePan(e.clientX, e.clientY); return }
    const { x, y, pressure } = getSVGPoint(e)
    if (tool === 'eraser') { if (e.buttons > 0) eraseAt(x, y) }
    else if (tool === 'pen') continueStroke(x, y, pressure)
    else if (e.buttons > 0) previewShape(x, y)
  }, [isPanning, tool, getSVGPoint, continueStroke, movePan, eraseAt, previewShape])

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.delete(e.pointerId)
    endPan()
    if (activePointers.current.size === 0) {
      const { x, y } = getSVGPoint(e)
      if (tool !== 'pen' && tool !== 'eraser') endShape(x, y)
      else endStroke()
    }
  }, [endPan, endStroke, endShape, getSVGPoint, tool])

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const svg = svgRef.current
      if (!svg) return
      handlePinch(e.touches, svg.getBoundingClientRect())
    }
  }, [handlePinch])

  // ── Export as PNG ─────────────────────────────────────
  const exportAsPNG = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = svg.clientWidth * 2   // 2x for retina
      canvas.height = svg.clientHeight * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)
      ctx.fillStyle = '#030712'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, svg.clientWidth, svg.clientHeight)
      URL.revokeObjectURL(url)
      const link = document.createElement('a')
      link.download = 'sketchflow-export.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url
  }, [])

  const transform = `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`

  const getCursor = () => {
    if (spaceHeld) return 'cursor-grab'
    if (tool === 'eraser') return 'cursor-cell'
    return 'cursor-crosshair'
  }

  const tools = [
    { id: 'pen',    label: 'Pen',     icon: <PenIcon />,    key: 'P' },
    { id: 'eraser', label: 'Eraser',  icon: <EraserIcon />, key: 'E' },
    { id: 'rect',   label: 'Rect',    icon: <RectIcon />,   key: 'R' },
    { id: 'circle', label: 'Circle',  icon: <CircleIcon />, key: 'C' },
    { id: 'line',   label: 'Line',    icon: <LineIcon />,   key: 'L' },
  ] as const

  return (
    <div className="flex flex-col h-screen bg-gray-950 select-none overflow-hidden">

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 z-10">
        <span className="text-white font-semibold text-sm tracking-wide">SketchFlow</span>
        <div className="flex items-center gap-2">
          <button onClick={resetView}
            className="text-xs text-gray-400 hover:text-white font-mono bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded transition-colors">
            {Math.round(viewport.zoom * 100)}%
          </button>
          {/* Layers toggle */}
          <button onClick={() => setShowLayers(s => !s)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
              showLayers ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <LayersIcon />
            <span className="hidden sm:inline">Layers</span>
          </button>
          {/* Export */}
          <button onClick={exportAsPNG}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-400 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-all">
            <ExportIcon />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={clearCanvas}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800">
            Clear
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas */}
        <svg
          ref={svgRef}
          className={`flex-1 touch-none ${getCursor()}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={(e) => {
            activePointers.current.delete(e.pointerId)
            endPan(); endStroke()
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

            {/* All elements */}
            {elements.map(el => {
              if (!el.visible) return null
              if (el.kind === 'stroke') {
                return (
                  <path key={el.id}
                    d={getPath(el.points, el.size)}
                    fill={el.color} opacity={el.opacity} />
                )
              }
              return renderShape(el, getPath)
            })}

            {/* Live stroke */}
            {currentStroke.length > 0 && (
              <path d={getPath(currentStroke, size)} fill={color} opacity={1} />
            )}

            {/* Shape preview */}
            {shapePreview && renderShape(shapePreview, getPath)}
          </g>
        </svg>

        {/* Layers Panel */}
        {showLayers && (
          <div className="w-52 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Layers</span>
              <span className="text-xs text-gray-500">{elements.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {elements.length === 0 && (
                <p className="text-xs text-gray-600 text-center mt-8 px-4">
                  Draw something to see layers here
                </p>
              )}
              {[...elements].reverse().map(el => (
                <div key={el.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 group transition-colors">
                  {/* Visibility */}
                  <button onClick={() => toggleVisibility(el.id)} className="shrink-0">
                    <EyeIcon visible={el.visible} />
                  </button>
                  {/* Color swatch */}
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 border border-gray-700"
                    style={{ backgroundColor: el.kind === 'stroke' ? el.color : el.color }} />
                  {/* Name */}
                  <span className={`text-xs flex-1 truncate ${el.visible ? 'text-gray-300' : 'text-gray-600'}`}>
                    {el.name}
                  </span>
                  {/* Delete */}
                  <button onClick={() => deleteElement(el.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="flex items-center justify-around px-2 py-2 bg-gray-900 border-t border-gray-800 overflow-x-auto gap-1">

        {/* Drawing tools */}
        {tools.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition-all shrink-0 ${
              tool === t.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            {t.icon}
            <span className="text-xs">{t.label}</span>
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-8 bg-gray-800 shrink-0" />

        {/* Color */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent" />
          <span className="text-xs text-gray-500">Color</span>
        </div>

        {/* Size */}
        <div className="flex flex-col items-center gap-0.5 flex-1 min-w-16 max-w-24 shrink-0">
          <span className="text-xs text-gray-500">{size}px</span>
          <input type="range" min={2} max={32} value={size}
            onChange={e => setSize(Number(e.target.value))}
            className="w-full accent-indigo-500" />
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-800 shrink-0" />

        {/* Undo / Redo */}
        <button onClick={undo}
          className="flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all shrink-0">
          <UndoIcon /><span className="text-xs">Undo</span>
        </button>
        <button onClick={redo}
          className="flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all shrink-0">
          <RedoIcon /><span className="text-xs">Redo</span>
        </button>

      </div>
    </div>
  )
}