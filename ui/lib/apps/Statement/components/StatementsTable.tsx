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
// import { useMax } from './use-max'
// import { StatementMaxVals } from './statement-types'
import * as commonColumns from '../utils/commonColumns'

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
    commonColumns.useDigestColumn(rows),
    {
      ...commonColumns.useSumLatencyColumn(rows),
      isSorted: true,
      isSortedDescending: true,
      onColumnClick: onColumnClick,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    {
      ...commonColumns.useAvgMinMaxLatencyColumn(rows),
      onColumnClick: onColumnClick,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    {
      ...commonColumns.useExecCountColumn(rows),
      onColumnClick: onColumnClick,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    {
      ...commonColumns.useAvgMaxMemColumn(rows),
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
  // const maxs = useMax(statements)
  const [columns, setColumns] = useState(() =>
    tableColumns(t, statements, onColumnClick, showFullSQL)
  )

  useEffect(() => {
    onGetColumns && onGetColumns(columns)
    // eslint-disable-next-line
  }, [])

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
