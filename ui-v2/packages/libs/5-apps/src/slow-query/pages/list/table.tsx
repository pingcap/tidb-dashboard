import { ProTable } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useProTableSortState } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { useListUrlState } from "../../url-state/list-url-state"
import { useListData } from "../../utils/use-data"

import { useListTableColumns } from "./cols"

export function ListTable() {
  const cols = useListTableColumns()
  const { data, isLoading } = useListData()
  const { sortRule, setSortRule, pagination, setPagination } = useListUrlState()
  const { sorting, setSorting } = useProTableSortState(sortRule, setSortRule)

  // do sorting in server for slow query list
  // do pagination in local for slow query list
  const finalData = useMemo(() => {
    const { curPage, pageSize } = pagination
    return data?.slice((curPage - 1) * pageSize, curPage * pageSize)
  }, [data, pagination?.curPage, pagination?.pageSize])

  return (
    <ProTable
      enableColumnResizing
      enablePinning
      enableSorting
      manualSorting
      sortDescFirst
      onSortingChange={setSorting}
      state={{ isLoading, sorting }}
      initialState={{ columnPinning: { left: ["query"] } }}
      pagination={{
        value: pagination.curPage,
        total: Math.ceil((data?.length ?? 0) / pagination.pageSize),
        onChange: (v) => setPagination({ ...pagination, curPage: v }),
        position: "center",
      }}
      columns={cols}
      data={finalData ?? []}
    />
  )
}
