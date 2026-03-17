import { useState, useCallback, useRef } from 'react'
import type { Viewport } from '../../types/canvas'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 10

export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const isPanning = useRef(false)
  const lastPanPoint = useRef({ x: 0, y: 0 })
  const lastPinchDist = useRef<number | null>(null)

  const screenToCanvas = useCallback((sx: number, sy: number, vp: Viewport) => ({
    x: (sx - vp.x) / vp.zoom,
    y: (sy - vp.y) / vp.zoom,
  }), [])

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent, svgRect: DOMRect) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setViewport(vp => {
      const newZoom = clampZoom(vp.zoom * delta)
      const mx = e.clientX - svgRect.left
      const my = e.clientY - svgRect.top
      return {
        zoom: newZoom,
        x: mx - (mx - vp.x) * (newZoom / vp.zoom),
        y: my - (my - vp.y) * (newZoom / vp.zoom),
      }
    })
  }, [])

  // Pan start (space+drag on desktop, two-finger on mobile)
  const startPan = useCallback((x: number, y: number) => {
    isPanning.current = true
    lastPanPoint.current = { x, y }
  }, [])

  const movePan = useCallback((x: number, y: number) => {
    if (!isPanning.current) return
    const dx = x - lastPanPoint.current.x
    const dy = y - lastPanPoint.current.y
    lastPanPoint.current = { x, y }
    setViewport(vp => ({ ...vp, x: vp.x + dx, y: vp.y + dy }))
  }, [])

  const endPan = useCallback(() => {
    isPanning.current = false
  }, [])

  // Pinch zoom (mobile)
  const handlePinch = useCallback((touches: React.TouchList, svgRect: DOMRect) => {
    if (touches.length < 2) return
    const t1 = touches[0]
    const t2 = touches[1]
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
    const midX = (t1.clientX + t2.clientX) / 2 - svgRect.left
    const midY = (t1.clientY + t2.clientY) / 2 - svgRect.top

    if (lastPinchDist.current !== null) {
      const scale = dist / lastPinchDist.current
      setViewport(vp => {
        const newZoom = clampZoom(vp.zoom * scale)
        return {
          zoom: newZoom,
          x: midX - (midX - vp.x) * (newZoom / vp.zoom),
          y: midY - (midY - vp.y) * (newZoom / vp.zoom),
        }
      })
    }
    lastPinchDist.current = dist
  }, [])

  const endPinch = useCallback(() => {
    lastPinchDist.current = null
  }, [])

  const resetView = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 1 })
  }, [])

  return {
    viewport,
    screenToCanvas,
    handleWheel,
    startPan,
    movePan,
    endPan,
    handlePinch,
    endPinch,
    resetView,
    isPanning,
  }
}