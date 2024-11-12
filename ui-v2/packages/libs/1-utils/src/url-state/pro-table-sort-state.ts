import { MRT_SortingState, MantineReactTableProps } from "@tidbcloud/uikit/biz"
import { useCallback, useMemo } from "react"

import { SortRule } from "./sort-url-state"

type onSortChangeFn = Required<MantineReactTableProps>["onSortingChange"]

export function useProTableSortState(
  sortRule: SortRule,
  setSortRule: (v: SortRule) => void,
): {
  sorting: MRT_SortingState
  setSorting: onSortChangeFn
} {
  const sorting = useMemo(() => {
    if (sortRule.orderBy) {
      return [{ id: sortRule.orderBy, desc: sortRule.desc }]
    }
    return []
  }, [sortRule.orderBy, sortRule.desc])

  const setSorting = useCallback<onSortChangeFn>(
    (updater) => {
      const newSort = typeof updater === "function" ? updater(sorting) : updater
      if (newSort === sorting) {
        return
      }
      if (newSort.length > 0) {
        setSortRule({ orderBy: newSort[0].id, desc: newSort[0].desc })
      } else {
        setSortRule({ orderBy: "", desc: true })
      }
    },
    [setSortRule, sorting],
  )

  return { sorting, setSorting }
}
