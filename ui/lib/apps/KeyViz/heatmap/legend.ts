import * as d3 from 'd3'
import _ from 'lodash'

import { ColorScheme } from './color'
import { DataTag } from './types'
import { tagUnit, withUnit } from './utils'

export default function (colorScheme: ColorScheme, dataTag: DataTag) {
  let marginRight = 120
  let width = 500
  let height = 50
  let innerWidth = width - marginRight
  let innerHeight = 26
  let tickCount = 5

  if (document.querySelector('.PD-Cluster-Legend') === null) {
    return
  }
  let container = (d3 as any)
    .select('.PD-Cluster-Legend')
    .style('width', `${width}px`)
    .style('height', `${height}px`)

  let xScale = (d3 as any)
    .scaleSymlog()
    .domain([colorScheme.maxValue / 1000, colorScheme.maxValue])
    .range([0, innerWidth])

  let canvas = container.selectAll('canvas').data([null])
  canvas = canvas
    .enter()
    .append('canvas')
    .style('position', 'absolute')
    .style('left', '0px')
    .style('top', '0px')
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

  let svg = container.selectAll('svg').data([null])
  svg = svg
    .enter()
    .append('svg')
    .style('position', 'absolute')
    .style('left', '0px')
    .style('top', '0px')
    .merge(svg)
    .attr('width', width)
    .attr('height', height)

  let xAxisG = svg.selectAll('g').data([null])
  xAxisG
    .enter()
    .append('g')
    .merge(xAxisG)
    .call(xAxis)
    .call((g) => {
      g.selectAll('.tick text').attr('y', innerHeight + 6)
      g.selectAll('.domain').remove()
    })

  let unitLabel = container.selectAll('div').data([null])
  unitLabel
    .enter()
    .append('div')
    .classed('unit', true)
    .merge(unitLabel)
    .text(tagUnit(dataTag))
}
