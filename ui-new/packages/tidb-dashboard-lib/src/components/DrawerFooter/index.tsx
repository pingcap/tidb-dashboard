import React from 'react'
import { useInView } from 'react-intersection-observer'
import cx from 'classnames'

import styles from './index.module.less'

// A sticky footer for Antd Drawer component.
function DrawerFooter({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const { ref, inView } = useInView({
    initialInView: true, // prevent shadow being displayed at the beginning
    rootMargin: '-24px' // equals to @drawer-body-padding
  })
  const displayShadow = !inView

  return (
    <>
      <div
        className={cx(className, styles.container, {
          [styles.withShadow]: displayShadow
        })}
        {...rest}
      >
        {children}
      </div>
      <div ref={ref} className={styles.mark}></div>
    </>
  )
}

export default React.memo(DrawerFooter)
