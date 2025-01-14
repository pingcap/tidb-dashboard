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
import { Box, Flex, Loader, useComputedColorScheme } from "@tidbcloud/uikit"
import { useEffect, useMemo, useRef, useState } from "react"

import { useAppContext } from "../ctx"
import { useMetricsUrlState } from "../shared-state/url-state"
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

export function ChartBody({
  config,
  timeRange,
  labelValue,
}: {
  config: SingleChartConfig
  timeRange: TimeRange
  labelValue?: string
}) {
  const ctx = useAppContext()
  const { refresh } = useMetricsUrlState()
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
  } = useMetricDataByMetricName(
    config.metricName,
    timeRange,
    getStep,
    labelValue,
  )

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
      { threshold: 0.1 },
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
  }, [timeRange, labelValue])

  useEffect(() => {
    // when click refresh button in the chart self, set refresh value to `_${metricName}{Date.now()}`
    if (refresh.startsWith("_")) {
      if (!refresh.startsWith(`_${config.metricName}`)) {
        return
      }
      if (isVisible.current) {
        refetch()
      }
      return
    }

    // when click auto-refresh-button outside the chart, set refresh value to Date.now()
    if (isVisible.current) {
      refetch()
      setIsFetched(true)
    } else {
      setIsFetched(false)
    }
  }, [refresh])

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
    <Box
      h={160}
      ref={chartRef}
      // add `data-metric` attribute to identify the metric name for easy debugging
      data-metric={config.metricName}
    >
      {seriesData.length > 0 || !isLoading ? (
        <SeriesChart
          unit={config.unit}
          data={seriesData}
          timeRange={tr}
          theme={colorScheme}
        />
      ) : (
        <Flex h="100%" align="center" justify="center">
          <Loader size="xs" />
        </Flex>
      )}
    </Box>
  )
}
