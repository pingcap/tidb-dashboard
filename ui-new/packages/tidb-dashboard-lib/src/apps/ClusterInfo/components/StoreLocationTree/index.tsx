import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { Space } from 'antd'
import { cyan, magenta, grey } from '@ant-design/colors'
import { useTranslation } from 'react-i18next'

import { TopologyStoreLocation } from '@lib/client'

import styles from './index.module.less'
import { instanceKindName } from '@lib/utils/instanceTable'

//////////////////////////////////////

type ShortStrMap = Record<string, string>

export function getShortStrMap(
  data: TopologyStoreLocation | undefined
): ShortStrMap {
  let allShortStrMap: ShortStrMap = {}

  if (data === undefined) {
    return allShortStrMap
  }

  // location labels
  // failure-domain.beta.kubernetes.io/region => region
  data.location_labels?.forEach((label) => {
    if (label.indexOf('/') >= 0) {
      const shortStr = label.split('/').pop()
      if (shortStr) {
        allShortStrMap[label] = shortStr
      }
    }
  })

  // location labels value
  data.location_labels?.forEach((label) => {
    // get label values
    const labelValues: string[] = []
    data.stores?.forEach((store) => {
      const val = store.labels?.[label]
      if (val) {
        labelValues.push(val)
      }
    })
    const shortStrMap = trimDuplicate(labelValues)
    allShortStrMap = Object.assign(allShortStrMap, shortStrMap)
  })

  // tikv & tiflash nodes address
  const addresses = (data.stores || []).map((s) => s.address!)
  addresses.forEach((addr) => {
    if (addr.startsWith('db-')) {
      const shortStr = addr.split('.').shift()
      if (shortStr) {
        allShortStrMap[addr] = shortStr
      }
    }
  })

  return allShortStrMap
}

// input: ['aaa-111a.abc.123', 'aaa-222a.abc.123', 'aaa-333a.abc.123'], items in the array have either the same prefix or suffix, or both.
// output:
// {
//   "aaa-111a.abc.123":"111a",
//   "aaa-222a.abc.123":"222a",
//   "aaa-333a.abc.123":"333a"
// }
export function trimDuplicate(strArr: string[]): ShortStrMap {
  const shortStrMap: ShortStrMap = {}
  const strSet = new Set(strArr)
  if (strSet.size < 2) {
    return shortStrMap
  }

  let i = 0
  let c
  const charSet = new Set()
  // calc the prefix length
  let headDotOrMinusPos = -1
  while (true) {
    charSet.clear()
    for (let str of strSet) {
      c = str[i]
      if (c === undefined) {
        break
      }
      charSet.add(c)
    }
    if (c === undefined) {
      break
    }
    if (charSet.size > 1) {
      break
    }
    if (c === '.' || c === '-') {
      headDotOrMinusPos = i
    }
    i++
  }

  // calc the suffix length
  i = 0
  let tailDotOrMinusPos = -1
  while (true) {
    charSet.clear()
    for (let str of strSet) {
      c = str[str.length - 1 - i]
      if (c === undefined) {
        break
      }
      charSet.add(c)
    }
    if (c === undefined) {
      break
    }
    if (charSet.size > 1) {
      break
    }
    if (c === '.' || c === '-') {
      tailDotOrMinusPos = i
    }
    i++
  }

  if (headDotOrMinusPos === -1 && tailDotOrMinusPos === -1) {
    return shortStrMap
  }
  strSet.forEach((s) => {
    const startIdx = headDotOrMinusPos + 1
    const endIdx =
      tailDotOrMinusPos === -1 ? s.length : s.length - 1 - tailDotOrMinusPos
    const short = s.slice(startIdx, endIdx)
    shortStrMap[s] = short
  })

  return shortStrMap
}

//////////////////////////////////////

const NODE_STORES = 'Stores'
const NODE_TIFLASH = () => instanceKindName('tiflash')
const NODE_TIKV = () => instanceKindName('tikv')

type TreeNode = {
  name: string
  value: string
  children: TreeNode[]
}

export function buildTreeData(
  data: TopologyStoreLocation | undefined
): TreeNode {
  const treeData: TreeNode = { name: NODE_STORES, value: '', children: [] }

  if ((data?.location_labels?.length || 0) > 0) {
    const locationLabels: string[] = data?.location_labels || []

    for (const store of data?.stores || []) {
      // reset curNode, point to tree nodes beginning
      let curNode = treeData
      for (const curLabel of locationLabels) {
        const curLabelVal = store.labels![curLabel]
        if (curLabelVal === undefined) {
          continue
        }
        let subNode: TreeNode | undefined = curNode.children.find(
          (el) => el.name === curLabel && el.value === curLabelVal
        )
        if (subNode === undefined) {
          subNode = { name: curLabel, value: curLabelVal, children: [] }
          curNode.children.push(subNode)
        }
        // make curNode point to subNode
        curNode = subNode
      }
      const storeType =
        store.labels!['engine'] === 'tiflash' ? NODE_TIFLASH() : NODE_TIKV()
      curNode.children.push({
        name: storeType,
        value: store.address!,
        children: []
      })
    }
  }
  return treeData
}

//////////////////////////////////////

interface ITooltipConfig {
  enable: boolean
  offsetX: number
  offsetY: number
}

export interface IStoreLocationProps {
  dataSource: any
  shortStrMap?: ShortStrMap
  getMinHeight?: () => number
  onReload?: () => void
}

const MAX_STR_LENGTH = 16

const margin = { left: 60, right: 40, top: 80, bottom: 100 }
const dx = 40

const diagonal = d3
  .linkHorizontal()
  .x((d: any) => d.y)
  .y((d: any) => d.x)

function calcHeight(root) {
  let x0 = Infinity
  let x1 = -x0
  root.each((d) => {
    if (d.x > x1) x1 = d.x
    if (d.x < x0) x0 = d.x
  })
  return x1 - x0
}

export default function StoreLocationTree({
  dataSource,
  shortStrMap = {},
  getMinHeight,
  onReload
}: IStoreLocationProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  const tooltipConfig = useRef<ITooltipConfig>()
  tooltipConfig.current = {
    enable: true,
    offsetX: 0,
    offsetY: 0
  }

  useEffect(() => {
    let divWidth = divRef.current?.clientWidth || 0
    const root = d3.hierarchy(dataSource) as any
    root.descendants().forEach((d, i) => {
      d.id = i
      d._children = d.children
      // collapse all nodes default
      // if (d.depth) d.children = null
    })
    const dy = divWidth / (root.height + 2)
    let tree = d3.tree().nodeSize([dx, dy])

    const div = d3.select(divRef.current)
    div.select('svg#slt').remove()
    const svg = div
      .append('svg')
      .attr('id', 'slt')
      .attr('width', divWidth)
      .attr('height', dx + margin.top + margin.bottom)
      .style('font', '14px sans-serif')
      .style('user-select', 'none')

    const bound = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)
    const gLink = bound
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 2)
    const gNode = bound
      .append('g')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all')

    // tooltip
    const tooltip = d3.select('#store-location-tooltip')
    // zoom
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 5])
      .filter(function () {
        // ref: https://godbasin.github.io/2018/02/07/d3-tree-notes-4-zoom-amd-drag/
        // only zoom when pressing CTRL
        const isWheelEvent = d3.event instanceof WheelEvent
        return !isWheelEvent || (isWheelEvent && d3.event.ctrlKey)
      })
      .on('start', () => {
        // hide tooltip if it shows
        tooltip.style('opacity', 0)
        tooltipConfig.current!.enable = false
      })
      .on('zoom', () => {
        const t = d3.event.transform
        bound.attr(
          'transform',
          `translate(${t.x + margin.left}, ${t.y + margin.top}) scale(${t.k})`
        )
        // this will cause unexpected result when dragging
        // svg.attr('transform', d3.event.transform)
      })
      .on('end', () => {
        const t = d3.event.transform
        tooltipConfig.current = {
          enable: t.k === 1, // disable tooltip if zoom
          offsetX: t.x,
          offsetY: t.y
        }
      })
    svg.call(zoom as any)

    // zoom actions
    d3.select('#slt-zoom-in').on('click', function () {
      zoom.scaleBy(svg.transition().duration(500) as any, 1.2)
    })
    d3.select('#slt-zoom-out').on('click', function () {
      zoom.scaleBy(svg.transition().duration(500) as any, 0.8)
    })
    d3.select('#slt-zoom-reset').on('click', function () {
      // https://stackoverflow.com/a/51981636/2998877
      svg
        .transition()
        .duration(500)
        .call(zoom.transform as any, d3.zoomIdentity)
      onReload?.()
    })

    update(root)

    function update(source) {
      // use altKey to slow down the animation, interesting!
      const duration = d3.event && d3.event.altKey ? 2500 : 500
      const nodes = root.descendants().reverse()
      const links = root.links()

      // compute the new tree layout
      // it modifies root self
      tree(root)
      const boundHeight = calcHeight(root)
      // node.x represent the y axes position actually
      // [root.y, root.x] is [0, 0], we need to move it to [0, boundHeight/2]
      root.descendants().forEach((d, i) => {
        d.x += boundHeight / 2
      })
      if (root.x0 === undefined) {
        // initial root.x0, root.y0, only need to set it once
        root.x0 = root.x
        root.y0 = root.y
      }

      const contentHeight = boundHeight + margin.top + margin.bottom

      const transition = svg
        .transition()
        .duration(duration)
        .attr('width', divWidth)
        .attr('height', Math.max(getMinHeight?.() || 0, contentHeight))

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
        .on('mouseenter', onMouseEnter)
        .on('mouseleave', onMouseLeave)

      function onMouseEnter(datum) {
        if (!tooltipConfig.current?.enable) {
          return
        }

        const { name, value } = datum.data
        if (
          shortStrMap[name] === undefined &&
          shortStrMap[value] === undefined
        ) {
          return
        }

        tooltip.select('#store-location-tooltip-name').text(name)
        tooltip.select('#store-location-tooltip-value').text(value)

        const x = datum.y + margin.left + tooltipConfig.current.offsetX
        const y = datum.x + margin.top - 20 + tooltipConfig.current.offsetY
        tooltip.style(
          'transform',
          `translate(calc(-50% + ${x}px), calc(-100% + ${y}px))`
        )

        tooltip.style('opacity', 1)
      }
      function onMouseLeave() {
        tooltip.style('opacity', 0)
      }

      // circle
      nodeEnter
        .append('circle')
        .attr('r', 8)
        .attr('fill', '#fff')
        .attr('stroke', (d: any) => {
          if (d._children) {
            return grey[1]
          }
          if (d.data.name === NODE_TIFLASH()) {
            return magenta[4]
          }
          return cyan[5]
        })
        .attr('stroke-width', 3)

      // text for root node
      nodeEnter
        .filter(({ data: { name } }: any) => name === NODE_STORES)
        .append('text')
        .attr('dy', '0.31em')
        .attr('x', -15)
        .attr('text-anchor', 'end')
        .text(({ data: { name } }: any) => name)

      // text for non-root and non-leaf nodes
      const middleNodeText = nodeEnter
        .filter(
          ({ data: { name } }: any) =>
            name !== NODE_STORES &&
            name !== NODE_TIFLASH() &&
            name !== NODE_TIKV()
        )
        .append('text')
      middleNodeText
        .append('tspan')
        .text(({ data: { name } }: any) => shortStrMap[name] ?? name)
        .attr('x', -15)
        .attr('dy', '-0.2em')
        .attr('text-anchor', 'end')
      middleNodeText
        .append('tspan')
        .text(({ data: { value } }: any) => {
          if (value.length <= MAX_STR_LENGTH) {
            return value
          }
          let shortStr = shortStrMap[value] ?? value
          if (shortStr.length > MAX_STR_LENGTH) {
            const midIdx = Math.round(MAX_STR_LENGTH / 2) - 1
            shortStr =
              shortStr.slice(0, midIdx) +
              '..' +
              shortStr.slice(shortStr.length - midIdx, shortStr.length)
          }
          return shortStr
        })
        .attr('x', -15)
        .attr('dy', '1em')
        .attr('text-anchor', 'end')

      // text for leaf nodes
      const leafNodeText = nodeEnter
        .filter(
          ({ data: { name } }: any) =>
            name === NODE_TIFLASH() || name === NODE_TIKV()
        )
        .append('text')
      leafNodeText
        .append('tspan')
        .text(({ data: { name } }: any) => name)
        .attr('x', 15)
        .attr('dy', '-0.2em')
      leafNodeText
        .append('tspan')
        .text(({ data: { value } }: any) => shortStrMap[value] ?? value)
        .attr('x', 15)
        .attr('dy', '1em')

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

    function resizeHandler() {
      divWidth = divRef.current?.clientWidth || 0
      const dy = divWidth / (root.height + 2)
      tree = d3.tree().nodeSize([dx, dy])
      update(root)
    }

    window.addEventListener('resize', resizeHandler)
    return () => {
      window.removeEventListener('resize', resizeHandler)
    }
  }, [dataSource, getMinHeight, onReload, shortStrMap])

  return (
    <div ref={divRef} style={{ position: 'relative' }}>
      <Space
        style={{
          cursor: 'pointer',
          fontSize: 18,
          position: 'absolute'
        }}
      >
        <ReloadOutlined id="slt-zoom-reset" />
        <ZoomInOutlined id="slt-zoom-in" />
        <ZoomOutOutlined id="slt-zoom-out" />
        <span
          style={{
            fontStyle: 'italic',
            fontSize: 12,
            display: 'block',
            margin: '0 auto'
          }}
        >
          *{t('cluster_info.list.store_topology.tooltip')}
        </span>
      </Space>

      <div id="store-location-tooltip" className={styles.tooltip}>
        <div id="store-location-tooltip-name"></div>
        <div id="store-location-tooltip-value"></div>
      </div>
    </div>
  )
}

// refs:
// https://observablehq.com/@d3/tidy-tree
// https://observablehq.com/@d3/collapsible-tree
