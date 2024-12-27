import { useCallback, useMemo } from "react"

import { PaginationUrlState } from "./pagination-url-state"
import { useUrlState } from "./use-url-state"

export type AdvancedFilterItem = {
  filterName: string
  filterOperator: string // =, !=, >, >=, <, <=, in, not in
  filterValues: string[]
}

export type AdvancedFilters = AdvancedFilterItem[]

export type AdvancedFiltersUrlState = Partial<Record<"af", string>>

export function useAdvancedFiltersUrlState(affectPagination: boolean = false) {
  const [queryParams, setQueryParams] = useUrlState<
    AdvancedFiltersUrlState & PaginationUrlState
  >()

  const advancedFilters = useMemo<AdvancedFilters>(() => {
    const filtersObjArr: AdvancedFilters = []
    if (queryParams.af) {
      const filtersArr = queryParams.af.split(";")
      filtersArr.forEach((filter) => {
        const [filterName, filterOperator, ...filterValues] = filter.split(",")
        if (filterName && filterOperator) {
          filtersObjArr.push({
            filterName: decodeURIComponent(filterName),
            filterOperator: decodeURIComponent(filterOperator),
            filterValues: filterValues.map((v) => decodeURIComponent(v)),
          })
        }
      })
    }
    return filtersObjArr
  }, [queryParams.af])

  const setAdvancedFilters = useCallback(
    (newAdvancedFilters: AdvancedFilters) => {
      const afStr = newAdvancedFilters
        .map(
          (f) =>
            `${encodeURIComponent(f.filterName)},${encodeURIComponent(
              f.filterOperator,
            )},${f.filterValues.map((v) => encodeURIComponent(v)).join(",")}`,
        )
        .join(";")
      setQueryParams({
        af: afStr,
        ...(affectPagination ? { curPage: undefined } : {}),
      })
    },
    [setQueryParams, affectPagination],
  )

  return {
    advancedFilters,
    setAdvancedFilters,
  }
}
