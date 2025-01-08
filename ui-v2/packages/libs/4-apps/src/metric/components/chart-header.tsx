import { TimeRange } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ActionIcon, Box, Group, Typography } from "@tidbcloud/uikit"
import { IconChevronDownDouble, IconRefreshCw02 } from "@tidbcloud/uikit/icons"

import { useChartState } from "../shared-state/memory-state"
import { useMetricsUrlState } from "../shared-state/url-state"
import { SingleChartConfig } from "../utils/type"

// a feature flag for debug
const enableDebug = localStorage.getItem("metric-chart.debug") === "true"

export function ChartHeader({
  title,
  enableDrillDown = false,
  config,
  timeRange,
  children,
}: {
  title?: string
  enableDrillDown?: boolean
  config: SingleChartConfig
  timeRange?: TimeRange
  children?: React.ReactNode
}) {
  const { setRefresh } = useMetricsUrlState()
  const setSelectedChart = useChartState((state) => state.setSelectedChart)
  const setTimeRange = useChartState((state) => state.setTimeRange)

  return (
    <>
      <Group gap={4}>
        <Typography variant="label-lg">{title}</Typography>
        {enableDrillDown && (
          <ActionIcon
            variant="transparent"
            onClick={() => {
              setTimeRange(timeRange!)
              setSelectedChart(config)
            }}
          >
            <IconChevronDownDouble size={16} />
          </ActionIcon>
        )}
        {enableDebug && (
          <ActionIcon
            variant="transparent"
            onClick={() => setRefresh("_" + config.metricName)}
          >
            <IconRefreshCw02 size={12} />
          </ActionIcon>
        )}
        {children}
      </Group>
      {(title || enableDrillDown || enableDebug || children) && <Box h={8} />}
    </>
  )
}
