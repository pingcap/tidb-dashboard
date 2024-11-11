import {
  MantineReactTableProps,
  ProTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useMemo } from "react"
import { useCallback } from "react"

import { useListUrlState } from "../../url-state/list-url-state"
import { useListData } from "../../utils/use-data"

import { useSlowQueryColumns } from "./use-list-table-cols"

export function ListTable() {
  const cols = useSlowQueryColumns()
  const { data, isLoading, isFetching } = useListData()
  const { sortRule, setSortRule } = useListUrlState()

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

  return (
    <ProTable
      enableSorting
      manualSorting
      sortDescFirst
      enableColumnResizing
      enablePinning
      onSortingChange={setSortRules}
      state={{ isLoading: isLoading || isFetching, sorting: sortRules }}
      initialState={{ columnPinning: { left: ["query"] } }}
      columns={cols}
      data={data ?? []}
    />
  )
}
