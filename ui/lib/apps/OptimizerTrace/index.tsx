import React, { useCallback, useState } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Button, Upload, Space, Alert, Tooltip } from 'antd'
import { UploadOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { ErrorBoundary } from 'react-error-boundary'

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
    steps: LogicalOptimizeActionStep[]
  }
  physical: {
    final: LogicalOperatorNode
    selected_candidates: PhysicalOperatorNode[]
    discarded_candidates: PhysicalOperatorNode[]
  }
  final: LogicalOperatorNode[]
  isFastPlan: boolean
}

interface LogicalOptimizeActionStep {
  index: number
  name: string
  before: LogicalOperatorNode[]
  steps: {
    id: number
    index: number
    action: string
    reason: string
    type: string
  }[]
}

function OptimizerTrace() {
  const [importedData, setImportedData] = useState<OptimizerData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleBeforeUpload = useCallback(async (file: File) => {
    setErrorMsg('')

    const t = await file.text()
    setImportedData(JSON.parse(t))
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

      {errorMsg && (
        <Card>
          <Alert showIcon type="error" message="Error" description={errorMsg} />
        </Card>
      )}

      <ErrorBoundary
        FallbackComponent={({ error, resetErrorBoundary }) => {
          setImportedData(null)
          setErrorMsg(error.message)
          resetErrorBoundary()
          return null
        }}
      >
        {importedData && (
          <>
            <LogicalOptimization data={importedData} />
            <PhysicalOptimization data={importedData} />
            <Final data={importedData} />
          </>
        )}
      </ErrorBoundary>
    </div>
  )
}

function LogicalOptimization({ data }: { data: OptimizerData }) {
  const logicalData = data.logical
  const Steps = () => (
    <>
      {logicalData.steps.map((s) => {
        const Action = () => (
          <div className={styles.steps}>
            <h3>{s.name}</h3>
            {s.steps.map((actionStep, index) => {
              const content = `action ${actionStep.index}: ${actionStep.action}
              ${actionStep.reason && `, reason: ${actionStep.reason}`}`
              return (
                <Tooltip title={content}>
                  <p key={index} className={styles.step_info}>
                    {content}
                  </p>
                </Tooltip>
              )
            })}
          </div>
        )
        return (
          <React.Fragment key={s.index}>
            <LogicalOperatorTree
              className={styles.operator_tree}
              data={s.before}
            />
            <ArrowRightOutlined
              style={{ fontSize: '30px' }}
              className={styles.arrow}
            />
            <Action />
            <ArrowRightOutlined
              style={{ fontSize: '30px' }}
              className={styles.arrow}
            />
          </React.Fragment>
        )
      })}
    </>
  )

  return (
    <Card className={styles.container}>
      <>
        <h2>Logical Optimization</h2>
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
      {rootOperatorCandidates.map((m, index) => {
        const selectedCandidates = m[1].filter((c) => c.selected)
        const unselectedCandidates = m[1].filter((c) => !c.selected)
        return (
          <div key={index} className={styles.physical_operator_tree_container}>
            <span>{m[0]}</span>
            <ArrowRightOutlined
              style={{ fontSize: '30px' }}
              className={styles.arrow}
            />
            <>
              {selectedCandidates.map((c) => (
                <PhysicalOperatorTree
                  key={c.id}
                  data={c}
                  className={styles.operator_tree}
                />
              ))}
            </>
            {!!unselectedCandidates.length && (
              <div className={styles.unselected_candidates}>
                <p>unselected candidates</p>
                {unselectedCandidates.map((c) => (
                  <PhysicalOperatorTree
                    key={c.id}
                    data={c}
                    className={styles.operator_tree}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </>
  )

  return (
    <Card className={styles.container}>
      <h2>Physical Optimization</h2>
      <div>
        <OperatorCandidates />
      </div>
    </Card>
  )
}

function Final({ data }: { data: OptimizerData }) {
  const finalData = data.final

  return (
    <Card className={styles.container}>
      <h2>Final</h2>
      <LogicalOperatorTree
        className={styles.operator_tree}
        data={finalData}
        labels={{ color: 'blue' }}
      />
    </Card>
  )
}
