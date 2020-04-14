import React from 'react'
import cx from 'classnames'
import Bar, { IBarProps } from './Bar'

import styles from './WithText.module.less'

export interface IBarWithTextProps extends IBarProps {
  children?: React.ReactNode
  className?: string
}

export default function BarWithText({
  children,
  className,
  ...rest
}: IBarWithTextProps) {
  const c = cx(styles.container, className)
  return (
    <div className={c}>
      <div className={styles.text}>{children}</div>
      <div className={styles.bar}>
        <Bar {...rest} />
      </div>
    </div>
  )
}
