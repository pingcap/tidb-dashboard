import React, { useEffect, useRef } from 'react'
import { Translate, rectBound } from './types'

import NodeWrapper from './NodeWrapper'
import LinkWrapper from './LinkWrapper'
import styles from './index.module.less'

// import d3 APIs
import { select, event } from 'd3-selection'
import { scaleLinear } from 'd3-scale'
import { brush as d3Brush } from 'd3-brush'
import { zoom as d3Zoom, zoomIdentity, zoomTransform } from 'd3-zoom'

interface MinimapProps {
  treeBound
  viewPort: rectBound
  links: any
  nodes: any
  customLinkElement: any
  customNodeElement: any
  minimapScale: number
  brushGroup: any
  minimapScaleX
  minimapScaleY
  mainChartSVG
  updateTreeTranslate
  brushBehavior
  gBrush
}

const Minimap = ({
  treeBound,
  viewPort,
  links,
  nodes,
  customLinkElement,
  customNodeElement,
  minimapScale,
  brushGroup,
  minimapScaleX,
  minimapScaleY,
  mainChartSVG,
  updateTreeTranslate,
  gBrush,
}: MinimapProps) => {
  const minimapSVG = select('.minimapSVG')
  const minimapGroup = select('.minimapGroup')
  const { width: mainChartWidth, height: mainChartHeight, x, y } = treeBound
  const translate: Translate = {
    x: -x,
    y,
    k: 1,
  }

  const minimapContainerWidth = viewPort.width * minimapScale
  const minimapContainerHeight = viewPort.height * minimapScale

  const longSide = mainChartWidth > mainChartHeight ? 'x' : 'y'
  const chartLongSideSize = Math.max(mainChartWidth, mainChartHeight)
  const chartMinimapScale =
    chartLongSideSize /
    (longSide === 'x' ? minimapContainerWidth : minimapContainerHeight)

  const drawMinimap = () => {
    minimapSVG
      .attr('width', minimapContainerWidth)
      .attr('height', minimapContainerHeight)
      .attr(
        'viewBox',
        (longSide === 'x'
          ? [
              0,
              -(minimapContainerHeight * chartMinimapScale - mainChartHeight) /
                2,
              mainChartWidth,
              minimapContainerHeight * chartMinimapScale,
            ]
          : [
              -(minimapContainerWidth * chartMinimapScale - mainChartWidth) / 2,
              0,
              minimapContainerWidth * chartMinimapScale,
              mainChartHeight,
            ]
        ).join(' ')
      )
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
      .attr('transform', `translate(${translate.x}, 0) scale(1)`)
      .attr('width', mainChartWidth)
      .attr('height', mainChartHeight)
  }

  const onBrush = () => {
    if (event.sourceEvent && event.sourceEvent.type === 'zoom') return null
    if (Array.isArray(event.selection)) {
      const [[brushX, brushY]] = event.selection

      const zoomScale = zoomTransform(mainChartSVG.node() as any)

      // Sets initial offset, so that first pan and zoom does not jump back to default [0,0] coords.
      // @ts-ignore
      mainChartSVG.call(
        d3Zoom().transform as any,
        zoomIdentity
          .translate(
            minimapScaleX(zoomScale.k)(-treeBound.x - brushX),
            minimapScaleY(zoomScale.k)(-brushY)
          )
          .scale(zoomScale.k)
      )

      // Handles tree translate update when brush moves
      updateTreeTranslate(zoomScale, brushX, brushY)
    }
  }

  // Limits brush move extent
  const brushBehavior = d3Brush()
    .extent([
      [
        minimapScaleX(1)(-viewPort.width / 2),
        minimapScaleY(1)(-viewPort.height / 2),
      ],
      [
        minimapScaleX(1)(treeBound.width + viewPort.width / 2),
        minimapScaleY(1)(treeBound.height + viewPort.height / 2),
      ],
    ])
    .on('brush', () => onBrush())

  const bindBrushListener = () => {
    gBrush.call(brushBehavior as any)

    // init brush seletion
    brushBehavior.move(gBrush as any, [
      [-treeBound.x - minimapScaleX(1)(viewPort.width / 2), 0],
      [
        -treeBound.x - minimapScaleX(1)(viewPort.width / 2) + viewPort.width,
        viewPort.height,
      ],
    ])
  }

  useEffect(() => {
    drawMinimap()
    // Removes these elements can avoid re-select brush on minimap
    minimapSVG.selectAll('.handle').remove()
    minimapSVG.selectAll('.overlay').remove()
  })

  useEffect(() => {
    bindBrushListener()
  }, [treeBound])

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
          transform={`translate(${translate.x}, ${translate.y}) scale(${translate.k})`}
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
                    zoomScale={translate.k}
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
