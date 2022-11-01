import React, { useCallback, useContext, useState } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Button, Upload, Space, Alert, Tooltip, Input, Modal } from 'antd'
import { UploadOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { ErrorBoundary } from 'react-error-boundary'

import { Card, Toolbar, Root } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'
import { useLocationChange } from '@lib/hooks/useLocationChange'

import LogicalOperatorTree, {
  LogicalOperatorNode
} from './components/LogicalOperatorTree'
import PhysicalOperatorTree, {
  PhysicalOperatorNode,
  PhysicalOperatorTreeWithFullScreen
} from './components/PhysicalOperatorTree'
import { OptimizerTraceContext } from './context'
import translations from './translations'

import styles from './index.module.less'
import PhysicalCostTree, {
  PhysicalCostMap
} from './components/PhysicalCostTree'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/optimizer_trace" element={<OptimizerTrace />} />
    </Routes>
  )
}

export default function OptimizeTraceApp() {
  const ctx = useContext(OptimizerTraceContext)
  if (ctx === null) {
    throw new Error('OptimizerTraceContext must not be null')
  }

  return (
    <Root>
      <Router>
        <AppRoutes />
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
    // old format
    selected_candidates?: PhysicalOperatorNode[]
    discarded_candidates?: PhysicalOperatorNode[]
    // new format
    candidates?: {
      [x: string]: PhysicalOperatorNode
    }
    costs?: PhysicalCostMap
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
  // const ctx = useContext(OptimizerTraceContext)

  const [importedData, setImportedData] = useState<OptimizerData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [showRunSQL, setShowRunSQL] = useState(false)
  const [sqlStr, setSqlStr] = useState('')
  const [running, setRunning] = useState(false)

  const handleBeforeUpload = useCallback(async (file: File) => {
    setErrorMsg('')

    const t = await file.text()
    setImportedData(JSON.parse(t))
    return false
  }, [])

  function toggleRunSQL() {
    setShowRunSQL((pre) => !pre)
  }

  async function handleRunSQL() {
    // if (!sqlStr.startsWith('trace plan')) {
    //   setErrorMsg('The SQL must start with "trace plan"')
    //   return
    // }
    // try {
    //   setRunning(true)
    //   setErrorMsg('')
    //   const resp = await ctx?.ds.queryEditorRun({
    //     max_rows: 1000,
    //     statements: sqlStr
    //   })
    //   if (resp?.data.error_msg) {
    //     setErrorMsg(resp?.data.error_msg)
    //   } else {
    //     // TODO
    //     setShowRunSQL(false)
    //     fetch('/optimizer-trace-example-1.json')
    //       .then((res) => res.json())
    //       .then((data) => setImportedData(data))
    //   }
    // } catch (err) {
    //   console.log(err)
    // } finally {
    //   setRunning(false)
    // }
  }

  return (
    <div>
      <Card noMarginBottom style={{ height: '70px' }}>
        <Toolbar>
          <Space style={{ alignItems: 'flex-start' }}>
            <Button onClick={toggleRunSQL}>Run SQL</Button>
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

      {showRunSQL && (
        <Card noMarginTop>
          <Input.TextArea
            rows={4}
            placeholder="Example SQL: trace plan select * from t;"
            onChange={(e) => setSqlStr(e.target.value)}
            defaultValue={sqlStr}
          />
          <Button
            style={{ marginTop: 8 }}
            type="primary"
            onClick={handleRunSQL}
            disabled={sqlStr.length === 0}
            loading={running}
          >
            Run
          </Button>
        </Card>
      )}

      {errorMsg && (
        <Card noMarginTop>
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
  const [physicalNodeName, setPhysicalNodeName] = useState('')
  const [logicalNodeName, setLogicalNodeName] = useState('')

  const [showCostTreeModal, setShowCostTreeModal] = useState(false)
  const [fullScreenPhysicalNode, setFullScreenPhysicalNode] = useState<
    PhysicalOperatorNode | undefined
  >(undefined)

  const physicalData = data.physical

  let allCandidatesMap: { [x: string]: PhysicalOperatorNode } = {}

  if (physicalData.candidates) {
    allCandidatesMap = physicalData.candidates
  } else {
    const selectedCandidates = physicalData.selected_candidates || []
    const discardedCandidates = physicalData.discarded_candidates || []

    const allCandidates = [...selectedCandidates, ...discardedCandidates]
    allCandidatesMap = allCandidates.reduce((acc, c) => {
      acc[c.id] = c
      return acc
    }, {} as { [props: string]: PhysicalOperatorNode })
  }

  // convert to tree
  Object.values(allCandidatesMap).forEach((c) => {
    c.childrenNodes = (c.children || []).map((i) => allCandidatesMap[i])
    // fix cost
    c.cost = physicalData.costs?.[`${c.type}_${c.id}`]?.cost ?? c.cost
  })

  const operatorCandidates = Object.values(allCandidatesMap).reduce(
    (acc, c) => {
      if (c.mapping === '') {
        return acc
      }
      if (!acc[c.mapping]) {
        acc[c.mapping] = []
      }
      // if (!!c.children?.length) {
      //   if (!c.childrenNodes) {
      //     c.childrenNodes = []
      //   }
      //   c.childrenNodes.push(
      //     ...c.children.map((cid) => {
      //       const cnode = allCandidatesMap[cid]
      //       cnode.parentNode = c
      //       return cnode
      //     })
      //   )
      // }
      acc[c.mapping].push(c)
      return acc
    },
    {} as { [props: string]: PhysicalOperatorNode[] }
  )
  // console.log('operator candidates:', operatorCandidates)

  // const rootOperatorCandidates = Object.entries(operatorCandidates)
  // .map(
  //   ([mapping, candidates]) =>
  //     [mapping, candidates.filter((c) => !c.parentNode)] as [
  //       string,
  //       PhysicalOperatorNode[]
  //     ]
  // )
  // console.log('root operator candidates:', rootOperatorCandidates)

  function updatePhysicalNodeName(name: string) {
    setPhysicalNodeName(name)
    setShowCostTreeModal(true)
  }

  const OperatorCandidates = () => {
    const selectedCandidates = operatorCandidates[logicalNodeName].filter(
      (c) => c.selected
    )
    const unselectedCandidates = operatorCandidates[logicalNodeName].filter(
      (c) => !c.selected
    )
    return (
      <div className={styles.physical_operator_tree_container}>
        {!!selectedCandidates.length && (
          <div className={styles.selected_candidates}>
            <p>selected candidates</p>
            <div className={styles.physical_operator_tree_container}>
              {selectedCandidates.map((c) => (
                <PhysicalOperatorTreeWithFullScreen
                  key={c.id}
                  data={c}
                  className={styles.operator_tree}
                  onSelect={updatePhysicalNodeName}
                  nodeName={physicalNodeName}
                  onFullScreen={() => setFullScreenPhysicalNode(c)}
                />
              ))}
            </div>
          </div>
        )}
        {!!unselectedCandidates.length && (
          <div className={styles.unselected_candidates}>
            <p>unselected candidates</p>
            <div className={styles.physical_operator_tree_container}>
              {unselectedCandidates.map((c) => (
                <PhysicalOperatorTreeWithFullScreen
                  key={c.id}
                  data={c}
                  className={styles.operator_tree}
                  onSelect={updatePhysicalNodeName}
                  nodeName={physicalNodeName}
                  onFullScreen={() => setFullScreenPhysicalNode(c)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={styles.container}>
      <h2>
        Physical Optimization {logicalNodeName && `for ${logicalNodeName}`}
      </h2>
      <div className={styles.physical_operator_tree_container}>
        <LogicalOperatorTree
          className={styles.operator_tree}
          data={data.logical.final}
          nodeName={logicalNodeName}
          onSelect={setLogicalNodeName}
        />
        <ArrowRightOutlined
          style={{ fontSize: '30px' }}
          className={styles.arrow}
        />
        {logicalNodeName && <OperatorCandidates />}
      </div>

      <Modal
        title={`Physical Optimization for ${logicalNodeName}`}
        style={{ top: 50 }}
        width="60%"
        visible={fullScreenPhysicalNode !== undefined}
        onCancel={() => setFullScreenPhysicalNode(undefined)}
        footer={null}
        destroyOnClose={true}
      >
        <PhysicalOperatorTree
          data={fullScreenPhysicalNode!}
          className={styles.physical_operator_tree_modal_container}
          onSelect={updatePhysicalNodeName}
          nodeName={physicalNodeName}
        />
      </Modal>

      <Modal
        title={`Cost for ${physicalNodeName}`}
        style={{ top: 50 }}
        width="90%"
        visible={showCostTreeModal}
        onCancel={() => setShowCostTreeModal(false)}
        footer={null}
        destroyOnClose={true}
      >
        <PhysicalCostTree
          costs={physicalData.costs ?? {}}
          name={physicalNodeName}
        />
      </Modal>
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

export * from './context'
