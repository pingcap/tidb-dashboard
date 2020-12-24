import React, { useEffect, useRef, useState } from 'react'
import client from '@lib/client'
import { Card } from '@lib/components'
import useQueryParams from '@lib/utils/useQueryParams'

import {
  TimelineOverviewChart,
  TimelineDetailChart,
  genFlameGraph,
  IFullSpan,
  IFlameGraph,
} from '../utils'

import styles from './Timeline.module.less'

import selectFromTt from '../test-data/select_from_tt_order_by_c1_asc_c2_desc.json'
import insertIntoTt from '../test-data/insert_into_tt_select_from_tt.json'
import TabBasic from './DetailTabBasic'

export default function Timeline() {
  const { trace_id } = useQueryParams()

  const overviewChartRef = useRef(null)
  const overviewChart = useRef<TimelineOverviewChart>()

  const detailChartRef = useRef(null)
  const detailChart = useRef<TimelineDetailChart>()

  const tooltipRef = useRef(null)

  const [clickedSpan, setClickedSpan] = useState<IFullSpan | null>(null)

  useEffect(() => {
    async function queryTraces() {
      if (trace_id === undefined) {
        return
      }
      if (trace_id === 'test_select') {
        setupCharts(genFlameGraph(selectFromTt))
      } else if (trace_id === 'test_insert') {
        setupCharts(genFlameGraph(insertIntoTt))
      } else {
        const res = await client.getInstance().traceQueryTraceIdGet(trace_id)
        if (res.data) {
          setupCharts(genFlameGraph(res.data))
        }
      }
    }
    queryTraces()
  }, [trace_id])

  function setupCharts(flameGraph: IFlameGraph) {
    if (overviewChartRef.current) {
      overviewChart.current = new TimelineOverviewChart(
        overviewChartRef.current!,
        flameGraph!
      )
      overviewChart.current.addTimeRangeListener((newTimeRange) => {
        detailChart.current?.setTimeRange(newTimeRange)
      })
    }
    if (detailChartRef.current) {
      detailChart.current = new TimelineDetailChart(
        detailChartRef.current!,
        flameGraph
      )
      detailChart.current.addTimeRangeListener((newTimeRange) => {
        overviewChart.current?.setTimeRange(newTimeRange)
      })
      detailChart.current.addSpanClickListener((span) => {
        setClickedSpan(span)
        console.log('clicked span:', span)
      })
      detailChart.current.setTooltipElement(tooltipRef.current!)
    }
  }

  return (
    <Card>
      <div style={{ overflowY: 'scroll' }}>
        <div
          ref={overviewChartRef}
          className={styles.overview_chart_container}
        />
        <br />
        <div ref={detailChartRef} className={styles.detail_chart_container} />
        <div ref={tooltipRef} className={styles.tooltip_container} />
        <br />
      </div>
      {clickedSpan && <TabBasic data={clickedSpan} />}
    </Card>
  )
}
