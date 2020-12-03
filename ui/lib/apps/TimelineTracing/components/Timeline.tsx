import React, { useEffect, useRef } from 'react'
import { Card } from '@lib/components'
import { TimelineOverviewChart } from '../utils'

import styles from './Timeline.module.less'

export default function Timeline() {
  const overviewChartRef = useRef(null)
  const overviewChart = useRef<TimelineOverviewChart>()

  useEffect(() => {
    if (overviewChartRef.current) {
      overviewChart.current = new TimelineOverviewChart(
        overviewChartRef.current!
      )
    }
  }, [])

  return (
    <Card>
      <h1>Timeline</h1>
      <div ref={overviewChartRef} className={styles.overview_chart_container} />
    </Card>
  )
}
