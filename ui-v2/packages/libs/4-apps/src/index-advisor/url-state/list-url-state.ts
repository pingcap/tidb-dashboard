import {
  PaginationUrlState,
  SortUrlState,
  usePaginationUrlState,
  useSortUrlState,
  useUrlState,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback } from "react"

type ListUrlState = Partial<
  Record<
    "status" | "search" | "advisorId" | "applyId" | "closeId" | "helper",
    string
  >
> &
  SortUrlState &
  PaginationUrlState

export function useIndexAdvisorUrlState() {
  const [queryParams, setQueryParams] = useUrlState<ListUrlState>()
  const { sortRule, setSortRule } = useSortUrlState()
  const { pagination, setPagination } = usePaginationUrlState()

  const status = queryParams.status ?? ""
  const setStatus = useCallback(
    (v?: string) => setQueryParams({ status: v, curPage: undefined }),
    [setQueryParams],
  )

  const search = queryParams.search ?? ""
  const setSearch = useCallback(
    (v?: string) => setQueryParams({ search: v, curPage: undefined }),
    [setQueryParams],
  )

  const reset = useCallback(
    () =>
      setQueryParams({
        status: undefined,
        search: undefined,
        curPage: undefined,
      }),
    [setQueryParams],
  )

  //////////////////////////

  const advisorId = queryParams.advisorId ?? ""
  const setAdvisorId = useCallback(
    (v?: string) => setQueryParams({ advisorId: v }),
    [setQueryParams],
  )

  const applyId = queryParams.applyId ?? ""
  const setApplyId = useCallback(
    (v?: string) => setQueryParams({ applyId: v }),
    [setQueryParams],
  )

  const closeId = queryParams.closeId ?? ""
  const setCloseId = useCallback(
    (v?: string) => setQueryParams({ closeId: v }),
    [setQueryParams],
  )

  const helperVisible = !!queryParams.helper
  const showHelper = useCallback(
    () => setQueryParams({ helper: "true" }),
    [setQueryParams],
  )
  const hideHelper = useCallback(
    () => setQueryParams({ helper: undefined }),
    [setQueryParams],
  )

  return {
    queryParams,
    setQueryParams,

    status,
    setStatus,
    search,
    setSearch,

    advisorId,
    setAdvisorId,
    applyId,
    setApplyId,
    closeId,
    setCloseId,

    helperVisible,
    showHelper,
    hideHelper,

    sortRule,
    setSortRule,
    pagination,
    setPagination,

    reset,
  }
}
