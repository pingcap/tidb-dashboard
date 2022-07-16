import { Space } from 'antd'
import _ from 'lodash'
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import format from 'string-template'
import { getValueFormat } from '@baurine/grafana-value-formats'
import client, { ErrorStrategy } from '@lib/client'
import { AnimatedSkeleton } from '@lib/components'
import ErrorBar from '../ErrorBar'
import { addTranslationResource } from '@lib/utils/i18n'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Axis,
  BrushEvent,
  Chart,
  DomainRange,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  PointerEvent,
} from '@elastic/charts'
import { GraphType, QueryData, renderQueryData } from './seriesRenderer'
import {
  alignRange,
  DEFAULT_CHART_SETTINGS,
  timeTickFormatter,
  useChartHandle,
} from '@lib/utils/charts'
import { useChange } from '@lib/utils/useChange'
import { TimeRangeValue } from '../TimeRangeSelector'
import {
  processRawData,
  PromMatrixData,
  QueryOptions,
  resolveQueryTemplate,
} from '@lib/utils/prometheus'

import { ChartContext } from './ChartContext'

export type { GraphType }

const translations = {
  en: {
    error: {
      api: {
        metrics: {
          prom_not_found:
            'Prometheus is not deployed in the cluster. Metrics are unavailable.',
        },
      },
    },
    components: {
      metricChart: {
        changePromButton: 'Change Prometheus Source',
      },
    },
  },
  zh: {
    error: {
      api: {
        metrics: {
          prom_not_found: '集群中未部署 Prometheus 组件，监控不可用。',
        },
      },
    },
    components: {
      metricChart: {
        changePromButton: '修改 Prometheus 源',
      },
    },
  },
}

for (const key in translations) {
  addTranslationResource(key, translations[key])
}

export interface IQueryOption {
  query: string
  name: string
  color?: string
}

export interface IMetricChartProps {
  // When object ref changed, there will be a data reload.
  range: TimeRangeValue

  yDomain?: DomainRange
  queries: IQueryOption[]
  unit?: string
  type: GraphType

  height?: number

  onRangeChange?: (newRange: TimeRangeValue) => void
  onLoadingStateChange?: (isLoading: boolean) => void
}

type Data = {
  meta: {
    queryOptions: QueryOptions
  }
  values: QueryData[]
}

export default function MetricChart({
  queries,
  range,
  yDomain,
  unit,
  type,
  height = 200,
  onRangeChange,
  onLoadingStateChange,
}: IMetricChartProps) {
  const chartRef = useRef<Chart>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartHandle] = useChartHandle(chartContainerRef, 150)
  const [isLoading, setLoading] = useState(false)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<any>(null)

  const ee = useContext(ChartContext)

  ee.useSubscription((e) => chartRef.current?.dispatchExternalPointerEvent(e))

  useChange(() => {
    onLoadingStateChange?.(isLoading)
  }, [isLoading])

  useChange(() => {
    const interval = chartHandle.calcIntervalSec(range)
    const rangeSnapshot = alignRange(range, interval) // Align the range according to calculated interval
    const queryOptions: QueryOptions = {
      start: rangeSnapshot[0],
      end: rangeSnapshot[1],
      step: interval,
    }

    async function queryMetric(
      queryTemplate: string,
      fillIdx: number,
      fillInto: (PromMatrixData | null)[]
    ) {
      const query = resolveQueryTemplate(queryTemplate, queryOptions)
      try {
        const resp = await client
          .getInstance()
          .metricsQueryGet(
            queryOptions.end,
            query,
            queryOptions.start,
            queryOptions.step,
            {
              errorStrategy: ErrorStrategy.Custom,
            }
          )
        let data: PromMatrixData | null = null
        if (resp.data.status === 'success') {
          data = resp.data.data as any
          if (data?.resultType !== 'matrix') {
            // unsupported
            data = null
          }
        }
        fillInto[fillIdx] = data
      } catch (e) {
        fillInto[fillIdx] = null
        setError((existingErr) => existingErr || e)
      }
    }

    async function queryAllMetrics() {
      setLoading(true)
      setError(null)
      const dataSets: (PromMatrixData | null)[] = []
      try {
        await Promise.all(
          queries.map((q, idx) => queryMetric(q.query, idx, dataSets))
        )
      } finally {
        setLoading(false)
      }

      // Transform response into data
      const sd: QueryData[] = []
      dataSets.forEach((data, queryIdx) => {
        if (!data) {
          return
        }
        data.result.forEach((promResult, seriesIdx) => {
          const data = processRawData(promResult, queryOptions)
          if (data === null) {
            return
          }
          sd.push({
            id: `${queryIdx}_${seriesIdx}`,
            name: format(queries[queryIdx].name, promResult.metric),
            data,
            color: queries[queryIdx].color,
          })
        })
      })
      setData({
        meta: {
          queryOptions,
        },
        values: sd,
      })
    }

    queryAllMetrics()
  }, [range])

  const handleBrushEnd = useCallback(
    (ev: BrushEvent) => {
      if (!ev.x) {
        return
      }
      const timeRange: TimeRangeValue = [
        Math.floor((ev.x[0] as number) / 1000),
        Math.floor((ev.x[1] as number) / 1000),
      ]
      onRangeChange?.(alignRange(timeRange))
    },
    [onRangeChange]
  )

  const { t } = useTranslation()

  const hasMetricData = useMemo(() => {
    return (
      (data?.values.length ?? 0) > 0 &&
      _.some(data?.values ?? [], (ds) => ds !== null)
    )
  }, [data])
  const showSkeleton = isLoading && !hasMetricData

  let inner
  if (showSkeleton) {
    inner = null
  } else if (!hasMetricData && error) {
    inner = (
      <div style={{ height }}>
        <Space direction="vertical">
          <ErrorBar errors={[error]} />
          <Link to="/user_profile?blink=profile.prometheus">
            {t('components.metricChart.changePromButton')}
          </Link>
        </Space>
      </div>
    )
  } else {
    inner = (
      <Chart size={{ height }} ref={chartRef}>
        <Settings
          {...DEFAULT_CHART_SETTINGS}
          legendPosition={Position.Right}
          pointerUpdateDebounce={0}
          onPointerUpdate={(e) => ee.emit(e)}
          legendSize={130}
          onBrushEnd={handleBrushEnd}
        />
        <Axis
          id="bottom"
          position={Position.Bottom}
          showOverlappingTicks
          tickFormat={timeTickFormatter(range)}
        />
        <Axis
          id="left"
          position={Position.Left}
          showOverlappingTicks
          tickFormat={(v) =>
            unit ? getValueFormat(unit)(v, 2) : Number(v).toFixed(0)
          }
          ticks={5}
          domain={yDomain}
        />
        {data?.values.map((qd) => renderQueryData(type, qd))}
        {data && (
          <LineSeries // An empty series to avoid "no data" notice
            id="_placeholder"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor={0}
            yAccessors={[1]}
            hideInLegend
            data={[
              [data.meta.queryOptions.start * 1000, null],
              [data.meta.queryOptions.end * 1000, null],
            ]}
          />
        )}
      </Chart>
    )
  }

  return (
    <AnimatedSkeleton showSkeleton={showSkeleton} style={{ height }}>
      <div ref={chartContainerRef}>{inner}</div>
    </AnimatedSkeleton>
  )
}
