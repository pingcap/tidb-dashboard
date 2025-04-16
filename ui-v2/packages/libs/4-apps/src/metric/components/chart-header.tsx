import { TimeRange, useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ActionIcon, Box, Group, Tooltip, Typography } from "@tidbcloud/uikit"
import { IconLayersThree02, IconRefreshCw02 } from "@tidbcloud/uikit/icons"

import {
  useChartState,
  useChartsSelectState,
} from "../shared-state/memory-state"
import { useMetricsUrlState } from "../shared-state/url-state"
import { SingleChartConfig } from "../utils/type"

import { ChartActionsMenu } from "./chart-actions-menu"

export function ChartHeader({
  title,
  enableDrillDown = false,
  showMoreActions = false,
  showHide = false,
  config,
  timeRange,
  children,
}: {
  title?: string
  enableDrillDown?: boolean
  showMoreActions?: boolean
  showHide?: boolean
  config: SingleChartConfig
  timeRange?: TimeRange
  children?: React.ReactNode
}) {
  const { tt } = useTn("metric")
  const { setRefresh } = useMetricsUrlState()
  const setSelectedChart = useChartState((s) => s.setSelectedChart)
  const setTimeRange = useChartState((s) => s.setTimeRange)
  const metricPromAddrs = useChartState((s) => s.metricPromAddrs)
  const curPromAddr = metricPromAddrs[config.metricName]

  const hiddenCharts = useChartsSelectState((s) => s.hiddenCharts)
  const setHiddenCharts = useChartsSelectState((s) => s.setHiddenCharts)

  function handleHide() {
    setHiddenCharts([...hiddenCharts, config.metricName])
  }

  return (
    <Group gap={2} mb={8}>
      <Typography variant="label-lg">{title}</Typography>
      <Box sx={{ flexGrow: 1 }} />
      {!showMoreActions && (
        <ActionIcon
          variant="transparent"
          onClick={() => setRefresh("_" + config.metricName + "_")}
        >
          <IconRefreshCw02 size={14} strokeWidth={2} />
        </ActionIcon>
      )}
      {enableDrillDown && (
        <Tooltip label={tt("Drill down analysis")}>
          <ActionIcon
            mx={-4}
            variant="transparent"
            onClick={() => {
              setTimeRange(timeRange!)
              setSelectedChart(config)
            }}
          >
            <IconLayersThree02 size={16} strokeWidth={2} />
          </ActionIcon>
        </Tooltip>
      )}
      {showMoreActions && (
        <ChartActionsMenu
          onHide={handleHide}
          onRefresh={() => setRefresh("_" + config.metricName + "_")}
          promAddr={curPromAddr}
          showHide={showHide}
        />
      )}
      {children}
    </Group>
  )
}
