import type { ShapeType } from '../../types/canvas'

// ── Helpers ───────────────────────────────────────────────────────────
function starPath(cx: number, cy: number, rx: number, ry: number): string {
  const ir = 0.4
  let d = ''
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI / 5) - Math.PI / 2
    const r = i % 2 === 0 ? { x: rx, y: ry } : { x: rx * ir, y: ry * ir }
    const x = cx + r.x * Math.cos(angle)
    const y = cy + r.y * Math.sin(angle)
    d += (i === 0 ? 'M' : 'L') + ` ${x.toFixed(2)} ${y.toFixed(2)} `
  }
  return d + 'Z'
}

function polygonPath(cx: number, cy: number, rx: number, ry: number, n: number): string {
  let d = ''
  for (let i = 0; i < n; i++) {
    const angle = (i * 2 * Math.PI / n) - Math.PI / 2
    const x = cx + rx * Math.cos(angle)
    const y = cy + ry * Math.sin(angle)
    d += (i === 0 ? 'M' : 'L') + ` ${x.toFixed(2)} ${y.toFixed(2)} `
  }
  return d + 'Z'
}

// ── Arrow (exported separately for open-path rendering) ───────────────
export function arrowPath(
  x1: number, y1: number,
  x2: number, y2: number,
  sw: number
): string {
  const dx = x2 - x1, dy = y2 - y1
  const angle = Math.atan2(dy, dx)
  const len = Math.hypot(dx, dy)
  const hs = Math.max(sw * 4, Math.min(len * 0.35, 32))
  const p1x = x2 - hs * Math.cos(angle - 0.45)
  const p1y = y2 - hs * Math.sin(angle - 0.45)
  const p2x = x2 - hs * Math.cos(angle + 0.45)
  const p2y = y2 - hs * Math.sin(angle + 0.45)
  return `M ${x1} ${y1} L ${x2} ${y2} M ${p1x.toFixed(2)} ${p1y.toFixed(2)} L ${x2} ${y2} L ${p2x.toFixed(2)} ${p2y.toFixed(2)}`
}

// ── Main shape path generator ─────────────────────────────────────────
export function getShapeD(
  type: ShapeType,
  x: number, y: number,
  w: number, h: number
): string {
  const minX = Math.min(x, x + w), minY = Math.min(y, y + h)
  const maxX = Math.max(x, x + w), maxY = Math.max(y, y + h)
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  const rx = (maxX - minX) / 2, ry = (maxY - minY) / 2
  const aw = maxX - minX, ah = maxY - minY

  switch (type) {
    case 'triangle':
      return `M ${cx} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`

    case 'diamond':
      return `M ${cx} ${minY} L ${maxX} ${cy} L ${cx} ${maxY} L ${minX} ${cy} Z`

    case 'star':
      return starPath(cx, cy, rx, ry)

    case 'hexagon':
      return polygonPath(cx, cy, rx, ry, 6)

    case 'pentagon':
      return polygonPath(cx, cy, rx, ry, 5)

    case 'cross': {
      const arm = Math.min(aw, ah) * 0.32
      const ha = arm / 2
      return `M ${cx - ha} ${minY} L ${cx + ha} ${minY}
        L ${cx + ha} ${cy - ha} L ${maxX} ${cy - ha}
        L ${maxX} ${cy + ha} L ${cx + ha} ${cy + ha}
        L ${cx + ha} ${maxY} L ${cx - ha} ${maxY}
        L ${cx - ha} ${cy + ha} L ${minX} ${cy + ha}
        L ${minX} ${cy - ha} L ${cx - ha} ${cy - ha} Z`
    }

    case 'heart': {
      const topY = minY + ah * 0.28
      const mx1 = minX + aw * 0.25
      const mx2 = maxX - aw * 0.25
      return `M ${cx} ${maxY}
        C ${minX} ${minY + ah * 0.7}, ${minX} ${topY}, ${mx1} ${topY}
        C ${minX + aw * 0.1} ${minY}, ${cx} ${minY + ah * 0.15}, ${cx} ${topY}
        C ${cx} ${minY + ah * 0.15}, ${maxX - aw * 0.1} ${minY}, ${mx2} ${topY}
        C ${maxX} ${topY}, ${maxX} ${minY + ah * 0.7}, ${cx} ${maxY} Z`
    }

    case 'speech-bubble': {
      const r = Math.min(aw, ah) * 0.1
      const bodyH = ah * 0.78
      const tailW = aw * 0.1
      const tailX = minX + aw * 0.22
      return `M ${minX + r} ${minY}
        L ${maxX - r} ${minY} Q ${maxX} ${minY} ${maxX} ${minY + r}
        L ${maxX} ${minY + bodyH - r} Q ${maxX} ${minY + bodyH} ${maxX - r} ${minY + bodyH}
        L ${tailX + tailW} ${minY + bodyH}
        L ${tailX} ${maxY}
        L ${tailX - tailW * 0.5} ${minY + bodyH}
        L ${minX + r} ${minY + bodyH} Q ${minX} ${minY + bodyH} ${minX} ${minY + bodyH - r}
        L ${minX} ${minY + r} Q ${minX} ${minY} ${minX + r} ${minY} Z`
    }

    case 'cloud': {
      return `M ${minX} ${maxY}
        L ${minX} ${minY + ah * 0.58}
        Q ${minX} ${minY + ah * 0.22} ${minX + aw * 0.18} ${minY + ah * 0.3}
        Q ${minX + aw * 0.14} ${minY} ${minX + aw * 0.42} ${minY + ah * 0.1}
        Q ${minX + aw * 0.44} ${minY - ah * 0.04} ${minX + aw * 0.62} ${minY + ah * 0.08}
        Q ${minX + aw * 0.68} ${minY} ${maxX - aw * 0.1} ${minY + ah * 0.2}
        Q ${maxX} ${minY + ah * 0.2} ${maxX} ${minY + ah * 0.55}
        L ${maxX} ${maxY} Z`
    }

    default:
      return ''
  }
}
