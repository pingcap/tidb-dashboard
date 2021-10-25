import { Badge, Tooltip, Space, Drawer, Switch } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePersistFn, useSessionStorageState } from 'ahooks'
import client, { ErrorStrategy } from '@lib/client'
import {
  Card,
  CardTable,
  Toolbar,
  TimeRangeSelector,
  TimeRange,
  calcTimeRange,
} from '@lib/components'
import DateTime from '@lib/components/DateTime'
import openLink from '@lib/utils/openLink'
import { useClientRequest } from '@lib/utils/useClientRequest'

import { SettingOutlined } from '@ant-design/icons'
import ConProfSettingForm from './ConProfSettingForm'

import styles from './List.module.less'
import { InstanceKindName } from '@lib/utils/instanceTable'

export default function Page() {
  const {
    data: historyTable,
    isLoading: listLoading,
    error: historyError,
    sendRequest: refreshGroupProfiles,
  } = useClientRequest(() => {
    const [beginTime, endTime] = calcTimeRange(timeRange)
    return client
      .getInstance()
      .continuousProfilingGroupProfilesGet(beginTime, endTime, {
        errorStrategy: ErrorStrategy.Custom,
      })
  })
  const historyLen = (historyTable || []).length
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleRowClick = usePersistFn(
    (rec, _idx, ev: React.MouseEvent<HTMLElement>) => {
      openLink(`/continuous_profiling/detail?ts=${rec.ts}`, ev, navigate)
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
          const { tikv, tidb, pd, tiflash } = rec.component_num
          const s = `${tikv} ${InstanceKindName['tikv']}, ${tidb} ${InstanceKindName['tidb']}, ${pd} ${InstanceKindName['pd']}, ${tiflash} ${InstanceKindName['tiflash']}`
          return <span>{s}</span>
        },
      },
      {
        name: t('continuous_profiling.list.table.columns.status'),
        key: 'status',
        minWidth: 100,
        maxWidth: 150,
        onRender: (rec) => {
          if (rec.state === 'failed') {
            // all failed
            return (
              <Badge
                status="error"
                text={t('continuous_profiling.list.table.status.failed')}
              />
            )
          } else if (rec.state === 'success') {
            // all success
            return (
              <Badge
                status="success"
                text={t('continuous_profiling.list.table.status.finished')}
              />
            )
          } else {
            // partial failed
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
        key: 'ts',
        minWidth: 160,
        maxWidth: 220,
        onRender: (rec) => {
          return <DateTime.Long unixTimestampMs={rec.ts * 1000} />
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

  const [timeRange, setTimeRange] = useSessionStorageState<
    TimeRange | undefined
  >('conprof.timerange', undefined)

  function onTimeRangeChange(v: TimeRange) {
    setTimeRange(v)
    setTimeout(() => {
      refreshGroupProfiles()
    }, 0)
  }

  const [showSetting, setShowSetting] = useState(false)

  const {
    data: ngMonitoringConfig,
    sendRequest,
    error: configError,
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
          configError ? null : (
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
            errors={[historyError, configError]}
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
