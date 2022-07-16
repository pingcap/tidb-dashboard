import React from 'react'
import cx from 'classnames'
import { Space } from 'antd'

import styles from './index.module.less'

export default function Toolbar(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, children, ...rest } = props
  const c = cx(className, styles.toolbar_container)

  // https://stackoverflow.com/questions/27366077
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== Space) {
      console.error('Toolbar children only can be Space component')
    }
  })

  return (
    <div className={c} {...rest}>
      {React.Children.map(children, (child, idx) => {
        // https://stackoverflow.com/questions/42261783
        if (React.isValidElement(child) && child.type === Space) {
          const extraClassName =
            idx === 0 ? styles.left_space : styles.right_space
          return React.cloneElement(child, {
            className: cx(child.props.className, extraClassName),
            size: child.props.size || 'middle'
          })
        }
      })}
    </div>
  )
}
