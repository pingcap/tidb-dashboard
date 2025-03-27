import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Group } from "@tidbcloud/uikit"

import {
  UrlStateResetButton,
  UrlStateTextInput,
  UrlStateTimeRangePicker,
} from "../../../_shared/url-state-filters"

import { AdvancedFiltersModal } from "./advanced-filters-modal"

export function FiltersWithAdvanced() {
  const { tt } = useTn("slow-query")

  return (
    <Group>
      <UrlStateTimeRangePicker />
      <UrlStateTextInput placeholder={tt("Find SQL text")} />
      <AdvancedFiltersModal />
      <UrlStateResetButton text={tt("Clear Filters")} />
    </Group>
  )
}
