import { useUrlState } from "@baurine/use-url-state"
// import { MantineReactTableProps } from '@pingcap-incubator/tidb-dashboard-lib-biz-ui'
import { useCallback, useMemo } from "react"

import { Pagination, SortRule } from "../utils/type"

type ListUrlState = Partial<
  Record<
    | "status"
    | "search"
    | "orderBy"
    | "desc"
    | "desc"
    | "curPage"
    | "pageSize"
    | "advisorId"
    | "applyId"
    | "closeId"
    | "helper",
    string
  >
>

const DEFAULT_PAGE_SIZE = 10

export function useIndexAdvisorUrlState() {
  const [queryParams, setQueryParams] = useUrlState<ListUrlState>()

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

  //////////////////////////

  const sortRule = useMemo<SortRule>(() => {
    return {
      orderBy: queryParams.orderBy ?? "",
      desc: queryParams.desc === "true",
    }
  }, [queryParams.orderBy, queryParams.desc])
  const setSortRule = useCallback(
    (newSortRule: SortRule) => {
      setQueryParams({
        orderBy: newSortRule.orderBy || undefined,
        desc: newSortRule.desc ? "true" : undefined,
        curPage: undefined,
      })
    },
    [setQueryParams],
  )

  //////////////////////////

  const pagination = useMemo<Pagination>(() => {
    return {
      curPage: Number(queryParams.curPage) || 1,
      pageSize: Number(queryParams.pageSize) || DEFAULT_PAGE_SIZE,
    }
  }, [queryParams.curPage, queryParams.pageSize])

  const setPagination = useCallback(
    (newPagination: Pagination) => {
      setQueryParams({
        curPage:
          newPagination.curPage === 1 ? undefined : newPagination.curPage + "",
        pageSize:
          newPagination.pageSize === DEFAULT_PAGE_SIZE
            ? undefined
            : newPagination.pageSize + "",
      })
    },
    [setQueryParams],
  )

  //////////////////////////

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
