import React from 'react'
import classNames from 'classnames'
import styles from './index.module.less'

function Card({ title, extra, className, children, ...rest }) {
  return (
    <div className={classNames(styles.cardContainer, className)} {...rest}>
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

export default Card
