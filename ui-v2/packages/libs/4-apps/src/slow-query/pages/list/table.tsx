import {
  useProTablePaginationState,
  useProTableSortState,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ProTable } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { useListUrlState } from "../../url-state/list-url-state"
import { useAvailableFieldsData, useListData } from "../../utils/use-data"

import { useListTableColumns } from "./cols"

export function ListTable() {
  const cols = useListTableColumns()
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

  const { data: availableFields } = useAvailableFieldsData()
  const columnVisibility = useMemo(() => {
    return (availableFields || []).reduce(
      (acc, col) => {
        acc[col] = visibleCols.includes(col)
        return acc
      },
      {} as Record<string, boolean>,
    )
  }, [availableFields, visibleCols])

  // do sorting in server for slow query list
  // do pagination in local for slow query list
  const pagedData = useMemo(() => {
    const { curPage, pageSize } = pagination
    return data?.slice((curPage - 1) * pageSize, curPage * pageSize)
  }, [data, pagination?.curPage, pagination?.pageSize])

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
      rowCount={data?.length ?? 0}
      state={{
        isLoading,
        sorting: sortingState,
        pagination: paginationState,
        columnVisibility,
      }}
      initialState={{ columnPinning: { left: ["query"] } }}
      pagination={{
        position: "right",
        showTotal: true,
      }}
      columns={cols}
      data={pagedData ?? []}
    />
  )
}
