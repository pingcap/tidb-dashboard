import {
  SeriesChart,
  SeriesData,
} from "@pingcap-incubator/tidb-dashboard-lib-charts"
import {
  PromResultItem,
  TransformNullValue,
  calcPromQueryStep,
  toTimeRangeValue,
  transformPromResultItem,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Box,
  Card,
  Flex,
  Group,
  Loader,
  Typography,
  useComputedColorScheme,
} from "@tidbcloud/uikit"
import { useEffect, useMemo, useRef } from "react"

import { useAppContext } from "../../ctx"
import { useMetricsUrlState } from "../../url-state"
import { SingleChartConfig, SingleQueryConfig } from "../../utils/type"
import { useMetricDataByPromQLs } from "../../utils/use-data"

export function transformData(
  items: PromResultItem[],
  qIdx: number,
  query: SingleQueryConfig,
  nullValue?: TransformNullValue,
): SeriesData[] {
  return items.map((d, dIdx) => ({
    ...transformPromResultItem(d, query.legendName, nullValue),
    id: `${qIdx}-${dIdx}`,
    type: query.type,
    color: query.color,
    // lineSeriesStyle: query.lineSeriesStyle,
  }))
}

export function ChartCard({ config }: { config: SingleChartConfig }) {
  const colorScheme = useComputedColorScheme()
  const ctx = useAppContext()
  const { timeRange, refresh } = useMetricsUrlState()
  const tr = useMemo(() => toTimeRangeValue(timeRange), [timeRange, refresh])
  const chartRef = useRef<HTMLDivElement | null>(null)

  // a function can always get the latest value
  function getStep() {
    if (!chartRef.current) return 0
    return calcPromQueryStep(
      tr,
      chartRef.current.offsetWidth - 140,
      ctx.cfg.scrapeInterval,
    )
  }

  const {
    data: metricData,
    isLoading,
    refetch,
  } = useMetricDataByPromQLs(
    config.queries.map((q) => q.promql),
    timeRange,
    getStep,
  )
  const seriesData = useMemo(
    () =>
      (metricData ?? [])
        .map((d, idx) =>
          transformData(d, idx, config.queries[idx], config.nullValue),
        )
        .flat(),
    [metricData],
  )

  useEffect(() => {
    refetch()
  }, [timeRange, refresh])

  return (
    <Card p={16} bg="carbon.0" shadow="none">
      <Group mb="xs" gap={0} sx={{ justifyContent: "center" }}>
        <Typography variant="title-md">{config.title}</Typography>
      </Group>

      <Box h={200} ref={chartRef}>
        {seriesData.length > 0 || !isLoading ? (
          <SeriesChart
            unit={config.unit}
            data={seriesData}
            timeRange={tr}
            theme={colorScheme}
          />
        ) : (
          <Flex h={200} align="center" justify="center">
            <Loader size="xs" />
          </Flex>
        )}
      </Box>
    </Card>
  )
}
