import React from 'react'
import cx from 'classnames'
import styles from './index.module.less'

export type IEllipsisTextProps = React.HTMLAttributes<HTMLDivElement>

export default function EllipsisText({
  className,
  children,
  ...rest
}: IEllipsisTextProps) {
  return (
    <div className={cx(styles.ellipsis_text, className)} {...rest}>
      {children}
    </div>
  )
}
