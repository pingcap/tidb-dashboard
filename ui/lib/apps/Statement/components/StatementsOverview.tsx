import React, { useReducer, useEffect, useContext, useState } from 'react'
import { Select, Space, Tooltip, Drawer, Button } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import {
  StatementOverview,
  StatementTimeRange,
  StatementConfig,
} from '@lib/client'
import { Card } from '@lib/components'
import StatementsTable from './StatementsTable'
import { StatementStatus, Instance, DATE_TIME_FORMAT } from './statement-types'
import { SearchContext } from './search-options-context'
import { SettingOutlined, ReloadOutlined } from '@ant-design/icons'
import StatementSettingForm from './StatementSettingForm'
import styles from './styles.module.less'

const { Option } = Select

interface State {
  curInstance: string | undefined
  curSchemas: string[]
  curTimeRange: StatementTimeRange | undefined
  curStmtTypes: string[]

  statementStatus: StatementStatus

  instances: Instance[]
  schemas: string[]
  timeRanges: StatementTimeRange[]
  stmtTypes: string[]

  statementsLoading: boolean
  statements: StatementOverview[]
}

const initState: State = {
  curInstance: undefined,
  curSchemas: [],
  curTimeRange: undefined,
  curStmtTypes: [],

  statementStatus: 'unknown',

  instances: [],
  schemas: [],
  timeRanges: [],
  stmtTypes: [],

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
  | { type: 'save_stmt_types'; payload: string[] }
  | { type: 'change_stmt_types'; payload: string[] }
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
    case 'save_stmt_types':
      return {
        ...state,
        stmtTypes: action.payload,
      }
    case 'change_stmt_types':
      return {
        ...state,
        curStmtTypes: action.payload,
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
  onFetchStmtTypes: (instanceId: string) => Promise<string[] | undefined>
  onFetchStatements: (
    instanceId: string,
    beginTime: number,
    endTime: number,
    schemas: string[],
    stmtTypes: string[]
  ) => Promise<StatementOverview[]>

  onFetchConfig: (instanceId: string) => Promise<StatementConfig | undefined>
  onUpdateConfig: (instanceId: string, config: StatementConfig) => Promise<any>

  detailPagePath: string
}

export default function StatementsOverview({
  onFetchInstances,
  onFetchSchemas,
  onFetchTimeRanges,
  onFetchStmtTypes,
  onFetchStatements,

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
  const [refreshTimes, setRefreshTimes] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
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
        const res = await onFetchConfig(state.curInstance)
        if (res !== undefined) {
          dispatch({
            type: 'change_statement_status',
            payload: res.enable ? 'on' : 'off',
          })
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

    async function queryStmtTypes() {
      if (state.curInstance) {
        const res = await onFetchStmtTypes(state.curInstance)
        dispatch({
          type: 'save_stmt_types',
          payload: res || [],
        })
      }
    }

    queryStatementStatus()
    querySchemas()
    queryTimeRanges()
    queryStmtTypes()
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
        state.curTimeRange.begin_time!,
        state.curTimeRange.end_time!,
        state.curSchemas,
        state.curStmtTypes
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
      curStmtTypes: state.curStmtTypes,
    })
    // eslint-disable-next-line
  }, [
    state.curInstance,
    state.curSchemas,
    state.curTimeRange,
    state.curStmtTypes,
    refreshTimes,
  ])
  // don't add the dependent functions likes onFetchStatements into the dependency array
  // it will cause the infinite loop
  // wrap them by useCallback() in the parent component can fix it but I don't think it is necessary

  function handleSchemaChange(val: string[]) {
    dispatch({
      type: 'change_schema',
      payload: val,
    })
  }

  function handleTimeRangeChange(val: string) {
    const timeRange = state.timeRanges.find(
      (item) => `${item.begin_time}_${item.end_time}` === val
    )
    dispatch({
      type: 'change_time_range',
      payload: timeRange,
    })
  }

  function handleStmtTypeChange(val: string[]) {
    dispatch({
      type: 'change_stmt_types',
      payload: val,
    })
  }

  const StatementDisabled = (
    <div className={styles.statement_disabled_container}>
      <h2>该功能未启用</h2>
      <div className={styles.statement_disabled_desc}>
        <p>SQL 语句分析功能未启用，因此无法查看历史记录。</p>
        <p>您可以修改设置打开该功能后等待新数据收集。</p>
      </div>
      <Button type="primary" onClick={() => setShowSettings(true)}>
        打开设置
      </Button>
    </div>
  )

  return (
    <div>
      <Card>
        <div style={{ display: 'flex' }}>
          <Space size="middle">
            <Select
              value={`${state.curTimeRange?.begin_time}_${state.curTimeRange?.end_time}`}
              placeholder={t('statement.filters.select_time')}
              style={{ width: 360 }}
              onChange={handleTimeRangeChange}
            >
              {state.timeRanges.map((item) => (
                <Option
                  value={`${item.begin_time}_${item.end_time}`}
                  key={`${item.begin_time}_${item.end_time}`}
                >
                  {dayjs.unix(item.begin_time!).format(DATE_TIME_FORMAT)} ~{' '}
                  {dayjs.unix(item.end_time!).format(DATE_TIME_FORMAT)}
                </Option>
              ))}
            </Select>
            <Select
              value={state.curSchemas}
              mode="multiple"
              allowClear
              placeholder={t('statement.filters.select_schemas')}
              style={{ minWidth: 200 }}
              onChange={handleSchemaChange}
            >
              {state.schemas.map((item) => (
                <Option value={item} key={item}>
                  {item}
                </Option>
              ))}
            </Select>
            <Select
              value={state.curStmtTypes}
              mode="multiple"
              allowClear
              placeholder={t('statement.filters.select_stmt_types')}
              style={{ minWidth: 160 }}
              onChange={handleStmtTypeChange}
            >
              {state.stmtTypes.map((item) => (
                <Option value={item} key={item}>
                  {item.toUpperCase()}
                </Option>
              ))}
            </Select>
          </Space>
          <div style={{ flex: 1 }} />
          <Space size="middle">
            <Tooltip title={t('statement.tooltip.settings')}>
              <SettingOutlined onClick={() => setShowSettings(true)} />
            </Tooltip>
            <Tooltip title={t('statement.tooltip.refresh')}>
              <ReloadOutlined
                onClick={() => setRefreshTimes((prev) => prev + 1)}
              />
            </Tooltip>
          </Space>
        </div>
      </Card>
      {state.statementStatus === 'off' ? (
        StatementDisabled
      ) : (
        <StatementsTable
          key={`${state.statements.length}_${refreshTimes}`}
          statements={state.statements}
          loading={state.statementsLoading}
          timeRange={state.curTimeRange!}
          detailPagePath={detailPagePath}
        />
      )}
      <Drawer
        title="设置"
        width={300}
        closable={true}
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        destroyOnClose={true}
      >
        <StatementSettingForm
          instanceId={state.curInstance || ''}
          onClose={() => setShowSettings(false)}
          onFetchConfig={onFetchConfig}
          onUpdateConfig={onUpdateConfig}
        />
      </Drawer>
    </div>
  )
}
