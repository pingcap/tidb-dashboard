import React from 'react'
import _ from 'lodash'
import styles from './HorizontalBar.module.css'

export const BLUE_COLOR = '#3a7de1'
export const ORANGE_COLOR = '#f2be2c'

type TextWithHorizontalBarProps = {
  text: string
  normalVal: number // 0~1
  maxVal?: number // 0~1
  minVal?: number // 0~1
  color: string
}

export function TextWithHorizontalBar({
  text,
  normalVal: factor,
  maxVal,
  minVal,
}: TextWithHorizontalBarProps) {
  // const minVal = rest.minVal || factor / 2
  // const maxVal = rest.maxVal || _.min([1.0, factor * 1.3]) || 1.0
  return (
    <div className={styles.bar_container}>
      <div style={{ width: 64 }}>{text}</div>
      <div style={{ width: 100, position: 'relative' }}>
        <div
          className={styles.normal_bar}
          style={{ width: 100 * factor }}
        ></div>
        {maxVal && minVal && (
          <div
            className={styles.max_min_bar}
            style={{
              width: 100 * (maxVal - minVal),
              left: 100 * minVal,
            }}
          ></div>
        )}
      </div>
    </div>
  )
}
