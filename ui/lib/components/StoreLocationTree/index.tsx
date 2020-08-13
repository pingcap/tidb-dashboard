import 'echarts/lib/chart/tree'
import 'echarts/lib/component/grid'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/tooltip'
import ReactEchartsCore from 'echarts-for-react/lib/core'
import echarts from 'echarts/lib/echarts'
import React from 'react'

export interface IStoreLocationProps {
  dataSource: any
}

const HEIGHT = 250

export default function StoreLocationTree({ dataSource }: IStoreLocationProps) {
  const opt = {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
    },
    series: [
      {
        type: 'tree',

        data: [dataSource],

        top: '1%',
        left: '7%',
        bottom: '1%',
        right: '20%',

        symbolSize: 7,

        label: {
          normal: {
            position: 'left',
            verticalAlign: 'middle',
            align: 'right',
            fontSize: 9,
          },
        },

        leaves: {
          label: {
            normal: {
              position: 'right',
              verticalAlign: 'middle',
              align: 'left',
            },
          },
        },

        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750,
      },
    ],
  }

  return (
    <ReactEchartsCore
      echarts={echarts}
      lazyUpdate={true}
      style={{ height: HEIGHT }}
      option={opt}
      theme={'light'}
    />
  )
}
