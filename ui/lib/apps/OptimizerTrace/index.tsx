import React, { useCallback, useState } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Button, Upload, Space } from 'antd'
import { UploadOutlined, ArrowRightOutlined } from '@ant-design/icons'

import { Card, Toolbar, Root } from '@lib/components'

import styles from './index.module.less'
import LogicalOperatorTree, {
  LogicalOperatorNode,
} from './components/LogicalOperatorTree'
import PhysicalOperatorTree, {
  PhysicalOperatorNode,
} from './components/PhysicalOperatorTree'

export default function OptimizeTraceApp() {
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

interface OptimizerData {
  logical: {
    final: LogicalOperatorNode[]
    steps: {
      index: number
      name: string
      before: LogicalOperatorNode[]
      steps: any[]
    }[]
  }
  physical: {
    final: LogicalOperatorNode
    selected_candidates: PhysicalOperatorNode[]
    discarded_candidates: PhysicalOperatorNode[]
  }
  final: LogicalOperatorNode[]
  isFastPlan: boolean
}

function OptimizerTrace() {
  const [data, setData] = useState<OptimizerData | null>(null)

  const handleBeforeUpload = useCallback(async (file: File) => {
    const t = await file.text()
    setData(JSON.parse(t))
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

      {data && (
        <>
          <LogicalOptimization data={data} />
          <PhysicalOptimization data={data} />
        </>
      )}
    </div>
  )
}

function LogicalOptimization({ data }: { data: OptimizerData }) {
  const logicalData = data.logical
  const Steps = () => (
    <>
      {logicalData.steps.map((s) => (
        <React.Fragment key={s.index}>
          <LogicalOperatorTree
            className={styles.operator_tree}
            data={s.before}
          />
          <ArrowRightOutlined
            style={{ fontSize: '30px' }}
            className={styles.arrow}
          />
        </React.Fragment>
      ))}
    </>
  )

  return (
    <Card className={styles.container}>
      <>
        <h2>Logical</h2>
        <div className={styles.logical_optimize}>
          <Steps />
          <LogicalOperatorTree
            className={styles.operator_tree}
            data={logicalData.final}
            labels={{ color: 'blue' }}
          />
        </div>
      </>
    </Card>
  )
}

function PhysicalOptimization({ data }: { data: OptimizerData }) {
  const physicalData = data.physical
  const selectedCandidates = physicalData.selected_candidates
  const discardedCandidates = physicalData.discarded_candidates
  const allCandidates = [...selectedCandidates, ...discardedCandidates]
  const allCandidatesMap = allCandidates.reduce((acc, c) => {
    acc[c.id] = c
    return acc
  }, {} as { [props: string]: PhysicalOperatorNode })
  const operatorCandidates = allCandidates.reduce((acc, c) => {
    if (!acc[c.mapping]) {
      acc[c.mapping] = []
    }
    if (!!c.children?.length) {
      if (!c.childrenNodes) {
        c.childrenNodes = []
      }
      c.childrenNodes.push(
        ...c.children.map((cid) => {
          const cnode = allCandidatesMap[cid]
          cnode.parentNode = c
          return cnode
        })
      )
    }
    acc[c.mapping].push(c)
    return acc
  }, {} as { [props: string]: PhysicalOperatorNode[] })
  const rootOperatorCandidates = Object.entries(operatorCandidates).map(
    ([mapping, candidates]) =>
      [mapping, candidates.filter((c) => !c.parentNode)] as [
        string,
        PhysicalOperatorNode[]
      ]
  )

  const OperatorCandidates = () => (
    <>
      {rootOperatorCandidates.map((m, index) => (
        <div key={index}>
          <span>{m[0]}</span>
          <div style={{ display: 'flex“' }}>
            {m[1].map((c) => (
              <PhysicalOperatorTree key={c.id} data={c} />
            ))}
          </div>
        </div>
      ))}
    </>
  )

  return (
    <Card className={styles.container}>
      <>
        <h2>Physical</h2>
        <div>
          <OperatorCandidates />
        </div>
      </>
    </Card>
  )
}
