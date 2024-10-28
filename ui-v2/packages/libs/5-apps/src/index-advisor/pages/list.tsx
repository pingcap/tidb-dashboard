import {
  Group,
  Stack,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { AdvisorsFilters } from "../components/AdvisorsFilters"
// import { AdvisorsSummary } from './components/AdvisorsSummary'
import { AdvisorsTable } from "../components/AdvisorsTable"
import { RefreshButton } from "../components/RefreshButton"

export function List() {
  return (
    <Stack mx={-24}>
      {/* temporary hide it */}
      {/* <AdvisorsSummary /> */}

      <Group px={24}>
        <AdvisorsFilters />
        <RefreshButton />
      </Group>

      <AdvisorsTable />
      {/* <AdvisorHelperDrawer /> */}
    </Stack>
  )
}
