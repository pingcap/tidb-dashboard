import React from 'react'

interface Props {
  factor: number // 0~1
  color: string
}

export function HorizontalBar({ factor, color }: Props) {
  return (
    <div
      style={{
        width: 100 * factor,
        height: 14,
        backgroundColor: color
      }}
    ></div>
  )
}
