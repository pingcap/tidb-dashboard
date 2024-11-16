import {
  TimeRange,
  toTimeRangeValue,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { SeriesData } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import { useQueries } from "@tanstack/react-query"
import interpolate from "string-template"

import { useAppContext } from "../ctx"

import {
  PromResultItem,
  SingleChartConfig,
  SingleQueryConfig,
  TransformNullValue,
} from "./type"

const POSITIVE_INFINITY_SAMPLE_VALUE = "+Inf"
const NEGATIVE_INFINITY_SAMPLE_VALUE = "-Inf"

function parseStrVal(value: string): number {
  switch (value) {
    case POSITIVE_INFINITY_SAMPLE_VALUE:
      return Number.POSITIVE_INFINITY
    case NEGATIVE_INFINITY_SAMPLE_VALUE:
      return Number.NEGATIVE_INFINITY
    default:
      return parseFloat(value)
  }
}

function transformStrVal(value: string, nullValue?: TransformNullValue) {
  let v: number | null = parseStrVal(value)
  if (isNaN(v)) {
    if (nullValue === TransformNullValue.AS_ZERO) {
      v = 0
    } else {
      v = null
    }
  }
  return v
}

function transformData(
  data: PromResultItem[],
  qIdx: number,
  query: SingleQueryConfig,
  nullValue?: TransformNullValue,
): SeriesData[] {
  return data.map((d, dIdx) => {
    const name = interpolate(query.name, d.metric)
    return {
      id: `${qIdx}-${dIdx}-${name}`,
      name,
      data: d.values.map(([ts, v]) => [
        ts * 1000,
        transformStrVal(v, nullValue),
      ]),
      type: query.type,
      color: query.color,
      // lineSeriesStyle: query.lineSeriesStyle,
    }
  })
}

export const DEF_SCRAPE_INTERVAL = 30

export function resolvePromQLTemplate(promql: string, step: number): string {
  return promql.replace(
    /\$__rate_interval/g,
    `${Math.max(step + DEF_SCRAPE_INTERVAL, 4 * DEF_SCRAPE_INTERVAL)}s`,
  )
}

export function calcStep(
  tr: [number, number],
  width: number,
  minBinWidth: number = 5,
  scrapeInteravl: number = DEF_SCRAPE_INTERVAL,
) {
  if (width <= 0) {
    return scrapeInteravl
  }
  const points = width / minBinWidth
  const step = (tr[1] - tr[0]) / points
  const fixedStep = Math.ceil(step / scrapeInteravl) * scrapeInteravl
  return fixedStep
}

export function useMetricData(
  chartConfig: SingleChartConfig,
  timeRange: TimeRange,
  step: number,
) {
  const ctx = useAppContext()

  const query = useQueries({
    queries: chartConfig.queries.map((q, qIdx) => {
      return {
        enabled: step > 0,
        queryKey: [ctx.ctxId, "metric", q.promql, timeRange, step],
        queryFn: () => {
          const promql = resolvePromQLTemplate(q.promql, step)
          const [beginTime, endTime] = toTimeRangeValue(timeRange)
          return ctx.api
            .getMetric({
              promql,
              beginTime,
              endTime,
              step,
            })
            .then((data) => transformData(data, qIdx, q, chartConfig.nullValue))
        },
        // placeholderData: (previousData: SeriesData[]) => previousData
      }
    }),
    combine: (results) => {
      return {
        refetchAll: () => results.forEach((result) => result.refetch()),
        data: results.map((result) => result.data ?? []).flat(),
        loading: results.some((result) => result.isLoading),
        error: results.find((result) => result.isError)?.error,
      }
    },
  })

  return query
}
