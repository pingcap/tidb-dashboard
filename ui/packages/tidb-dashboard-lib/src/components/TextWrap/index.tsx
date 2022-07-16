import React from 'react'
import cx from 'classnames'

import styles from './index.module.less'

export interface ITextWrapProps extends React.HTMLAttributes<HTMLDivElement> {
  // When multiline enabled, text will be wrapped. When multiline disabled,
  // overflow texts will be truncated with ellipsis.
  multiline?: boolean
}

export default function TextWrap({
  multiline,
  className,
  children,
  ...rest
}: ITextWrapProps) {
  const c = cx(className, {
    [styles.multiLine]: multiline,
    [styles.singleLine]: !multiline
  })
  return (
    <div className={c} {...rest}>
      {children}
    </div>
  )
}
