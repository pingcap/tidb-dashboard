import { useProTableSortState } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ProTable } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { StatementModel } from "../../models"
import { useListUrlState } from "../../url-state/list-url-state"
import { useListData } from "../../utils/use-data"

import { useListTableColumns } from "./cols"

export function ListTable() {
  const cols = useListTableColumns()
  const { data, isLoading } = useListData()
  const { pagination, setPagination, sortRule, setSortRule } = useListUrlState()
  const { sorting, setSorting } = useProTableSortState(sortRule, setSortRule)

  // do sorting in local for statement list
  const sortedData = useMemo(() => {
    if (!data) {
      return []
    }
    if (!sorting[0]) {
      return data
    }
    const [{ id, desc }] = sorting
    const sorted = [...data]
    sorted.sort((a, b) => {
      const aVal = a[id as keyof StatementModel] ?? 0
      const bVal = b[id as keyof StatementModel] ?? 0
      if (desc) {
        return aVal > bVal ? -1 : 1
      } else {
        return aVal > bVal ? 1 : -1
      }
    })
    return sorted
  }, [data, sorting])

  // do pagination in local for statement list
  const finalData = useMemo(() => {
    const { curPage, pageSize } = pagination
    return sortedData.slice((curPage - 1) * pageSize, curPage * pageSize)
  }, [sortedData, pagination])

  return (
    <ProTable
      enableColumnResizing
      enableColumnPinning
      enableSorting
      manualSorting
      sortDescFirst
      onSortingChange={setSorting}
      state={{ isLoading, sorting }}
      initialState={{ columnPinning: { left: ["digest_text"] } }}
      pagination={{
        value: pagination.curPage,
        total: Math.ceil((data?.length ?? 0) / pagination.pageSize),
        onChange: (v) => setPagination({ ...pagination, curPage: v }),
        position: "center",
      }}
      columns={cols}
      data={finalData}
    />
  )
}
