import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  BrushEndListener
} from '@elastic/charts'
import { orderBy, toPairs } from 'lodash'
import React, { useMemo, useState, forwardRef } from 'react'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { TopsqlSummaryItem, TopsqlSummaryByItem } from '@lib/client'
import { useTranslation } from 'react-i18next'
import { useChange } from '@lib/utils/useChange'
import { DEFAULT_CHART_SETTINGS, timeTickFormatter } from '@lib/utils/charts'
import { AggLevel } from './List'

export interface ListChartProps {
  data: any[]
  timeWindowSize: number
  groupBy: string
  timeRangeTimestamp: [number, number]
  onBrushEnd: BrushEndListener
}

const isQueryAggLevel = (groupBy: string) => {
  // default is query
  return !(groupBy === AggLevel.Table || groupBy === AggLevel.Schema)
}

export const ListChart = forwardRef<Chart, ListChartProps>(
  ({ onBrushEnd, data, groupBy, timeWindowSize, timeRangeTimestamp }, ref) => {
    const { t } = useTranslation()
    // And we need update all the data at the same time and let the chart refresh only once for a better experience.
    const [bundle, setBundle] = useState({
      data,
      groupBy,
      timeWindowSize,
      timeRangeTimestamp
    })
    const { chartData } = useChartData(bundle.data, bundle.groupBy)
    const { digestMap } = useDigestMap(bundle.data, bundle.groupBy)

    useChange(() => {
      setBundle({ data, groupBy, timeWindowSize, timeRangeTimestamp })
    }, [data])

    return (
      <Chart ref={ref}>
        <Settings
          {...DEFAULT_CHART_SETTINGS}
          showLegend={false}
          onBrushEnd={onBrushEnd}
          xDomain={{
            // Why do we want this? Because some data point may be missing. ech cannot know an
            // accurate interval.
            minInterval: bundle.timeWindowSize * 1000,
            min: bundle.timeRangeTimestamp[0] * 1000,
            max: bundle.timeRangeTimestamp[1] * 1000
          }}
        />
        <Axis
          id="bottom"
          position={Position.Bottom}
          showOverlappingTicks
          tickFormat={timeTickFormatter(bundle.timeRangeTimestamp)}
        />
        <Axis
          id="left"
          title={t('topsql.chart.cpu_time')}
          position={Position.Left}
          showOverlappingTicks
          tickFormat={(v) => getValueFormat('ms')(v, 1)}
          ticks={5}
        />
        {Object.keys(chartData).map((originText) => {
          const sql = digestMap?.[originText] || ''
          let text = sql
          if (!originText) {
            text = t('topsql.table.others')
            // is unknown text
          } else if (!sql) {
            if (isQueryAggLevel(bundle.groupBy)) {
              // cannot find the sql text, but we agg by sql
              text = `(SQL ${originText.slice(0, 8)})`
            } else {
              text = originText
            }
          } else {
            // text too long, show a part of it
            text = sql.length > 50 ? `${sql.slice(0, 50)}...` : sql
          }

          return (
            <BarSeries
              key={originText}
              id={originText}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={0}
              yAccessors={[1]}
              stackAccessors={[0]}
              data={chartData[originText]}
              name={text}
            />
          )
        })}
        {Object.keys(chartData).length === 0 && (
          // When there is no data, supply an empty one to preserve the axis.
          <BarSeries
            id="_placeholder"
            hideInLegend
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor={0}
            yAccessors={[1]}
            data={[
              [bundle.timeRangeTimestamp[0] * 1000, null],
              [bundle.timeRangeTimestamp[1] * 1000, null]
            ]}
          />
        )}
      </Chart>
    )
  }
)

function useDigestMap(seriesDataO: any[] = [], groupBy: string) {
  const digestMap = useMemo(() => {
    if (!seriesDataO) {
      return {}
    }
    if (!isQueryAggLevel(groupBy)) {
      return {}
    }
    let seriesData = seriesDataO as TopsqlSummaryItem[]
    if (!seriesData) {
      return {}
    }
    return seriesData.reduce((prev, { sql_digest, sql_text }) => {
      prev[sql_digest!] = sql_text
      return prev
    }, {} as { [digest: string]: string | undefined })
  }, [seriesDataO, groupBy])
  return { digestMap }
}

function useChartData(seriesDataO: any[], groupBy: string) {
  let chartData: Record<string, Array<[number, number]>> = {}
  chartData = useMemo(() => {
    if (isQueryAggLevel(groupBy)) {
      if (!seriesDataO) {
        return {}
      }
      let seriesData = seriesDataO as TopsqlSummaryItem[]
      // Group by SQL digest + timestamp and sum their values
      const valuesByDigestAndTs: Record<string, Record<number, number>> = {}
      const sumValueByDigest: Record<string, number> = {}
      seriesData.forEach((series) => {
        const seriesDigest = series.sql_digest!

        if (!valuesByDigestAndTs[seriesDigest]) {
          valuesByDigestAndTs[seriesDigest] = {}
        }
        const map = valuesByDigestAndTs[seriesDigest]
        let sum = 0
        series.plans?.forEach((values) => {
          values.timestamp_sec?.forEach((t, i) => {
            if (!map[t]) {
              map[t] = values.cpu_time_ms![i]
            } else {
              map[t] += values.cpu_time_ms![i]
            }
            sum += values.cpu_time_ms![i]
          })
        })

        if (!sumValueByDigest[seriesDigest]) {
          sumValueByDigest[seriesDigest] = 0
        }
        sumValueByDigest[seriesDigest] += sum
      })

      // Order by digest
      const orderedDigests = orderBy(toPairs(sumValueByDigest), ['1'], ['desc'])
        .filter((v) => v[1] > 0)
        .map((v) => v[0])

      const datumByDigest: Record<string, Array<[number, number]>> = {}
      for (const digest of orderedDigests) {
        const datum: Array<[number, number]> = []

        const valuesByTs = valuesByDigestAndTs[digest]
        for (const ts in valuesByTs) {
          const value = valuesByTs[ts]
          datum.push([Number(ts), value])
        }

        datumByDigest[digest] = datum
      }

      return datumByDigest
    } else {
      if (!seriesDataO) {
        return {}
      }
      let seriesData = seriesDataO as TopsqlSummaryByItem[]
      const datumBy: Record<string, Array<[number, number]>> = {}
      seriesData.forEach((series) => {
        const key = series.text!
        if (!datumBy[key]) {
          datumBy[key] = []
        }
        series.cpu_time_ms?.forEach((v, i) => {
          datumBy[key].push([series.timestamp_sec![i], v])
        })
      })
      return datumBy
    }
  }, [seriesDataO, groupBy])

  return {
    chartData
  }
}
