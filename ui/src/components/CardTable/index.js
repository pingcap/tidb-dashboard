import React from 'react'
import { Table, Skeleton, Card } from 'antd'
import classNames from 'classnames'
import styles from './index.module.less'

class TableCard extends React.PureComponent {
  render() {
    const {
      title,
      className,
      style,
      loading,
      loadingSkeletonRows,
      cardExtra,
      ...rest
    } = this.props
    return (
      <Card
        title={title}
        bordered={false}
        style={style}
        className={classNames(styles.cardTable, className)}
        extra={cardExtra}
      >
        {loading ? (
          <Skeleton
            active
            title={false}
            paragraph={{ rows: loadingSkeletonRows || 5 }}
          />
        ) : (
          <Table pagination={false} size="middle" {...rest} />
        )}
      </Card>
    )
  }
}

export default TableCard
