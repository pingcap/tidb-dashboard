import React from 'react'
import _ from 'lodash'
import styles from './HorizontalBar.module.css'

type TextWithHorizontalBarProps = {
  text: string
  normalVal: number // 0~1
  maxVal?: number // 0~1
  minVal?: number // 0~1
}

export function TextWithHorizontalBar({
  text,
  normalVal,
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
          style={{ width: 100 * normalVal }}
        ></div>
        {maxVal !== undefined && minVal !== undefined && (
          <div
            className={styles.max_min_bar}
            style={{
              width: 100 * (maxVal - minVal),
              left: 100 * minVal,
            }}
          ></div>
        )}
        {maxVal !== undefined && minVal === undefined && (
          <div
            className={styles.max_bar}
            style={{
              width: 100 * (maxVal - normalVal),
              left: 100 * normalVal,
            }}
          ></div>
        )}
      </div>
    </div>
  )
}
