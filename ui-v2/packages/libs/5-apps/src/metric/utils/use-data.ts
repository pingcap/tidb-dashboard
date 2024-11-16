import {
  TimeRange,
  toTimeRangeValue,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { SeriesData } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import {
  PromResultItem,
  TransformNullValue,
  resolvePromQLTemplate,
  transformPromResultItem,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useQueries } from "@tanstack/react-query"

import { useAppContext } from "../ctx"

import { SingleChartConfig, SingleQueryConfig } from "./type"

function transformData(
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
