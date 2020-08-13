import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export interface IStoreLocationProps {
  dataSource: any
}

const width = 954
const dx = 10
let dy

const tree = (data) => {
  const root = d3.hierarchy(data)
  dy = width / (root.height + 1)
  return d3.tree().nodeSize([dx, dy])(root)
}

const diagonal = d3
  .linkHorizontal()
  .x((d: any) => d.y)
  .y((d: any) => d.x)

export default function StoreLocationTree({ dataSource }: IStoreLocationProps) {
  const ref = useRef(null)

  useEffect(() => {
    const root = tree(dataSource)
    let x0 = Infinity
    let x1 = -x0
    root.each((d) => {
      if (d.x > x1) x1 = d.x
      if (d.x < x0) x0 = d.x
    })

    const svg = d3.select(ref.current)
    svg.select('g').remove()
    svg.attr('viewBox', [0, 0, width, x1 - x0 + dx * 2] as any)

    const g = svg
      .append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('transform', `translate(${dy / 3},${dx - x0})`)

    const link = g
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#555')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('d', diagonal as any)

    const node = g
      .append('g')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-width', 3)
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('transform', (d) => `translate(${d.y},${d.x})`)

    node
      .append('circle')
      .attr('fill', (d) => (d.children ? '#555' : '#999'))
      .attr('r', 2.5)

    node
      .append('text')
      .attr('dy', '0.31em')
      .attr('x', (d) => (d.children ? -6 : 6))
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .text((d: any) => d.data.name)
      .clone(true)
      .lower()
      .attr('stroke', 'white')
  }, [dataSource])

  return <svg ref={ref} />
}
