import { useCallback, useMemo } from "react"

import { useUrlState } from "./use-url-state"

export type Pagination = {
  pageIndex: number
  pageSize: number
}

export type PaginationUrlState = Partial<
  Record<"pageIndex" | "pageSize", string>
>

export function usePaginationUrlState(defPageSize: number = 15) {
  const [queryParams, setQueryParams] = useUrlState<PaginationUrlState>()

  const pagination = useMemo<Pagination>(() => {
    return {
      pageIndex: Number(queryParams.pageIndex) || 0,
      pageSize: Number(queryParams.pageSize) || defPageSize,
    }
  }, [queryParams.pageIndex, queryParams.pageSize, defPageSize])

  const setPagination = useCallback(
    (newPagination: Pagination) => {
      setQueryParams({
        pageIndex:
          newPagination.pageIndex === 0
            ? undefined
            : newPagination.pageIndex.toString(),
        pageSize:
          newPagination.pageSize === defPageSize
            ? undefined
            : newPagination.pageSize.toString(),
      })
    },
    [setQueryParams],
  )

  return { pagination, setPagination }
}
