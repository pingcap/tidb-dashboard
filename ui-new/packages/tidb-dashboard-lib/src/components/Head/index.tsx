import React, { ReactNode } from 'react'
import cx from 'classnames'
import styles from './index.module.less'

export interface IHeadProps {
  title: string
  titleExtra?: ReactNode
  back?: ReactNode
  footer?: ReactNode
  className?: string
  children?: ReactNode
}

function Head({
  title,
  titleExtra,
  back,
  footer,
  className,
  children,
  ...rest
}: IHeadProps) {
  return (
    <div className={cx(styles.headContainer, className)} {...rest}>
      <div className={styles.headInner}>
        {(title || titleExtra || back) && (
          <div className={cx(styles.headTitleSection)}>
            {back && <div className={styles.headBack}>{back}</div>}
            {title && <div className={styles.headTitle}>{title}</div>}
            {titleExtra && <div>{titleExtra}</div>}
          </div>
        )}
        {children && <div className={styles.headContent}>{children}</div>}
        {footer && <div className={styles.headFooter}>{footer}</div>}
      </div>
    </div>
  )
}

export default Head
