import { Badge, Tooltip, Space, Drawer, Switch } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePersistFn } from 'ahooks'
import client from '@lib/client'
import {
  Card,
  CardTable,
  Toolbar,
  TimeRangeSelector,
  TimeRange,
} from '@lib/components'
import DateTime from '@lib/components/DateTime'
import openLink from '@lib/utils/openLink'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { combineTargetStats } from '../utils'

import { SettingOutlined } from '@ant-design/icons'
import ConProfSettingForm from './ConProfSettingForm'

import styles from './List.module.less'
import { getValueFormat } from '@baurine/grafana-value-formats'

export default function Page() {
  const {
    data: historyTable,
    isLoading: listLoading,
    error: historyError,
  } = useClientRequest((reqConfig) =>
    client.getInstance().getProfilingGroups(reqConfig)
  )
  const historyLen = (historyTable || []).length
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleRowClick = usePersistFn(
    (rec, _idx, ev: React.MouseEvent<HTMLElement>) => {
      openLink(`/continuous_profiling/detail?id=${rec.id}`, ev, navigate)
    }
  )

  const historyTableColumns = useMemo(
    () => [
      {
        name: t('continuous_profiling.list.table.columns.order'),
        key: 'order',
        minWidth: 100,
        maxWidth: 150,
        onRender: (_rec, idx) => {
          return <span>{historyLen - idx}</span>
        },
      },
      {
        name: t('continuous_profiling.list.table.columns.targets'),
        key: 'targets',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec) => {
          const s = combineTargetStats(rec.target_stats)
          return <span>{s}</span>
        },
      },
      {
        name: t('continuous_profiling.list.table.columns.status'),
        key: 'status',
        minWidth: 100,
        maxWidth: 150,
        onRender: (rec) => {
          if (rec.state === 0) {
            // all failed
            return (
              <Badge
                status="error"
                text={t('continuous_profiling.list.table.status.failed')}
              />
            )
          } else if (rec.state === 1) {
            // running
            return (
              <Badge
                status="processing"
                text={t('continuous_profiling.list.table.status.running')}
              />
            )
          } else if (rec.state === 2) {
            // all success
            return (
              <Badge
                status="success"
                text={t('continuous_profiling.list.table.status.finished')}
              />
            )
          } else {
            // partial success
            return (
              <Badge
                status="warning"
                text={t(
                  'continuous_profiling.list.table.status.partial_finished'
                )}
              />
            )
          }
        },
      },
      {
        name: t('continuous_profiling.list.table.columns.start_at'),
        key: 'started_at',
        minWidth: 160,
        maxWidth: 220,
        onRender: (rec) => {
          return <DateTime.Calendar unixTimestampMs={rec.started_at * 1000} />
        },
      },
      {
        name: t('continuous_profiling.list.table.columns.duration'),
        key: 'duration',
        minWidth: 100,
        maxWidth: 150,
        fieldName: 'profile_duration_secs',
      },
    ],
    [t, historyLen]
  )

  const [timeRange, setTimeRange] = useState<TimeRange | undefined>(undefined)

  function onTimeRangeChange(v: TimeRange) {
    setTimeRange(v)
    // TODO: request api
  }

  const [showSetting, setShowSetting] = useState(false)

  const {
    data: ngMonitoringConfig,
    sendRequest,
    error,
  } = useClientRequest((reqConfig) =>
    client.getInstance().continuousProfilingConfigGet(reqConfig)
  )
  const conprofEnable = useMemo(
    () => ngMonitoringConfig?.continuous_profiling?.enable ?? false,
    [ngMonitoringConfig]
  )
  const conProfStatusTooltip = useMemo(() => {
    if (conprofEnable) {
      return t('continuous_profiling.list.control_form.enable_tooltip')
    } else {
      return t('continuous_profiling.list.control_form.disable_tooltip')
    }
  }, [conprofEnable, t])

  return (
    <div className={styles.list_container}>
      <Card
        title={t('continuous_profiling.list.control_form.title')}
        subTitle={
          error ? null : (
            <Tooltip title={conProfStatusTooltip}>
              <Switch disabled={true} checked={conprofEnable} />
            </Tooltip>
          )
        }
      >
        <Toolbar className={styles.list_toolbar}>
          <Space>
            <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
          </Space>
          <Space>
            <Tooltip title={t('statement.settings.title')} placement="bottom">
              <SettingOutlined onClick={() => setShowSetting(true)} />
            </Tooltip>
          </Space>
        </Toolbar>
      </Card>

      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <CardTable
            cardNoMarginTop
            loading={listLoading}
            items={historyTable || []}
            columns={historyTableColumns}
            errors={[historyError]}
            onRowClicked={handleRowClick}
          />
        </ScrollablePane>
      </div>

      <Drawer
        title={t('statement.settings.title')}
        width={300}
        closable={true}
        visible={showSetting}
        onClose={() => setShowSetting(false)}
        destroyOnClose={true}
      >
        <ConProfSettingForm
          onClose={() => setShowSetting(false)}
          onConfigUpdated={sendRequest}
        />
      </Drawer>
    </div>
  )
}
