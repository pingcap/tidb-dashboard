//import 'echarts/lib/chart/bar'
import 'echarts/lib/chart/tree'
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

export type GraphType = 'tree'

export interface ISeries {
  query: string
  name: string
}

export interface IStoryLocationProps {
  title: React.ReactNode

  series: ISeries[]
  // stepSec: number
  // beginTimeSec: number
  // endTimeSec: number
 // unit: string
  type: GraphType
}

const HEIGHT = 250


// FIXME
function getTimeParams() {
  return {
    beginTimeSec: Math.floor((Date.now() - 60 * 60 * 1000) / 1000),
    endTimeSec: Math.floor(Date.now() / 1000),
  }
}

export default function StoryLocation({
  title,
  series,
  // stepSec,
  // beginTimeSec,
  // endTimeSec,
  //unit,
  type,
}: IStoryLocationProps) {
  const timeParams = useRef(getTimeParams())

  const { isLoading, data, error, sendRequest } = useBatchClientRequest(
    series.map((s) => (cancelToken) =>
      client
        .getInstance()
        .metricsQueryGet(
          timeParams.current.endTimeSec,
          s.query,
          timeParams.current.beginTimeSec,
          30,
          {
            cancelToken,
          }
        )
    )
  )

  const update = () => {
    timeParams.current = getTimeParams()
    sendRequest()
  }

  useInterval(update, 60 * 1000)

 // const valueFormatter = useMemo(() => getValueFormat(unit), [unit])
 const dataSource = {
  children: [
    {
      children: [
        {
          children: [
            {
              children: [],
              name: "低压车间表计82",
            },
          ],
          name: "低压关口表计1",
        },
      ],
      name: "高压子表计122",
    },
    {
      children: [
        {
          children: [],
          name: "低压关口表计101",
        },
      ],
      name: "高压子表计141",
    },
  ],
  name: "高压总表计102",
};

  /*var myChart = echarts.init()
    myChart.showLoading();    //显示Loading标志； var myChart = echarts.init(document.getElementById('页面中div的id')); 
$.get('./storyData.json', function (data) {
    myChart.hideLoading();    //得到数据后隐藏Loading标志
 
    echarts.util.each(data.children, function (datum, index) {
        index % 2 === 0 && (datum.collapsed = true);
    });    //间隔展开子数据，animate，display，physics，scale，vis是展开的
 */
    const opt ={
        tooltip: {    //提示框组件
            trigger: 'item',    //触发类型，默认：item（数据项图形触发，主要在散点图，饼图等无类目轴的图表中使用）。可选：'axis'：坐标轴触发，主要在柱状图，折线图等会使用类目轴的图表中使用。'none':什么都不触发。
            triggerOn: 'mousemove'    //提示框触发的条件，默认mousemove|click（鼠标点击和移动时触发）。可选mousemove：鼠标移动时，click：鼠标点击时，none：        
        },
        series: [    //系列列表
            {
                type: 'tree',    //树形结构
 
                data: [dataSource],    //上面从flare.json中得到的数据
 
                top: '1%',       //距离上
                left: '7%',      //左
                bottom: '1%',    //下
                right: '20%',    //右的距离
 
                symbolSize: 7,   //标记的大小，就是那个小圆圈，默认7
 
                label: {         //每个节点所对应的标签的样式
                    normal: {
                        position: 'left',       //标签的位置
                        verticalAlign: 'middle',//文字垂直对齐方式，默认自动。可选：top，middle，bottom
                        align: 'right',         //文字水平对齐方式，默认自动。可选：top，center，bottom
                        fontSize: 9             //标签文字大小
                    }
                },
 
                leaves: {    //叶子节点的特殊配置，如上面的树图示例中，叶子节点和非叶子节点的标签位置不同
                    label: {
                        normal: {
                            position: 'right',
                            verticalAlign: 'middle',
                            align: 'left'
                        }
                    }
                },
 
                expandAndCollapse: true,    //子树折叠和展开的交互，默认打开
                animationDuration: 550,     //初始动画的时长，支持回调函数,默认1000
                animationDurationUpdate: 750//数据更新动画的时长，默认300
            }
        ]
      };

  const showSkeleton = isLoading && _.every(data, (d) => d === null)

  let inner

  if (showSkeleton) {
    inner = <div style={{ height: HEIGHT }} />
  } else if (
    _.every(
      _.zip(data, error),
      ([data, err]) => err || !data || data?.status !== 'success'
    )
  ) {
    inner = (
      <div style={{ height: HEIGHT }}>
        <ErrorBar errors={error} />
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
      <AnimatedSkeleton showSkeleton={showSkeleton}>{inner}</AnimatedSkeleton>
    </Card>
  )
}
