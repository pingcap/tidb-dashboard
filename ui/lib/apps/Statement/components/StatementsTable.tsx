import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import { CardTableV2, ICardTableV2Props } from '@lib/components'
import { StatementTimeRange, StatementModel } from '@lib/client'
import DetailPage from '../pages/Detail'
import * as useStatementColumn from '../utils/useColumn'

const tableColumns = (
  rows: StatementModel[],
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
      ...useStatementColumn.useErrorsWarningsColumn(rows),
      onColumnClick: onColumnClick,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    {
      ...useStatementColumn.useAvgParseLatencyColumn(rows),
      onColumnClick: onColumnClick,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    {
      ...useStatementColumn.useAvgCompileLatencyColumn(rows),
      onColumnClick: onColumnClick,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    {
      ...useStatementColumn.useAvgCoprColumn(rows),
      onColumnClick: onColumnClick,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    useStatementColumn.useRelatedSchemasColumn(rows),
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
  statements: StatementModel[]
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
  const navigate = useNavigate()
  const [items, setItems] = useState(statements)
  const [columns, setColumns] = useState(
    tableColumns(statements, onColumnClick, showFullSQL)
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
