import React, { useCallback, useEffect, useRef, useState } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Viz from 'viz.js'
import workerURL from 'viz.js/full.render'
import svgPanZoom from 'svg-pan-zoom'
import { Button, Upload, Space } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

import { Card, Toolbar, Root } from '@lib/components'
import styles from './index.module.less'

export default function () {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/optimizer_trace" element={<OptimizerTrace />} />
        </Routes>
      </Router>
    </Root>
  )
}
const buildNodeTree = (namespace: string, ns: OptimizeNode[]): Node => {
  const nodes = ns.map((node, index) => new Node(`${namespace}_${index}`, node))
  const nodesMap = nodes.reduce((acc, node) => {
    acc[node.props.id] = node
    return acc
  }, {} as { [id: string]: Node })

  nodes.forEach((n) => {
    n.props.children.forEach((c) => n.dedge(nodesMap[c]))
  })

  return nodes[0].getRoot() as Node
}

function OptimizerTrace() {
  const [viz] = useState(new Viz(workerURL))
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentFile, setCurrentFile] = useState<any>(null)

  useEffect(() => {
    if (!currentFile) {
      return
    }

    const logical = currentFile.logical

    logical.steps.sort((a, b) => a.index - b.index)

    const logicalCluster = new Cluster('logical', { label: 'logical optimize' })
    const ths: { tail: Node; head: Node; cluster: Cluster }[] = []

    logical.steps.forEach((step) => {
      const cluster = new Cluster(`logical_${step.name}_${step.index}`, {
        label: `${step.index}`,
      })
      const root = buildNodeTree('logical_steps', step.before as OptimizeNode[])

      const th = { head: root, tail: null as any, cluster }

      root.forEach((node) => {
        cluster.add(node as Node)
        if (!node.children.length) {
          th.tail = node as Node
        }
      })
      logicalCluster.add(cluster)
      ths.push(th)
    })

    const finalCluster = new Cluster('final', { label: 'final', color: 'blue' })
    const finalRoot = buildNodeTree(
      'logical_final',
      logical.final as OptimizeNode[]
    )
    const th = {
      head: finalRoot,
      tail: null as any,
      cluster: finalCluster,
    }

    finalRoot.forEach((node) => {
      finalCluster.add(node as Node)
      if (!node.children.length) {
        th.tail = node as Node
      }
    })
    logicalCluster.add(finalCluster)
    ths.push(th)

    for (let i = 0; i < ths.length - 1; i++) {
      const current = ths[i]
      const next = ths[i + 1]
      logicalCluster.add(
        new ClusterEdge(
          current.tail.id,
          next.head.id,
          current.cluster.id,
          next.cluster.id
        )
      )
    }

    const physical = currentFile.physical
    const physicalCluster = new Cluster('physical', {
      label: 'physical optimize',
    })

    const root = new RootGraph([logicalCluster])

    // console.log(root.draw())

    viz.renderSVGElement(root.draw()).then((el) => {
      if (!containerRef.current) {
        return
      }
      containerRef.current.appendChild(el)
      svgPanZoom(el, {
        controlIconsEnabled: true,
      })
    })
  }, [containerRef, currentFile])

  const handleBeforeUpload = useCallback(async (file: File) => {
    const t = await file.text()
    setCurrentFile(JSON.parse(t))
    return false
  }, [])

  return (
    <div>
      <Card noMarginBottom style={{ height: '70px' }}>
        <Toolbar>
          <Space>
            <Upload
              beforeUpload={handleBeforeUpload}
              accept=".json"
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Space>
        </Toolbar>
      </Card>
      <div ref={containerRef} className={styles.container}></div>
    </div>
  )
}

class RootGraph {
  constructor(public gs: Graph[]) {}

  draw() {
    return `
digraph optimizer_trace {

	graph [labeljust=l fontsize=14 fontname="Verdana" compound=true rankdir=LR splines=line];
	node [shape=ellipse fontsize=10 fontname="Verdana"];

	${this.gs.map((g) => g.draw()).join('\n')}

}
		`
  }
}

class Edge implements Graph {
  constructor(
    private from: string | number,
    private to: string | number,
    private direct = true
  ) {}

  draw(): string {
    return `${this.from} -${this.direct ? '>' : '-'} ${this.to};`
  }
}

class ClusterEdge implements Graph {
  constructor(
    private from: string | number,
    private to: string | number,
    private fromCluster: string,
    private toCluster: string,
    private direct = true
  ) {}

  draw(): string {
    return `${this.from} -${this.direct ? '>' : '-'} ${this.to} [ltail=${
      this.fromCluster
    } lhead=${this.toCluster}];`
  }
}

class TreeNode {
  parent: TreeNode | null = null
  children: TreeNode[] = []

  getRoot(): TreeNode {
    return this.parent ? this.parent.getRoot() : this
  }

  forEach(fn: (n: TreeNode) => void): void {
    fn(this)
    this.children.forEach((c) => c.forEach(fn))
  }

  protected addChild(n: TreeNode) {
    n.parent = this
    this.children.push(n)
  }
}

class Node extends TreeNode implements Graph {
  public id: string

  constructor(
    private namespace: string,
    public props: OptimizeNode,
    private gs: Graph[] = []
  ) {
    super()
    this.id = `${this.namespace}_${this.props.id}`
  }

  dedge(g: Node): Node {
    this.addChild(g)
    this.gs.push(new Edge(this.id, g.id))
    return this
  }

  draw(): string {
    return `
			${this.id} [label="${this.props.type}"];
			${this.gs.map((g) => g.draw()).join('\n')}
		`
  }
}

class Cluster implements Graph {
  private gs: Graph[] = []
  public id: string

  constructor(_id: string, private props: { label: string; color?: string }) {
    this.id = `cluster_${_id}`
  }

  add(g: Graph): Cluster {
    this.gs.push(g)
    return this
  }

  draw(): string {
    return `
subgraph ${this.id} {
	graph [${Object.entries(this.props)
    .filter(([k, v]) => !!v)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')}];

	${this.gs.map((g) => g.draw()).join('\n')}
}`
  }
}

interface Graph {
  draw(): string
}

// interface TreeNode extends Graph {
//   nodes: TreeNode[]
// }

interface OptimizeNode {
  id: number
  children: number[] // children id
  type: string
  cost: number
  selected: boolean
  property: string
  info: string
}

interface StepNode {
  id: number
  index: number
  action: string
  reason: string
  type: string
}
