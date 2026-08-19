import React from 'react'

export default function PatternStrip({ className = '', height = '6px', variant = 'default' }) {
  const colors = variant === 'glow'
    ? ['#C1622F', '#F5F1E8', '#5F7A5A', '#F5F1E8']
    : ['#5F7A5A', '#F5F1E8', '#C1622F', '#F5F1E8']

  const stripeStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
    backgroundImage: `repeating-linear-gradient(
      135deg,
      ${colors[0]} 0px, ${colors[0]} 6px,
      ${colors[1]} 6px, ${colors[1]} 8px,
      ${colors[2]} 8px, ${colors[2]} 12px,
      ${colors[3]} 12px, ${colors[3]} 14px
    )`,
  }

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div
        role="presentation"
        aria-hidden="true"
        className={`w-full transition-all duration-300 ${
          variant === 'pill' ? 'rounded-pill' : ''
        } ${
          variant === 'glow' ? 'shadow-[0_0_12px_rgba(193,98,47,0.35)]' : ''
        }`}
        style={stripeStyle}
      />
    </div>
  )
}
