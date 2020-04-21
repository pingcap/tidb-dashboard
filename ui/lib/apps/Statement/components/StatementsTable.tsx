import React, { useState, useEffect } from 'react'
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
  <Tooltip title={t(key + '_tooltip')}>
    <span>
      {t(key)}
      <InfoCircleOutlined style={{ margin: '0 8px' }} />
    </span>
  </Tooltip>
)

const tableColumns = (
  t: (string) => string,
  rows: StatementOverview[],
  onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void,
  showFullSQL?: boolean
): IColumn[] => {
  const columns: IColumn[] = [
    useStatementColumn.useDigestColumn(rows, showFullSQL),
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
  loading: boolean
  statements: StatementOverview[]
  timeRange: StatementTimeRange
  detailPagePath?: string
  showFullSQL?: boolean

  onGetColumns?: (columns: IColumn[]) => void
}

export default function StatementsTable({
  loading,
  statements,
  timeRange,
  detailPagePath,
  showFullSQL,
  onGetColumns,
  ...restPrpos
}: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState(statements)
  const [columns, setColumns] = useState(
    tableColumns(t, statements, onColumnClick, showFullSQL)
  )
  // `useState(() => tableColumns(...))` will cause run-time crash, the message:
  // Warning: Do not call Hooks inside useEffect(...), useMemo(...),
  // or other built-in Hooks. You can only call Hooks at the top level of your React function.
  // I guess because we use the `useTranslation()` inside the `tableColumns()` method
  // TODO: verify

  useEffect(() => {
    onGetColumns && onGetColumns(columns)
    // eslint-disable-next-line
  }, [])

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
