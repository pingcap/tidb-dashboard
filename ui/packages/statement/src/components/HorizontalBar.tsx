import React from 'react'

export const BLUE_COLOR = 'rgba(73, 169, 238, 1)'
export const RED_COLOR = 'rgba(255, 102, 51, 1)'

interface HorizontalBarProps {
  factor: number // 0~1
  color: string
}

export function HorizontalBar({ factor, color }: HorizontalBarProps) {
  return (
    <div
      style={{
        width: 100 * factor,
        height: 14,
        backgroundColor: color,
      }}
    ></div>
  )
}

type TextWithHorizontalBarProps = HorizontalBarProps & {
  text: string
}

export function TextWithHorizontalBar({
  text,
  ...rest
}: TextWithHorizontalBarProps) {
  return (
    <div>
      {text}
      <HorizontalBar {...rest} />
    </div>
  )
}
