import React, { useState, useReducer, useEffect } from 'react'
import { Select, Button, Modal } from 'antd'
import StatementEnableModal from './StatementEnableModal'
import StatementSettingModal from './StatementSettingModal'
import StatementsTable from './StatementsTable'
import {
  StatementStatus,
  StatementConfig,
  Instance,
  Statement
} from './statement-types'
const { Option } = Select

interface State {
  curInstance: string | undefined
  curSchema: string[]
  curTimeRange: string | undefined

  statementStatus: StatementStatus

  instances: Instance[]
  schemas: string[]
  timeRanges: string[]

  statementsLoading: boolean
  statements: Statement[]
}

const initState: State = {
  curInstance: undefined,
  curSchema: [],
  curTimeRange: undefined,

  statementStatus: 'unknown',

  instances: [],
  schemas: [],
  timeRanges: [],

  statementsLoading: false,
  statements: []
}

type Action =
  | { type: 'save_instances'; payload: Instance[] }
  | { type: 'change_instance'; payload: string | undefined }
  | { type: 'change_statement_status'; payload: StatementStatus }
  | { type: 'save_schemas'; payload: string[] }
  | { type: 'change_schema'; payload: string[] }
  | { type: 'save_time_ranges'; payload: string[] }
  | { type: 'change_time_range'; payload: string | undefined }
  | { type: 'save_statements'; payload: Statement[] }
  | { type: 'set_statements_loading' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'save_instances':
      return {
        ...state,
        instances: action.payload
      }
    case 'change_instance':
      return {
        ...state,
        curInstance: action.payload,
        curSchema: [],
        curTimeRange: undefined,
        statementStatus: 'unknown',
        schemas: [],
        timeRanges: [],
        statements: []
      }
    case 'change_statement_status':
      return {
        ...state,
        statementStatus: action.payload
      }
    case 'save_schemas':
      return {
        ...state,
        schemas: action.payload
      }
    case 'change_schema':
      return {
        ...state,
        curSchema: action.payload,
        curTimeRange: undefined,
        timeRanges: [],
        statements: []
      }
    case 'save_time_ranges':
      return {
        ...state,
        timeRanges: action.payload
      }
    case 'change_time_range':
      return {
        ...state,
        curTimeRange: action.payload,
        statements: []
      }
    case 'save_statements':
      return {
        ...state,
        statementsLoading: false,
        statements: action.payload
      }
    case 'set_statements_loading':
      return {
        ...state,
        statementsLoading: true
      }
    default:
      throw new Error('invalid action type')
  }
}

interface Props {
  onFetchInstances: () => Promise<Instance[] | undefined>
  onFetchSchemas: (instanceId: string) => Promise<string[] | undefined>
  onFetchTimeRanges: (
    instanceId: string,
    schemas: string[]
  ) => Promise<string[] | undefined>
  onFetchStatements: (
    instanceId: string,
    schemas: string[],
    timeRange: string | undefined
  ) => Promise<Statement[] | undefined>

  onGetStatementStatus: (instanceId: string) => Promise<any>
  onSetStatementStatus: (
    instanceId: string,
    status: 'on' | 'off'
  ) => Promise<any>

  onFetchConfig: (instanceId: string) => Promise<StatementConfig | undefined>
  onUpdateConfig: (instanceId: string, config: StatementConfig) => Promise<any>
}

export default function StatementList({
  onFetchInstances,
  onFetchSchemas,
  onFetchTimeRanges,
  onFetchStatements,

  onGetStatementStatus,
  onSetStatementStatus,

  onFetchConfig,
  onUpdateConfig
}: Props) {
  const [state, dispatch] = useReducer(reducer, initState)
  const [
    enableStatementModalVisible,
    setEnableStatementModalVisible
  ] = useState(false)
  const [
    statementSettingModalVisible,
    setStatementSettingModalVisible
  ] = useState(false)

  useEffect(() => {
    async function queryInstances() {
      const res = await onFetchInstances()
      dispatch({
        type: 'save_instances',
        payload: res || []
      })
    }
    queryInstances()
  }, [onFetchInstances])

  function handleInstanceChange(val: string | undefined) {
    dispatch({
      type: 'change_instance',
      payload: val
    })
    if (val === undefined) {
      return
    }
    queryStatementStatus()
    querySchemas()
    queryTimeRanges()
    queryStatementList()
  }

  function handleSchemaChange(val: string[]) {
    dispatch({
      type: 'change_schema',
      payload: val
    })
    queryTimeRanges()
    queryStatementList()
  }

  function handleTimeRangeChange(val: string | undefined) {
    dispatch({
      type: 'change_time_range',
      payload: val
    })
    queryStatementList()
  }

  async function queryStatementStatus() {
    const res = await onGetStatementStatus(state.curInstance!)
    if (res !== undefined) {
      // TODO: set on or off according res
      dispatch({
        type: 'change_statement_status',
        payload: 'on'
      })
    }
  }

  async function querySchemas() {
    const res = await onFetchSchemas(state.curInstance!)
    dispatch({
      type: 'save_schemas',
      payload: res || []
    })
  }

  async function queryTimeRanges() {
    const res = await onFetchTimeRanges(state.curInstance!, state.curSchema)
    dispatch({
      type: 'save_time_ranges',
      payload: res || []
    })
  }

  async function queryStatementList() {
    dispatch({
      type: 'set_statements_loading'
    })
    const res = await onFetchStatements(
      state.curInstance!,
      state.curSchema,
      state.curTimeRange
    )
    dispatch({
      type: 'save_statements',
      payload: res || []
    })
  }

  function toggleStatementStatus(enable: boolean) {
    if (enable) {
      setEnableStatementModalVisible(true)
    } else {
      Modal.confirm({
        title: '关闭 Statement 统计',
        content: '确认要关闭统计吗？关闭后不留存 statement 统计信息！',
        okText: '关闭',
        okButtonProps: { type: 'danger' },
        onOk() {
          return onSetStatementStatus(state.curInstance!, 'off').then(res => {
            if (res !== undefined) {
              dispatch({
                type: 'change_statement_status',
                payload: 'off'
              })
            }
          })
        },
        onCancel() {}
      })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', marginBottom: 12 }}>
        <Select
          value={state.curInstance}
          allowClear
          placeholder='选择集群实例'
          style={{ width: 200, marginRight: 12 }}
          onChange={handleInstanceChange}
        >
          {state.instances.map(item => (
            <Option value={item.uuid} key={item.uuid}>
              {item.name}
            </Option>
          ))}
        </Select>
        <Select
          mode='multiple'
          allowClear
          placeholder='选择 schema'
          style={{ minWidth: 200, marginRight: 12 }}
          onChange={handleSchemaChange}
        >
          {state.schemas.map(item => (
            <Option value={item} key={item}>
              {item}
            </Option>
          ))}
        </Select>
        <Select
          value={state.curTimeRange}
          allowClear
          placeholder='选择时间'
          style={{ width: 200, marginRight: 12 }}
          onChange={handleTimeRangeChange}
        >
          {state.timeRanges.map(item => (
            <Option value={item} key={item}>
              {item}
            </Option>
          ))}
        </Select>
        {state.statementStatus === 'on' && (
          <div>
            <Button
              type='primary'
              style={{ backgroundColor: 'rgba(0,128,0,1)', marginRight: 12 }}
              onClick={() => toggleStatementStatus(false)}
            >
              已开启
            </Button>
            <Button
              type='primary'
              onClick={() => setStatementSettingModalVisible(true)}
            >
              设置
            </Button>
          </div>
        )}
        {state.statementStatus === 'off' && (
          <Button type='danger' onClick={() => toggleStatementStatus(true)}>
            已关闭
          </Button>
        )}
      </div>
      {enableStatementModalVisible && (
        <StatementEnableModal
          instanceId={state.curInstance || ''}
          visible={enableStatementModalVisible}
          onOK={instanceId => onSetStatementStatus(instanceId, 'on')}
          onClose={() => setEnableStatementModalVisible(false)}
          onSetting={() => setStatementSettingModalVisible(true)}
          onData={() =>
            dispatch({ type: 'change_statement_status', payload: 'on' })
          }
        />
      )}
      {statementSettingModalVisible && (
        <StatementSettingModal
          instanceId={state.curInstance || ''}
          visible={statementSettingModalVisible}
          onClose={() => setStatementSettingModalVisible(false)}
          onFetchConfig={onFetchConfig}
          onUpdateConfig={onUpdateConfig}
        />
      )}
      <StatementsTable
        statements={state.statements}
        loading={state.statementsLoading}
      />
    </div>
  )
}
