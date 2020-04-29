import React, { useReducer, useEffect, useState } from 'react'
import { Select, Space, Tooltip, Drawer, Button, Checkbox } from 'antd'
import { useLocalStorageState, useSessionStorageState } from '@umijs/hooks'
import { SettingOutlined, ReloadOutlined } from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { useTranslation } from 'react-i18next'
import client, { StatementTimeRange, StatementModel } from '@lib/client'
import { Card, ColumnsSelector, IColumnKeys, Toolbar } from '@lib/components'
import StatementsTable from './StatementsTable'
import StatementSettingForm from './StatementSettingForm'
import TimeRangeSelector from './TimeRangeSelector'

import styles from './styles.module.less'

const { Option } = Select

const QUERY_OPTIONS = 'statement.query_options'
const VISIBLE_COLUMN_KEYS = 'statement.visible_column_keys'
const SHOW_FULL_SQL = 'statement.show_full_sql'

const defColumnKeys: IColumnKeys = {
  digest_text: true,
  sum_latency: true,
  avg_latency: true,
  exec_count: true,
  avg_mem: true,
  related_schemas: true,
}

interface QueryOptions {
  curSchemas: string[]
  curTimeRange: StatementTimeRange | undefined
  curStmtTypes: string[]
}

const initialQueryOptions: QueryOptions = {
  curSchemas: [],
  curTimeRange: undefined,
  curStmtTypes: [],
}

interface State extends QueryOptions {
  statementEnable: boolean

  schemas: string[]
  timeRanges: StatementTimeRange[]
  stmtTypes: string[]

  statementsLoading: boolean
  statements: StatementModel[]
}

const initState: State = {
  ...initialQueryOptions,

  statementEnable: true,

  schemas: [],
  timeRanges: [],
  stmtTypes: [],

  statementsLoading: true,
  statements: [],
}

type Action =
  | { type: 'change_statement_status'; payload: boolean }
  | { type: 'save_schemas'; payload: string[] }
  | { type: 'change_schema'; payload: string[] }
  | { type: 'save_time_ranges'; payload: StatementTimeRange[] }
  | { type: 'change_time_range'; payload: StatementTimeRange | undefined }
  | { type: 'save_stmt_types'; payload: string[] }
  | { type: 'change_stmt_types'; payload: string[] }
  | { type: 'save_statements'; payload: StatementModel[] }
  | { type: 'set_statements_loading' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'change_statement_status':
      return {
        ...state,
        statementEnable: action.payload,
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

export default function StatementsOverview() {
  const { t } = useTranslation()

  const [queryOptions, setQueryOptions] = useSessionStorageState(
    QUERY_OPTIONS,
    initialQueryOptions
  )

  // combine the context to state
  const [state, dispatch] = useReducer(reducer, {
    ...initState,
    ...queryOptions,
  })

  const [refreshTimes, setRefreshTimes] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [columns, setColumns] = useState<IColumn[]>([])
  const [visibleColumnKeys, setVisibleColumnKeys] = useLocalStorageState(
    VISIBLE_COLUMN_KEYS,
    defColumnKeys
  )
  const [showFullSQL, setShowFullSQL] = useLocalStorageState(
    SHOW_FULL_SQL,
    false
  )

  useEffect(() => {
    async function queryStatementStatus() {
      const res = await client.getInstance().statementsConfigGet()
      if (res?.data) {
        dispatch({
          type: 'change_statement_status',
          payload: res?.data.enable!,
        })
      }
    }

    async function querySchemas() {
      const res = await client.getInstance().statementsSchemasGet()
      dispatch({
        type: 'save_schemas',
        payload: res?.data || [],
      })
    }

    async function queryTimeRanges() {
      const res = await client.getInstance().statementsTimeRangesGet()
      dispatch({
        type: 'save_time_ranges',
        payload: res?.data || [],
      })
      if (res?.data?.length > 0 && !state.curTimeRange) {
        dispatch({
          type: 'change_time_range',
          payload: res?.data[0],
        })
      }
      if (res?.data?.length === 0) {
        dispatch({
          type: 'change_time_range',
          payload: undefined,
        })
      }
    }

    async function queryStmtTypes() {
      const res = await client.getInstance().statementsStmtTypesGet()
      dispatch({
        type: 'save_stmt_types',
        payload: res?.data || [],
      })
    }

    queryStatementStatus()
    querySchemas()
    queryTimeRanges()
    queryStmtTypes()
  }, [state.curTimeRange, refreshTimes])

  useEffect(() => {
    async function queryStatementList() {
      if (!state.curTimeRange) {
        return
      }
      dispatch({
        type: 'set_statements_loading',
      })
      const res = await client
        .getInstance()
        .statementsOverviewsGet(
          state.curTimeRange.begin_time!,
          state.curTimeRange.end_time!,
          state.curSchemas.join(','),
          state.curStmtTypes.join(',')
        )
      dispatch({
        type: 'save_statements',
        payload: res?.data || [],
      })
    }

    queryStatementList()
    setQueryOptions({
      curSchemas: state.curSchemas,
      curTimeRange: state.curTimeRange,
      curStmtTypes: state.curStmtTypes,
    })
    // eslint-disable-next-line
  }, [state.curSchemas, state.curTimeRange, state.curStmtTypes, refreshTimes])

  function handleSchemaChange(val: string[]) {
    dispatch({
      type: 'change_schema',
      payload: val,
    })
  }

  function handleTimeRangeChange(val: StatementTimeRange) {
    dispatch({
      type: 'change_time_range',
      payload: val,
    })
  }

  function handleStmtTypeChange(val: string[]) {
    dispatch({
      type: 'change_stmt_types',
      payload: val,
    })
  }

  const statementDisabled = (
    <div className={styles.statement_disabled_container}>
      <h2>{t('statement.pages.overview.settings.disabled_desc_title')}</h2>
      <div className={styles.statement_disabled_desc}>
        <p>{t('statement.pages.overview.settings.disabled_desc_line_1')}</p>
        <p>{t('statement.pages.overview.settings.disabled_desc_line_2')}</p>
      </div>
      <Button type="primary" onClick={() => setShowSettings(true)}>
        {t('statement.pages.overview.settings.open_setting')}
      </Button>
    </div>
  )

  return (
    <ScrollablePane style={{ height: '100vh' }}>
      <Card>
        <Toolbar>
          <Space>
            <TimeRangeSelector
              timeRanges={state.timeRanges}
              onChange={handleTimeRangeChange}
            />
            <Select
              value={state.curSchemas}
              mode="multiple"
              allowClear
              placeholder={t('statement.pages.overview.toolbar.select_schemas')}
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
              placeholder={t(
                'statement.pages.overview.toolbar.select_stmt_types'
              )}
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

          <Space>
            {columns.length > 0 && (
              <ColumnsSelector
                columns={columns}
                visibleColumnKeys={visibleColumnKeys}
                resetColumnKeys={defColumnKeys}
                onChange={setVisibleColumnKeys}
                foot={
                  <Checkbox
                    checked={showFullSQL}
                    onChange={(e) => setShowFullSQL(e.target.checked)}
                  >
                    {t(
                      'statement.pages.overview.toolbar.select_columns.show_full_sql'
                    )}
                  </Checkbox>
                }
              />
            )}
            <Tooltip title={t('statement.pages.overview.settings.title')}>
              <SettingOutlined onClick={() => setShowSettings(true)} />
            </Tooltip>
            <Tooltip title={t('statement.pages.overview.toolbar.refresh')}>
              <ReloadOutlined
                onClick={() => setRefreshTimes((prev) => prev + 1)}
              />
            </Tooltip>
          </Space>
        </Toolbar>
      </Card>

      {state.statementEnable ? (
        <StatementsTable
          key={`${state.statements.length}_${refreshTimes}_${showFullSQL}`}
          statements={state.statements}
          loading={state.statementsLoading}
          timeRange={state.curTimeRange!}
          showFullSQL={showFullSQL}
          onGetColumns={setColumns}
          visibleColumnKeys={visibleColumnKeys}
        />
      ) : (
        statementDisabled
      )}

      <Drawer
        title={t('statement.pages.overview.settings.title')}
        width={300}
        closable={true}
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        destroyOnClose={true}
      >
        <StatementSettingForm
          onClose={() => setShowSettings(false)}
          onConfigUpdated={() => setRefreshTimes((prev) => prev + 1)}
        />
      </Drawer>
    </ScrollablePane>
  )
}
