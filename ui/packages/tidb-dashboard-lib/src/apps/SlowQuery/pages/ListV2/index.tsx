import React, { useCallback, useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Space, Checkbox, Alert, Result } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'

import {
  Card,
  ColumnsSelector,
  Toolbar,
  TimeRange,
  IColumnKeys,
  Head,
  DEFAULT_TIME_RANGE
} from '@lib/components'
import { CacheContext } from '@lib/utils/useCache'
import { useVersionedLocalStorageState } from '@lib/utils/useVersionedLocalStorageState'
import SlowQueriesTable from '../../components/SlowQueriesTable'
import useSlowQueryTableController, {
  DEF_SLOW_QUERY_COLUMN_KEYS,
  DEF_SLOW_QUERY_OPTIONS
} from '../../utils/useSlowQueryTableController'
import styles from './List.module.less'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { useDeepCompareChange } from '@lib/utils/useChange'
import { SlowQueryContext } from '../../context'
import { Selections, useUrlSelection } from './Selections'
import useUrlState from '@ahooksjs/use-url-state'
import { SlowQueryScatterChart } from '../../components/charts/ScatterChart'
import { Analyzing } from './Analyzing'

const SLOW_QUERY_VISIBLE_COLUMN_KEYS = 'slow_query.visible_column_keys'
const SLOW_QUERY_SHOW_FULL_SQL = 'slow_query.show_full_sql'

function List() {
  const { t } = useTranslation()

  const ctx = useContext(SlowQueryContext)

  const cacheMgr = useContext(CacheContext)

  const [urlSelection, setUrlSelection] = useUrlSelection()

  const [visibleColumnKeys, setVisibleColumnKeys] =
    useVersionedLocalStorageState(SLOW_QUERY_VISIBLE_COLUMN_KEYS, {
      defaultValue: DEF_SLOW_QUERY_COLUMN_KEYS
    })
  const [showFullSQL, setShowFullSQL] = useVersionedLocalStorageState(
    SLOW_QUERY_SHOW_FULL_SQL,
    { defaultValue: false }
  )
  const [filters, setFilters] = useState<Set<string>>()
  const { timeRange, setTimeRange } =
    useURLTimeRangeToTimeRange(DEFAULT_TIME_RANGE)

  const controller = useSlowQueryTableController({
    cacheMgr,
    showFullSQL,
    fetchSchemas: ctx?.cfg.showDBFilter,
    initialQueryOptions: {
      ...DEF_SLOW_QUERY_OPTIONS,
      visibleColumnKeys,
      timeRange
    },
    filters,
    persistQueryInSession: false,

    ds: ctx!.ds
  })
  function updateVisibleColumnKeys(v: IColumnKeys) {
    setVisibleColumnKeys(v)
    if (!v[controller.orderOptions.orderBy]) {
      controller.resetOrder()
    }
  }

  const [filterSchema] = useState<string[]>(controller.queryOptions.schemas)
  const [filterLimit] = useState<number>(controller.queryOptions.limit)
  const [filterText] = useState<string>(controller.queryOptions.searchText)

  const sendQueryNow = useMemoizedFn(() => {
    cacheMgr?.clear()
    controller.setQueryOptions({
      timeRange,
      schemas: filterSchema,
      limit: filterLimit,
      searchText: filterText,
      visibleColumnKeys,
      digest: '',
      plans: []
    })
  })

  const sendQueryDebounced = useDebounceFn(sendQueryNow, {
    wait: 300
  }).run

  useDeepCompareChange(() => {
    if (
      controller.isDataLoadedSlowly || // if data was loaded slowly
      controller.isDataLoadedSlowly === null // or a request is not yet finished (which means slow network)..
    ) {
      // do not send requests on-the-fly.
      return
    }
    sendQueryDebounced()
  }, [timeRange, filterSchema, filterLimit, filterText, visibleColumnKeys])

  const onLegendChange = useCallback(({ isSelectAll, data }) => {
    if (isSelectAll) {
      setFilters(undefined)
    } else {
      setFilters(new Set(data.map((d) => d.rawData.metric.digest)))
    }
  }, [])

  return (
    <div className={styles.list_container}>
      <Head title={t('slow_query_v2.overview.head.title')}>
        <Selections
          timeRange={timeRange}
          selection={urlSelection}
          onSelectionChange={setUrlSelection}
          onTimeRangeChange={setTimeRange}
        />
        <div style={{ height: '300px' }}>
          <Analyzing timeRange={timeRange} rows={5}>
            <SlowQueryScatterChart
              timeRange={timeRange}
              displayOptions={urlSelection}
              onLegendChange={onLegendChange}
            />
          </Analyzing>
        </div>
      </Head>

      {controller.data?.length === 0 ? (
        <Result title={t('slow_query.overview.empty_result')} />
      ) : (
        <div style={{ height: '100%', position: 'relative' }}>
          {controller.isDataLoadedSlowly && (
            <Card noMarginBottom noMarginTop>
              <Alert
                message={t('slow_query.overview.slow_load_info')}
                type="info"
                showIcon
              />
            </Card>
          )}
          <Card noMarginBottom noMarginTop>
            <Toolbar className={styles.list_toolbar}>
              <Space>
                <div>
                  {(controller.data?.length ?? 0) > 0 && (
                    <p className="ant-form-item-extra">
                      {t('slow_query.overview.result_count', {
                        n: controller.data?.length
                      })}
                    </p>
                  )}
                </div>
              </Space>

              <Space>
                {controller.availableColumnsInTable.length > 0 && (
                  <ColumnsSelector
                    columns={controller.availableColumnsInTable}
                    visibleColumnKeys={visibleColumnKeys}
                    defaultVisibleColumnKeys={DEF_SLOW_QUERY_COLUMN_KEYS}
                    onChange={updateVisibleColumnKeys}
                    foot={
                      <Checkbox
                        checked={showFullSQL}
                        onChange={(e) => setShowFullSQL(e.target.checked)}
                        data-e2e="slow_query_show_full_sql"
                      >
                        {t('slow_query.toolbar.select_columns.show_full_sql')}
                      </Checkbox>
                    }
                  />
                )}
              </Space>
            </Toolbar>
          </Card>
          <div style={{ height: '100%', position: 'relative' }}>
            <ScrollablePane>
              <SlowQueriesTable cardNoMarginTop controller={controller} />
            </ScrollablePane>
          </div>
        </div>
      )}
    </div>
  )
}

export const useURLTimeRangeToTimeRange = (
  initialState: TimeRange,
  typeKey = 'timeRangeType',
  valueKey = 'timeRangeValue'
) => {
  const [_timeRange, _setTimeRange] = useUrlState({
    [typeKey]: initialState.type,
    [valueKey]: initialState.value as any
  })
  const timeRange: TimeRange = useMemo(
    () => ({
      type: _timeRange[typeKey],
      value: Array.isArray(_timeRange[valueKey])
        ? _timeRange[valueKey].map((v) => parseInt(v))
        : (parseInt(_timeRange[valueKey]) as any)
    }),
    [_timeRange, typeKey, valueKey]
  )
  const setTimeRange = useCallback(
    (timeRange: TimeRange) => {
      _setTimeRange({
        [typeKey]: timeRange.type,
        [valueKey]: timeRange.value
      })
    },
    [_setTimeRange, typeKey, valueKey]
  )

  return { timeRange, setTimeRange }
}

export default List
