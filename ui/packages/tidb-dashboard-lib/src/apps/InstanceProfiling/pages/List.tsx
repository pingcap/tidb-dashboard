import { Badge, Button, Form, Select, Modal, Alert, Space, Tooltip } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useContext
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMemoizedFn } from 'ahooks'

import { ProfilingStartRequest, ModelRequestTargetNode } from '@lib/client'

import {
  Card,
  CardTable,
  InstanceSelect,
  IInstanceSelectRefProps,
  MultiSelect,
  Toolbar
} from '@lib/components'
import DateTime from '@lib/components/DateTime'
import openLink from '@lib/utils/openLink'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { combineTargetStats } from '../utils'

import styles from './List.module.less'
import { upperFirst } from 'lodash'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { isDistro } from '@lib/utils/distro'
import { InstanceProfilingContext } from '../context'

const profilingDurationsSec = [10, 30, 60, 120]
const defaultProfilingDuration = 30
const profilingTypeOptions = ['CPU', 'Heap', 'Goroutine', 'Mutex']

export default function Page() {
  const ctx = useContext(InstanceProfilingContext)

  const {
    data: historyTable,
    isLoading: listLoading,
    error: historyError
  } = useClientRequest(ctx!.ds.getProfilingGroups)
  const { data: ngMonitoringConfig } = useClientRequest(
    ctx!.ds.continuousProfilingConfigGet
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
          content: 'Some required fields are not filled'
        })
        return
      }
      if (!instanceSelect.current) {
        Modal.error({
          content: 'Internal error: Instance select is not ready'
        })
        return
      }
      const targets: ModelRequestTargetNode[] = instanceSelect
        .current!.getInstanceByKeys(fieldsValue.instances)
        .map((instance) => {
          let port
          switch (instance.instanceKind) {
            case 'pd':
            case 'tso':
            case 'scheduling':
              port = instance.port
              break
            case 'tidb':
            case 'tikv':
            case 'tiflash':
            case 'ticdc':
            case 'tiproxy':
              port = instance.status_port
              break
          }
          return {
            kind: instance.instanceKind,
            display_name: instance.key,
            ip: instance.ip,
            port
          }
        })
        .filter((i) => i.port != null)

      // Default to all types if non is selected
      const types = !fieldsValue.type?.length
        ? [...profilingTypeOptions]
        : fieldsValue.type
      const req: ProfilingStartRequest = {
        targets,
        duration_secs: fieldsValue.duration,
        requsted_profiling_types: types.map((type) => type.toLowerCase())
      }
      try {
        setSubmitting(true)
        const res = await ctx!.ds.startProfiling(req)
        navigate(`/instance_profiling/detail?id=${res.data.id}`)
      } finally {
        setSubmitting(false)
      }
    },
    [navigate, ctx]
  )

  const handleRowClick = useMemoizedFn(
    (rec, _idx, ev: React.MouseEvent<HTMLElement>) => {
      openLink(`/instance_profiling/detail?id=${rec.id}`, ev, navigate)
    }
  )

  const historyTableColumns = useMemo(
    () => [
      {
        name: t('instance_profiling.list.table.columns.targets'),
        key: 'targets',
        minWidth: 300,
        maxWidth: 480,
        onRender: (rec) => {
          return combineTargetStats(rec.target_stats)
        }
      },
      {
        name: t(
          'instance_profiling.list.table.columns.requsted_profiling_types'
        ),
        key: 'types',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec) => {
          return (rec.requsted_profiling_types ?? ['cpu'])
            .map((p) => (p === 'cpu' ? 'CPU' : upperFirst(p)))
            .join(',')
        }
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
        }
      },
      {
        name: t('instance_profiling.list.table.columns.start_at'),
        key: 'started_at',
        minWidth: 160,
        maxWidth: 220,
        onRender: (rec) => {
          return <DateTime.Calendar unixTimestampMs={rec.started_at * 1000} />
        }
      },
      {
        name: t('instance_profiling.list.table.columns.duration'),
        key: 'duration',
        minWidth: 100,
        maxWidth: 150,
        fieldName: 'profile_duration_secs'
      }
    ],
    [t]
  )

  return (
    <div className={styles.list_container}>
      <Card>
        <Toolbar>
          <Space>
            <Form
              onFinish={handleFinish}
              layout="inline"
              initialValues={{
                instances: [],
                duration: defaultProfilingDuration,
                type: []
              }}
            >
              <Form.Item
                name="instances"
                // label={t('instance_profiling.list.control_form.instances.label')}
                rules={[{ required: true }]}
              >
                <InstanceSelect
                  disabled={conprofEnable}
                  enableTiFlash={true}
                  ref={instanceSelect}
                  style={{ width: 320 }}
                  defaultSelectAll
                  getTiDBTopology={ctx!.ds.getTiDBTopology}
                  getStoreTopology={ctx!.ds.getStoreTopology}
                  getPDTopology={ctx!.ds.getPDTopology}
                  getTiCDCTopology={ctx!.ds.getTiCDCTopology}
                  getTiProxyTopology={ctx!.ds.getTiProxyTopology}
                  getTSOTopology={ctx!.ds.getTSOTopology}
                  getSchedulingTopology={ctx!.ds.getSchedulingTopology}
                />
              </Form.Item>
              <Form.Item name="type">
                <MultiSelect.Plain
                  disabled={conprofEnable}
                  placeholder={t(
                    'instance_profiling.list.control_form.profiling_type.placeholder'
                  )}
                  columnTitle={t(
                    'instance_profiling.list.control_form.profiling_type.columnTitle'
                  )}
                  style={{ width: 200 }}
                  items={profilingTypeOptions}
                ></MultiSelect.Plain>
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
          </Space>
          <Space>
            {!isDistro() && (
              <Tooltip
                mouseEnterDelay={0}
                mouseLeaveDelay={0}
                title={t('instance_profiling.settings.help')}
                placement="bottom"
              >
                <QuestionCircleOutlined
                  onClick={() => {
                    window.open(
                      t('instance_profiling.settings.help_url'),
                      '_blank'
                    )
                  }}
                />
              </Tooltip>
            )}
          </Space>
        </Toolbar>
      </Card>

      {conprofEnable && (
        <div className={styles.alert_container}>
          <Alert
            type="warning"
            message={
              <>
                {t('instance_profiling.list.disable_warning')}{' '}
                {!isDistro() && (
                  <a
                    target="_blank"
                    href={t('instance_profiling.settings.help_url')}
                    rel="noreferrer"
                  >
                    {t('instance_profiling.settings.help')}
                  </a>
                )}
              </>
            }
            showIcon
          />
        </div>
      )}

      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <CardTable
            cardNoMarginTop
            cardNoMarginBottom
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
