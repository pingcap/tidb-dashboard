import {
  MantineReactTableProps,
  ProTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useMemo } from "react"
import { useCallback } from "react"

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
      onSortingChange={setSortRules}
      state={{ isLoading: isLoading || isFetching, sorting: sortRules }}
      initialState={{ columnPinning: { left: ["query"] } }}
      pagination={{
        page: pagination.curPage,
        total: Math.ceil((data?.length ?? 0) / pagination.pageSize),
        onChange: (v) => setPagination({ ...pagination, curPage: v }),
        position: "center",
      }}
      columns={cols}
      data={finalData ?? []}
    />
  )
}
