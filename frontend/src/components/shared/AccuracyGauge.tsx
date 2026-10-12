'use client'

import { useMemo } from 'react'

interface AccuracyGaugeProps {
  value: number // 0 to 100
  size?: number
  strokeWidth?: number
  label?: string
  subtext?: string
  showTicks?: boolean
}

export default function AccuracyGauge({
  value,
  size = 140,
  strokeWidth = 10,
  label = 'ACCURACY',
  subtext,
  showTicks = true,
}: AccuracyGaugeProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))

  // Color calculation based on forensic accuracy tiers
  const color = useMemo(() => {
    if (clamped >= 85) return '#4DDD94' // Emerald
    if (clamped >= 70) return '#BEA791' // Manila gold
    if (clamped >= 50) return '#F3A712' // Amber
    return '#EF4444' // Crimson
  }, [clamped])

  const center = size / 2
  const radius = center - strokeWidth - 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  // 12 cosmetic tick marks around the perimeter
  const ticks = useMemo(() => {
    if (!showTicks) return []
    const count = 16
    const tickRadius = radius + strokeWidth / 2 + 4
    return Array.from({ length: count }, (_, i) => {
      const angle = (i * 360) / count - 90
      const rad = (angle * Math.PI) / 180
      const x1 = center + (tickRadius - 3) * Math.cos(rad)
      const y1 = center + (tickRadius - 3) * Math.sin(rad)
      const x2 = center + (tickRadius + 1) * Math.cos(rad)
      const y2 = center + (tickRadius + 1) * Math.sin(rad)
      return { x1, y1, x2, y2, angle }
    })
  }, [center, radius, strokeWidth, showTicks])

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Subtle background glow */}
        <defs>
          <filter id={`gauge-glow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Perimeter ticks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="rgba(190, 167, 145, 0.25)"
            strokeWidth={1}
          />
        ))}

        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />

        {/* Value arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          filter={`url(#gauge-glow-${size})`}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease',
          }}
        />
      </svg>

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: size * 0.22,
            fontWeight: 900,
            color,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textShadow: `0 0 16px ${color}40`,
          }}
        >
          {clamped}%
        </span>
        <span
          style={{
            fontSize: Math.max(9, size * 0.07),
            fontWeight: 700,
            color: '#A89582',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginTop: 4,
          }}
        >
          {label}
        </span>
        {subtext && (
          <span
            style={{
              fontSize: Math.max(8, size * 0.06),
              color: '#6B5A4B',
              letterSpacing: '0.04em',
              marginTop: 2,
            }}
          >
            {subtext}
          </span>
        )}
      </div>
    </div>
  )
}
