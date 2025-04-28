import { MRT_SortingState, ProTableOptions } from "@tidbcloud/uikit/biz"
import { useCallback, useMemo } from "react"

import { SortRule } from "./sort-url-state"

type onSortChangeFn = Required<ProTableOptions>["onSortingChange"]

export function useProTableSortState(
  sortRule: SortRule,
  setSortRule: (v: SortRule) => void,
): {
  sortingState: MRT_SortingState
  setSortingState: onSortChangeFn
} {
  const sortingState = useMemo(() => {
    if (sortRule.orderBy) {
      return [{ id: sortRule.orderBy, desc: sortRule.desc }]
    }
    return []
  }, [sortRule.orderBy, sortRule.desc])

  const setSortingState = useCallback<onSortChangeFn>(
    (updater) => {
      const newSort =
        typeof updater === "function" ? updater(sortingState) : updater
      if (newSort === sortingState) {
        return
      }
      if (newSort.length > 0) {
        setSortRule({ orderBy: newSort[0].id, desc: newSort[0].desc })
      } else {
        setSortRule({ orderBy: "", desc: true })
      }
    },
    [setSortRule, sortingState],
  )

  return { sortingState, setSortingState }
}
