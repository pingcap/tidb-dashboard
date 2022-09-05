import * as d3 from 'd3'
import _ from 'lodash'
import dayjs from 'dayjs'

import { HeatmapRange, HeatmapData, DataTag } from './types'
import { createBuffer } from './buffer'
import { labelAxisGroup } from './axis/label-axis'
import { histogram } from './axis/histogram'
import { getColorScheme, ColorScheme, rasterizeLevel } from './color'
import { tagUnit, withUnit, clickToCopyBehavior } from './utils'
import legend from './legend'
import { tz } from '@lib/utils'

const margin = {
  top: 25,
  right: 40,
  bottom: 70,
  left: 100
}

const tooltipOffset = {
  horizontal: 20,
  vertical: 20
}

type TooltipStatus = {
  pinned: boolean
  hidden: boolean
  x: number
  y: number
}

type FocusStatus = {
  xDomain: [number, number]
  yDomain: [number, number]
}

const defaultTooltipStatus = { pinned: false, hidden: true, x: 0, y: 0 }
const heatmapCanvasPixelRatio = Math.max(2, window.devicePixelRatio)

function normalizeData(d: number[][], maxValue: number) {
  const height = d.length > 0 ? d[0].length : 0
  const width = d.length
  const len = width * height
  const normalized = new Uint8Array(len)
  const logMaxValue = Math.log(maxValue)
  for (let cIdx = 0; cIdx < width; cIdx++) {
    for (let rIdx = 0; rIdx < height; rIdx++) {
      const addr = rIdx * width + cIdx
      normalized[addr] =
        (Math.log(d[cIdx][rIdx]) / logMaxValue) * rasterizeLevel
    }
  }
  return normalized
}

export async function heatmapChart(
  container,
  data: HeatmapData,
  dataTag: DataTag,
  onBrush: (range: HeatmapRange) => void,
  onZoom: () => void
) {
  const maxValue =
    d3.max(data.data[dataTag].map((array) => d3.max(array)!)) || 0
  const normalizedData = normalizeData(data.data[dataTag], maxValue)

  let colorScheme: ColorScheme
  let brightness = 1
  let bufferCanvas: HTMLCanvasElement
  let zoomTransform = d3.zoomIdentity
  let tooltipStatus: TooltipStatus = _.clone(defaultTooltipStatus)
  let focusStatus: FocusStatus | null = null
  let isBrushing = false
  let width = 0
  let height = 0
  let canvasWidth = 0
  let canvasHeight = 0

  heatmapChart.brightness = function (val: number) {
    brightness = val
    updateBuffer()
    heatmapChart()
  }

  heatmapChart.brush = function (enabled: boolean) {
    isBrushing = enabled
    heatmapChart()
  }

  heatmapChart.resetZoom = function () {
    zoomTransform = d3.zoomIdentity
    heatmapChart()
  }

  heatmapChart.size = function (newWidth, newHeight) {
    const newCanvasWidth = newWidth - margin.left - margin.right
    const newCanvasHeight = newHeight - margin.top - margin.bottom
    // Sync transform on resize
    if (canvasWidth !== 0 && canvasHeight !== 0) {
      zoomTransform = d3.zoomIdentity
        .translate(
          (zoomTransform.x * newCanvasWidth) / canvasWidth,
          (zoomTransform.y * newCanvasHeight) / canvasHeight
        )
        .scale(zoomTransform.k)
    }
    width = newWidth
    height = newHeight
    canvasWidth = newCanvasWidth
    canvasHeight = newCanvasHeight
    heatmapChart()
  }

  function updateBuffer() {
    const d = data.data[dataTag]
    const height = d.length > 0 ? d[0].length : 0
    const width = d.length
    const newColorScheme = getColorScheme(maxValue, brightness)
    bufferCanvas = createBuffer(
      normalizedData,
      width,
      height,
      newColorScheme.rasterizedColors
    )
    colorScheme = newColorScheme
  }

  updateBuffer()
  heatmapChart()

  function heatmapChart() {
    let xHistogramCanvas = container
      .selectAll('canvas.x-histogram')
      .data([null])
    xHistogramCanvas = xHistogramCanvas
      .enter()
      .append('canvas')
      .classed('x-histogram', true)
      .style('position', 'absolute')
      .style('z-index', '100')
      .merge(xHistogramCanvas)
      .attr('width', canvasWidth * window.devicePixelRatio)
      .attr('height', canvasHeight * window.devicePixelRatio)
      .style('width', canvasWidth + 'px')
      .style('height', 30 + 'px')
      .style('margin-top', height - 60 + 'px')
      .style('margin-left', margin.left + 'px')
    xHistogramCanvas
      .node()
      .getContext('2d')
      .scale(window.devicePixelRatio, window.devicePixelRatio)

    let yHistogramCanvas = container
      .selectAll('canvas.y-histogram')
      .data([null])
    yHistogramCanvas = yHistogramCanvas
      .enter()
      .append('canvas')
      .classed('y-histogram', true)
      .style('position', 'absolute')
      .style('z-index', '101')
      .merge(yHistogramCanvas)
      .attr('width', 30 * window.devicePixelRatio)
      .attr('height', canvasHeight * window.devicePixelRatio)
      .style('width', 30 + 'px')
      .style('height', canvasHeight + 'px')
      .style('margin-top', margin.top + 'px')
      .style('margin-left', width - 30 + 'px')
    yHistogramCanvas
      .node()
      .getContext('2d')
      .scale(window.devicePixelRatio, window.devicePixelRatio)

    let labelCanvas = container.selectAll('canvas.label').data([null])
    labelCanvas = labelCanvas
      .enter()
      .append('canvas')
      .classed('label', true)
      .style('position', 'absolute')
      .style('z-index', '102')
      .merge(labelCanvas)
      .style('width', 90 + 'px')
      .style('height', canvasHeight + 'px')
      .attr('width', 90 * window.devicePixelRatio)
      .attr('height', canvasHeight * window.devicePixelRatio)
      .style('margin-top', margin.top + 'px')
    labelCanvas
      .node()
      .getContext('2d')
      .scale(window.devicePixelRatio, window.devicePixelRatio)

    let canvas = container.selectAll('canvas.heatmap').data([null])
    canvas = canvas
      .enter()
      .append('canvas')
      .classed('heatmap', true)
      .style('position', 'absolute')
      .style('z-index', '103')
      .merge(canvas)
      .attr('width', canvasWidth * heatmapCanvasPixelRatio)
      .attr('height', canvasHeight * heatmapCanvasPixelRatio)
      .style('width', canvasWidth + 'px')
      .style('height', canvasHeight + 'px')
      .style('margin-top', margin.top + 'px')
      .style('margin-right', margin.right + 'px')
      .style('margin-bottom', margin.bottom + 'px')
      .style('margin-left', margin.left + 'px')
    const ctx: CanvasRenderingContext2D = canvas.node().getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.scale(heatmapCanvasPixelRatio, heatmapCanvasPixelRatio)

    let axis = container.selectAll('svg').data([null])
    axis = axis
      .enter()
      .append('svg')
      .style('position', 'absolute')
      .style('z-index', '200')
      .merge(axis)
      .style('width', width + 'px')
      .style('height', height + 'px')

    let tooltipLayer = container.selectAll('div').data([null])
    tooltipLayer = tooltipLayer
      .enter()
      .append('div')
      .style('position', 'absolute')
      .style('z-index', '300')
      .style('pointer-events', 'none')
      .merge(tooltipLayer)
      .style('width', width + 'px')
      .style('height', height + 'px')

    const xScale = d3
      .scaleLinear()
      .domain([0, data.timeAxis.length - 1])
      .range([0, canvasWidth])

    const yScale = d3
      .scaleLinear()
      .domain([0, data.keyAxis.length - 1])
      .range([0, canvasHeight])

    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((idx) =>
        data.timeAxis[idx as number] !== undefined
          ? // d3.timeFormat('%Y-%m-%d %H:%M:%S')(
            //   new Date(data.timeAxis[idx as number] * 1000)
            // )
            dayjs(data.timeAxis[idx as number] * 1000)
              .utcOffset(tz.getTimeZone())
              .format('YYYY-MM-DD HH:mm:ss')
          : ''
      )
      .ticks(width / 270)

    const labelAxis = labelAxisGroup(data.keyAxis).range([0, canvasHeight])

    const histogramAxis = histogram(data.data[dataTag])
      .xRange([0, canvasWidth])
      .yRange([0, canvasHeight])

    let xAxisG = axis.selectAll('g.x-axis').data([null])
    xAxisG = xAxisG
      .enter()
      .append('g')
      .classed('x-axis', true)
      .merge(xAxisG)
      .attr('transform', 'translate(' + margin.left + ',' + (height - 20) + ')')

    d3.zoom().transform(axis, zoomTransform)

    const zoomBehavior = d3
      .zoom()
      .scaleExtent([1, 128])
      .on('zoom', zooming)
      .on('end', zoomEnd)

    function constrainBoucing(transform) {
      const bounceRatio = 0.8
      const dragLeft = Math.max(0, transform.applyX(0))
      const dragRight = Math.max(0, canvasWidth - transform.applyX(canvasWidth))
      const dragTop = Math.max(0, transform.applyY(0))
      const dragBottom = Math.max(
        0,
        canvasHeight - transform.applyY(canvasHeight)
      )
      return d3.zoomIdentity
        .translate(
          Math.floor(transform.x - (dragLeft - dragRight) * bounceRatio),
          Math.floor(transform.y - (dragTop - dragBottom) * bounceRatio)
        )
        .scale(transform.k)
    }

    function constrainHard(transform) {
      let dx0 = transform.invertX(0),
        dx1 = transform.invertX(canvasWidth) - canvasWidth,
        dy0 = transform.invertY(0),
        dy1 = transform.invertY(canvasHeight) - canvasHeight
      return transform.translate(
        dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1),
        dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1)
      )
    }

    function zooming() {
      onZoom()
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'mousemove') {
        zoomTransform = constrainBoucing(d3.event.transform)
        hideTooltips()
      } else {
        zoomTransform = constrainHard(d3.event.transform)
        showTooltips()
      }
      render()
    }

    function zoomEnd() {
      zoomTransform = constrainHard(zoomTransform)
      axis.call(d3.zoom().transform, zoomTransform)
      if (tooltipStatus.pinned) {
        showTooltips()
      }
      render()
    }

    function focusPoint(x: number, y: number) {
      focusStatus = { xDomain: [x, x + 0.001], yDomain: [y, y + 0.001] }
    }

    function hoverBehavior(axis) {
      axis.on('mousemove', () => {
        showTooltips()
        render()
      })

      axis.on('mouseout', () => {
        if (!tooltipStatus.pinned && !isBrushing) {
          focusStatus = null
          render()
        }
      })
    }

    function showTooltips() {
      tooltipStatus.hidden = false

      if (!tooltipStatus.pinned) {
        const mouseCanvasOffset = d3.mouse(canvas.node())
        if (isNaN(mouseCanvasOffset[0])) return

        const xRescale = zoomTransform.rescaleX(xScale)
        const yRescale = zoomTransform.rescaleY(yScale)
        const x = xRescale.invert(mouseCanvasOffset[0])
        const y = yRescale.invert(mouseCanvasOffset[1])

        if (!isBrushing) focusPoint(x, y)

        if (
          mouseCanvasOffset[0] < 0 ||
          mouseCanvasOffset[0] > canvasWidth ||
          mouseCanvasOffset[1] < 0 ||
          mouseCanvasOffset[1] > canvasHeight
        ) {
          hideTooltips()
        } else {
          tooltipStatus.x = x
          tooltipStatus.y = y
        }
      }
    }

    function hideTooltips() {
      tooltipStatus.hidden = true
    }

    function hideAxisTicksWithoutLabel() {
      axis.selectAll('.tick text').each(function () {
        if (this.innerHTML === '') {
          this.parentNode.style.display = 'none'
        }
      })
    }

    axis.on('click', clicked)

    function clicked() {
      if (d3.event.defaultPrevented) return // zoom

      const mouseCanvasOffset = d3.mouse(canvas.node())
      if (
        mouseCanvasOffset[0] < 0 ||
        mouseCanvasOffset[0] > canvasWidth ||
        mouseCanvasOffset[1] < 0 ||
        mouseCanvasOffset[1] > canvasHeight
      ) {
        return
      }

      tooltipStatus.pinned = !tooltipStatus.pinned
      showTooltips()
      render()
    }

    axis.call(zoomBehavior)
    axis.call(hoverBehavior)

    function render() {
      renderHeatmap()
      // renderHighlight()
      renderAxis()
      renderBrush()
      renderTooltip()
      renderCross()
      legend(colorScheme, dataTag)
    }

    function renderHeatmap() {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      ctx.drawImage(
        bufferCanvas,
        xScale.invert(zoomTransform.invertX(0)),
        yScale.invert(zoomTransform.invertY(0)),
        xScale.invert(canvasWidth * (1 / zoomTransform.k)),
        yScale.invert(canvasHeight * (1 / zoomTransform.k)),
        0,
        0,
        canvasWidth,
        canvasHeight
      )
    }

    // function renderHighlight() {
    //   const selectedData = data.data[dataTag]
    //   const xLen = selectedData.length
    //   const yLen = selectedData[0].length
    //   const xRescale = zoomTransform.rescaleX(xScale)
    //   const yRescale = zoomTransform.rescaleY(yScale)
    //   const xStartIdx = Math.max(0, Math.floor(xScale.invert(0)))
    //   const xEndIdx = Math.min(xLen - 1, Math.ceil(xScale.invert(canvasWidth)))
    //   const yStartIdx = Math.max(0, Math.floor(yScale.invert(0)))
    //   const yEndIdx = Math.min(yLen - 1, Math.ceil(yScale.invert(canvasHeight)))

    //   ctx.shadowColor = '#fff'
    //   ctx.shadowBlur = 9 + zoomTransform.k // 10 + 1 * (zoomTransform.k - 1)
    //   ctx.fillStyle = 'blue'
    //   for (let x = xStartIdx; x < xEndIdx; x++) {
    //     for (let y = yStartIdx; y < yEndIdx; y++) {
    //       if (selectedData[x][y] > maxValue / 2) {
    //         const left = xRescale(x)
    //         const top = yRescale(y)
    //         const right = xRescale(x + 1)
    //         const bottom = yRescale(y + 1)
    //         const width = right - left
    //         const height = bottom - top
    //         const xPadding = ((0.8 + 0.5 * (1 - 1 / zoomTransform.k)) * width) / height
    //         const yPadding = ((0.8 + 0.5 * (1 - 1 / zoomTransform.k)) * height) / width
    //         ctx.beginPath()
    //         ctx.shadowOffsetX = (left + 1000) * heatmapCanvasPixelRatio
    //         ctx.shadowOffsetY = (top + 1000) * heatmapCanvasPixelRatio
    //         ctx.fillRect(-1000 - xPadding, -1000 - yPadding, right - left + xPadding * 2, bottom - top + yPadding * 2)
    //         ctx.closePath()
    //       }
    //     }
    //   }
    // }

    function renderAxis() {
      const xRescale = zoomTransform.rescaleX(xScale)
      const yRescale = zoomTransform.rescaleY(yScale)
      histogramAxis(
        xHistogramCanvas.node().getContext('2d'),
        yHistogramCanvas.node().getContext('2d'),
        focusStatus?.xDomain,
        focusStatus?.yDomain,
        xRescale,
        yRescale
      )
      labelAxis(
        labelCanvas.node().getContext('2d'),
        focusStatus?.yDomain,
        yRescale
      )
      xAxisG.call(xAxis.scale(xRescale))
      hideAxisTicksWithoutLabel()
    }

    function renderBrush() {
      if (isBrushing) {
        const brush = d3
          .brush()
          .extent([
            [0, 0],
            [canvasWidth, canvasHeight]
          ])
          .on('start', brushStart)
          .on('brush', brushing)
          .on('end', brushEnd)

        let brushSvg = axis.selectAll('g.brush').data([null])
        brushSvg = brushSvg
          .enter()
          .append('g')
          .classed('brush', true)
          .merge(brushSvg)
          .attr(
            'transform',
            'translate(' + margin.left + ',' + margin.top + ')'
          )
          .call(brush)

        function brushStart() {
          hideTooltips()
          render()
        }

        function brushing() {
          const selection = d3.event.selection
          if (selection) {
            const xRescale = zoomTransform.rescaleX(xScale)
            const yRescale = zoomTransform.rescaleY(yScale)
            focusStatus = {
              xDomain: [
                xRescale.invert(selection[0][0]),
                xRescale.invert(selection[1][0])
              ],
              yDomain: [
                yRescale.invert(selection[0][1]),
                yRescale.invert(selection[1][1])
              ]
            }
            render()
          }
        }

        function brushEnd() {
          brushSvg.remove()
          isBrushing = false

          const selection = d3.event.selection
          if (selection) {
            brush.move(brushSvg, null)
            const xRescale = zoomTransform.rescaleX(xScale)
            const yRescale = zoomTransform.rescaleY(yScale)
            const startTime =
              data.timeAxis[Math.floor(xRescale.invert(selection[0][0]))]
            const endTime =
              data.timeAxis[Math.ceil(xRescale.invert(selection[1][0]))]
            const startKey =
              data.keyAxis[Math.ceil(yRescale.invert(selection[1][1]))].key
            const endKey =
              data.keyAxis[Math.floor(yRescale.invert(selection[0][1]))].key

            onBrush({
              starttime: startTime,
              endtime: endTime,
              startkey: startKey,
              endkey: endKey
            })
          }

          showTooltips()
          render()
        }
      } else {
        axis.selectAll('g.brush').remove()
      }
    }

    function getTooltipOverviewLabel(keyIdx) {
      const startLabel = data.keyAxis[keyIdx]!.labels
      const endLabel = data.keyAxis[keyIdx - 1]!.labels

      if (!startLabel && !endLabel) {
        return []
      }
      if (!startLabel) {
        return endLabel
      }
      if (!endLabel || _.isEqual(startLabel, endLabel)) {
        return startLabel
      }

      const startLen = startLabel.length
      const endLen = endLabel.length

      // Cross start boundary, only use end label
      if (
        startLen >= 1 &&
        startLen + 1 === endLen &&
        _.isEqual(startLabel, endLabel.slice(0, startLen))
      ) {
        return endLabel
      }
      // range
      if (
        startLen >= 3 &&
        startLen === endLen &&
        _.isEqual(
          startLabel.slice(0, startLen - 1),
          endLabel.slice(0, startLen - 1)
        )
      ) {
        return [
          ...startLabel.slice(0, startLen - 1),
          `${startLabel[startLen - 1]} ~ ${endLabel[startLen - 1]}`
        ]
      }
      // Cross end boundary, only use start label
      return startLabel
    }

    function renderTooltip() {
      if (tooltipStatus.hidden) {
        tooltipLayer.selectAll('div').remove()
        return
      }

      const timeIdx = Math.floor(tooltipStatus.x)
      const keyIdx = Math.floor(tooltipStatus.y)

      if (data.keyAxis[keyIdx] == null || data.keyAxis[keyIdx + 1] == null) {
        return
      }

      if (
        data.timeAxis[timeIdx] == null ||
        data.timeAxis[timeIdx + 1] == null
      ) {
        return
      }

      const xRescale = zoomTransform.rescaleX(xScale)
      const yRescale = zoomTransform.rescaleY(yScale)
      const canvasOffset = [
        xRescale(tooltipStatus.x)!,
        yRescale(tooltipStatus.y)!
      ]

      let tooltipDiv = tooltipLayer.selectAll('div').data([null])
      tooltipDiv = tooltipDiv
        .enter()
        .append('div')
        .style('position', 'absolute')
        // .style('width', tooltipSize.width + 'px')
        // .style('height', tooltipSize.height + 'px')
        .classed('tooltip', true)
        .merge(tooltipDiv)
        .style('pointer-events', tooltipStatus.pinned ? 'all' : 'none')

      if (canvasOffset[0] < canvasWidth / 2) {
        // Left half
        const v = canvasOffset[0] + tooltipOffset.horizontal + margin.left
        tooltipDiv.style('left', `${v}px`).style('right', 'auto')
      } else {
        // Right half
        const v =
          canvasWidth -
          canvasOffset[0] +
          tooltipOffset.horizontal +
          margin.right
        tooltipDiv.style('right', `${v}px`).style('left', 'auto')
      }

      if (canvasOffset[1] < canvasHeight / 2) {
        // Top half
        const v = canvasOffset[1] + tooltipOffset.vertical + margin.top
        tooltipDiv.style('top', `${v}px`).style('bottom', 'auto')
      } else {
        // Bottom half
        const v =
          canvasHeight -
          canvasOffset[1] +
          tooltipOffset.vertical +
          margin.bottom
        tooltipDiv.style('bottom', `${v}px`).style('top', 'auto')
      }

      const value = data.data[dataTag]?.[timeIdx]?.[keyIdx]

      let valueDiv = tooltipDiv.selectAll('div.value').data([null])
      valueDiv = valueDiv
        .enter()
        .append('div')
        .classed('value', true)
        .merge(valueDiv)

      let valueText = valueDiv.selectAll('div.value').data([null])
      valueText
        .enter()
        .append('div')
        .classed('value', true)
        .merge(valueText)
        .text(withUnit(value))
        .style('color', colorScheme.label(value))
        .style('background-color', colorScheme.background(value))

      let unitText = valueDiv.selectAll('div.unit').data([null])
      unitText
        .enter()
        .append('div')
        .classed('unit', true)
        .merge(unitText)
        .text(tagUnit(dataTag))

      const timeText = [timeIdx, timeIdx + 1]
        .map((idx) =>
          // d3.timeFormat('%Y-%m-%d\n%H:%M:%S')(
          //   new Date(data.timeAxis[idx] * 1000)
          // )
          dayjs(data.timeAxis[idx as number] * 1000)
            .utcOffset(tz.getTimeZone())
            .format('YYYY-MM-DD HH:mm:ss')
        )
        .join(' ~ ')

      let timeDiv = tooltipDiv.selectAll('button.time').data([timeText])
      timeDiv
        .enter()
        .append('button')
        .classed('time', true)
        .merge(timeDiv)
        .call(clickToCopyBehavior, (d) => d)
        .text((d) => d)

      let overviewLabelDiv = tooltipDiv
        .selectAll('div.overviewLabel')
        .data([keyIdx + 1])
      overviewLabelDiv = overviewLabelDiv
        .enter()
        .append('div')
        .classed('overviewLabel', true)
        .merge(overviewLabelDiv)

      let overviewSubLabel = overviewLabelDiv
        .selectAll('.subLabel')
        .style('display', 'none')
        .data((keyIdx) => getTooltipOverviewLabel(keyIdx))

      overviewSubLabel
        .enter()
        .append('button')
        .classed('subLabel', true)
        .merge(overviewSubLabel)
        .call(clickToCopyBehavior, (d) => d)
        .text((d, idx) => {
          // Prefix with spaces
          return '\u00A0'.repeat(idx * 2) + d
        })
        .style('display', 'block')

      let keyContainer = tooltipDiv.selectAll('div.keyContainer').data([
        {
          desc: 'Start Key (Incl.):',
          idx: keyIdx + 1
        },
        {
          desc: 'End key (Excl.):',
          idx: keyIdx
        }
      ])

      keyContainer = keyContainer
        .enter()
        .append('div')
        .classed('keyContainer', true)
        .merge(keyContainer)

      let descText = keyContainer.selectAll('.desc').data((d) => [d])
      descText
        .enter()
        .append('div')
        .classed('desc', true)
        .merge(descText)
        .text(({ desc }) => desc)

      let keyText = keyContainer.selectAll('button.key').data((d) => [d])
      keyText
        .enter()
        .append('button')
        .classed('key', true)
        .merge(keyText)
        .call(clickToCopyBehavior, ({ idx }) => data.keyAxis[idx]!.key)
        .text(({ idx }) => data.keyAxis[idx]!.key)
    }

    function renderCross() {
      if (tooltipStatus.pinned) {
        const xRescale = zoomTransform.rescaleX(xScale)
        const yRescale = zoomTransform.rescaleY(yScale)
        const canvasOffset = [
          xRescale(tooltipStatus.x)!,
          yRescale(tooltipStatus.y)!
        ]
        const crossCenterPadding = 3
        const crossBorder = 1
        const crossSize = 8
        const crossWidth = 2

        ctx.lineWidth = crossWidth + 2 * crossBorder
        ctx.strokeStyle = '#111'
        ctx.beginPath()
        ctx.moveTo(canvasOffset[0], canvasOffset[1] - crossSize - crossBorder)
        ctx.lineTo(
          canvasOffset[0],
          canvasOffset[1] - crossCenterPadding + crossBorder
        )
        ctx.moveTo(
          canvasOffset[0],
          canvasOffset[1] + crossCenterPadding - crossBorder
        )
        ctx.lineTo(canvasOffset[0], canvasOffset[1] + crossSize + crossBorder)
        ctx.moveTo(canvasOffset[0] - crossSize - crossBorder, canvasOffset[1])
        ctx.lineTo(
          canvasOffset[0] - crossCenterPadding + crossBorder,
          canvasOffset[1]
        )
        ctx.moveTo(
          canvasOffset[0] + crossCenterPadding - crossBorder,
          canvasOffset[1]
        )
        ctx.lineTo(canvasOffset[0] + crossSize + crossBorder, canvasOffset[1])
        ctx.stroke()
        ctx.lineWidth = crossWidth
        ctx.strokeStyle = '#eee'
        ctx.beginPath()
        ctx.moveTo(canvasOffset[0], canvasOffset[1] - crossSize)
        ctx.lineTo(canvasOffset[0], canvasOffset[1] - crossCenterPadding)
        ctx.moveTo(canvasOffset[0], canvasOffset[1] + crossCenterPadding)
        ctx.lineTo(canvasOffset[0], canvasOffset[1] + crossSize)
        ctx.moveTo(canvasOffset[0] - crossSize, canvasOffset[1])
        ctx.lineTo(canvasOffset[0] - crossCenterPadding, canvasOffset[1])
        ctx.moveTo(canvasOffset[0] + crossCenterPadding, canvasOffset[1])
        ctx.lineTo(canvasOffset[0] + crossSize, canvasOffset[1])
        ctx.stroke()
      }
    }

    render()
  }

  return heatmapChart
}
