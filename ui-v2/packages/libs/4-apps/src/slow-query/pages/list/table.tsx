import {
  useProTablePaginationState,
  useProTableSortState,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ProTable } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { useListUrlState } from "../../shared-state/list-url-state"
import { useSelectedSlowQueryState } from "../../shared-state/memory-state"
import { useListData } from "../../utils/use-data"

import { useListTableColumns } from "./cols"

export function ListTable() {
  const tableColumns = useListTableColumns()
  const { data, isLoading } = useListData()
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
  const selectedSlowQueryId = useSelectedSlowQueryState((s) => s.slowQueryId)

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

  // do sorting in server for slow query list
  // do pagination in local for slow query list
  const pagedData = useMemo(() => {
    const { pageIndex, pageSize } = pagination
    return data?.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  }, [data, pagination?.pageIndex, pagination?.pageSize])

  const { tt } = useTn("slow-query")

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
      rowCount={data?.length ?? 0}
      state={{
        isLoading,
        sorting: sortingState,
        pagination: paginationState,
        columnVisibility,
      }}
      initialState={{ columnPinning: { left: ["query"] } }}
      mantineTableBodyRowProps={({ row }) => {
        const { digest, connection_id, timestamp } = row.original
        const id = `${digest},${connection_id},${timestamp}`
        return selectedSlowQueryId === id
          ? {
              style(theme) {
                return {
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: theme.colors.carbon[7],
                }
              },
            }
          : {}
      }}
      columns={tableColumns}
      data={pagedData ?? []}
      emptyMessage={tt("No Data")}
    />
  )
}
