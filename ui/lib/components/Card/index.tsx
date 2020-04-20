import React, { ReactNode } from 'react'
import cx from 'classnames'
import styles from './index.module.less'

export interface ICardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  extra?: ReactNode
  noMargin?: boolean
}

export default function Card({
  title,
  extra,
  className,
  noMargin,
  children,
  ...rest
}: ICardProps) {
  return (
    <div className={cx(styles.cardContainer, className)} {...rest}>
      <div
        className={cx(styles.cardInner, {
          [styles.noMargin]: noMargin,
          [styles.hasTitle]: title || extra,
        })}
      >
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
