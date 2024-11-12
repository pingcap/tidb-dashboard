import {
  MantineReactTableProps,
  ProTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useMemo } from "react"
import { useCallback } from "react"

import { StatementModel } from "../../models"
import { useListUrlState } from "../../url-state/list-url-state"
import { useListData } from "../../utils/use-data"

import { useListTableColumns } from "./list-table-cols"

export function ListTable() {
  const cols = useListTableColumns()
  const { data, isLoading, isFetching } = useListData()
  const { sortRule, setSortRule, pagination, setPagination } = useListUrlState()

  const sortRules = useMemo(() => {
    return [{ id: sortRule.orderBy, desc: sortRule.desc }]
  }, [sortRule.orderBy, sortRule.desc])
  type onSortChangeFn = Required<MantineReactTableProps>["onSortingChange"]
  const setSortRules = useCallback<onSortChangeFn>(
    (updater) => {
      const newSort =
        typeof updater === "function" ? updater(sortRules) : updater
      if (newSort === sortRules) {
        return
      }
      setSortRule({ orderBy: newSort[0].id, desc: newSort[0].desc })
    },
    [setSortRule, sortRules],
  )

  // do sorting in local for statement list
  const sortedData = useMemo(() => {
    if (!data || !sortRules[0]) {
      return []
    }
    const [{ id, desc }] = sortRules
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
  }, [data, sortRules])

  // do pagination in local for statement list
  const finalData = useMemo(() => {
    const { curPage, pageSize } = pagination
    return sortedData.slice((curPage - 1) * pageSize, curPage * pageSize)
  }, [sortedData, pagination?.curPage, pagination?.pageSize])

  return (
    <ProTable
      enableColumnResizing
      enablePinning
      enableSorting
      manualSorting
      sortDescFirst
      onSortingChange={setSortRules}
      state={{ isLoading: isLoading || isFetching, sorting: sortRules }}
      initialState={{ columnPinning: { left: ["digest_text"] } }}
      pagination={{
        page: pagination.curPage,
        total: Math.ceil((data?.length ?? 0) / pagination.pageSize),
        onChange: (v) => setPagination({ ...pagination, curPage: v }),
        position: "center",
      }}
      columns={cols}
      data={finalData}
    />
  )
}
