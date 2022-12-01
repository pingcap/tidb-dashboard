import React from 'react'
import { Bar, BarConfig } from '@ant-design/plots'

interface DiffChartProps {
  height?: number
}

const data = [
  {
    label: 'Mon.',
    type: 'series1',
    value: 2800
  },
  {
    label: 'Mon.',
    type: 'series2',
    value: -2260
  },
  {
    label: 'Tues.',
    type: 'series1',
    value: 1800
  },
  {
    label: 'Tues.',
    type: 'series2',
    value: 1300
  },
  {
    label: 'Wed.',
    type: 'series1',
    value: 950
  },
  {
    label: 'Wed.',
    type: 'series2',
    value: 900
  },
  {
    label: 'Thur.',
    type: 'series1',
    value: 500
  },
  {
    label: 'Thur.',
    type: 'series2',
    value: 390
  },
  {
    label: 'Fri.',
    type: 'series1',
    value: 170
  },
  {
    label: 'Fri.',
    type: 'series2',
    value: 100
  }
]

export const DiffChart: React.FC<DiffChartProps> = ({ height }) => {
  const config: BarConfig = {
    data,
    height,
    isGroup: true,
    xField: 'value',
    yField: 'label',
    seriesField: 'type',
    marginRatio: 0,
    label: {
      // position: 'right'
      // layout: [
      //   // 柱形图数据标签位置自动调整
      //   {
      //     type: 'interval-adjust-position'
      //   }, // 数据标签防遮挡
      //   {
      //     type: 'interval-hide-overlap'
      //   } // 数据标签文颜色自动调整
      // ]
    },
    legend: false
  }
  return <Bar {...config}></Bar>
}
