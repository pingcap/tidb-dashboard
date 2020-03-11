import React from 'react'

import ReactEcharts from 'echarts-for-react';

export default function LabelChart({ cluster }) {
  return (
    <ReactEcharts ref='echartsInstance'
                  option={this.state.option} />
  )
}

