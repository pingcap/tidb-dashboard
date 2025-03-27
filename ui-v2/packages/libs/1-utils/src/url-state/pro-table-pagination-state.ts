import { MRT_PaginationState, ProTableOptions } from "@tidbcloud/uikit/biz"
import { useCallback } from "react"

import { Pagination } from "./pagination-url-state"

type onPaginationChangeFn = Required<ProTableOptions>["onPaginationChange"]

export function useProTablePaginationState(
  pagination: Pagination,
  setPagination: (v: Pagination) => void,
): {
  paginationState: MRT_PaginationState
  setPaginationState: onPaginationChangeFn
} {
  const paginationState = pagination

  const setPaginationState = useCallback<onPaginationChangeFn>(
    (updater) => {
      const newPagination =
        typeof updater === "function" ? updater(paginationState) : updater
      setPagination(newPagination)
    },
    [setPagination, paginationState.pageIndex, paginationState.pageSize],
  )

  return { paginationState, setPaginationState }
}
