import React, { useState, useCallback } from 'react'
import { Select, Space, Tooltip, Drawer, Button, Checkbox, Result } from 'antd'
import { useLocalStorageState } from '@umijs/hooks'
import {
  SettingOutlined,
  ReloadOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { useTranslation } from 'react-i18next'
import { Card, ColumnsSelector, IColumnKeys, Toolbar } from '@lib/components'
import { StatementsTable } from '../../components'
import StatementSettingForm from './StatementSettingForm'
import TimeRangeSelector from './TimeRangeSelector'
import useStatement from '../../utils/useStatement'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'

const { Option } = Select

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

export default function StatementsOverview() {
  const { t } = useTranslation()

  const {
    savedQueryOptions,
    setSavedQueryOptions,
    enable,
    allTimeRanges,
    allSchemas,
    allStmtTypes,
    validTimeRange,
    loadingStatements,
    statements,
    refresh,
  } = useStatement()

  const [columns, setColumns] = useState<IColumn[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [visibleColumnKeys, setVisibleColumnKeys] = useLocalStorageState(
    VISIBLE_COLUMN_KEYS,
    defColumnKeys
  )
  const [showFullSQL, setShowFullSQL] = useLocalStorageState(
    SHOW_FULL_SQL,
    false
  )

  const onChangeSort = useCallback((orderBy, desc) => {
    setSavedQueryOptions({
      ...savedQueryOptions,
      orderBy,
      desc,
    })
  }, [])

  return (
    <ScrollablePane style={{ height: '100vh' }}>
      <Sticky stickyPosition={StickyPositionType.Header} isScrollSynced>
        <Card>
          <Toolbar>
            <Space>
              <TimeRangeSelector
                value={savedQueryOptions.timeRange}
                timeRanges={allTimeRanges}
                onChange={(timeRange) =>
                  setSavedQueryOptions({
                    ...savedQueryOptions,
                    timeRange,
                  })
                }
              />
              <Select
                value={savedQueryOptions.schemas}
                mode="multiple"
                allowClear
                placeholder={t(
                  'statement.pages.overview.toolbar.select_schemas'
                )}
                style={{ minWidth: 200 }}
                onChange={(schemas) =>
                  setSavedQueryOptions({
                    ...savedQueryOptions,
                    schemas,
                  })
                }
              >
                {allSchemas.map((item) => (
                  <Option value={item} key={item}>
                    {item}
                  </Option>
                ))}
              </Select>
              <Select
                value={savedQueryOptions.stmtTypes}
                mode="multiple"
                allowClear
                placeholder={t(
                  'statement.pages.overview.toolbar.select_stmt_types'
                )}
                style={{ minWidth: 160 }}
                onChange={(stmtTypes) =>
                  setSavedQueryOptions({
                    ...savedQueryOptions,
                    stmtTypes,
                  })
                }
              >
                {allStmtTypes.map((item) => (
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
              <Tooltip title={t('statement.settings.title')}>
                <SettingOutlined onClick={() => setShowSettings(true)} />
              </Tooltip>
              <Tooltip title={t('statement.pages.overview.toolbar.refresh')}>
                {loadingStatements ? (
                  <LoadingOutlined />
                ) : (
                  <ReloadOutlined onClick={refresh} />
                )}
              </Tooltip>
            </Space>
          </Toolbar>
        </Card>
      </Sticky>

      {enable ? (
        <StatementsTable
          loading={loadingStatements}
          statements={statements}
          timeRange={validTimeRange}
          orderBy={savedQueryOptions.orderBy}
          desc={savedQueryOptions.desc}
          showFullSQL={showFullSQL}
          visibleColumnKeys={visibleColumnKeys}
          onGetColumns={setColumns}
          onChangeSort={onChangeSort}
        />
      ) : (
        <Result
          title={t('statement.settings.disabled_result.title')}
          subTitle={t('statement.settings.disabled_result.sub_title')}
          extra={
            <Button type="primary" onClick={() => setShowSettings(true)}>
              {t('statement.settings.open_setting')}
            </Button>
          }
        />
      )}

      <Drawer
        title={t('statement.settings.title')}
        width={300}
        closable={true}
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        destroyOnClose={true}
      >
        <StatementSettingForm
          onClose={() => setShowSettings(false)}
          onConfigUpdated={refresh}
        />
      </Drawer>
    </ScrollablePane>
  )
}
