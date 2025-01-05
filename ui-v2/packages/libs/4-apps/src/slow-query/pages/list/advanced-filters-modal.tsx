import { AdvancedFiltersModal as AFModal } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { useAppContext } from "../../ctx"
import { useListUrlState } from "../../shared-state/list-url-state"
import { useAdvancedFilterNamesData } from "../../utils/use-data"

export function AdvancedFiltersModal() {
  const ctx = useAppContext()
  const { data: availableFiltersData } = useAdvancedFilterNamesData()
  const { advancedFilters, setAdvancedFilters } = useListUrlState()
  const { tk } = useTn("slow-query")

  const availableFilters = useMemo(
    () =>
      (availableFiltersData || []).map((f) => ({
        label: tk(`fields.${f}`),
        value: f,
      })),
    [availableFiltersData, tk],
  )

  function handleReqFilterInfo(name: string) {
    return ctx.api.getAdvancedFilterInfo({ name })
  }

  return (
    <AFModal
      availableFilters={availableFilters}
      advancedFilters={advancedFilters}
      onUpdateFilters={setAdvancedFilters}
      reqFilterInfo={handleReqFilterInfo}
    />
  )
}
