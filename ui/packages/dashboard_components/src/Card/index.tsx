import React, { ReactNode } from 'react'
import cx from 'classnames'
import styles from './index.module.less'

export interface ICardProps {
  title?: ReactNode
  extra?: ReactNode
  className?: string
  style?: object
  children?: ReactNode
  [k: string]: any
}

export default function Card({
  title,
  extra,
  className,
  children,
  ...rest
}: ICardProps) {
  return (
    <div className={cx(styles.cardContainer, className)} {...rest}>
      <div className={styles.cardInner}>
        {(title || extra) && (
          <div className={styles.cardTitleSection}>
            {title && <div className={styles.cardTitle}>{title}</div>}
            {extra && <div className={styles.cardTitleExtra}>{extra}</div>}
          </div>
        )}
        {children && <div className={styles.cardContent}>{children}</div>}
      </div>
    </div>
  )
}
