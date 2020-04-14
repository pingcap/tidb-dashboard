import React, { useState } from 'react'
import _ from 'lodash'
import { useNavigate } from 'react-router-dom'
import { Tooltip } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import {
  Bar,
  CardTableV2,
  ICardTableV2Props,
} from '@pingcap-incubator/dashboard_components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import {
  StatementOverview,
  StatementTimeRange,
  StatementMaxVals,
} from './statement-types'
import styles from './styles.module.less'
import { useMax } from './use-max'

// TODO: Extract to single file when needs to be re-used
const columnHeaderWithTooltip = (key: string, t: (string) => string): any => (
  <div>
    {t(key)}&nbsp;&nbsp;
    <Tooltip title={t(key + '_tooltip')}>
      <InfoCircleOutlined />
    </Tooltip>
  </div>
)

const tableColumns = (
  t: (string) => string,
  concise: boolean,
  maxs: StatementMaxVals,
  onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void
): IColumn[] => {
  const columns: IColumn[] = [
    {
      name: columnHeaderWithTooltip('statement.common.schemas', t),
      key: 'schemas',
      minWidth: 120,
      maxWidth: 140,
      isResizable: true,
      onRender: (rec) => rec.schemas,
    },
    {
      name: columnHeaderWithTooltip('statement.common.digest_text', t),
      key: 'digest_text',
      minWidth: 100,
      maxWidth: 500,
      isResizable: true,
      onRender: (rec: StatementOverview) => (
        <Tooltip title={rec.digest_text} placement="right">
          <div className={styles.digest_column}>{rec.digest_text}</div>
        </Tooltip>
      ),
    },
    {
      name: columnHeaderWithTooltip('statement.common.sum_latency', t),
      key: 'sum_latency',
      fieldName: 'sum_latency',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      isSorted: true,
      isSortedDescending: true,
      onColumnClick: onColumnClick,
      onRender: (rec) => (
        <Bar.WithText value={rec.sum_latency} capacity={maxs.maxSumLatency}>
          {getValueFormat('ns')(rec.sum_latency, 1, null)}
        </Bar.WithText>
      ),
    },
    {
      name: columnHeaderWithTooltip('statement.common.avg_latency', t),
      key: 'avg_latency',
      fieldName: 'avg_latency',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      onColumnClick: onColumnClick,
      onRender: (rec) => {
        const tooltipContent = `
AVG: ${getValueFormat('ns')(rec.avg_latency, 1, null)}
MIN: ${getValueFormat('ns')(rec.avg_latency * 0.5, 1, null)}
MAX: ${getValueFormat('ns')(rec.avg_latency * 1.2, 1, null)}`.trim()
        return (
          <Tooltip title={<pre>{tooltipContent.trim()}</pre>}>
            <Bar.WithText
              // value={rec.avg_latency * 0.9}
              // max={rec.avg_latency}
              // min={rec.avg_latency * 0.8}
              value={rec.avg_latency}
              capacity={maxs.maxAvgLatency}
            >
              {getValueFormat('ns')(rec.avg_latency, 1, null)}
            </Bar.WithText>
          </Tooltip>
        )
      },
    },
    {
      name: columnHeaderWithTooltip('statement.common.exec_count', t),
      key: 'exec_count',
      fieldName: 'exec_count',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      onColumnClick: onColumnClick,
      onRender: (rec) => (
        <Bar.WithText value={rec.exec_count} capacity={maxs.maxExecCount}>
          {getValueFormat('short')(rec.exec_count, 0, 0)}
        </Bar.WithText>
      ),
    },
    {
      name: columnHeaderWithTooltip('statement.common.avg_mem', t),
      key: 'avg_mem',
      fieldName: 'avg_mem',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
      onColumnClick: onColumnClick,
      onRender: (rec) => (
        <Bar.WithText value={rec.avg_mem} capacity={maxs.maxAvgMem}>
          {getValueFormat('decbytes')(rec.avg_mem, 1, null)}
        </Bar.WithText>
      ),
    },
  ]
  if (concise) {
    return columns.filter((col) =>
      ['schemas', 'digest_text', 'sum_latency', 'avg_latency'].includes(col.key)
    )
  }
  return columns
}

function copyAndSort<T>(
  items: T[],
  columnKey: string,
  isSortedDescending?: boolean
): T[] {
  const key = columnKey as keyof T
  return items
    .slice(0)
    .sort((a: T, b: T) =>
      (isSortedDescending ? a[key] < b[key] : a[key] > b[key]) ? 1 : -1
    )
}

interface Props extends ICardTableV2Props {
  statements: StatementOverview[]
  loading: boolean
  timeRange: StatementTimeRange
  detailPagePath?: string
  concise?: boolean
}

export default function StatementsTable({
  statements,
  loading,
  timeRange,
  detailPagePath,
  concise,
  ...restPrpos
}: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState(statements)
  const maxs = useMax(statements)
  const [columns, setColumns] = useState(() =>
    tableColumns(t, concise || false, maxs, onColumnClick)
  )

  function handleRowClick(rec) {
    navigate(
      `${detailPagePath || '/statement/detail'}?digest=${rec.digest}&schema=${
        rec.schema_name
      }&begin_time=${timeRange.begin_time}&end_time=${timeRange.end_time}`
    )
  }

  function onColumnClick(_ev: React.MouseEvent<HTMLElement>, column: IColumn) {
    const newColumns: IColumn[] = columns.slice()
    const currColumn: IColumn = newColumns.filter(
      (currCol) => column.key === currCol.key
    )[0]
    newColumns.forEach((newCol: IColumn) => {
      if (newCol === currColumn) {
        currColumn.isSorted = true
        currColumn.isSortedDescending = !currColumn.isSortedDescending
      } else {
        newCol.isSorted = false
        newCol.isSortedDescending = false
      }
    })
    const newItems = copyAndSort(
      items,
      currColumn.fieldName!,
      currColumn.isSortedDescending
    )
    setColumns(newColumns)
    setItems(newItems)
  }

  return (
    <CardTableV2
      loading={loading}
      columns={columns}
      onRowClicked={handleRowClick}
      {...restPrpos}
      items={items}
    />
  )
}
