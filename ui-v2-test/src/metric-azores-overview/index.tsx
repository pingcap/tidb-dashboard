import {
  AppProvider,
  AzoresOverviewPage,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { Stack } from "@tidbcloud/uikit"

import { useCtxValue } from "./mock-api-app-provider"

export function MetricsAzoresOverviewApp() {
  const ctxValue = useCtxValue()
  return (
    <Stack p={16}>
      <AppProvider ctxValue={ctxValue}>
        <AzoresOverviewPage />
      </AppProvider>
    </Stack>
  )
}
