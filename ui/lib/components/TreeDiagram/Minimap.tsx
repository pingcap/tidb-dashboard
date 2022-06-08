import React, { useEffect, useRef } from 'react'
import { Translate, rectBound } from './types'

import NodeWrapper from './NodeWrapper'
import LinkWrapper from './LinkWrapper'
import styles from './index.module.less'

// import d3 APIs
import { select, event } from 'd3-selection'
import { scaleLinear } from 'd3-scale'
import { brush as d3Brush } from 'd3-brush'

interface MinimapProps {
  mainChartGroupBound: rectBound
  minimapTranslate: Translate
  links: any
  nodes: any
  customLinkElement: any
  customNodeElement: any
  minimapScale: number
}

const Minimap = ({
  mainChartGroupBound,
  links,
  nodes,
  minimapTranslate,
  customLinkElement,
  customNodeElement,
  minimapScale,
}: MinimapProps) => {
  const minimapSVG = select('.minimapSVG')
  const minimapGroup = select('.minimapGroup')
  const { width: mainChartWidth, height: mainChartHeight } = mainChartGroupBound
  console.log('viewPort in minimap', mainChartGroupBound, minimapTranslate)
  const minimapContainerWidth = mainChartWidth * minimapScale
  const minimapContainerHeight = mainChartHeight * minimapScale

  const gBrushRef = useRef(null)

  const minimapScaleX = (zoomScale) => {
    return scaleLinear()
      .domain([0, mainChartWidth])
      .range([0, mainChartWidth * zoomScale])
  }

  const minimapScaleY = (zoomScale) => {
    return scaleLinear()
      .domain([0, mainChartWidth])
      .range([0, mainChartWidth * zoomScale])
  }

  const brushBehavior = d3Brush()
    .extent([
      [0, 0],
      [worldSize[0], worldSize[1]],
    ])
    .on('brush', onBrush)

  const bindBrushListener = () => {
    gBrush.call(brushBehavior as any)

    drawMinimap()

    brushBehavior.move(gBrush as any, [
      [0, 0],
      [worldSize[0], worldSize[1]],
    ])
  }

  const drawMinimap = () => {
    // const worldWidth = worldSize[0]
    // const worldHeight = worldSize[1]

    minimapSVG
      .attr('width', minimapScaleX(minimapScale)(mainChartWidth))
      .attr('height', minimapScaleX(minimapScale)(mainChartHeight))
      .attr('viewBox', [0, 0, mainChartWidth, mainChartHeight].join(' '))
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('position', 'absolute')
      .style('top', 0)
      .style('right', 20)
      .style('border', '1px solid grey')
      .style('background', 'white')

    select('.minimap-rect')
      .attr('width', mainChartWidth)
      .attr('height', mainChartHeight)
      .attr('fill', 'white')

    minimapGroup
      .attr('transform', `translate(${minimapTranslate.x}, 0) scale(1)`)
      .attr('width', mainChartWidth)
      .attr('height', mainChartHeight)

    bindBrushListener()
  }

  useEffect(() => {
    drawMinimap()
  })
  return (
    <div className={styles.minimapContainer}>
      <svg
        className="minimapSVG"
        width={minimapContainerWidth}
        height={minimapContainerHeight}
      >
        <rect className="minimap-rect"></rect>
        <g
          className="minimapGroup"
          transform={`translate(${minimapTranslate.x}, ${minimapTranslate.y}) scale(${minimapTranslate.k})`}
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
                    zoomScale={minimapTranslate.k}
                  />
                )
              })}
          </g>
        </g>
        <g ref={gBrushRef}></g>
      </svg>
    </div>
  )
}

export default Minimap
