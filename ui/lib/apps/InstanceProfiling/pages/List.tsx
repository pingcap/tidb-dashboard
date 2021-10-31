import { Badge, Button, Form, Select, Modal, Tooltip, Alert } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import React, { useMemo, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePersistFn } from 'ahooks'
import { QuestionCircleOutlined } from '@ant-design/icons'

import client, {
  ProfilingStartRequest,
  ModelRequestTargetNode,
} from '@lib/client'
import {
  Card,
  CardTable,
  InstanceSelect,
  IInstanceSelectRefProps,
} from '@lib/components'
import DateTime from '@lib/components/DateTime'
import openLink from '@lib/utils/openLink'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { combineTargetStats } from '../utils'

import styles from './List.module.less'

const profilingDurationsSec = [10, 30, 60, 120]
const defaultProfilingDuration = 30

export default function Page() {
  const {
    data: historyTable,
    isLoading: listLoading,
    error: historyError,
  } = useClientRequest((reqConfig) =>
    client.getInstance().getProfilingGroups(reqConfig)
  )
  const { data: ngMonitoringConfig } = useClientRequest((reqConfig) =>
    client.getInstance().continuousProfilingConfigGet(reqConfig)
  )
  const conprofEnable =
    ngMonitoringConfig?.continuous_profiling?.enable ?? false

  const { t } = useTranslation()
  const navigate = useNavigate()
  const instanceSelect = useRef<IInstanceSelectRefProps>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleFinish = useCallback(
    async (fieldsValue) => {
      if (!fieldsValue.instances || fieldsValue.instances.length === 0) {
        Modal.error({
          content: 'Some required fields are not filled',
        })
        return
      }
      if (!instanceSelect.current) {
        Modal.error({
          content: 'Internal error: Instance select is not ready',
        })
        return
      }
      const targets: ModelRequestTargetNode[] = instanceSelect
        .current!.getInstanceByKeys(fieldsValue.instances)
        .map((instance) => {
          let port
          switch (instance.instanceKind) {
            case 'pd':
              port = instance.port
              break
            case 'tidb':
            case 'tikv':
            case 'tiflash':
              port = instance.status_port
              break
          }
          return {
            kind: instance.instanceKind,
            display_name: instance.key,
            ip: instance.ip,
            port,
          }
        })
        .filter((i) => i.port != null)
      const req: ProfilingStartRequest = {
        targets,
        duration_secs: fieldsValue.duration,
      }
      try {
        setSubmitting(true)
        const res = await client.getInstance().startProfiling(req)
        navigate(`/instance_profiling/detail?id=${res.data.id}`)
      } finally {
        setSubmitting(false)
      }
    },
    [navigate]
  )

  const handleRowClick = usePersistFn(
    (rec, _idx, ev: React.MouseEvent<HTMLElement>) => {
      openLink(`/instance_profiling/detail?id=${rec.id}`, ev, navigate)
    }
  )

  const historyTableColumns = useMemo(
    () => [
      {
        name: t('instance_profiling.list.table.columns.targets'),
        key: 'targets',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec) => {
          const s = combineTargetStats(rec.target_stats)
          return <span>{s}</span>
        },
      },
      {
        name: t('instance_profiling.list.table.columns.status'),
        key: 'status',
        minWidth: 100,
        maxWidth: 150,
        onRender: (rec) => {
          if (rec.state === 0) {
            // all failed
            return (
              <Badge
                status="error"
                text={t('instance_profiling.list.table.status.failed')}
              />
            )
          } else if (rec.state === 1) {
            // running
            return (
              <Badge
                status="processing"
                text={t('instance_profiling.list.table.status.running')}
              />
            )
          } else if (rec.state === 2) {
            // all success
            return (
              <Badge
                status="success"
                text={t('instance_profiling.list.table.status.finished')}
              />
            )
          } else {
            // partial success
            return (
              <Badge
                status="warning"
                text={t(
                  'instance_profiling.list.table.status.partial_finished'
                )}
              />
            )
          }
        },
      },
      {
        name: t('instance_profiling.list.table.columns.start_at'),
        key: 'started_at',
        minWidth: 160,
        maxWidth: 220,
        onRender: (rec) => {
          return <DateTime.Calendar unixTimestampMs={rec.started_at * 1000} />
        },
      },
      {
        name: t('instance_profiling.list.table.columns.duration'),
        key: 'duration',
        minWidth: 100,
        maxWidth: 150,
        fieldName: 'profile_duration_secs',
      },
    ],
    [t]
  )

  return (
    <div className={styles.list_container}>
      <Card>
        <Form
          onFinish={handleFinish}
          layout="inline"
          initialValues={{
            instances: [],
            duration: defaultProfilingDuration,
          }}
        >
          <Form.Item
            name="instances"
            label={t('instance_profiling.list.control_form.instances.label')}
            rules={[{ required: true }]}
          >
            <InstanceSelect
              disabled={conprofEnable}
              enableTiFlash={true}
              ref={instanceSelect}
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item
            name="duration"
            label={t('instance_profiling.list.control_form.duration.label')}
            rules={[{ required: true }]}
          >
            <Select style={{ width: 120 }} disabled={conprofEnable}>
              {profilingDurationsSec.map((sec) => (
                <Select.Option value={sec} key={sec}>
                  {sec}s
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              disabled={conprofEnable}
            >
              {t('instance_profiling.list.control_form.submit')}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {conprofEnable && (
        <div className={styles.alert_container}>
          <Alert
            type="warning"
            message={t('instance_profiling.list.disable_warning')}
            showIcon
          />
        </div>
      )}

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
    </div>
  )
}
