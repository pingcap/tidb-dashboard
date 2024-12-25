import { useCallback, useMemo } from "react"

import { useUrlState } from "./use-url-state"

export type Pagination = {
  curPage: number
  pageSize: number
}

export type PaginationUrlState = Partial<Record<"curPage" | "pageSize", string>>

export function usePaginationUrlState(defPageSize: number = 15) {
  const [queryParams, setQueryParams] = useUrlState<PaginationUrlState>()

  const pagination = useMemo<Pagination>(() => {
    return {
      curPage: Number(queryParams.curPage) || 1,
      pageSize: Number(queryParams.pageSize) || defPageSize,
    }
  }, [queryParams.curPage, queryParams.pageSize, defPageSize])

  const setPagination = useCallback(
    (newPagination: Pagination) => {
      setQueryParams({
        curPage:
          newPagination.curPage === 1 ? undefined : newPagination.curPage + "",
        pageSize:
          newPagination.pageSize === defPageSize
            ? undefined
            : newPagination.pageSize + "",
      })
    },
    [setQueryParams],
  )

  return { pagination, setPagination }
}
