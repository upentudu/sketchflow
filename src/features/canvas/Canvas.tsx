import { useRef, useCallback, useEffect, useState } from 'react'
import { useCanvas, isShapeTool } from './useCanvas'
import { useViewport } from './useViewport'
import { usePages } from './usePages'
import { getShapeD, arrowPath } from './shapeUtils'
import type { Tool, ShapeType } from '../../types/canvas'

// ═══════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════
const Ico = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const SelectIcon  = () => <Ico><path d="M4 4l7 18 3-7 7-3L4 4z" /></Ico>
const PanIcon     = () => <Ico><path d="M18 11V6a2 2 0 00-2-2 2 2 0 00-2 2"/><path d="M14 10V4a2 2 0 00-2-2 2 2 0 00-2 2v2"/><path d="M10 10.5V6a2 2 0 00-2-2 2 2 0 00-2 2v8"/><path d="M18 11a2 2 0 112 2l-3 5H9l-3-3-.5-6.5"/></Ico>
const PenIcon     = () => <Ico><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></Ico>
const FrameIcon   = () => <Ico><rect x="3" y="3" width="18" height="18" rx="1" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="3" x2="9" y2="9" /></Ico>
const EraserIcon  = () => <Ico><path d="M20 20H7L3 16l10-10 7 7-2.5 2.5" /><path d="M6 17L17 6" /></Ico>
const UndoIcon    = () => <Ico><path d="M3 7v6h6" /><path d="M3 13C5 6 13 3 20 7" /></Ico>
const RedoIcon    = () => <Ico><path d="M21 7v6h-6" /><path d="M21 13C19 6 11 3 4 7" /></Ico>
const LayersIcon  = () => <Ico><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></Ico>
const ExportIcon  = () => <Ico><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Ico>
const PagesIcon   = () => <Ico><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></Ico>
const EyeOn       = () => <Ico size={14}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></Ico>
const EyeOff      = () => <Ico size={14}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></Ico>
const TrashIcon   = () => <Ico size={12}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Ico>
const AddIcon     = () => <Ico size={14}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Ico>

const ShapeIco = ({ type }: { type?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {type === 'circle'        && <ellipse cx="12" cy="12" rx="9" ry="9" />}
    {type === 'rect'          && <rect x="3" y="5" width="18" height="14" />}
    {type === 'rounded-rect'  && <rect x="3" y="5" width="18" height="14" rx="4" />}
    {type === 'line'          && <line x1="4" y1="20" x2="20" y2="4" />}
    {type === 'arrow'         && <><line x1="4" y1="12" x2="20" y2="12" /><polyline points="14 6 20 12 14 18" /></>}
    {type === 'triangle'      && <polygon points="12 4 22 20 2 20" />}
    {type === 'star'          && <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />}
    {type === 'diamond'       && <polygon points="12 2 22 12 12 22 2 12" />}
    {type === 'cross'         && <><line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /></>}
    {type === 'hexagon'       && <polygon points="21 16 21 8 12 3 3 8 3 16 12 21" />}
    {type === 'pentagon'      && <polygon points="12 2 22 9.3 18 21 6 21 2 9.3" />}
    {type === 'heart'         && <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 000-7.6z" />}
    {type === 'speech-bubble' && <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />}
    {type === 'cloud'         && <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />}
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════
// SHAPES DATA
// ═══════════════════════════════════════════════════════════════════════
const SHAPE_GROUPS: { label: string; shapes: { id: ShapeType; label: string }[] }[] = [
  {
    label: 'Basic',
    shapes: [
      { id: 'rect',         label: 'Rectangle' },
      { id: 'rounded-rect', label: 'Rounded' },
      { id: 'circle',       label: 'Circle' },
      { id: 'triangle',     label: 'Triangle' },
      { id: 'diamond',      label: 'Diamond' },
      { id: 'line',         label: 'Line' },
    ],
  },
  {
    label: 'Complex',
    shapes: [
      { id: 'arrow',   label: 'Arrow' },
      { id: 'star',    label: 'Star' },
      { id: 'cross',   label: 'Cross' },
      { id: 'hexagon', label: 'Hexagon' },
      { id: 'pentagon',label: 'Pentagon' },
    ],
  },
  {
    label: 'Illustrative',
    shapes: [
      { id: 'heart',         label: 'Heart' },
      { id: 'speech-bubble', label: 'Bubble' },
      { id: 'cloud',         label: 'Cloud' },
    ],
  },
]
const ALL_SHAPES: ShapeType[] = SHAPE_GROUPS.flatMap(g => g.shapes.map(s => s.id))
const SHAPE_LABELS: Record<string, string> = Object.fromEntries(
  SHAPE_GROUPS.flatMap(g => g.shapes.map(s => [s.id, s.label]))
)

// ═══════════════════════════════════════════════════════════════════════
// ELEMENT RENDERER
// ═══════════════════════════════════════════════════════════════════════
function RenderElement({ el, getPath }: { el: any; getPath: any }) {
  if (!el.visible) return null

  if (el.kind === 'frame') {
    const { id, x, y, width: w, height: h, background, name } = el
    const rx = w < 0 ? x + w : x, ry = h < 0 ? y + h : y
    const aw = Math.abs(w), ah = Math.abs(h)
    return (
      <g key={id}>
        <rect x={rx} y={ry} width={aw} height={ah} fill={background} />
        <rect x={rx} y={ry} width={aw} height={ah} fill="none" stroke="#475569" strokeWidth={1} />
        <text x={rx} y={ry - 6} fill="#64748b" fontSize={11} fontFamily="system-ui,sans-serif">{name}</text>
      </g>
    )
  }

  if (el.kind === 'stroke') {
    return <path key={el.id} d={getPath(el.points, el.size)} fill={el.color} opacity={el.opacity} />
  }

  if (el.kind === 'shape') {
    const { id, type, x, y, width: w, height: h, color, strokeWidth: sw, opacity } = el
    const common = { fill: 'none' as const, stroke: color, strokeWidth: sw, opacity, strokeLinejoin: 'round' as const }
    const minX = Math.min(x, x + w), minY = Math.min(y, y + h)
    const aw = Math.abs(w), ah = Math.abs(h)
    if (type === 'rect')
      return <rect key={id} x={minX} y={minY} width={aw} height={ah} {...common} />
    if (type === 'rounded-rect')
      return <rect key={id} x={minX} y={minY} width={aw} height={ah} rx={Math.min(aw, ah) * 0.15} {...common} />
    if (type === 'circle')
      return <ellipse key={id} cx={x + w / 2} cy={y + h / 2} rx={Math.abs(w / 2)} ry={Math.abs(h / 2)} {...common} />
    if (type === 'line')
      return <line key={id} x1={x} y1={y} x2={x + w} y2={y + h} stroke={color} strokeWidth={sw} opacity={opacity} strokeLinecap="round" />
    if (type === 'arrow') {
      const len = Math.hypot(w, h)
      const hs = Math.max(sw * 4, Math.min(len * 0.3, 32))
      return <path key={id} d={arrowPath(x, y, x + w, y + h, hs)} stroke={color} strokeWidth={sw} fill="none" opacity={opacity} strokeLinecap="round" strokeLinejoin="round" />
    }
    const d = getShapeD(type, x, y, w, h)
    return <path key={id} d={d} {...common} />
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════════
// FRAME PRESETS
// ═══════════════════════════════════════════════════════════════════════
const FRAME_PRESETS = [
  { label: 'Mobile',  width: 390,  height: 844  },
  { label: 'Tablet',  width: 768,  height: 1024 },
  { label: 'Desktop', width: 1440, height: 900  },
]

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function Canvas() {
  const svgRef       = useRef<SVGSVGElement>(null)
  const shapeBtnRef  = useRef<HTMLButtonElement>(null)
  const activePointers = useRef<Set<number>>(new Set())

  const [spaceHeld,      setSpaceHeld]      = useState(false)
  const [showLayers,     setShowLayers]     = useState(false)
  const [layerTab,       setLayerTab]       = useState<'layers' | 'pages'>('layers')
  const [showShapes,     setShowShapes]     = useState(false)
  const [dropdownPos,    setDropdownPos]    = useState({ bottom: 0, left: 0 })
  const [showPresets,    setShowPresets]    = useState(false)
  const [lastShape,      setLastShape]      = useState<ShapeType>('rect')
  const [editingPageId,  setEditingPageId]  = useState<string | null>(null)
  const [editingName,    setEditingName]    = useState('')

  // ── Hooks ──────────────────────────────────────────────────────────
  const {
    pages, currentPage, currentId,
    setCurrentId, savePage, addPage, deletePage, renamePage,
  } = usePages()

  const {
    elements, currentStroke, shapePreview,
    color, size, eraserSize, tool,
    startStroke, continueStroke, endStroke, cancelStroke,
    eraseAt, startDrag, previewDrag, endDrag, cancelDrag,
    placeFramePreset, undo, redo,
    toggleVisibility, deleteElement, clearCanvas,
    setColor, setSize, setEraserSize, setTool,
    loadElements, getPath,
  } = useCanvas()

  const {
    viewport, screenToCanvas,
    handleWheel, startPan, movePan,
    endPan, handlePinch, endPinch,
    resetView, isPanning,
  } = useViewport()

  // ── Derived state ──────────────────────────────────────────────────
  const isEraser      = tool === 'eraser'
  const activeSize    = isEraser ? eraserSize : size
  const setActiveSize = isEraser ? setEraserSize : setSize
  const sizeLabel     = isEraser ? 'Radius' : 'Size'
  const shapeActive   = ALL_SHAPES.includes(tool as ShapeType)
  const activeShape   = shapeActive ? (tool as ShapeType) : lastShape

  // ── Eraser: rAF throttle so setElements fires max once per frame ───
  const eraseRaf   = useRef<number | null>(null)
  const eraseQueue = useRef<{ x: number; y: number; r: number } | null>(null)
  const throttledErase = useCallback((x: number, y: number, r: number) => {
    eraseQueue.current = { x, y, r }
    if (eraseRaf.current !== null) return
    eraseRaf.current = requestAnimationFrame(() => {
      eraseRaf.current = null
      if (eraseQueue.current) {
        eraseAt(eraseQueue.current.x, eraseQueue.current.y, eraseQueue.current.r)
        eraseQueue.current = null
      }
    })
  }, [eraseAt])

  // ── Shapes dropdown: calculate upward position from button rect ────
  // Using fixed position so it escapes overflow-x-auto clipping
  const toggleShapes = useCallback(() => {
    if (!showShapes && shapeBtnRef.current) {
      const r = shapeBtnRef.current.getBoundingClientRect()
      setDropdownPos({ bottom: window.innerHeight - r.top + 8, left: r.left })
    }
    setShowShapes(s => !s)
  }, [showShapes])

  // ── Page switching ─────────────────────────────────────────────────
  const switchPage = useCallback((id: string) => {
    if (id === currentId) return
    savePage(currentId, elements)
    const target = pages.find(p => p.id === id)
    if (target) loadElements(target.elements)
    setCurrentId(id)
  }, [currentId, elements, pages, savePage, loadElements, setCurrentId])

  // ── Wheel zoom ─────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => handleWheel(e, svg.getBoundingClientRect())
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [handleWheel])

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.code === 'Space') { e.preventDefault(); setSpaceHeld(true) }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ') { e.preventDefault(); redo(); return }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); undo(); return }
      const map: Record<string, Tool> = {
        KeyS: 'select', KeyH: 'pan', KeyP: 'pen',
        KeyE: 'eraser', KeyF: 'frame',
        KeyR: 'rect',   KeyC: 'circle',
        KeyL: 'line',   KeyA: 'arrow',
      }
      if (map[e.code]) setTool(map[e.code])
    }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [undo, redo, setTool])

  // ── Canvas coordinate helper ───────────────────────────────────────
  const getSVGPoint = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0, pressure: 0.5 }
    const rect = svg.getBoundingClientRect()
    const c = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, viewport)
    return { ...c, pressure: e.pressure || 0.5 }
  }, [viewport, screenToCanvas])

  // ── Pointer handlers ───────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointers.current.add(e.pointerId)

    // 2+ fingers → cancel drawing, start pan (fixes dot/shape on pinch zoom)
    if (activePointers.current.size >= 2) {
      cancelStroke()
      cancelDrag()
      startPan(e.clientX, e.clientY)
      return
    }

    // Space or pan tool → pan
    if (spaceHeld || tool === 'pan') {
      startPan(e.clientX, e.clientY)
      return
    }

    // Select / lasso → no-op for now (Phase 2 will add selection logic)
    if (tool === 'select' || tool === 'lasso') return

    const { x, y, pressure } = getSVGPoint(e)
    if      (tool === 'eraser')                    throttledErase(x, y, eraserSize)
    else if (tool === 'pen')                        startStroke(x, y, pressure)
    else if (tool === 'frame' || isShapeTool(tool)) startDrag(x, y)
  }, [spaceHeld, tool, eraserSize, getSVGPoint, startStroke, startPan, cancelStroke, cancelDrag, throttledErase, startDrag])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointers.current.size >= 2) { movePan(e.clientX, e.clientY); return }
    if (isPanning.current)                { movePan(e.clientX, e.clientY); return }

    const { x, y, pressure } = getSVGPoint(e)
    if      (tool === 'eraser')                    { if (e.buttons > 0) throttledErase(x, y, eraserSize) }
    else if (tool === 'pen')                        continueStroke(x, y, pressure)
    else if (tool === 'frame' || isShapeTool(tool)) { if (e.buttons > 0) previewDrag(x, y) }
  }, [isPanning, tool, eraserSize, getSVGPoint, continueStroke, movePan, throttledErase, previewDrag])

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.delete(e.pointerId)
    endPan()
    if (activePointers.current.size === 0) {
      const { x, y } = getSVGPoint(e)
      if      (tool === 'pen')                        endStroke()
      else if (tool === 'frame' || isShapeTool(tool)) endDrag(x, y)
    }
  }, [endPan, endStroke, endDrag, getSVGPoint, tool])

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const svg = svgRef.current
      if (!svg) return
      handlePinch(e.touches, svg.getBoundingClientRect())
    }
  }, [handlePinch])

  // ── Frame presets ──────────────────────────────────────────────────
  const handlePreset = useCallback((width: number, height: number, label: string) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const c = screenToCanvas(rect.width / 2, rect.height / 2, viewport)
    placeFramePreset(width, height, label, c.x, c.y)
    setShowPresets(false)
  }, [viewport, screenToCanvas, placeFramePreset])

  // ── Export PNG ─────────────────────────────────────────────────────
  const exportAsPNG = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const img  = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = svg.clientWidth * 2; c.height = svg.clientHeight * 2
      const ctx = c.getContext('2d')!
      ctx.scale(2, 2)
      ctx.fillStyle = '#030712'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, svg.clientWidth, svg.clientHeight)
      URL.revokeObjectURL(url)
      const a = document.createElement('a')
      a.download = `${currentPage.name}.png`
      a.href = c.toDataURL('image/png')
      a.click()
    }
    img.src = url
  }, [currentPage.name])

  // ── Tool select helper ─────────────────────────────────────────────
  const selectTool = (t: Tool) => {
    setTool(t)
    if (ALL_SHAPES.includes(t as ShapeType)) {
      setLastShape(t as ShapeType)
      setShowShapes(false)
    }
  }

  const transform = `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`
  const getCursor = () => {
    if (spaceHeld || tool === 'pan')  return 'cursor-grab'
    if (tool === 'eraser')            return 'cursor-cell'
    if (tool === 'select' || tool === 'lasso') return 'cursor-default'
    return 'cursor-crosshair'
  }

  // ════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── Root layout shell ── */}
      <div
        className="flex flex-col bg-gray-950 select-none overflow-hidden"
        style={{ height: '100dvh' }}
      >
        {/* ── TOP BAR ───────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 z-10">
          <span className="text-white font-semibold text-sm tracking-wide">SketchFlow</span>
          <div className="flex items-center gap-2">
            <button onClick={resetView}
              className="text-xs text-gray-400 hover:text-white font-mono bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded transition-colors">
              {Math.round(viewport.zoom * 100)}%
            </button>

            {tool === 'frame' && (
              <div className="relative">
                <button onClick={() => setShowPresets(s => !s)}
                  className="text-xs text-indigo-300 bg-indigo-900 hover:bg-indigo-800 px-3 py-1.5 rounded-lg transition-colors">
                  Presets ▾
                </button>
                {showPresets && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPresets(false)} />
                    <div className="absolute right-0 top-9 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 w-40 overflow-hidden">
                      {FRAME_PRESETS.map(p => (
                        <button key={p.label} onClick={() => handlePreset(p.width, p.height, p.label)}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-colors">
                          <div className="text-xs font-medium text-gray-200">{p.label}</div>
                          <div className="text-xs text-gray-500">{p.width} × {p.height}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <button onClick={() => setShowLayers(s => !s)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                showLayers ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <LayersIcon />
              <span className="hidden sm:inline">Layers</span>
            </button>

            <button onClick={exportAsPNG}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-400 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-all">
              <ExportIcon />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button onClick={clearCanvas}
              className="text-xs text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              Clear
            </button>
          </div>
        </div>

        {/* ── MAIN AREA: canvas + optional layers panel ─────────────── */}
        <div className="flex flex-1 overflow-hidden relative min-h-0">

          {/* Canvas SVG */}
          <svg
            ref={svgRef}
            className={`flex-1 touch-none ${getCursor()}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={e => {
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

              {elements.filter(el => el.kind === 'frame').map(el =>
                <RenderElement key={el.id} el={el} getPath={getPath} />
              )}
              {elements.filter(el => el.kind !== 'frame').map(el =>
                <RenderElement key={el.id} el={el} getPath={getPath} />
              )}
              {currentStroke.length > 0 && (
                <path d={getPath(currentStroke, size)} fill={color} opacity={1} />
              )}
              {shapePreview && <RenderElement el={{ ...shapePreview, visible: true }} getPath={getPath} />}
            </g>
          </svg>

          {/* Floating Undo / Redo — bottom-left of canvas area */}
          <div className="absolute left-3 bottom-4 flex flex-col gap-2 z-20 pointer-events-none">
            <button onClick={undo} style={{ pointerEvents: 'all' }}
              className="w-10 h-10 flex items-center justify-center bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white rounded-xl shadow-lg transition-all"
              title="Undo (Ctrl+Z)">
              <UndoIcon />
            </button>
            <button onClick={redo} style={{ pointerEvents: 'all' }}
              className="w-10 h-10 flex items-center justify-center bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white rounded-xl shadow-lg transition-all"
              title="Redo (Ctrl+Shift+Z)">
              <RedoIcon />
            </button>
          </div>

          {/* Layers / Pages panel */}
          {showLayers && (
            <div className="w-56 bg-gray-900 border-l border-gray-800 flex flex-col shrink-0 overflow-hidden">
              <div className="flex shrink-0 border-b border-gray-800">
                <button onClick={() => setLayerTab('layers')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                    layerTab === 'layers' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}>
                  <LayersIcon /> Layers
                </button>
                <button onClick={() => setLayerTab('pages')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                    layerTab === 'pages' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}>
                  <PagesIcon /> Pages
                </button>
              </div>

              {layerTab === 'layers' && (
                <div className="flex-1 overflow-y-auto">
                  <div className="px-3 py-2 flex justify-between">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Elements</span>
                    <span className="text-xs text-gray-600">{elements.length}</span>
                  </div>
                  {elements.length === 0 && (
                    <p className="text-xs text-gray-600 text-center mt-6 px-4">Draw something to see layers</p>
                  )}
                  {[...elements].reverse().map(el => (
                    <div key={el.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 group transition-colors">
                      <button onClick={() => toggleVisibility(el.id)} className="shrink-0 text-gray-400 hover:text-white">
                        {el.visible ? <EyeOn /> : <EyeOff />}
                      </button>
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0 border border-gray-600"
                        style={{ backgroundColor: el.kind === 'frame' ? el.background : el.color }} />
                      <span className={`text-xs flex-1 truncate ${el.visible ? 'text-gray-300' : 'text-gray-600'}`}>
                        {el.name || (el.kind === 'frame' ? 'Frame' : 'Element')}
                      </span>
                      <button onClick={() => deleteElement(el.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0">
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {layerTab === 'pages' && (
                <div className="flex-1 overflow-y-auto flex flex-col">
                  <div className="flex-1">
                    {pages.map(page => (
                      <div key={page.id}
                        className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                          page.id === currentId
                            ? 'bg-indigo-900/40 border-l-2 border-indigo-500'
                            : 'hover:bg-gray-800'}`}
                        onClick={() => switchPage(page.id)}>
                        <PagesIcon />
                        {editingPageId === page.id ? (
                          <input autoFocus value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onBlur={() => {
                              if (editingName.trim()) renamePage(page.id, editingName.trim())
                              setEditingPageId(null)
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { if (editingName.trim()) renamePage(page.id, editingName.trim()); setEditingPageId(null) }
                              if (e.key === 'Escape') setEditingPageId(null)
                            }}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 bg-gray-800 text-white text-xs px-2 py-0.5 rounded outline-none border border-indigo-500 min-w-0"
                          />
                        ) : (
                          <span
                            className={`flex-1 text-xs truncate ${page.id === currentId ? 'text-white' : 'text-gray-400'}`}
                            onDoubleClick={e => { e.stopPropagation(); setEditingPageId(page.id); setEditingName(page.name) }}>
                            {page.name}
                          </span>
                        )}
                        {pages.length > 1 && (
                          <button onClick={e => { e.stopPropagation(); deletePage(page.id) }}
                            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0">
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-800 p-2 shrink-0">
                    <button onClick={addPage}
                      className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                      <AddIcon /> Add Page
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── BOTTOM TOOLBAR ────────────────────────────────────────── */}
        <div
          className="shrink-0 bg-gray-900 border-t border-gray-800"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center px-2 py-2 gap-1 overflow-x-auto">

            <button onClick={() => selectTool('select')} title="Select (S)"
              className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition-all shrink-0 ${
                tool === 'select' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <SelectIcon /><span className="text-xs">Select</span>
            </button>

            <button onClick={() => selectTool('pan')} title="Pan (H)"
              className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition-all shrink-0 ${
                tool === 'pan' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <PanIcon /><span className="text-xs">Pan</span>
            </button>

            <div className="w-px h-8 bg-gray-800 shrink-0 mx-0.5" />

            <button onClick={() => selectTool('pen')} title="Pen (P)"
              className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition-all shrink-0 ${
                tool === 'pen' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <PenIcon /><span className="text-xs">Pen</span>
            </button>

            {/* Shapes button — no relative wrapper so overflow-x-auto doesn't clip dropdown */}
            <button
              ref={shapeBtnRef}
              onClick={toggleShapes}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition-all shrink-0 ${
                shapeActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <ShapeIco type={activeShape} />
              <span className="text-xs">{shapeActive ? (SHAPE_LABELS[tool] ?? 'Shape') : 'Shapes'} ▾</span>
            </button>

            <button onClick={() => selectTool('frame')} title="Frame (F)"
              className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition-all shrink-0 ${
                tool === 'frame' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <FrameIcon /><span className="text-xs">Frame</span>
            </button>

            <button onClick={() => selectTool('eraser')} title="Eraser (E)"
              className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition-all shrink-0 ${
                tool === 'eraser' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <EraserIcon /><span className="text-xs">Eraser</span>
            </button>

            <div className="w-px h-8 bg-gray-800 shrink-0 mx-0.5" />

            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent" />
              <span className="text-xs text-gray-500">Color</span>
            </div>

            <div className="flex flex-col items-center gap-0.5 shrink-0 min-w-16 max-w-28 flex-1">
              <span className="text-xs text-gray-500">{sizeLabel}: {activeSize}</span>
              <input type="range"
                min={isEraser ? 8 : 2}
                max={isEraser ? 80 : 32}
                value={activeSize}
                onChange={e => setActiveSize(Number(e.target.value))}
                className="w-full accent-indigo-500" />
            </div>

          </div>
        </div>
      </div>

      {/* ── SHAPES DROPDOWN ─────────────────────────────────────────── */}
      {/* Rendered outside root div as a fixed portal — immune to overflow-x-auto clipping */}
      {showShapes && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowShapes(false)} />
          <div
            className="fixed z-50 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-y-auto"
            style={{
              bottom:    dropdownPos.bottom,
              left:      Math.min(dropdownPos.left, window.innerWidth - 216),
              width:     208,
              maxHeight: '60vh',
            }}
          >
            {SHAPE_GROUPS.map(group => (
              <div key={group.label}>
                <div className="px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700/60 bg-gray-900/60">
                  {group.label}
                </div>
                <div className="grid grid-cols-3 gap-0.5 p-1.5">
                  {group.shapes.map(shape => (
                    <button key={shape.id}
                      onClick={() => selectTool(shape.id)}
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${
                        tool === shape.id ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                      <ShapeIco type={shape.id} />
                      <span className="text-xs leading-tight text-center">{shape.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
