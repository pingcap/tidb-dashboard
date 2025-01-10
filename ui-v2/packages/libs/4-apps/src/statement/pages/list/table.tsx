import {
  useProTablePaginationState,
  useProTableSortState,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ProTable } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { StatementModel } from "../../models"
import { useListUrlState } from "../../url-state/list-url-state"
import { useSelectedStatementState } from "../../url-state/memory-state"

import { useListTableColumns } from "./cols"

export function ListTable({
  data,
  isLoading,
}: {
  data: StatementModel[]
  isLoading: boolean
}) {
  const tableColumns = useListTableColumns()
  const {
    sortRule,
    setSortRule,
    pagination,
    setPagination,
    cols: visibleCols,
  } = useListUrlState()
  const { sortingState, setSortingState } = useProTableSortState(
    sortRule,
    setSortRule,
  )
  const { paginationState, setPaginationState } = useProTablePaginationState(
    pagination,
    setPagination,
  )
  const columnVisibility = useMemo(() => {
    return tableColumns
      .map((c) => c.id)
      .filter((f) => f !== undefined)
      .reduce(
        (acc, col) => {
          acc[col] = visibleCols.includes(col) || visibleCols.includes("all")
          return acc
        },
        {} as Record<string, boolean>,
      )
  }, [tableColumns, visibleCols])

  const selectedStatementId = useSelectedStatementState((s) => s.statementId)

  // do sorting in local for statement list
  const sortedData = useMemo(() => {
    if (!data) {
      return []
    }
    if (!sortingState[0]) {
      return data
    }
    const [{ id, desc }] = sortingState
    const sorted = [...data]
    sorted.sort((a, b) => {
      const aVal = a[id as keyof StatementModel] ?? 0
      const bVal = b[id as keyof StatementModel] ?? 0
      if (desc) {
        return Number(aVal) > Number(bVal) ? -1 : 1
      } else {
        return Number(aVal) > Number(bVal) ? 1 : -1
      }
    })
    return sorted
  }, [data, sortingState])

  // do pagination in local for statement list
  const pagedData = useMemo(() => {
    const { pageIndex, pageSize } = paginationState
    return sortedData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  }, [sortedData, paginationState.pageIndex, paginationState.pageSize])

  return (
    <ProTable
      layoutMode="grid"
      enableColumnResizing
      enableColumnPinning
      enableSorting
      manualSorting
      sortDescFirst
      onSortingChange={setSortingState}
      manualPagination
      onPaginationChange={setPaginationState}
      pagination={{
        position: "right",
        showTotal: true,
      }}
      rowCount={sortedData?.length ?? 0}
      state={{
        isLoading,
        sorting: sortingState,
        pagination: paginationState,
        columnVisibility,
      }}
      initialState={{ columnPinning: { left: ["digest_text"] } }}
      mantineTableBodyRowProps={({ row }) => {
        const { digest, schema_name } = row.original
        const id = `${digest},${schema_name}`
        return selectedStatementId === id
          ? {
              style(theme) {
                return {
                  backgroundColor: theme.colors.carbon[2],
                }
              },
            }
          : {}
      }}
      columns={tableColumns}
      data={pagedData}
    />
  )
}
