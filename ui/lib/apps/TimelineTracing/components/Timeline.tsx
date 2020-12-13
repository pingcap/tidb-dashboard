import React, { useEffect, useRef } from 'react'
import { Card } from '@lib/components'
import { TimelineOverviewChart, genFlameGraph } from '../utils'

import styles from './Timeline.module.less'
import { TimelineDetailChart } from '../utils/TimelineDetailChart'

import selectCount from '../test-data/select-count.json'
import insertInto from '../test-data/insert_into.json'

import selectFromTt from '../test-data/select_from_tt_order_by_c1_asc_c2_desc.json'
import insertIntoTt from '../test-data/insert_into_tt_select_from_tt.json'

export default function Timeline() {
  const overviewChartRef = useRef(null)
  const overviewChart = useRef<TimelineOverviewChart>()

  const detailChartRef = useRef(null)
  const detailChart = useRef<TimelineDetailChart>()

  useEffect(() => {
    // const flameGraph = genFlameGraph(selectCount)
    // const flameGraph = genFlameGraph(insertInto)
    // const flameGraph = genFlameGraph(selectFromTt)
    const flameGraph = genFlameGraph(insertIntoTt)

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
    }
  }, [])

  return (
    <Card>
      <h1>Timeline</h1>
      <div ref={overviewChartRef} className={styles.overview_chart_container} />
      <br />
      <div ref={detailChartRef} className={styles.detail_chart_container} />
    </Card>
  )
}
