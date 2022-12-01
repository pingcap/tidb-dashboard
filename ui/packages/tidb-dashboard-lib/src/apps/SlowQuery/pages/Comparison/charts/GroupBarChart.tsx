import React from 'react'
import { Bar, BarConfig } from '@ant-design/plots'

interface GroupBarChartProps {
  height?: number
}

const data = [
  {
    year: '1951 年',
    value: 38
  },
  {
    year: '1952 年',
    value: 52
  },
  {
    year: '1956 年',
    value: 61
  },
  {
    year: '1957 年',
    value: 145
  },
  {
    year: '1958 年',
    value: 48
  }
]

export const GroupBarChart: React.FC<GroupBarChartProps> = ({ height }) => {
  const config: BarConfig = {
    data,
    height,
    xField: 'value',
    yField: 'year',
    legend: false
  }
  return <Bar {...config}></Bar>
}
