import React from 'react'

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
