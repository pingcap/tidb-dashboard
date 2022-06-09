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
  viewPort: rectBound
  minimapTranslate: Translate
  links: any
  nodes: any
  customLinkElement: any
  customNodeElement: any
  minimapScale: number
  brushGroup: any
}

const Minimap = ({
  mainChartGroupBound,
  viewPort,
  links,
  nodes,
  minimapTranslate,
  customLinkElement,
  customNodeElement,
  minimapScale,
  brushGroup,
}: MinimapProps) => {
  const minimapSVG = select('.minimapSVG')
  const minimapGroup = select('.minimapGroup')
  const { width: mainChartWidth, height: mainChartHeight } = mainChartGroupBound

  console.log('mainChartGroupBound', mainChartGroupBound)

  const minimapContainerWidth = mainChartWidth * minimapScale
  const minimapContainerHeight = mainChartHeight * minimapScale

  // const gBrushRef = useRef(null)
  // const gBrush = select(gBrushRef.current)

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

  // const onBrush = () => {
  //   if (event.sourceEvent && event.sourceEvent.type === 'zoom') return null

  //   if (Array.isArray(event.selection)) {
  //     const [[brushX, brushY], [brushX2, brushY2]] = event.selection
  //     console.log('on brush event', event, event.selection)
  //     // const zoomScale = zoomTransform(mainChartContainerSVG.node() as any).k

  //     // const scaleX = minimapScaleX(zoomScale)
  //     // const scaleY = minimapScaleY(zoomScale)

  //     //   mainChartContainerSVG.call(
  //     //     zoomBehavior.transform as any,
  //     //     d3.zoomIdentity
  //     //       // .translate(attrs.svgWidth, attrs.svgHeight)
  //     //       .translate(-brushX + viewPortWidth / 2, -brushY)
  //     //       .scale(zoomScale)
  //     //   )

  //     //   mainChartGroup.attr(
  //     //     'transform',
  //     //     `translate(${scaleX(-brushX + viewPortWidth / 2)}, ${scaleY(
  //     //       -brushY
  //     //     )}) scale(${zoomScale})`
  //     //   )
  //     // }
  //   }
  // }

  // const brushBehavior = d3Brush()
  //   .extent([
  //     [0, 0],
  //     [viewPort.width, viewPort.height],
  //   ])
  //   .on('brush', onBrush)

  // const bindBrushListener = () => {
  //   console.log('bind brush listener')
  //   gBrush.call(brushBehavior as any)

  //   brushBehavior.move(gBrush as any, [
  //     [0, 0],
  //     [viewPort.width, viewPort.height],
  //   ])
  // }

  const drawMinimap = () => {
    minimapSVG
      .attr('width', minimapScaleX(minimapScale)(mainChartWidth))
      .attr('height', minimapScaleY(minimapScale)(mainChartHeight))
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
  }

  useEffect(() => {
    drawMinimap()
  })

  // useEffect(() => {
  //   if(gBrushRef.current) {
  //     console.log('gBrushRef.current', gBrushRef.current)
  //     bindBrushListener()
  //   }
  // }, [])
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
        {brushGroup()}
      </svg>
    </div>
  )
}

export default Minimap
