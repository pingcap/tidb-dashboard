import React from 'react'
import classNames from 'classnames'
import styles from './index.module.less'

class Head extends React.PureComponent {
  render() {
    const {
      title,
      titleExtra,
      back,
      footer,
      className,
      children,
      ...rest
    } = this.props
    return (
      <div className={classNames(styles.headContainer, className)} {...rest}>
        <div className={styles.headInner}>
          {(title || titleExtra || back) && (
            <div className={styles.headTitleSection}>
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
}

export default Head
