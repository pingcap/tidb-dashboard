import { DeadlockModel } from '@lib/client'
import { CardTable, HighlightSQL } from '@lib/components'
import * as d3 from 'd3'
import React, { useRef, useState } from 'react'
import { useEffectOnce } from 'react-use'
import Deadlock from '..'

interface Prop {
    deadlockChain: DeadlockModel[]
    onHover: (id: string) => void
}

function DeadlockChainGraph(prop: Prop) {
    const data = {
        nodes: [{ id: '426812829645406216' }, { id: '426812829645406217' }] as {
            id: string
        }[],
        links: [
            {
                source: 0,
                target: 1,
                type: 'blocked',
                key: '7480000000000000355F728000000000000002',
            },
            {
                source: 1,
                target: 0,
                type: 'blocked',
                key: '7480000000000000355F728000000000000001',
            },
        ] as { source: number; target: number; type: string; key: string }[],
    }
    for (let node of prop.deadlockChain) {
        const newObject = { id: node.try_lock_trx_id!!.toString() }
        data.nodes.splice(0, 0, newObject)
    }
    const links = data.links.map(Object.create)
    const nodes = data.nodes.map(Object.create)
    console.log(data, links, nodes)
    const [nodeCurrentLookingAt, setNodeCurrentLookingAt] = useState(
        null as number | null
    )
    const containerRef = useRef<HTMLDivElement>(null)
    function linkArc(d) {
        const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y)
        return `
            M${d.source.x},${d.source.y}
            A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
        `
    }
    useEffectOnce(() => {
        const simulation = d3
            .forceSimulation(nodes)
            .force('link', d3.forceLink(links))
            .force('charge', d3.forceManyBody().strength(-2000))
            .force('x', d3.forceX())
            .force('y', d3.forceY())
        const svg = d3
            .create('svg')
            .attr('width', 400)
            .attr('height', 300)
            .attr('viewBox', '-100, -75, 200, 150')
            .style('font', '12px sans-serif')

        svg
            .append('defs')
            .selectAll('marker')
            .data(['blocked'])
            .join('marker')
            .attr('id', (d) => `arrow-${d}`)
            .attr('viewBox', '0 0 10 10')
            .attr('refX', 38)
            .attr('refY', -5)
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('orient', 'auto')
            .append('path')
            .attr('fill', 'red')
            .attr('d', 'M0,-5L10,0L0,5')

        const link = svg
            .append('g')
            .attr('fill', 'none')
            .attr('stroke-width', 1)
            .selectAll('path')
            .data(links)
            .join('path')
            .attr('stroke', 'red')
            .attr('marker-end', (d) => `url(#arrow-${d.type})`)
            .join('g')

        const node = svg
            .append('g')
            .attr('fill', 'currentColor')
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .selectAll('g')
            .data(nodes)
            .join('g')

        node
            .append('circle')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('fill', 'white')
            .attr('r', 25)
            .on('mouseover', function (d, i) {
                setNodeCurrentLookingAt(i)
            })

        node
            .append('text')
            .attr('x', -20)
            .attr('y', 4)
            .text((d) => d.id.slice(d.id.length - 6))
            .clone(true)
            .lower()
            .attr('fill', 'none')
            .attr('stroke', 'white')
            .attr('stroke-width', 3)

        simulation.on('tick', () => {
            link.attr('d', linkArc)
            node.attr('transform', (d) => `translate(${d.x},${d.y})`)
        })

        containerRef.current?.appendChild(svg.node()!)
    })
    return (
        <div>
            <div ref={containerRef} />
            <CardTable
                loading={false}
                columns={[
                    {
                        name: 'try_lock_trx',
                        key: 'try_lock_trx',
                        minWidth: 100,
                        onRender: (it) => it.try_lock_trx,
                    },
                    {
                        name: 'sql',
                        key: 'sql',
                        minWidth: 350,
                        onRender: (it) => <HighlightSQL sql={it.sql} compact />,
                    },
                    {
                        name: 'locked_key',
                        key: 'locked_key',
                        minWidth: 300,
                        onRender: (it) => it.locked_key,
                    },
                    {
                        name: 'holding_lock_trx',
                        key: 'holding_lock_trx',
                        minWidth: 150,
                        onRender: (it) => it.holding_lock_trx,
                    },
                ]}
                items={prop.deadlockChain}
                orderBy={'try_lock_trx'}
                desc={false}
                data-e2e="detail_tabs_deadlock"
            />
        </div>
    )
}

export default DeadlockChainGraph