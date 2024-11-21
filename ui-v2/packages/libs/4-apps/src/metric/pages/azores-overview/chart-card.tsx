import {
  // KIBANA_METRICS,
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
  RelativeTimeRange,
  toTimeRangeValue,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  PromResultItem,
  TransformNullValue,
  calcPromQueryStep,
  transformPromResultItem,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useAppContext } from "../../ctx"
import { SingleChartConfig } from "../../utils/type"

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
  timeRange: RelativeTimeRange
}) {
  const colorScheme = useComputedColorScheme()
  const ctx = useAppContext()
  const tr = useMemo(() => toTimeRangeValue(timeRange), [timeRange])

  const step = useRef(0)
  const chartRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        // 140 is the width of the chart legend, will make it configurable in the future
        step.current = calcPromQueryStep(
          tr,
          node.offsetWidth - 140,
          ctx.cfg.scrapeInterval,
        )
      }
    },
    [tr],
  )

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SeriesData[]>([])
  useEffect(() => {
    async function fetchData() {
      if (step.current === 0 || loading) {
        return
      }

      setLoading(true)
      try {
        const ret = await ctx.api
          .getMetricDataByMetricName({
            metricName: config.metricName,
            beginTime: tr[0],
            endTime: tr[1],
            step: step.current,
          })
          .then((data) =>
            data.map((d, idx) =>
              transformData(d.result, idx, d.legend, config.nullValue),
            ),
          )
        setData(ret.flat())
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [tr])

  return (
    <Box>
      <Typography variant="label-lg" mb={16}>
        {config.title}
      </Typography>

      <Box h={200} ref={chartRef}>
        {data.length > 0 || !loading ? (
          <SeriesChart
            unit={config.unit}
            data={data}
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
