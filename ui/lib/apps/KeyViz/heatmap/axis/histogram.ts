import * as d3 from 'd3'
import { Section, scaleSections } from '.'

const fill = '#333'
const fillFocus = '#ccc'
const stroke = '#fff'

export function histogram(data: number[][]) {
  let xRange: [number, number] = [0, 0]
  let yRange: [number, number] = [0, 0]

  histogram.xRange = function (val: [number, number]) {
    xRange = val
    return this
  }

  histogram.yRange = function (val: [number, number]) {
    yRange = val
    return this
  }

  function histogram(
    xCtx: CanvasRenderingContext2D,
    yCtx: CanvasRenderingContext2D,
    xFocusDomain: [number, number] | null,
    yFocusDomain: [number, number] | null,
    xScale,
    yScale
  ) {
    const xHeight = xCtx.canvas.height
    const yWidth = yCtx.canvas.width

    const xLen = data.length
    const yLen = data[0].length

    const xStartIdx = Math.max(0, Math.floor(xScale.invert(xRange[0])))
    const xEndIdx = Math.min(xLen - 1, Math.ceil(xScale.invert(xRange[1])))
    const yStartIdx = Math.max(0, Math.floor(yScale.invert(yRange[0])))
    const yEndIdx = Math.min(yLen - 1, Math.ceil(yScale.invert(yRange[1])))

    const xSum: Section<number>[] = []
    const ySum: Section<number>[] = []

    for (let x = xStartIdx; x < xEndIdx; x++) {
      let sumVal = 0
      for (let y = yStartIdx; y < yEndIdx; y++) {
        sumVal += data[x][y]
      }
      xSum.push({ val: sumVal, startIdx: x, endIdx: x + 1 })
    }
    for (let y = yStartIdx; y < yEndIdx; y++) {
      let sumVal = 0
      for (let x = xStartIdx; x < xEndIdx; x++) {
        sumVal += data[x][y]
      }
      ySum.push({ val: sumVal, startIdx: y, endIdx: y + 1 })
    }

    const xBins = scaleSections(
      xSum,
      xFocusDomain,
      xRange,
      xScale,
      (origin, val) => origin + val
    )
    const yBins = scaleSections(
      ySum,
      yFocusDomain,
      yRange,
      yScale,
      (origin, val) => origin + val
    )

    const xBinsMax = d3.max(xBins, (section) => section.val)!
    const yBinsMax = d3.max(yBins, (section) => section.val)!

    xCtx.clearRect(xRange[0], 0, xRange[1], xHeight)
    xCtx.strokeStyle = stroke
    xCtx.lineWidth = 1
    for (const bin of xBins) {
      const width = bin.endPos - bin.startPos
      const height = (bin.val / xBinsMax) * xHeight
      if (height < 1) continue
      xCtx.fillStyle = bin.focus ? fillFocus : fill
      xCtx.beginPath()
      xCtx.rect(bin.startPos, xHeight - height, width, height)
      xCtx.fill()
      xCtx.stroke()
      xCtx.closePath()
    }

    yCtx.clearRect(0, yRange[0], yWidth, yRange[1])
    yCtx.strokeStyle = stroke
    yCtx.lineWidth = 1
    for (const bin of yBins) {
      const width = (bin.val / yBinsMax) * yWidth
      const height = bin.endPos - bin.startPos
      if (width < 1) continue
      yCtx.fillStyle = bin.focus ? fillFocus : fill
      yCtx.beginPath()
      yCtx.rect(yWidth - width, bin.startPos, width, height)
      yCtx.fill()
      yCtx.stroke()
      yCtx.closePath()
    }
  }

  return histogram
}
