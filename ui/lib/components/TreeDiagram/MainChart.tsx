import React from 'react'
import { Translate } from './types'

import NodeWrapper from './NodeWrapper'
import LinkWrapper from './LinkWrapper'

interface MainChartProps {
  viewPort: {
    width: number
    height: number
  }
  treeTranslate: Translate
  links: any
  nodes: any
  customLinkElement: any
  customNodeElement: any
  handleNodeExpandBtnToggle: any
}

const MainChart = ({
  viewPort,
  treeTranslate,
  links,
  nodes,
  customLinkElement,
  customNodeElement,
  handleNodeExpandBtnToggle,
}: MainChartProps) => {
  console.log('in mainchat', treeTranslate)
  return (
    <svg
      className="mainChartSVG"
      width={viewPort.width}
      height={viewPort.height}
    >
      <g
        className="mainChartGroup"
        transform={`translate(${treeTranslate.x}, ${treeTranslate.y}) scale(${treeTranslate.k})`}
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
              const { data } = hierarchyPointNode
              return (
                <NodeWrapper
                  data={data}
                  key={data.name}
                  renderCustomNodeElement={customNodeElement}
                  hierarchyPointNode={hierarchyPointNode}
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
