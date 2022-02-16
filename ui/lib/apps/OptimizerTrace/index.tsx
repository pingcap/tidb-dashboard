import React, { useCallback, useEffect, useRef, useState } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Viz from 'viz.js'
import workerURL from 'viz.js/full.render'
import svgPanZoom from 'svg-pan-zoom'
import { Button, Upload, Space } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

import {
  Card,
  AutoRefreshButton,
  TimeRangeSelector,
  calcTimeRange,
  DEFAULT_TIME_RANGE,
  Toolbar,
  Root,
} from '@lib/components'
import styles from './index.module.less'

import { test_data } from './test_data'

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

function OptimizerTrace() {
  const [viz] = useState(new Viz(workerURL))
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    viz
      .renderSVGElement(
        `digraph g {

					graph [fontsize=14 fontname="Verdana" compound=true rankdir=LR splines=line];
					node [shape=circle fontsize=10 fontname="Verdana"];

						{ rank=same;
								0 [style = invis];
								02 [style=invis];

						}

						02 -> "0A" [style=invis];
						0 -> "0C" [style=invis];

						subgraph logical {
								label="logical";

								subgraph clusterA {
										"0A" -> "1A" -> "2A" [constraint=false];
										label="A";
								}

								subgraph clusterB {
										"0B" -> "1B" -> "2B" [constraint=false];
										label="B";
								}

								subgraph clusterCC {
										"0CC" -> "1CC" -> "2CC" [constraint=false];
										label="CC";
								}

								"0A" -> "0B" [ltail=clusterA lhead=clusterB];
								"0B" -> "0CC" [ltail=clusterB lhead=clusterCC];
						}

						subgraph physical {
								label="physical";

								subgraph clusterC {
										"0C" -> "1C" -> "2C";
										label="C";
										color=blue;
								}

								subgraph clusterD {
										"0D" -> "1D" -> "2D";
										label="D";
								}

								"2C" -> "0D"[style=invis];
						}

						// edges between clusters
						// edge[constraint=false, style=solid];
						// "0A" -> "1B" [label=a]
						// "1A" -> "2B" [label=a]
						// "0B" -> "1C" [label=b]
						// "1B" -> "2C" [label=b]
				}
			`
      )
      .then((el) => {
        if (!containerRef.current) {
          return
        }
        containerRef.current.appendChild(el)
        svgPanZoom(el, {
          controlIconsEnabled: true,
        })
      })
  }, [containerRef])

  const handleBeforeUpload = useCallback((file) => {
    console.log(file)
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

// class RootGraph {
//   constructor(public g: Graph) {}

//   build() {
//     return this.g.build()
//   }
// }

// interface Graph {
//   dedgeop(g: Graph): Graph
//   uedgeop(g: Graph): Graph

//   combine(g: Graph): Graph
//   build(): string
// }

// interface Node extends Graph {}

// interface TreeNode extends Graph {
//   nodes: TreeNode[]
// }

// interface LogicalOptimize extends Graph {
//   steps: TreeNode[]
// }

// interface OptimizeNode extends TreeNode {
//   id: number
//   children: number[] // children id
//   type: string
//   cost: number
//   selected: boolean
//   property: string
//   info: string
// }

// interface StepNode extends TreeNode {
//   id: number
//   index: number
//   action: string
//   reason: string
//   type: string
// }
