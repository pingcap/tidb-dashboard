import {
  RelativeTimeRange,
  toTimeRangeValue,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
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
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import {
  PromResultItem,
  TransformNullValue,
  calcPromQueryStep,
  resolvePromQLTemplate,
  transformPromResultItem,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useAppContext } from "../../ctx"
import { SingleChartConfig, SingleQueryConfig } from "../../utils/type"

export function transformData(
  items: PromResultItem[],
  qIdx: number,
  query: SingleQueryConfig,
  nullValue?: TransformNullValue,
): SeriesData[] {
  return items.map((d, dIdx) => ({
    ...transformPromResultItem(d, query.name, nullValue),
    id: `${qIdx}-${dIdx}`,
    type: query.type,
    color: query.color,
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
  const ctx = useAppContext()
  const tr = useMemo(() => toTimeRangeValue(timeRange), [timeRange])
  const [step, setStep] = useState(0)
  const chartRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        // 140 is the width of the chart legend, will make it configurable in the future
        setStep(
          calcPromQueryStep(tr, node.offsetWidth - 140, ctx.cfg.scrapeInterval),
        )
      }
    },
    [tr],
  )

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SeriesData[]>([])
  useEffect(() => {
    async function fetchData() {
      if (step === 0) {
        return
      }

      setLoading(true)
      try {
        const ret = await Promise.all(
          config.queries.map((q, idx) =>
            ctx.api
              .getMetric({
                name: q.name,
                promql: resolvePromQLTemplate(
                  q.promql,
                  step,
                  ctx.cfg.scrapeInterval,
                ),
                beginTime: tr[0],
                endTime: tr[1],
                step,
              })
              .then((data) => transformData(data, idx, q, config.nullValue)),
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
  }, [tr, step])

  return (
    <Box>
      <Typography variant="label-lg" mb={16}>
        {config.title}
      </Typography>

      <Box h={200} ref={chartRef}>
        {data.length > 0 || !loading ? (
          <SeriesChart unit={config.unit} data={data} timeRange={tr} />
        ) : (
          <Flex h={200} align="center" justify="center">
            <Loader size="xs" />
          </Flex>
        )}
      </Box>
    </Box>
  )
}
