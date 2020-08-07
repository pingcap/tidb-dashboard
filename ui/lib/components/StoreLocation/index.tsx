import 'echarts/lib/chart/tree'
import 'echarts/lib/component/grid'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/tooltip'
import { Space } from 'antd'
import ReactEchartsCore from 'echarts-for-react/lib/core'
import echarts from 'echarts/lib/echarts'
import _ from 'lodash'
import React, { useMemo, useRef } from 'react'
import { LoadingOutlined, ReloadOutlined } from '@ant-design/icons'
import { AnimatedSkeleton, Card } from '@lib/components'

export type GraphType = 'tree'

export interface IStoreLocationProps {
  dataSource: any
  title: React.ReactNode
  type: GraphType
}
const HEIGHT = 250

export default function StoreLocation({
  dataSource,
  title,
  type,
}: IStoreLocationProps) {
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

  let inner

  inner = (
    <ReactEchartsCore
      echarts={echarts}
      lazyUpdate={true}
      style={{ height: HEIGHT }}
      option={opt}
      theme={'light'}
    />
  )

  const update = () => {}

  const subTitle = (
    <Space>
      <a onClick={update}>
        <ReloadOutlined />
      </a>
    </Space>
  )
  return (
    <Card title={title} subTitle={subTitle}>
      <AnimatedSkeleton>{inner}</AnimatedSkeleton>
    </Card>
  )
}
