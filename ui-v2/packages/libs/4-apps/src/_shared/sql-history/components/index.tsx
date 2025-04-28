import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Card, Group, Stack, Title } from "@tidbcloud/uikit"
import { useEffect } from "react"

import { useSqlHistoryState } from "../shared-state/memory-state"

import { SqlHistoryChart } from "./chart"
import { Filters } from "./filters"
import { TimeRangeClipAlert } from "./time-range-clip-alert"

export function SqlHistoryCard() {
  const { tt } = useTn("sql-history")
  const reset = useSqlHistoryState((s) => s.reset)

  // reset state on unmount
  useEffect(() => {
    return () => {
      reset()
    }
  }, [])

  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Group justify="space-between">
          <Title order={5}>{tt("SQL History")}</Title>
          <Filters />
        </Group>
        <TimeRangeClipAlert />
        <SqlHistoryChart />
      </Stack>
    </Card>
  )
}
