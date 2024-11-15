import { SeriesData } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import { useQueries } from "@tanstack/react-query"
import interpolate from "string-template"

import { useAppContext } from "../ctx"

import {
  PromResult,
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
  data: PromResult,
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

export const DEFAULT_MIN_INTERVAL_SEC = 15

export function resolvePromQLTemplate(promql: string, step: number): string {
  return promql.replace(
    /\$__rate_interval/g,
    `${Math.max(step, 4 * DEFAULT_MIN_INTERVAL_SEC)}s`,
  )
}

export function useMetricData(
  chartConfig: SingleChartConfig,
  beginTime: number,
  endTime: number,
  step: number,
) {
  const ctx = useAppContext()

  const query = useQueries({
    queries: chartConfig.queries.map((q, qIdx) => {
      const promql = resolvePromQLTemplate(q.promql, step)
      return {
        queryKey: [ctx.ctxId, "metric", promql, beginTime, endTime, step],
        queryFn: () =>
          ctx.api
            .getMetric({
              promql,
              beginTime,
              endTime,
              step,
            })
            .then((data) =>
              transformData(data, qIdx, q, chartConfig.nullValue),
            ),
      }
    }),
    combine: (results) => {
      return {
        data: results.map((result) => result.data ?? []).flat(),
        loading: results.some((result) => result.isLoading),
        error: results.find((result) => result.isError)?.error,
      }
    },
  })

  return query
}
