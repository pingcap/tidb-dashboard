import React from 'react'
import cx from 'classnames'
import styles from './index.module.less'

export interface IPreProps extends React.HTMLAttributes<HTMLPreElement> {
  noWrap?: boolean
}

export default function Pre({
  noWrap,
  className,
  children,
  ...rest
}: IPreProps) {
  return (
    <pre
      className={cx(styles.pre, className, { [styles.preNoWrap]: noWrap })}
      {...rest}
    >
      {children}
    </pre>
  )
}
