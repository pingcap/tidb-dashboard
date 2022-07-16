import React, { ReactNode } from 'react'
import cx from 'classnames'
import styles from './index.module.less'

export interface ICardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  subTitle?: ReactNode
  extra?: ReactNode
  noMargin?: boolean
  noMarginTop?: boolean
  noMarginBottom?: boolean
  noMarginLeft?: boolean
  noMarginRight?: boolean
  flexGrow?: boolean
}

export default function Card({
  title,
  subTitle,
  extra,
  className,
  noMargin,
  noMarginTop,
  noMarginBottom,
  noMarginLeft,
  noMarginRight,
  flexGrow,
  children,
  ...rest
}: ICardProps) {
  return (
    <div
      className={cx(styles.cardContainer, className, {
        [styles.flexGrow]: flexGrow
      })}
      {...rest}
    >
      <div
        className={cx(styles.cardInner, {
          [styles.noMargin]: noMargin,
          [styles.noMarginTop]: noMarginTop,
          [styles.noMarginBottom]: noMarginBottom,
          [styles.noMarginLeft]: noMarginLeft,
          [styles.noMarginRight]: noMarginRight,
          [styles.hasTitle]: title || subTitle || extra
        })}
      >
        {(title || subTitle || extra) && (
          <div className={styles.cardTitleSection}>
            {title && <div className={styles.cardTitle}>{title}</div>}
            {subTitle && <div className={styles.cardSubTitle}>{subTitle}</div>}
            <div className={styles.cardTitleSpacer} />
            {extra && <div className={styles.cardTitleExtra}>{extra}</div>}
          </div>
        )}
        {children && <div className={styles.cardContent}>{children}</div>}
      </div>
    </div>
  )
}
