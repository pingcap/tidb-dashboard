import React, { useState, useReducer, useEffect, useContext } from 'react'
import { Select, Button, Modal } from 'antd'
import StatementEnableModal from './StatementEnableModal'
import StatementSettingModal from './StatementSettingModal'
import StatementsTable from './StatementsTable'
import {
  StatementStatus,
  StatementConfig,
  Instance,
  StatementOverview,
  StatementTimeRange,
} from './statement-types'
import styles from './styles.module.css'
import { SearchContext } from './search-options-context'
import { useTranslation } from 'react-i18next'
const { Option } = Select

interface State {
  curInstance: string | undefined
  curSchemas: string[]
  curTimeRange: StatementTimeRange | undefined

  statementStatus: StatementStatus

  instances: Instance[]
  schemas: string[]
  timeRanges: StatementTimeRange[]

  statementsLoading: boolean
  statements: StatementOverview[]
}

const initState: State = {
  curInstance: undefined,
  curSchemas: [],
  curTimeRange: undefined,

  statementStatus: 'unknown',

  instances: [],
  schemas: [],
  timeRanges: [],

  statementsLoading: false,
  statements: [],
}

type Action =
  | { type: 'save_instances'; payload: Instance[] }
  | { type: 'change_instance'; payload: string | undefined }
  | { type: 'change_statement_status'; payload: StatementStatus }
  | { type: 'save_schemas'; payload: string[] }
  | { type: 'change_schema'; payload: string[] }
  | { type: 'save_time_ranges'; payload: StatementTimeRange[] }
  | { type: 'change_time_range'; payload: StatementTimeRange | undefined }
  | { type: 'save_statements'; payload: StatementOverview[] }
  | { type: 'set_statements_loading' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'save_instances':
      return {
        ...state,
        instances: action.payload,
      }
    case 'change_instance':
      return {
        ...state,
        curInstance: action.payload,
        curSchemas: [],
        curTimeRange: undefined,
        statementStatus: 'unknown',
        schemas: [],
        timeRanges: [],
        statements: [],
      }
    case 'change_statement_status':
      return {
        ...state,
        statementStatus: action.payload,
      }
    case 'save_schemas':
      return {
        ...state,
        schemas: action.payload,
      }
    case 'change_schema':
      return {
        ...state,
        curSchemas: action.payload,
        statements: [],
      }
    case 'save_time_ranges':
      return {
        ...state,
        timeRanges: action.payload,
      }
    case 'change_time_range':
      return {
        ...state,
        curTimeRange: action.payload,
        statements: [],
      }
    case 'save_statements':
      return {
        ...state,
        statementsLoading: false,
        statements: action.payload,
      }
    case 'set_statements_loading':
      return {
        ...state,
        statementsLoading: true,
      }
    default:
      throw new Error('invalid action type')
  }
}

interface Props {
  onFetchInstances: () => Promise<Instance[] | undefined>
  onFetchSchemas: (instanceId: string) => Promise<string[] | undefined>
  onFetchTimeRanges: (instanceId: string) => Promise<StatementTimeRange[]>
  onFetchStatements: (
    instanceId: string,
    schemas: string[],
    beginTime: string,
    endTime: string
  ) => Promise<StatementOverview[]>

  onGetStatementStatus: (instanceId: string) => Promise<any>
  onSetStatementStatus: (
    instanceId: string,
    status: 'on' | 'off'
  ) => Promise<any>

  onFetchConfig: (instanceId: string) => Promise<StatementConfig>
  onUpdateConfig: (instanceId: string, config: StatementConfig) => Promise<any>

  detailPagePath: string
}

export default function StatementsOverview({
  onFetchInstances,
  onFetchSchemas,
  onFetchTimeRanges,
  onFetchStatements,

  onGetStatementStatus,
  onSetStatementStatus,

  onFetchConfig,
  onUpdateConfig,

  detailPagePath,
}: Props) {
  const { searchOptions, setSearchOptions } = useContext(SearchContext)
  // combine the context to state
  const [state, dispatch] = useReducer(reducer, {
    ...initState,
    ...searchOptions,
  })
  const [
    enableStatementModalVisible,
    setEnableStatementModalVisible,
  ] = useState(false)
  const [
    statementSettingModalVisible,
    setStatementSettingModalVisible,
  ] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    async function queryInstances() {
      const res = await onFetchInstances()
      dispatch({
        type: 'save_instances',
        payload: res || [],
      })
      if (res?.length === 1 && !state.curInstance) {
        dispatch({
          type: 'change_instance',
          payload: res[0].uuid,
        })
      }
    }

    queryInstances()
    // eslint-disable-next-line
  }, [])
  // empty dependency represents only run this effect once at the begining time

  useEffect(() => {
    async function queryStatementStatus() {
      if (state.curInstance) {
        const res = await onGetStatementStatus(state.curInstance)
        if (res !== undefined) {
          // TODO: set on or off according res
          // dispatch({
          //   type: 'change_statement_status',
          //   payload: 'on'
          // })
        }
      }
    }

    async function querySchemas() {
      if (state.curInstance) {
        const res = await onFetchSchemas(state.curInstance)
        dispatch({
          type: 'save_schemas',
          payload: res || [],
        })
      }
    }

    async function queryTimeRanges() {
      if (state.curInstance) {
        const res = await onFetchTimeRanges(state.curInstance)
        dispatch({
          type: 'save_time_ranges',
          payload: res || [],
        })
        if (res && res.length > 0 && !state.curTimeRange) {
          dispatch({
            type: 'change_time_range',
            payload: res[0],
          })
        }
      }
    }

    queryStatementStatus()
    querySchemas()
    queryTimeRanges()
    // eslint-disable-next-line
  }, [state.curInstance])
  // don't add the dependent functions likes onFetchTimeRanges into the dependency array
  // it will cause the infinite loop
  // wrap them by useCallback() in the parent component can fix it but I don't think it is necessary

  useEffect(() => {
    async function queryStatementList() {
      if (!state.curInstance || !state.curTimeRange) {
        return
      }
      dispatch({
        type: 'set_statements_loading',
      })
      const res = await onFetchStatements(
        state.curInstance,
        state.curSchemas,
        state.curTimeRange.begin_time!,
        state.curTimeRange.end_time!
      )
      dispatch({
        type: 'save_statements',
        payload: res || [],
      })
    }

    queryStatementList()
    // update context
    setSearchOptions({
      curInstance: state.curInstance,
      curSchemas: state.curSchemas,
      curTimeRange: state.curTimeRange,
    })
    // eslint-disable-next-line
  }, [state.curInstance, state.curSchemas, state.curTimeRange])
  // don't add the dependent functions likes onFetchStatements into the dependency array
  // it will cause the infinite loop
  // wrap them by useCallback() in the parent component can fix it but I don't think it is necessary

  function handleInstanceChange(val: string | undefined) {
    dispatch({
      type: 'change_instance',
      payload: val,
    })
  }

  function handleSchemaChange(val: string[]) {
    dispatch({
      type: 'change_schema',
      payload: val,
    })
  }

  function handleTimeRangeChange(val: string | undefined) {
    const timeRange = state.timeRanges.find((item) => item.begin_time === val)
    dispatch({
      type: 'change_time_range',
      payload: timeRange,
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
          return onSetStatementStatus(state.curInstance!, 'off').then((res) => {
            if (res !== undefined) {
              dispatch({
                type: 'change_statement_status',
                payload: 'off',
              })
            }
          })
        },
        onCancel() {},
      })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', marginBottom: 12 }}>
        {false && (
          <Select
            value={state.curInstance}
            allowClear
            placeholder="选择集群实例"
            style={{ width: 200, marginRight: 12 }}
            onChange={handleInstanceChange}
          >
            {state.instances.map((item) => (
              <Option value={item.uuid} key={item.uuid}>
                {item.name}
              </Option>
            ))}
          </Select>
        )}
        <Select
          value={state.curTimeRange?.begin_time}
          placeholder={t('statement.filters.select_time')}
          style={{ width: 340, marginRight: 12 }}
          onChange={handleTimeRangeChange}
        >
          {state.timeRanges.map((item) => (
            <Option value={item.begin_time} key={item.begin_time}>
              {item.begin_time} ~ {item.end_time}
            </Option>
          ))}
        </Select>
        <Select
          value={state.curSchemas}
          mode="multiple"
          allowClear
          placeholder={t('statement.filters.select_schemas')}
          style={{ minWidth: 200, marginRight: 12 }}
          onChange={handleSchemaChange}
        >
          {state.schemas.map((item) => (
            <Option value={item} key={item}>
              {item}
            </Option>
          ))}
        </Select>
        {state.statementStatus === 'on' && (
          <div>
            <Button
              type="primary"
              style={{ backgroundColor: 'rgba(0,128,0,1)', marginRight: 12 }}
              onClick={() => toggleStatementStatus(false)}
            >
              已开启
            </Button>
            <Button
              type="primary"
              onClick={() => setStatementSettingModalVisible(true)}
            >
              设置
            </Button>
          </div>
        )}
        {state.statementStatus === 'off' && (
          <Button type="danger" onClick={() => toggleStatementStatus(true)}>
            已关闭
          </Button>
        )}
      </div>
      {enableStatementModalVisible && (
        <StatementEnableModal
          instanceId={state.curInstance || ''}
          visible={enableStatementModalVisible}
          onOK={(instanceId) => onSetStatementStatus(instanceId, 'on')}
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
      <div className={styles.table_wrapper}>
        <StatementsTable
          statements={state.statements}
          loading={state.statementsLoading}
          timeRange={state.curTimeRange!}
          detailPagePath={detailPagePath}
        />
      </div>
    </div>
  )
}
