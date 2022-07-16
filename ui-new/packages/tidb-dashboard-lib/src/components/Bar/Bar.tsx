import React, { useMemo } from 'react'
import cx from 'classnames'
import clamp from 'lodash/clamp'
import sum from 'lodash/sum'

import styles from './Bar.module.less'

export interface IBarProps {
  value: number[] | number
  colors?: (string | null)[]
  capacity: number
  min?: number
  max?: number
  className?: string
  children?: React.ReactNode
  textWidth?: number | string
}

function Bar({
  value,
  colors,
  capacity,
  min,
  max,
  className,
  children,
  textWidth,
  ...rest
}: IBarProps) {
  const clampedValues = useMemo(() => {
    if (value instanceof Array) {
      const r: [number, number][] = []
      let sum = 0
      value.forEach((value) => {
        let v: number
        if (sum + value <= capacity) {
          v = value
        } else if (sum < capacity) {
          v = capacity - sum
        } else {
          v = 0
        }
        r.push([sum, v])
        sum += v
      })
      return r
    } else {
      return [[0, clamp(value, 0, capacity)]]
    }
  }, [value, capacity])

  const valuesSum = useMemo(
    () => sum(clampedValues.map(([_s, v]) => v)),
    [clampedValues]
  )

  if (min != null) {
    min = clamp(min, 0, valuesSum)
    if ((valuesSum - min) / capacity < 0.01) {
      min = undefined
    }
  }
  if (max != null) {
    max = clamp(max, valuesSum, capacity)
    if ((max - valuesSum) / capacity < 0.01) {
      max = undefined
    }
  }

  return (
    <div className={cx(styles.container, className)} {...rest}>
      {children && (
        <div className={styles.text} style={{ width: textWidth }}>
          {children}
        </div>
      )}
      <div className={styles.bar_container}>
        {clampedValues.map(([offset, value], idx) => (
          <div
            className={cx(styles.bar)}
            style={{
              width: `${(value / capacity) * 100}%`,
              left: `${(offset / capacity) * 100}%`,
              backgroundColor: colors?.[idx] || undefined
            }}
            key={idx}
          />
        ))}
        {min != null && (
          <div
            className={cx(styles.error_bar, styles.min_bar)}
            style={{
              left: `${(min / capacity) * 100}%`,
              width: `${((valuesSum - min) / capacity) * 100}%`
            }}
          />
        )}
        {max != null && (
          <div
            className={cx(styles.error_bar, styles.max_bar)}
            style={{
              left: `${(valuesSum / capacity) * 100}%`,
              width: `${((max - valuesSum) / capacity) * 100}%`
            }}
          />
        )}
      </div>
    </div>
  )
}

export default Bar
