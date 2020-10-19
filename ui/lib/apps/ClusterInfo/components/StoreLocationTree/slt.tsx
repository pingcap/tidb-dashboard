import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export interface IStoreLocationProps {
  dataSource: any
}

const margin = { top: 40, right: 120, bottom: 10, left: 80 }
const width = 954
const dx = 40
const dy = width / 6

const tree = d3.tree().nodeSize([dx, dy])

const diagonal = d3
  .linkHorizontal()
  .x((d: any) => d.y)
  .y((d: any) => d.x)

// original implementation, temporary keep it
export default function SLT({ dataSource }: IStoreLocationProps) {
  const ref = useRef(null)

  useEffect(() => {
    const root = d3.hierarchy(dataSource) as any
    root.x0 = dy / 2
    root.y0 = 0
    root.descendants().forEach((d, i) => {
      d.id = i
      d._children = d.children
      // collapse all nodes default
      // if (d.depth) d.children = null
    })

    const svg = d3.select(ref.current)
    svg.selectAll('g').remove()
    svg
      .attr('viewBox', [-margin.left, -margin.top, width, dx] as any)
      .style('font', '16px sans-serif')
      .style('user-select', 'none')

    const gLink = svg
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#555')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 2)

    const gNode = svg
      .append('g')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all')

    function update(source) {
      const duration = d3.event && d3.event.altKey ? 2500 : 250
      const nodes = root.descendants().reverse()
      const links = root.links()

      // compute the new tree layout
      // it modifies root self
      tree(root)

      let left = root
      let right = root
      root.eachBefore((node) => {
        if (node.x < left.x) left = node
        if (node.x > right.x) right = node
      })

      const height = right.x - left.x + margin.top + margin.bottom

      const transition = svg
        .transition()
        .duration(duration)
        .attr('viewBox', [
          -margin.left,
          left.x - margin.top,
          width,
          height,
        ] as any)
        .tween('resize', () => () => svg.dispatch('toggle'))

      // update the nodes
      const node = gNode.selectAll('g').data(nodes, (d: any) => d.id)

      // enter any new nodes at the parent's previous position
      const nodeEnter = node
        .enter()
        .append('g')
        .attr('transform', (_d) => `translate(${source.y0},${source.x0})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)
        .on('click', (d: any) => {
          d.children = d.children ? null : d._children
          update(d)
        })

      nodeEnter
        .append('circle')
        .attr('r', 6)
        .attr('fill', (d: any) => (d._children ? '#ff4d4f' : '#3351ff'))
        .attr('stroke-width', 10)

      nodeEnter
        .append('text')
        .attr('dy', '0.31em')
        .attr('x', (d: any) => (d._children ? -8 : 8))
        .attr('text-anchor', (d: any) => (d._children ? 'end' : 'start'))
        .text(({ data: { name, value } }: any) => {
          if (value) {
            return `${name}: ${value}`
          }
          return name
        })
        .clone(true)
        .lower()
        .attr('stroke-linejoin', 'round')
        .attr('stroke-width', 3)
        .attr('stroke', 'white')

      // transition nodes to their new position
      node
        .merge(nodeEnter as any)
        .transition(transition as any)
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
        .attr('fill-opacity', 1)
        .attr('stroke-opacity', 1)

      // transition exiting nodes to the parent's new position
      node
        .exit()
        .transition(transition as any)
        .remove()
        .attr('transform', (d) => `translate(${source.y},${source.x})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)

      // update the links
      const link = gLink.selectAll('path').data(links, (d: any) => d.target.id)

      // enter any new links at the parent's previous position
      const linkEnter = link
        .enter()
        .append('path')
        .attr('d', (_d) => {
          const o = { x: source.x0, y: source.y0 }
          return diagonal({ source: o, target: o } as any)
        })

      // transition links to their new position
      link
        .merge(linkEnter as any)
        .transition(transition as any)
        .attr('d', diagonal as any)

      // transition exiting nodes to the parent's new position
      link
        .exit()
        .transition(transition as any)
        .remove()
        .attr('d', (_d) => {
          const o = { x: source.x, y: source.y }
          return diagonal({ source: o, target: o } as any)
        })

      // stash the old positions for transition
      root.eachBefore((d) => {
        d.x0 = d.x
        d.y0 = d.y
      })
    }

    update(root)
  }, [dataSource])

  return <svg ref={ref} />
}

// refs:
// https://observablehq.com/@d3/tidy-tree
// https://observablehq.com/@d3/collapsible-tree
