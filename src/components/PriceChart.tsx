import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { fetchHistory, RANGES, type Point, type Range } from '../lib/history'
import { changeClass, fmtAgo, fmtChange, fmtUsd } from '../lib/format'

const L = 64
const R = 10
const T = 10
const B = 28
const KEY = 'chart-range'

function savedRange(): Range {
  try {
    const v = localStorage.getItem(KEY)
    return v === '30d' ? '30d' : '7d'
  } catch {
    return '7d'
  }
}

const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const tickFmt = {
  '7d': new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }),
  '30d': new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
}
const pad2 = (n: number) => String(n).padStart(2, '0')
const when = (t: number) => {
  const d = new Date(t)
  return `${dayFmt.format(d)} ${pad2(d.getUTCHours())}:00 UTC`
}

type Size = { W: number; H: number }
type Geo = { x: (i: number) => number; y: (v: number) => number; lo: number; hi: number; lo0: number; hi0: number }

function extent(points: Point[]) {
  const prices = points.map((p) => p.price)
  return { lo: Math.min(...prices), hi: Math.max(...prices) }
}

function geometry(points: Point[], { W, H }: Size): Geo {
  const { lo, hi } = extent(points)
  // Zoomed out on purpose: room below and above, so a quiet week looks quiet.
  const span = (hi - lo) || hi * 0.02
  const lo0 = Math.max(0, lo - span * 0.9)
  const hi0 = hi + span * 0.6
  const n = points.length
  return {
    x: (i) => L + (i * (W - L - R)) / Math.max(1, n - 1),
    y: (v) => T + (1 - (v - lo0) / (hi0 - lo0)) * (H - T - B),
    lo, hi, lo0, hi0,
  }
}

function Plot({ points, range }: { points: Point[]; range: Range }) {
  const [active, setActive] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  // Drawn at the real pixel width so labels stay 11px on phones instead of shrinking with the SVG.
  const [width, setWidth] = useState(900)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setWidth(Math.max(280, el.clientWidth - 20))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const W = width
  const H = W < 560 ? 220 : 300
  const g = geometry(points, { W, H })
  const n = points.length
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${g.x(i).toFixed(1)} ${g.y(p.price).toFixed(1)}`).join('')
  const base = H - B
  const ticks = range === '7d' ? (W < 560 ? 4 : 7) : W < 560 ? 3 : 5

  const at = (clientX: number, svg: SVGSVGElement) => {
    const b = svg.getBoundingClientRect()
    const u = ((clientX - b.left) / b.width) * W
    return Math.max(0, Math.min(n - 1, Math.round(((u - L) / (W - L - R)) * (n - 1))))
  }
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    setActive((a) => Math.max(0, Math.min(n - 1, (a ?? n - 1) + step)))
  }
  const p = active === null ? null : points[active]

  return (
    <div
      ref={box}
      className="plot"
      data-testid="price-chart"
      tabIndex={0}
      role="group"
      aria-label={`Price chart, ${points.length} points. Use the left and right arrow keys to read prices.`}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
    >
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        onPointerMove={(e: PointerEvent<SVGSVGElement>) => setActive(at(e.clientX, e.currentTarget))}
        onPointerLeave={() => setActive(null)}
      >
        {[0, 1, 2, 3].map((k) => {
          const v = g.lo0 + ((g.hi0 - g.lo0) * k) / 3
          return (
            <g key={k}>
              <line x1={L} x2={W - R} y1={g.y(v)} y2={g.y(v)} stroke="var(--soft)" />
              <text x={L - 8} y={g.y(v) + 4} textAnchor="end">{fmtUsd(v)}</text>
            </g>
          )
        })}
        {Array.from({ length: ticks }, (_, k) => {
          const i = Math.round((k * (n - 1)) / ticks)
          return (
            <g key={k}>
              <line x1={g.x(i)} x2={g.x(i)} y1={base} y2={base + 5} stroke="var(--muted)" />
              <text x={g.x(i) + 4} y={H - 8}>{tickFmt[range].format(new Date(points[i].t))}</text>
            </g>
          )
        })}
        <path d={`${line}L${g.x(n - 1)} ${base}L${g.x(0)} ${base}Z`} fill="var(--ink)" opacity="0.07" />
        <path d={line} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
        {active === null ? (
          <circle cx={g.x(n - 1)} cy={g.y(points[n - 1].price)} r="4.5" fill="var(--ink)" />
        ) : (
          <>
            <line x1={g.x(active)} x2={g.x(active)} y1={T} y2={base} stroke="var(--muted)" strokeDasharray="3 3" />
            <circle cx={g.x(active)} cy={g.y(points[active].price)} r="5" fill="var(--card)" stroke="var(--ink)" strokeWidth="2" />
          </>
        )}
      </svg>
      {p && active !== null && (
        <div
          className="plot-tip"
          data-testid="chart-tip"
          style={{ left: Math.max(70, Math.min(W - 60, g.x(active))) + 10, top: g.y(p.price) + 14 - 12 }}
        >
          <b>{fmtUsd(p.price)}</b>
          {when(p.t)}
        </div>
      )}
    </div>
  )
}

export function PriceChart({ pool, symbol }: { pool?: string; symbol: string }) {
  const [range, setRange] = useState<Range>(savedRange)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(id)
  }, [])
  const q = useQuery({
    queryKey: ['history', pool, range],
    queryFn: () => fetchHistory(pool!, range),
    enabled: !!pool,
    retry: 1,
    retryDelay: 1_000,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })
  const pick = (r: Range) => {
    setRange(r)
    try {
      localStorage.setItem(KEY, r)
    } catch {
      /* the choice just isn't remembered */
    }
  }
  const points = q.data && q.data.length > 1 ? q.data : undefined
  const change = points ? (points[points.length - 1].price / points[0].price - 1) * 100 : null
  const label = range === '7d' ? '7-day change' : '30-day change'

  return (
    <section className="block" aria-labelledby="history-h">
      <div className="block-head">
        <h2 id="history-h">Price history</h2>
        <div className="range" role="group" aria-label="Range">
          {(Object.keys(RANGES) as Range[]).map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => pick(r)}>
              {RANGES[r].label}
            </button>
          ))}
        </div>
      </div>
      {points && (
        <div className="chart-readout">
          <div>
            <span className="eyebrow">{label}</span>
            <b className={changeClass(change)} data-testid="chart-change">{fmtChange(change)}</b>
          </div>
          <div>
            <span className="eyebrow">High</span>
            <b data-testid="chart-high">{fmtUsd(extent(points).hi)}</b>
          </div>
          <div>
            <span className="eyebrow">Low</span>
            <b data-testid="chart-low">{fmtUsd(extent(points).lo)}</b>
          </div>
        </div>
      )}
      {points ? (
        <Plot key={range} points={points} range={range} />
      ) : (
        <div className="plot" aria-busy={q.isLoading}>
          <div className="plot-state" role={q.isError ? "alert" : undefined}>
            {q.isLoading || !pool ? (
              'Loading price history…'
            ) : (
              <>
                <span>Price history for {symbol} is unavailable right now.</span>
                <button type="button" className="linklike" onClick={() => void q.refetch()}>Retry</button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="chart-foot sub">
        <span>{RANGES[range].note} on the deepest Base pool. Hover, drag or use the arrow keys to read a price.</span>
        {q.dataUpdatedAt > 0 && <span className="stamp">Updated {fmtAgo(now - q.dataUpdatedAt)}</span>}
      </div>
    </section>
  )
}
