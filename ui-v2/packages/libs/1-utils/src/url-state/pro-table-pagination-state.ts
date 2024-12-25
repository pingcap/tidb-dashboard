import { MRT_PaginationState, ProTableOptions } from "@tidbcloud/uikit/biz"
import { useCallback, useMemo } from "react"

import { Pagination } from "./pagination-url-state"

type onPaginationChangeFn = Required<ProTableOptions>["onPaginationChange"]

export function useProTablePaginationState(
  pagination: Pagination,
  setPagination: (v: Pagination) => void,
): {
  paginationState: MRT_PaginationState
  setPaginationState: onPaginationChangeFn
} {
  const paginationState = useMemo(() => {
    return {
      pageIndex: pagination.curPage - 1,
      pageSize: pagination.pageSize,
    }
  }, [pagination.curPage, pagination.pageSize])

  const setPaginationState = useCallback<onPaginationChangeFn>(
    (updater) => {
      const newPagination =
        typeof updater === "function" ? updater(paginationState) : updater
      setPagination({
        curPage: newPagination.pageIndex + 1,
        pageSize: newPagination.pageSize,
      })
    },
    [setPagination, paginationState.pageIndex, paginationState.pageSize],
  )

  return { paginationState, setPaginationState }
}
