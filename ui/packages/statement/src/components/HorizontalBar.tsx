import React from 'react'
import cx from 'classnames'
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
  return (
    <div className={styles.container}>
      <div className={styles.text_container}>{text}</div>
      <div className={styles.bar_container}>
        <div
          className={styles.normal_bar}
          style={{ width: 100 * normalVal }}
        ></div>
        {maxVal !== undefined && minVal !== undefined && (
          <div
            className={cx(styles.min_bar, styles.max_bar)}
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
