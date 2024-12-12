import {
  SeriesChart,
  SeriesData,
} from "@pingcap-incubator/tidb-dashboard-lib-charts"
import {
  PromResultItem,
  TimeRange,
  TransformNullValue,
  calcPromQueryStep,
  toTimeRangeValue,
  transformPromResultItem,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Box,
  Flex,
  Group,
  Loader,
  Typography,
  useComputedColorScheme,
} from "@tidbcloud/uikit"
import { IconRefreshCw02 } from "@tidbcloud/uikit/icons"
import { useEffect, useMemo, useRef, useState } from "react"

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

// a switch for debug
const enableDebug = localStorage.getItem("metric-chart.debug") === "true"

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
  const isVisible = useRef(false)
  const [isFetched, setIsFetched] = useState(false)

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

  // only fetch data when the chart is visible in the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible.current = entry.isIntersecting
        if (entry.isIntersecting && !isFetched) {
          refetch()
          setIsFetched(true)
        }
      },
      { threshold: 0 },
    )

    if (chartRef.current) {
      observer.observe(chartRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [refetch, isFetched])

  useEffect(() => {
    if (isVisible.current) {
      refetch()
      setIsFetched(true)
    } else {
      setIsFetched(false)
    }
  }, [timeRange])

  const seriesData = useMemo(
    () =>
      (metricData ?? [])
        .map((d, idx) =>
          transformData(d.result, idx, d.legend, config.nullValue),
        )
        .flat(),
    [metricData],
  )

  return (
    <Box>
      <Group mb={16} gap={8}>
        <Typography
          variant="label-lg"
          // add `data-metric` attribute to identify the metric name for easy debugging
          data-metric={config.metricName}
        >
          {config.title}
        </Typography>
        {enableDebug && (
          <IconRefreshCw02
            style={{ cursor: "pointer" }}
            size={12}
            onClick={() => refetch()}
          />
        )}
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
    </Box>
  )
}
