import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Group } from "@tidbcloud/uikit"

import {
  MemoryStateResetButton,
  UrlStateSearchInput,
  UrlStateTimeRangePicker,
} from "../../../_shared/state-filters"

import { AdvancedFiltersModal } from "./advanced-filters-modal"

export function FiltersWithAdvanced() {
  const { tt } = useTn("statement")

  return (
    <Group>
      <UrlStateTimeRangePicker />
      <UrlStateSearchInput placeholder={tt("Find SQL text")} />
      <AdvancedFiltersModal />
      <MemoryStateResetButton text={tt("Clear Filters")} />
    </Group>
  )
}
