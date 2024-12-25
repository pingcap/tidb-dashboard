import {
  useProTablePaginationState,
  useProTableSortState,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ProTable } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { useListUrlState } from "../../url-state/list-url-state"
import { useListData } from "../../utils/use-data"

import { useListTableColumns } from "./cols"

export function ListTable() {
  const cols = useListTableColumns()
  const { data, isLoading } = useListData()
  const { sortRule, setSortRule, pagination, setPagination } = useListUrlState()
  const { sorting, setSorting } = useProTableSortState(sortRule, setSortRule)
  const { paginationState, setPaginationState } = useProTablePaginationState(
    pagination,
    setPagination,
  )

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
      onSortingChange={setSorting}
      manualPagination
      onPaginationChange={setPaginationState}
      rowCount={data?.length ?? 0}
      state={{ isLoading, sorting, pagination: paginationState }}
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
