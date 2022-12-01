import { Card, Divider } from 'antd'
import React, { useState } from 'react'
import { ComparisonCharts } from './ComparisonCharts'
import { Selections, useUrlSelection } from './Selections'

export const SlowQueryComparison: React.FC = () => {
  const [urlSelection, setUrlSelection] = useUrlSelection()

  return (
    <div>
      <Card>
        <h1 style={{ marginBottom: '36px' }}>Slow Query Comparison</h1>
        <Selections
          selection={urlSelection}
          onSelectionChange={setUrlSelection}
        />
        <Divider />
        <ComparisonCharts />
      </Card>
    </div>
  )
}
