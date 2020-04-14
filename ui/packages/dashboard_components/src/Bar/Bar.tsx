import React from 'react'
import cx from 'classnames'
import clamp from 'lodash/clamp'

import WithText from './WithText'

import styles from './Bar.module.less'

export interface IBarProps {
  value: number
  capacity: number
  min?: number
  max?: number
  className?: string
}

function Bar({ value, capacity, min, max, className, ...rest }: IBarProps) {
  value = clamp(value, 0, capacity)
  if (min) {
    min = clamp(min, 0, value)
  }
  if (max) {
    max = clamp(max, value, capacity)
  }

  const c = cx(styles.container, className)

  return (
    <div className={c} {...rest}>
      <div
        className={styles.bar}
        style={{ width: `${(value / capacity) * 100}%` }}
      />
      {min && (
        <div
          className={cx(styles.error_bar, styles.min_bar)}
          style={{
            left: `${(min / capacity) * 100}%`,
            width: `${((value - min) / capacity) * 100}%`,
          }}
        ></div>
      )}
      {max && (
        <div
          className={cx(styles.error_bar, styles.max_bar)}
          style={{
            left: `${(value / capacity) * 100}%`,
            width: `${((max - value) / capacity) * 100}%`,
          }}
        ></div>
      )}
    </div>
  )
}

Bar.WithText = WithText

export default Bar
