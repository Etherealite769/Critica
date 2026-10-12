'use client'

import { useMemo } from 'react'

export interface ModuleCompetencyData {
  logic_thread: number // 0-100
  snap_gap: number     // 0-100
  tap_clues: number    // 0-100
  fact_scanner: number // 0-100
}

interface CompetencyRadarProps {
  data: ModuleCompetencyData
  size?: number
}

// Map accuracy to forensic competency tier
export function getCompetencyLevel(accuracy: number): { label: string; color: string } {
  if (accuracy >= 95) return { label: 'Master', color: '#FFD700' }
  if (accuracy >= 80) return { label: 'Expert', color: '#4DDD94' }
  if (accuracy >= 60) return { label: 'Investigator', color: '#BEA791' }
  if (accuracy >= 40) return { label: 'Apprentice', color: '#F3A712' }
  return { label: 'Novice', color: '#EF4444' }
}

const AXES = [
  { key: 'logic_thread' as const, label: 'LOGIC THREAD', angle: -90 }, // Top
  { key: 'snap_gap' as const,     label: 'SNAP GAP',     angle: 0 },   // Right
  { key: 'tap_clues' as const,    label: 'TAP CLUES',    angle: 90 },  // Bottom
  { key: 'fact_scanner' as const, label: 'FACT SCANNER', angle: 180 }, // Left
]

export default function CompetencyRadar({
  data,
  size = 320,
}: CompetencyRadarProps) {
  const center = size / 2
  const maxRadius = size * 0.35 // Leave space for outer labels

  // Coordinates helper
  const getPoint = (angleDeg: number, valPct: number) => {
    const rad = (angleDeg * Math.PI) / 180
    const r = (valPct / 100) * maxRadius
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    }
  }

  // 4 concentric grid diamonds at 25%, 50%, 75%, 100%
  const gridLevels = [25, 50, 75, 100]
  const gridPolygons = useMemo(() => {
    return gridLevels.map(level => {
      return AXES.map(axis => {
        const pt = getPoint(axis.angle, level)
        return `${pt.x},${pt.y}`
      }).join(' ')
    })
  }, [center, maxRadius])

  // Student data polygon
  const dataPolygon = useMemo(() => {
    return AXES.map(axis => {
      const val = Math.min(100, Math.max(0, data[axis.key] ?? 0))
      const pt = getPoint(axis.angle, val)
      return `${pt.x},${pt.y}`
    }).join(' ')
  }, [data, center, maxRadius])

  // Vertex points
  const vertexPoints = useMemo(() => {
    return AXES.map(axis => {
      const val = Math.min(100, Math.max(0, data[axis.key] ?? 0))
      const pt = getPoint(axis.angle, val)
      return {
        ...pt,
        val,
        key: axis.key,
        label: axis.label,
        tier: getCompetencyLevel(val),
      }
    })
  }, [data, center, maxRadius])

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4DDD94" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4DDD94" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* Concentric grid rings */}
        {gridPolygons.map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill={i === gridPolygons.length - 1 ? 'rgba(0, 0, 0, 0.3)' : 'none'}
            stroke="rgba(190, 167, 145, 0.2)"
            strokeWidth={1}
            strokeDasharray={i === gridPolygons.length - 1 ? 'none' : '3 3'}
          />
        ))}

        {/* Axis lines */}
        {AXES.map((axis, i) => {
          const pt = getPoint(axis.angle, 100)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={pt.x}
              y2={pt.y}
              stroke="rgba(190, 167, 145, 0.3)"
              strokeWidth={1.5}
            />
          )
        })}

        {/* Level indicator marks along top axis */}
        {gridLevels.map((lvl) => {
          const pt = getPoint(-90, lvl)
          return (
            <text
              key={lvl}
              x={pt.x + 6}
              y={pt.y + 3}
              fill="rgba(190, 167, 145, 0.45)"
              fontSize={8}
              fontFamily="monospace"
            >
              {lvl}%
            </text>
          )
        })}

        {/* Plotted student shape */}
        <polygon
          points={dataPolygon}
          fill="url(#radar-glow)"
          stroke="#4DDD94"
          strokeWidth={2}
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(77, 221, 148, 0.4))',
            transition: 'all 0.6s ease',
          }}
        />

        {/* Vertex pins */}
        {vertexPoints.map((v) => (
          <g key={v.key}>
            <circle
              cx={v.x}
              cy={v.y}
              r={5}
              fill="#14110E"
              stroke={v.tier.color}
              strokeWidth={2}
            />
            <circle cx={v.x} cy={v.y} r={2} fill={v.tier.color} />
          </g>
        ))}

        {/* Outer Axis Labels */}
        {/* Top: Logic Thread */}
        <text
          x={center}
          y={center - maxRadius - 26}
          textAnchor="middle"
          fill="#FFF8ED"
          fontSize={10}
          fontWeight="bold"
          letterSpacing="0.08em"
        >
          LOGIC THREAD
        </text>
        <text
          x={center}
          y={center - maxRadius - 12}
          textAnchor="middle"
          fill={vertexPoints[0].tier.color}
          fontSize={9}
          fontWeight="bold"
        >
          {data.logic_thread}% • {vertexPoints[0].tier.label}
        </text>

        {/* Right: Snap Gap */}
        <text
          x={center + maxRadius + 14}
          y={center - 4}
          textAnchor="start"
          fill="#FFF8ED"
          fontSize={10}
          fontWeight="bold"
          letterSpacing="0.08em"
        >
          SNAP GAP
        </text>
        <text
          x={center + maxRadius + 14}
          y={center + 10}
          textAnchor="start"
          fill={vertexPoints[1].tier.color}
          fontSize={9}
          fontWeight="bold"
        >
          {data.snap_gap}% • {vertexPoints[1].tier.label}
        </text>

        {/* Bottom: Tap Clues */}
        <text
          x={center}
          y={center + maxRadius + 18}
          textAnchor="middle"
          fill="#FFF8ED"
          fontSize={10}
          fontWeight="bold"
          letterSpacing="0.08em"
        >
          TAP CLUES
        </text>
        <text
          x={center}
          y={center + maxRadius + 32}
          textAnchor="middle"
          fill={vertexPoints[2].tier.color}
          fontSize={9}
          fontWeight="bold"
        >
          {data.tap_clues}% • {vertexPoints[2].tier.label}
        </text>

        {/* Left: Fact Scanner */}
        <text
          x={center - maxRadius - 14}
          y={center - 4}
          textAnchor="end"
          fill="#FFF8ED"
          fontSize={10}
          fontWeight="bold"
          letterSpacing="0.08em"
        >
          FACT SCANNER
        </text>
        <text
          x={center - maxRadius - 14}
          y={center + 10}
          textAnchor="end"
          fill={vertexPoints[3].tier.color}
          fontSize={9}
          fontWeight="bold"
        >
          {data.fact_scanner}% • {vertexPoints[3].tier.label}
        </text>
      </svg>
    </div>
  )
}
