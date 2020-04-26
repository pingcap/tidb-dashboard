import React, { useReducer, useEffect, useContext, useState } from 'react'
import {
  Select,
  Space,
  Tooltip,
  Drawer,
  Button,
  Dropdown,
  Menu,
  Checkbox,
} from 'antd'
import { useLocalStorageState } from '@umijs/hooks'
import {
  SettingOutlined,
  ReloadOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { useTranslation } from 'react-i18next'
import {
  StatementTimeRange,
  StatementConfig,
  StatementModel,
} from '@lib/client'
import { Card, CardTableV2 } from '@lib/components'
import StatementsTable from './StatementsTable'
import StatementSettingForm from './StatementSettingForm'
import TimeRangeSelector from './TimeRangeSelector'
import { Instance } from './statement-types'
import { SearchContext } from './search-options-context'
import styles from './styles.module.less'

const { Option } = Select

const VISIBLE_COLUMN_KEYS = 'statement_overview_visible_column_keys'
const SHOW_FULL_SQL = 'statement_overview_show_full_sql'

interface State {
  curInstance: string | undefined
  curSchemas: string[]
  curTimeRange: StatementTimeRange | undefined
  curStmtTypes: string[]

  statementEnable: boolean

  instances: Instance[]
  schemas: string[]
  timeRanges: StatementTimeRange[]
  stmtTypes: string[]

  statementsLoading: boolean
  statements: StatementModel[]
}

const initState: State = {
  curInstance: undefined,
  curSchemas: [],
  curTimeRange: undefined,
  curStmtTypes: [],

  statementEnable: true,

  instances: [],
  schemas: [],
  timeRanges: [],
  stmtTypes: [],

  statementsLoading: true,
  statements: [],
}

type Action =
  | { type: 'save_instances'; payload: Instance[] }
  | { type: 'change_instance'; payload: string | undefined }
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
        statementEnable: true,
        schemas: [],
        timeRanges: [],
        statements: [],
      }
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
  ) => Promise<StatementModel[]>

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
  const { t } = useTranslation()

  const { searchOptions, setSearchOptions } = useContext(SearchContext)
  // combine the context to state
  const [state, dispatch] = useReducer(reducer, {
    ...initState,
    ...searchOptions,
  })

  const [refreshTimes, setRefreshTimes] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [columns, setColumns] = useState<IColumn[]>([])
  const [visibleColumnKeys, setVisibleColumnKeys] = useLocalStorageState(
    VISIBLE_COLUMN_KEYS,
    {
      digest_text: true,
      sum_latency: true,
      avg_latency: true,
      exec_count: true,
      avg_mem: true,
      related_schemas: true,
    } as { [key: string]: boolean }
  )
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const [showFullSQL, setShowFullSQL] = useLocalStorageState(
    SHOW_FULL_SQL,
    false
  )

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
            payload: res.enable!,
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
        if (res && res.length === 0) {
          dispatch({
            type: 'change_time_range',
            payload: undefined,
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
  }, [state.curInstance, refreshTimes])
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

  const dropdownMenus = (
    <Menu>
      {CardTableV2.renderColumnVisibilitySelection(
        columns,
        visibleColumnKeys,
        setVisibleColumnKeys
      ).map((item, idx) => (
        <Menu.Item key={idx}>{item}</Menu.Item>
      ))}
      <Menu.Divider />
      <Menu.Item>
        <Checkbox
          checked={showFullSQL}
          onChange={(e) => setShowFullSQL(e.target.checked)}
        >
          {t('statement.pages.overview.toolbar.select_columns.show_full_sql')}
        </Checkbox>
      </Menu.Item>
    </Menu>
  )

  return (
    <ScrollablePane style={{ height: '100vh' }}>
      <Card>
        <div className={styles.overview_header}>
          <Space size="middle" className={styles.overview_options}>
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
          <Space size="middle" className={styles.overview_right_actions}>
            {columns.length > 0 && (
              <Dropdown
                placement="bottomRight"
                visible={dropdownVisible}
                onVisibleChange={setDropdownVisible}
                overlay={dropdownMenus}
              >
                <div style={{ cursor: 'pointer' }}>
                  {t('statement.pages.overview.toolbar.select_columns.name')}{' '}
                  <DownOutlined />
                </div>
              </Dropdown>
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
        </div>
      </Card>
      {state.statementEnable ? (
        <StatementsTable
          key={`${state.statements.length}_${refreshTimes}_${showFullSQL}`}
          statements={state.statements}
          loading={state.statementsLoading}
          timeRange={state.curTimeRange!}
          detailPagePath={detailPagePath}
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
          instanceId={state.curInstance || ''}
          onClose={() => setShowSettings(false)}
          onFetchConfig={onFetchConfig}
          onUpdateConfig={onUpdateConfig}
          onConfigUpdated={() => setRefreshTimes((prev) => prev + 1)}
        />
      </Drawer>
    </ScrollablePane>
  )
}
