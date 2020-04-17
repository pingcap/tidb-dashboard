import React, { ReactNode } from 'react'
import { Table, Skeleton } from 'antd'
import { TableProps } from 'antd/es/table'
import cx from 'classnames'
import Card from '../Card'
import styles from './index.module.less'

export interface ICardTableProps<RecordType extends object = any>
  extends TableProps<RecordType> {
  title?: any
  className?: string
  style?: object
  loading?: boolean
  loadingSkeletonRows?: number
  cardExtra?: ReactNode
  children?: ReactNode
}

function CardTable({
  title,
  className,
  style,
  loading,
  loadingSkeletonRows,
  cardExtra,
  ...rest
}: ICardTableProps) {
  return (
    <Card
      title={title}
      style={style}
      className={cx(styles.cardTable, className)}
      extra={cardExtra}
    >
      {loading ? (
        <Skeleton
          active
          title={false}
          paragraph={{ rows: loadingSkeletonRows || 5 }}
        />
      ) : (
        <div className={styles.cardTableContent}>
          <Table pagination={false} size="middle" {...rest} />
        </div>
      )}
    </Card>
  )
}

export default CardTable
