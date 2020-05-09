import React, { useState, useRef, useEffect } from 'react'
import cx from 'classnames'
import { Skeleton } from 'antd'
import { SkeletonProps } from 'antd/lib/skeleton'
import { animated, useSpring } from 'react-spring'

import styles from './index.module.less'

export interface IAnimatedSkeletonProps extends SkeletonProps {
  showSkeleton?: boolean
  children?: React.ReactNode
}

function opacityToDisplay(v) {
  return v === 0 ? 'none' : 'block'
}

function getTargetProps(showSkeleton) {
  return {
    skeletonOpacity: showSkeleton ? 1 : 0,
    contentOpacity: showSkeleton ? 0 : 1,
  }
}

function AnimatedSkeleton({
  showSkeleton,
  children,
  ...restProps
}: IAnimatedSkeletonProps) {
  const skeletonRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setAnimating] = useState(false)
  const [minHeight, setMinHeight] = useState<string | number>('auto')

  const [props, setProps] = useSpring(() => ({
    ...getTargetProps(showSkeleton),
    onStart: () => {
      setAnimating(true)
      if (!skeletonRef.current || !contentRef.current) {
        return
      }
      let minHeight = 0
      minHeight = Math.max(minHeight, skeletonRef.current!.offsetHeight)
      minHeight = Math.max(minHeight, contentRef.current!.offsetHeight)
      setMinHeight(minHeight)
    },
    onRest: () => {
      setAnimating(false)
      setMinHeight('auto')
    },
  }))

  useEffect(() => {
    setProps(getTargetProps(showSkeleton))
  }, [showSkeleton, setProps])

  return (
    <div
      className={cx(styles.container, { [styles.isAnimating]: isAnimating })}
      style={{ minHeight: minHeight }}
    >
      <animated.div
        className={styles.skeleton}
        style={{
          opacity: props.skeletonOpacity,
          display: props.skeletonOpacity.interpolate(opacityToDisplay),
        }}
      >
        <div ref={skeletonRef}>
          <Skeleton title={false} paragraph={{ rows: 3 }} {...restProps} />
        </div>
      </animated.div>
      <animated.div
        className={styles.content}
        style={{
          opacity: props.contentOpacity,
        }}
      >
        <div ref={contentRef}>{children}</div>
      </animated.div>
    </div>
  )
}

export default AnimatedSkeleton
