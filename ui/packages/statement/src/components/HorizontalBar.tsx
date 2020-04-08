import React from 'react'
import _ from 'lodash'
import styles from './HorizontalBar.module.css'

export const BLUE_COLOR = '#3a7de1'
export const RED_COLOR = '#f2be2c'

type TextWithHorizontalBarProps = {
  text: string
  factor: number // 0~1
  maxVal?: number // 0~1
  minVal?: number // 0~1
  color: string
}

export function TextWithHorizontalBar({
  text,
  factor,
  ...rest
}: TextWithHorizontalBarProps) {
  const minVal = rest.minVal || factor / 2
  const maxVal = rest.maxVal || _.min([1.0, factor * 1.3]) || 1.0
  return (
    <div className={styles.bar_container}>
      <div style={{ width: 64 }}>{text}</div>
      <div style={{ width: 100, position: 'relative' }}>
        <div
          style={{
            width: 100 * factor,
            height: 14,
            backgroundColor: BLUE_COLOR,
          }}
        ></div>
        <div
          style={{
            width: 100 * (maxVal - minVal),
            height: 3,
            backgroundColor: RED_COLOR,
            position: 'absolute',
            top: 5,
            left: 100 * minVal,
          }}
        ></div>
      </div>
    </div>
  )
}
