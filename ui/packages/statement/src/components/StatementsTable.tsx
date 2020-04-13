import React, { useState } from 'react'
import _ from 'lodash'
import { useNavigate } from 'react-router-dom'
import { Tooltip } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { CardTableV2 } from '@pingcap-incubator/dashboard_components'
import { ICardTableV2Props } from '@pingcap-incubator/dashboard_components/dist/CardTableV2'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { TextWithHorizontalBar } from './HorizontalBar'
import {
  StatementOverview,
  StatementTimeRange,
  StatementMaxMinVals,
} from './statement-types'
import styles from './styles.module.less'
import { useMaxMin } from './use-max-min'

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
  maxMins: StatementMaxMinVals,
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
      minWidth: 200,
      maxWidth: 250,
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
      minWidth: 170,
      maxWidth: 200,
      isResizable: true,
      isSorted: true,
      isSortedDescending: true,
      onColumnClick: onColumnClick,
      onRender: (rec) => (
        <TextWithHorizontalBar
          text={getValueFormat('ns')(rec.sum_latency, 1, null)}
          normalVal={rec.sum_latency / maxMins.maxSumLatency}
        />
      ),
    },
    {
      name: columnHeaderWithTooltip('statement.common.avg_latency', t),
      key: 'avg_latency',
      fieldName: 'avg_latency',
      minWidth: 170,
      maxWidth: 200,
      isResizable: true,
      onColumnClick: onColumnClick,
      onRender: (rec) => {
        const tooltipContent = `
AVG: ${getValueFormat('ns')(rec.avg_latency, 1, null)}
MIN: ${getValueFormat('ns')(rec.avg_latency * 0.5, 1, null)}
MAX: ${getValueFormat('ns')(rec.avg_latency * 1.2, 1, null)}`
        return (
          <TextWithHorizontalBar
            tooltip={<pre>{tooltipContent.trim()}</pre>}
            text={getValueFormat('ns')(rec.avg_latency, 1, null)}
            normalVal={rec.avg_latency / maxMins.maxAvgLatency}
            maxVal={(rec.avg_latency / maxMins.maxAvgLatency) * 1.2}
            minVal={(rec.avg_latency / maxMins.maxAvgLatency) * 0.5}
          />
        )
      },
    },
    {
      name: columnHeaderWithTooltip('statement.common.exec_count', t),
      key: 'exec_count',
      fieldName: 'exec_count',
      minWidth: 170,
      maxWidth: 200,
      isResizable: true,
      onColumnClick: onColumnClick,
      onRender: (rec) => (
        <TextWithHorizontalBar
          text={getValueFormat('short')(rec.exec_count, 0, 0)}
          normalVal={rec.exec_count / maxMins.maxExecCount}
        />
      ),
    },
    {
      name: columnHeaderWithTooltip('statement.common.avg_mem', t),
      key: 'avg_mem',
      fieldName: 'avg_mem',
      minWidth: 170,
      maxWidth: 200,
      isResizable: true,
      onColumnClick: onColumnClick,
      onRender: (rec) => (
        <TextWithHorizontalBar
          text={getValueFormat('decbytes')(rec.avg_mem, 1, null)}
          normalVal={rec.avg_mem / maxMins.maxAvgMem}
          maxVal={(rec.avg_mem / maxMins.maxAvgMem) * 1.2}
        />
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
  const maxMins = useMaxMin(statements)
  const [columns, setColumns] = useState(() =>
    tableColumns(t, concise || false, maxMins, onColumnClick)
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
