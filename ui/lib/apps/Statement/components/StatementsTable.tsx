import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tooltip } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import { CardTableV2, ICardTableV2Props, EllipsisText } from '@lib/components'
import { StatementOverview, StatementTimeRange } from '@lib/client'
import DetailPage from '../pages/Detail'
import * as useStatementColumn from '../utils/useColumn'

// TODO: Extract to single file when needs to be re-used
const columnHeaderWithTooltip = (key: string, t: (string) => string): any => (
  <>
    {t(key)}
    <Tooltip title={t(key + '_tooltip')}>
      <InfoCircleOutlined style={{ margin: '0 8px' }} />
    </Tooltip>
  </>
)

const tableColumns = (
  t: (string) => string,
  concise: boolean,
  rows: StatementOverview[],
  onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void
): IColumn[] => {
  const columns: IColumn[] = [
    useStatementColumn.useDigestColumn(rows),
    {
      ...useStatementColumn.useSumLatencyColumn(rows),
      isSorted: true,
      isSortedDescending: true,
      onColumnClick: onColumnClick,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    {
      ...useStatementColumn.useAvgMinMaxLatencyColumn(rows),
      onColumnClick: onColumnClick,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    {
      ...useStatementColumn.useExecCountColumn(rows),
      onColumnClick: onColumnClick,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    {
      ...useStatementColumn.useAvgMaxMemColumn(rows),
      onColumnClick: onColumnClick,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    {
      name: columnHeaderWithTooltip('statement.common.schemas', t),
      key: 'schemas',
      minWidth: 160,
      maxWidth: 240,
      isResizable: true,
      columnActionsMode: ColumnActionsMode.disabled,
      onRender: (rec) => (
        <Tooltip title={rec.schemas}>
          <EllipsisText>{rec.schemas}</EllipsisText>
        </Tooltip>
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

interface Props extends Partial<ICardTableV2Props> {
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
  // const maxs = useMax(statements)
  const [columns, setColumns] = useState(
    tableColumns(t, concise || false, statements, onColumnClick)
  )

  function handleRowClick(rec) {
    const qs = DetailPage.buildQuery({
      digest: rec.digest,
      schema: rec.schema_name,
      beginTime: timeRange.begin_time,
      endTime: timeRange.end_time,
    })
    navigate(`/statement/detail?${qs}`)
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
