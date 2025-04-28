import { useCallback, useMemo } from "react"

import { PaginationUrlState } from "./pagination-url-state"
import { useUrlState } from "./use-url-state"

export type AdvancedFilterItem = {
  name: string
  operator: string // =, !=, >, >=, <, <=, in, not in
  values: string[]
}

export type AdvancedFiltersUrlState = Partial<Record<"af", string>>

export function useAdvancedFiltersUrlState() {
  const [queryParams, setQueryParams] = useUrlState<
    AdvancedFiltersUrlState & PaginationUrlState
  >()

  const advancedFilters = useMemo<AdvancedFilterItem[]>(() => {
    const filtersObjArr: AdvancedFilterItem[] = []
    if (queryParams.af) {
      const filtersArr = queryParams.af.split(";")
      filtersArr.forEach((filter) => {
        const [filterName, filterOperator, ...filterValues] = filter.split(",")
        if (filterName && filterOperator) {
          filtersObjArr.push({
            name: decodeURIComponent(filterName),
            operator: decodeURIComponent(filterOperator),
            values: filterValues.map((v) => decodeURIComponent(v)),
          })
        }
      })
    }
    return filtersObjArr
  }, [queryParams.af])

  const setAdvancedFilters = useCallback(
    (newAdvancedFilters: AdvancedFilterItem[]) => {
      const afStr = newAdvancedFilters
        .map(
          (f) =>
            `${encodeURIComponent(f.name)},${encodeURIComponent(
              f.operator,
            )},${f.values.map((v) => encodeURIComponent(v)).join(",")}`,
        )
        .join(";")
      setQueryParams({
        af: afStr,
        pageIndex: undefined,
      })
    },
    [setQueryParams],
  )

  return {
    advancedFilters,
    setAdvancedFilters,
  }
}
