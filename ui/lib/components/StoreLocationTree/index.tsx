import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export interface IStoreLocationProps {
  dataSource: any
}

const margin = { top: 10, right: 120, bottom: 10, left: 40 }
const width = 954
const dx = 10
const dy = width / 6

const tree = d3.tree().nodeSize([dx, dy])

const diagonal = d3
  .linkHorizontal()
  .x((d: any) => d.y)
  .y((d: any) => d.x)

export default function StoreLocationTree({ dataSource }: IStoreLocationProps) {
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
      .style('font', '10px sans-serif')
      .style('user-select', 'none')

    const gLink = svg
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#555')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5)

    const gNode = svg
      .append('g')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all')

    function update(source) {
      const duration = d3.event && d3.event.altKey ? 2500 : 250
      const nodes = root.descendants().reverse()
      const links = root.links()

      // Compute the new tree layout.
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

      // Update the nodes…
      const node = gNode.selectAll('g').data(nodes, (d: any) => d.id)

      // Enter any new nodes at the parent's previous position.
      const nodeEnter = node
        .enter()
        .append('g')
        .attr('transform', (d) => `translate(${source.y0},${source.x0})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)
        .on('click', (d: any) => {
          d.children = d.children ? null : d._children
          update(d)
        })

      nodeEnter
        .append('circle')
        .attr('r', 2.5)
        .attr('fill', (d: any) => (d._children ? '#555' : '#999'))
        .attr('stroke-width', 10)

      nodeEnter
        .append('text')
        .attr('dy', '0.31em')
        .attr('x', (d: any) => (d._children ? -6 : 6))
        .attr('text-anchor', (d: any) => (d._children ? 'end' : 'start'))
        .text((d: any) => d.data.name)
        .clone(true)
        .lower()
        .attr('stroke-linejoin', 'round')
        .attr('stroke-width', 3)
        .attr('stroke', 'white')

      // Transition nodes to their new position.
      const nodeUpdate = node
        .merge(nodeEnter as any)
        .transition(transition as any)
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
        .attr('fill-opacity', 1)
        .attr('stroke-opacity', 1)

      // Transition exiting nodes to the parent's new position.
      const nodeExit = node
        .exit()
        .transition(transition as any)
        .remove()
        .attr('transform', (d) => `translate(${source.y},${source.x})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)

      // Update the links…
      const link = gLink.selectAll('path').data(links, (d: any) => d.target.id)

      // Enter any new links at the parent's previous position.
      const linkEnter = link
        .enter()
        .append('path')
        .attr('d', (d) => {
          const o = { x: source.x0, y: source.y0 }
          return diagonal({ source: o, target: o } as any)
        })

      // Transition links to their new position.
      link
        .merge(linkEnter as any)
        .transition(transition as any)
        .attr('d', diagonal as any)

      // Transition exiting nodes to the parent's new position.
      link
        .exit()
        .transition(transition as any)
        .remove()
        .attr('d', (d) => {
          const o = { x: source.x, y: source.y }
          return diagonal({ source: o, target: o } as any)
        })

      // Stash the old positions for transition.
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
