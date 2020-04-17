import React from 'react'
import cx from 'classnames'
import styles from './index.module.less'

export default function Pre({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLPreElement>) {
  return (
    <pre className={cx(styles.pre, className)} {...rest}>
      {children}
    </pre>
  )
}
