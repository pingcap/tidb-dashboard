import { TimeRange } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ActionIcon, Group, Typography } from "@tidbcloud/uikit"
import { IconChevronDownDouble, IconRefreshCw02 } from "@tidbcloud/uikit/icons"

import { useChartState } from "../shared-state/memory-state"
import { useMetricsUrlState } from "../shared-state/url-state"
import { SingleChartConfig } from "../utils/type"

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
    <Group gap={2} mb={8}>
      <Typography variant="label-lg">{title}</Typography>
      {enableDrillDown && (
        <ActionIcon
          mr={-8}
          variant="transparent"
          onClick={() => {
            setTimeRange(timeRange!)
            setSelectedChart(config)
          }}
        >
          <IconChevronDownDouble size={16} />
        </ActionIcon>
      )}
      <ActionIcon
        variant="transparent"
        onClick={() => setRefresh("_" + config.metricName + "_")}
      >
        <IconRefreshCw02 size={12} />
      </ActionIcon>
      {children}
    </Group>
  )
}
