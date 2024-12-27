import { AdvancedFiltersModal as AFModal } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"

import { useAppContext } from "../../ctx"
import { useListUrlState } from "../../url-state/list-url-state"
import { useAdvancedFilterNamesData } from "../../utils/use-data"

export function AdvancedFiltersModal() {
  const ctx = useAppContext()
  const { data: availableFilters } = useAdvancedFilterNamesData()
  const { advancedFilters, setAdvancedFilters } = useListUrlState()

  function handleReqFilterInfo(name: string) {
    return ctx.api.getAdvancedFilterInfo({ name })
  }

  return (
    <AFModal
      availableFilters={availableFilters || []}
      advancedFilters={advancedFilters}
      onUpdateFilters={setAdvancedFilters}
      reqFilterInfo={handleReqFilterInfo}
    />
  )
}
