import React from 'react'

import ReactEcharts from 'echarts-for-react'

export default function LabelChart({ cluster }) {
  let datas = []
  if (cluster && cluster.tikv) {
    const kv = cluster.tikv
    for (let node of kv.nodes) {
      let current = {
        name: `${node.ip}:${node.port}`,
        children: [],
      }
      if (node.labels) {
        for (let key in node.labels) {
          if (node.labels.hasOwnProperty(key)) {
            console.log(key, node.labels[key])
            current.children.push({
              name: `${key}: ${node.labels[key]}`,
            })
          }
        }
      }
      datas.push(current)
    }
  }
  datas = {
    name: 'TiKV Labels',
    children: datas,
  }

  let treeOption = {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
    },
    series: [
      {
        type: 'tree',

        data: datas,

        left: '2%',
        right: '2%',
        top: '8%',
        bottom: '20%',

        symbol: 'emptyCircle',

        orient: 'vertical',

        expandAndCollapse: true,

        label: {
          position: 'top',
          rotate: -90,
          verticalAlign: 'middle',
          align: 'right',
          fontSize: 9,
        },

        leaves: {
          label: {
            position: 'bottom',
            rotate: -90,
            verticalAlign: 'middle',
            align: 'left',
          },
        },

        animationDurationUpdate: 750,
      },
    ],
  }
  return (
    <div>
      <ReactEcharts option={treeOption} />
    </div>
  )
}
