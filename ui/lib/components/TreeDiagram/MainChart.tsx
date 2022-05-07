import React from 'react'
import { Translate } from './types'

import NodeWrapper from './NodeWrapper'
import LinkWrapper from './LinkWrapper'

interface MainChartProps {
  viewPort: {
    width: number
    height: number
  }
  chartTranslate: Translate
  links: any
  nodes: any
  customLinkElement: any
  customNodeElement: any
  handleNodeExpandBtnToggle: any
}

const MainChart = ({
  viewPort,
  chartTranslate,
  links,
  nodes,
  customLinkElement,
  customNodeElement,
  handleNodeExpandBtnToggle,
}: MainChartProps) => {
  return (
    <svg
      className="mainChartSVG"
      width={viewPort.width}
      height={viewPort.height}
    >
      <g
        className="mainChartGroup"
        transform={`translate(${chartTranslate.x}, ${chartTranslate.y}) scale(${chartTranslate.k})`}
      >
        <g className="linksWrapper">
          {links &&
            links.map((link, i) => {
              return (
                <LinkWrapper
                  key={i}
                  data={link}
                  collapsiableButtonSize={{ width: 60, height: 30 }}
                  renderCustomLinkElement={customLinkElement}
                />
              )
            })}
        </g>

        <g className="nodesWrapper">
          {nodes &&
            nodes.map((hierarchyPointNode, i) => {
              const { data, x, y } = hierarchyPointNode
              return (
                <NodeWrapper
                  data={data}
                  key={data.name}
                  renderCustomNodeElement={customNodeElement}
                  hierarchyPointNode={hierarchyPointNode}
                  zoomScale={chartTranslate.k}
                  onNodeExpandBtnToggle={handleNodeExpandBtnToggle}
                />
              )
            })}
        </g>
      </g>
    </svg>
  )
}

export default MainChart
