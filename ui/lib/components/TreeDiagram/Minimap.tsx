import React, { MutableRefObject, Ref, useEffect, useMemo, useRef } from 'react'
import { select, event } from 'd3-selection'
import { brush as d3Brush } from 'd3-brush'
import { zoom as d3Zoom, zoomIdentity, zoomTransform } from 'd3-zoom'

import SingleTree from './SingleTree'
import styles from './index.module.less'
import { rectBound, TreeNodeDatum, nodeMarginType } from './types'

interface MinimapProps {
  treeNodeDatum: TreeNodeDatum[]
  classNamePrefix: string
  viewport: rectBound
  multiTreesBound: rectBound
  customLinkElement: any
  customNodeElement: any
  minimapScale: number
  minimapScaleX?
  minimapScaleY?
  multiTreesSVG?
  updateTreeTranslate?
  brushBehavior?
  brushRef?: Ref<SVGGElement>
  zoomToFitViewportScale
  getTreePosition: (number) => any
  nodeMargin?: nodeMarginType
}

const Minimap = ({
  treeNodeDatum,
  classNamePrefix,
  viewport,
  multiTreesBound,
  nodeMargin,
  customLinkElement,
  customNodeElement,
  minimapScale,
  minimapScaleX,
  minimapScaleY,
  multiTreesSVG,
  updateTreeTranslate,
  zoomToFitViewportScale,
  getTreePosition,
  brushRef,
}: MinimapProps) => {
  const minimapContainer = {
    width: viewport.width * minimapScale,
    height: viewport.height * minimapScale,
  }
  const { width: multiTreesBoundWidth, height: multiTreesBoundHeight } =
    multiTreesBound

  const margin: nodeMarginType = useMemo(
    () => ({
      siblingMargin: nodeMargin?.childrenMargin || 40,
      childrenMargin: nodeMargin?.siblingMargin || 60,
    }),
    [nodeMargin?.childrenMargin, nodeMargin?.siblingMargin]
  )

  const _brushRef = useRef<SVGGElement>(null)

  const brushSelection = select(_brushRef.current!)
  const minimapMultiTreesSVGSelection = select(`.${classNamePrefix}SVG`)
  const minimapMultiTreesGroupSelection = select(`.${classNamePrefix}Group`)

  const drawMinimap = () => {
    minimapMultiTreesSVGSelection
      .attr('width', minimapContainer.width)
      .attr('height', minimapContainer.height)
      .attr('viewBox', [0, 0, viewport.width, viewport.height].join(' '))
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('position', 'absolute')
      .style('top', 0)
      .style('left', 20)
      .style('border', '1px solid grey')
      .style('background', 'white')

    select('.minimap-rect')
      .attr('width', viewport.width)
      .attr('height', viewport.height)
      .attr('fill', 'white')

    minimapMultiTreesGroupSelection
      .attr('width', multiTreesBoundWidth)
      .attr('height', multiTreesBoundHeight)
  }

  const onBrush = () => {
    if (event.sourceEvent && event.sourceEvent.type === 'zoom') return null
    if (Array.isArray(event.selection)) {
      const [[brushX, brushY]] = event.selection

      const zoomScale = zoomTransform(multiTreesSVG.node() as any)

      // Sets initial offset, so that first pan and zoom does not jump back to default [0,0] coords.
      // @ts-ignore
      multiTreesSVG.call(
        d3Zoom().transform as any,
        zoomIdentity
          .translate(
            minimapScaleX(zoomScale.k)(-brushX),
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
        minimapScaleX(1)(-viewport.width / 2),
        minimapScaleY(1)(-viewport.height / 2),
      ],
      [
        minimapScaleX(1)(multiTreesBoundWidth + viewport.width / 2),
        minimapScaleY(1)(multiTreesBoundHeight + viewport.height / 2),
      ],
    ])
    .on('brush', () => onBrush())

  const bindBrushListener = () => {
    brushSelection.call(brushBehavior)

    // init brush seletion
    brushBehavior.move(brushSelection, [
      [0, 0],
      [viewport.width, viewport.height],
    ])
  }

  useEffect(() => {
    drawMinimap()
    // Removes these elements can avoid re-select brush on minimap
    minimapMultiTreesSVGSelection.selectAll('.handle').remove()
    minimapMultiTreesSVGSelection.selectAll('.overlay').remove()
  })

  useEffect(() => {
    bindBrushListener()
  }, [multiTreesBound])

  useEffect(() => {
    if (!_brushRef.current || !brushRef) {
      return
    }
    ;(brushRef as MutableRefObject<SVGElement>).current = _brushRef.current
  }, [brushRef])

  return (
    <div className={styles.minimapContainer}>
      <svg
        className={`${classNamePrefix}SVG`}
        width={minimapContainer.width}
        height={minimapContainer.height}
      >
        <rect className="minimap-rect"></rect>
        <g className={`${classNamePrefix}Group`}>
          {treeNodeDatum.map((datum, idx) => (
            <SingleTree
              key={datum.name}
              datum={datum}
              treeIdx={idx}
              nodeMargin={nodeMargin}
              zoomToFitViewportScale={zoomToFitViewportScale}
              customLinkElement={customLinkElement}
              customNodeElement={customNodeElement}
              getTreePosition={getTreePosition}
            />
          ))}
        </g>
        <g ref={_brushRef}></g>
      </svg>
    </div>
  )
}

export default Minimap
