import 'echarts/lib/chart/bar'
import 'echarts/lib/chart/line'
import 'echarts/lib/component/grid'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/tooltip'

import { Space } from 'antd'
import dayjs from 'dayjs'
import ReactEchartsCore from 'echarts-for-react/lib/core'
import echarts from 'echarts/lib/echarts'
import _ from 'lodash'
import React, { useMemo, useRef } from 'react'
import { useInterval } from 'react-use'
import format from 'string-template'
import { LoadingOutlined, ReloadOutlined } from '@ant-design/icons'
import { getValueFormat } from '@baurine/grafana-value-formats'

import client from '@lib/client'
import { AnimatedSkeleton, Card } from '@lib/components'
import { useBatchClientRequest } from '@lib/utils/useClientRequest'
import ErrorBar from '../ErrorBar'
import { addTranslationResource } from '@lib/utils/i18n'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export type GraphType = 'bar' | 'line'

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

export interface ISeries {
  query: string
  name: string
}

export interface IMetricChartProps {
  title: React.ReactNode

  series: ISeries[]
  // stepSec: number
  // beginTimeSec: number
  // endTimeSec: number
  unit: string
  type: GraphType
}

const HEIGHT = 250

function getSeriesProps(type: GraphType) {
  if (type === 'bar') {
    return {
      stack: 'bar_stack',
    }
  } else if (type === 'line') {
    return {
      showSymbol: false,
    }
  }
}

// FIXME
function getTimeParams() {
  return {
    beginTimeSec: Math.floor((Date.now() - 60 * 60 * 1000) / 1000),
    endTimeSec: Math.floor(Date.now() / 1000),
  }
}

export default function MetricChart({
  title,
  series,
  // stepSec,
  // beginTimeSec,
  // endTimeSec,
  unit,
  type,
}: IMetricChartProps) {
  const timeParams = useRef(getTimeParams())
  const { t } = useTranslation()

  const { isLoading, data, error, sendRequest } = useBatchClientRequest(
    series.map((s) => (reqConfig) =>
      client
        .getInstance()
        .metricsQueryGet(
          timeParams.current.endTimeSec,
          s.query,
          timeParams.current.beginTimeSec,
          30,
          reqConfig
        )
    )
  )

  const update = () => {
    timeParams.current = getTimeParams()
    sendRequest()
  }

  useInterval(update, 60 * 1000)

  const valueFormatter = useMemo(() => getValueFormat(unit), [unit])

  const opt = useMemo(() => {
    const s: any[] = []
    data.forEach((dataBySeries, seriesIdx) => {
      if (!dataBySeries) {
        return
      }
      if (dataBySeries.status !== 'success') {
        return
      }
      const r = (dataBySeries.data as any)?.result
      if (!r) {
        return
      }
      r.forEach((rData) => {
        s.push({
          name: format(series[seriesIdx].name, rData.metric),
          data:
            rData.values.map(([ts, value]) => {
              return [ts * 1000, value]
            }) ?? [],
          type,
          ...getSeriesProps(type),
        })
      })
    })

    return {
      xAxis: {
        type: 'time',
        splitLine: {
          show: true,
        },
        minorSplitLine: {
          show: true,
        },
        splitNumber: 10,
        boundaryGap: false,
        axisLabel: {
          formatter: (v) => {
            return dayjs(v).format('HH:mm')
          },
          showMinLabel: false,
          showMaxLabel: false,
        },
        axisLine: {
          lineStyle: {
            width: 0,
          },
        },
        axisTick: {
          lineStyle: {
            width: 0,
          },
        },
      },
      legend: {
        orient: 'horizontal',
        x: 'left', // 'center' | 'left' | {number},
        y: 'bottom',
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v) => {
            return valueFormatter(v, 1)
          },
        },
        splitLine: {
          show: true,
        },
        axisLine: {
          lineStyle: {
            width: 0,
          },
        },
        axisTick: {
          lineStyle: {
            width: 0,
          },
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          animation: false,
          snap: true,
        },
        formatter: (series) => {
          let tooltip = ''

          const title = dayjs(series[0].axisValue).format('YYYY-MM-DD HH:mm:ss')
          tooltip += `<div>${title}</div>`

          series.forEach((s) => {
            tooltip += `<div>${s.marker} ${s.seriesName}: ${valueFormatter(
              s.value[1],
              1
            )}</div>`
          })

          return tooltip
        },
      },
      animation: false,
      grid: {
        top: 10,
        left: 60,
        right: 0,
        bottom: 60,
      },
      series: s,
    }
  }, [data, valueFormatter, series, type])

  const showSkeleton = isLoading && _.every(data, (d) => d === null)

  let inner

  if (showSkeleton) {
    inner = null
  } else if (
    _.every(
      _.zip(data, error),
      ([data, err]) => err || !data || data?.status !== 'success'
    )
  ) {
    inner = (
      <div style={{ height: HEIGHT }}>
        <Space direction="vertical">
          <ErrorBar errors={error} />
          <Link to="/user_profile?blink=profile.prometheus">
            {t('components.metricChart.changePromButton')}
          </Link>
        </Space>
      </div>
    )
  } else {
    inner = (
      <ReactEchartsCore
        echarts={echarts}
        lazyUpdate={true}
        style={{ height: HEIGHT }}
        option={opt}
        theme={'light'}
      />
    )
  }

  const subTitle = (
    <Space>
      <a onClick={update}>
        <ReloadOutlined />
      </a>
      {isLoading ? <LoadingOutlined /> : null}
    </Space>
  )

  return (
    <Card title={title} subTitle={subTitle}>
      <AnimatedSkeleton showSkeleton={showSkeleton} style={{ height: HEIGHT }}>
        {inner}
      </AnimatedSkeleton>
    </Card>
  )
}
