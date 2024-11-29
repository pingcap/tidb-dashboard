import {
  SeriesChart,
  SeriesData,
} from "@pingcap-incubator/tidb-dashboard-lib-charts"
import {
  Box,
  Flex,
  Loader,
  Typography,
  useComputedColorScheme,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import {
  PromResultItem,
  TimeRange,
  TransformNullValue,
  calcPromQueryStep,
  toTimeRangeValue,
  transformPromResultItem,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useEffect, useMemo, useRef } from "react"

import { useAppContext } from "../ctx"
import { SingleChartConfig } from "../utils/type"
import { useMetricDataByMetricName } from "../utils/use-data"

export function transformData(
  items: PromResultItem[],
  qIdx: number,
  // query: SingleQueryConfig,
  legendName: string,
  nullValue?: TransformNullValue,
): SeriesData[] {
  return items.map((d, dIdx) => ({
    ...transformPromResultItem(d, legendName, nullValue),
    id: `${qIdx}-${dIdx}`,
    // type: query.type,
    // color: query.color,
    // lineSeriesStyle: query.lineSeriesStyle,
  }))
}

export function ChartCard({
  config,
  timeRange,
}: {
  config: SingleChartConfig
  timeRange: TimeRange
}) {
  const ctx = useAppContext()
  const colorScheme = useComputedColorScheme()
  const tr = useMemo(() => toTimeRangeValue(timeRange), [timeRange])
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
  } = useMetricDataByMetricName(config.metricName, timeRange, getStep)
  const seriesData = useMemo(
    () =>
      (metricData ?? [])
        .map((d, idx) =>
          transformData(d.result, idx, d.legend, config.nullValue),
        )
        .flat(),
    [metricData],
  )

  useEffect(() => {
    refetch()
  }, [timeRange])

  return (
    <Box>
      <Typography variant="label-lg" mb={16}>
        {config.title}
      </Typography>

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
    </Box>
  )
}
