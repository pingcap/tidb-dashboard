import useQueryParams from '@lib/utils/useQueryParams'
import React from 'react'
import cx from 'classnames'

import styles from './index.module.less'

export interface IBlinkProps extends React.HTMLAttributes<HTMLDivElement> {
  activeId: string
}

export default function Blink({
  activeId,
  children,
  className,
  ...restProps
}: IBlinkProps) {
  const { blink } = useQueryParams()

  return (
    <div
      className={cx(className, {
        [styles.blinkActive]: blink === activeId
      })}
      {...restProps}
    >
      {children}
    </div>
  )
}
