import React, { ReactNode } from 'react'
import { Tooltip } from 'antd'
import cx from 'classnames'
import styles from './HorizontalBar.module.less'

type TextWithHorizontalBarProps = {
  text: string
  normalVal: number // 0~1
  maxVal?: number // 0~1
  minVal?: number // 0~1
  tooltip?: string | ReactNode
}

export function TextWithHorizontalBar({
  text,
  normalVal,
  maxVal,
  minVal,
  tooltip,
}: TextWithHorizontalBarProps) {
  const body = (
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
  return tooltip ? <Tooltip title={tooltip}>{body}</Tooltip> : body
}
