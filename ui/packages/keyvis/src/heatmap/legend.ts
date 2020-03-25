import * as d3 from 'd3'
import _ from 'lodash'

import { ColorScheme } from './color'
import { DataTag } from './types'
import { tagUnit, withUnit } from './utils'

export default function (colorScheme: ColorScheme, dataTag: DataTag) {
  let marginLeft = 70
  let marginRight = 120
  let width = 500
  let height = 50
  let innerWidth = width - marginLeft - marginRight
  let innerHeight = 26
  let tickCount = 5

  if (document.querySelector('.PD-Cluster-Legend') === null) {
    return
  }
  let contaiiner = (d3 as any).select('.PD-Cluster-Legend')

  let xScale = (d3 as any)
    .scaleSymlog()
    .domain([colorScheme.maxValue / 1000, colorScheme.maxValue])
    .range([0, innerWidth])

  let canvas = contaiiner.selectAll('canvas').data([null])
  canvas = canvas
    .enter()
    .append('canvas')
    .style('left', marginLeft + 'px')
    .style('position', 'absolute')
    .merge(canvas)
    .attr('width', width)
    .attr('height', height)

  const ctx: CanvasRenderingContext2D = canvas.node().getContext('2d')

  for (let x = 0; x < innerWidth; x++) {
    ctx.fillStyle = colorScheme.background(xScale.invert(x)).toString()
    ctx.fillRect(x, 0, 1, innerHeight)
  }

  let xAxis = d3
    .axisBottom(xScale)
    .tickValues(
      _.range(0, tickCount + 1).map((d) =>
        xScale.invert((innerWidth * d) / tickCount)
      )
    )
    .tickSize(innerHeight)
    .tickFormat((d) => withUnit(d as number))

  let svg = contaiiner.selectAll('svg').data([null])
  svg = svg
    .enter()
    .append('svg')
    .style('position', 'absolute')
    .style('left', '0px')
    .merge(svg)
    .attr('width', width)
    .attr('height', height)

  let xAxisG = svg.selectAll('g').data([null])
  xAxisG = xAxisG
    .enter()
    .append('g')
    .attr('transform', 'translate(' + marginLeft + ', 0)')
    .merge(xAxisG)
    .call(xAxis)
    .call((g) => {
      g.selectAll('.tick text').attr('y', innerHeight + 6)
      g.selectAll('.domain').remove()
    })

  let unitLabel = contaiiner.selectAll('p').data([null])
  unitLabel = unitLabel
    .enter()
    .append('p')
    .classed('unit', true)
    .style('margin-left', marginLeft + innerWidth + 30 + 'px')
    .merge(unitLabel)
    .text(tagUnit(dataTag))
}
