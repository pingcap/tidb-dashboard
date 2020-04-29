import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { CardTableV2, ICardTableV2Props } from '@lib/components'
import { StatementTimeRange, StatementModel } from '@lib/client'
import DetailPage from '../pages/Detail'
import * as useStatementColumn from '../utils/useColumn'

const tableColumns = (
  rows: StatementModel[],
  onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void,
  orderBy?: string,
  desc?: boolean,
  showFullSQL?: boolean
): IColumn[] => {
  const columns: IColumn[] = [
    useStatementColumn.useDigestColumn(rows, showFullSQL),
    {
      ...useStatementColumn.useSumLatencyColumn(rows, orderBy, desc),
      onColumnClick: onColumnClick,
    },
    {
      ...useStatementColumn.useAvgMinMaxLatencyColumn(rows, orderBy, desc),
      onColumnClick: onColumnClick,
    },
    {
      ...useStatementColumn.useExecCountColumn(rows, orderBy, desc),
      onColumnClick: onColumnClick,
    },
    {
      ...useStatementColumn.useAvgMaxMemColumn(rows, orderBy, desc),
      onColumnClick: onColumnClick,
    },
    {
      ...useStatementColumn.useErrorsWarningsColumn(rows, orderBy, desc),
      onColumnClick: onColumnClick,
    },
    {
      ...useStatementColumn.useAvgParseLatencyColumn(rows, orderBy, desc),
      onColumnClick: onColumnClick,
    },
    {
      ...useStatementColumn.useAvgCompileLatencyColumn(rows, orderBy, desc),
      onColumnClick: onColumnClick,
    },
    {
      ...useStatementColumn.useAvgCoprColumn(rows, orderBy, desc),
      onColumnClick: onColumnClick,
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
  orderBy?: string
  desc?: boolean
  showFullSQL?: boolean

  onChangeSort: (orderBy: string, desc: boolean) => void
  onGetColumns?: (columns: IColumn[]) => void
}

export default function StatementsTable({
  loading,
  statements,
  timeRange,
  orderBy,
  desc,
  showFullSQL,

  onChangeSort,
  onGetColumns,
  ...restPrpos
}: Props) {
  const navigate = useNavigate()

  // const [columns, setColumns] = useState(
  //   tableColumns(statements, onColumnClick, orderBy, desc, showFullSQL)
  // )
  // `useState(() => tableColumns(...))` will cause run-time crash, the message:
  // Warning: Do not call Hooks inside useEffect(...), useMemo(...),
  // or other built-in Hooks. You can only call Hooks at the top level of your React function.
  // I guess because we use the `useTranslation()` inside the `tableColumns()` method
  // TODO: verify

  const columns = tableColumns(
    statements,
    onColumnClick,
    orderBy,
    desc,
    showFullSQL
  )

  const items = useMemo(() => {
    const curColumn = columns.find((col) => col.key === orderBy)
    if (curColumn) {
      return copyAndSort(
        statements,
        curColumn.fieldName!,
        curColumn.isSortedDescending
      )
    }
    return statements
  }, [statements, orderBy, desc])

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
    if (column.key === orderBy) {
      onChangeSort(orderBy, !desc)
    } else {
      onChangeSort(column.key, true)
    }
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
