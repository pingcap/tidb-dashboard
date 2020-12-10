import React, { useEffect, useRef } from 'react'
import { Card } from '@lib/components'
import { TimelineOverviewChart, genFlameGraph } from '../utils'

import styles from './Timeline.module.less'
import { TimelineDetailChart } from '../utils/TimelineDetailChart'

import testData from '../utils/test-data.json'

export default function Timeline() {
  const overviewChartRef = useRef(null)
  const overviewChart = useRef<TimelineOverviewChart>()

  const detailChartRef = useRef(null)
  const detailChart = useRef<TimelineDetailChart>()

  useEffect(() => {
    const flameGraph = genFlameGraph(testData)

    if (overviewChartRef.current) {
      overviewChart.current = new TimelineOverviewChart(
        overviewChartRef.current!,
        8000
      )
    }
    if (detailChartRef.current) {
      detailChart.current = new TimelineDetailChart(
        detailChartRef.current!,
        flameGraph
      )
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
