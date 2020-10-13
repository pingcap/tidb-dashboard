import React, { useEffect, useState } from 'react'
import cx from 'classnames'
import { Skeleton } from 'antd'
import { SkeletonProps } from 'antd/lib/skeleton'
import { AppearAnimate } from '..'

import styles from './index.module.less'

export interface IAnimatedSkeletonProps extends SkeletonProps {
  showSkeleton?: boolean
  children?: React.ReactNode
}

function AnimatedSkeleton({
  showSkeleton,
  children,
  ...restProps
}: IAnimatedSkeletonProps) {
  const [skeletonAppears, setSkeletonAppears] = useState(0)

  useEffect(() => {
    if (showSkeleton) {
      setSkeletonAppears((v) => v + 1)
    }
  }, [showSkeleton])

  return (
    <div className={cx(styles.container)}>
      {showSkeleton && (
        <div
          className={cx({
            [styles.skeletonAnimationFirstTime]: skeletonAppears === 1,
            [styles.skeletonAnimationNotFirstTime]: skeletonAppears > 1,
          })}
        >
          <Skeleton
            active
            title={false}
            paragraph={{ rows: 3 }}
            {...restProps}
          />
        </div>
      )}
      {!showSkeleton && (
        <AppearAnimate motionName={styles.contentAnimation}>
          {children}
        </AppearAnimate>
      )}
    </div>
  )
}

export default React.memo(AnimatedSkeleton)
