import { Badge, Button, Form, Select, Modal, Alert } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import React, { useMemo, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePersistFn } from 'ahooks'
import { Card, CardTable, MultiSelect } from '@lib/components'
import DateTime from '@lib/components/DateTime'
import openLink from '@lib/utils/openLink'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { stringifyTopoCount } from '../utils'
import styles from './List.module.less'
import { upperFirst } from 'lodash'
import InstanceSelectV2 from '@lib/components/InstanceSelectV2'
import client, {
  ViewBundle,
  ViewStartBundleReq,
  TopoCompInfoWithSignature,
  TopoSignedCompDescriptor,
} from '@lib/client'
import _ from 'lodash'
import { BundleState } from '../utils/constants'

const profilingDurationsSec = [10, 30, 60, 120]
const defaultProfilingDuration = 30
const profilingTypeOptions = ['CPU', 'Heap', 'Goroutine', 'Mutex']

export default function Page() {
  const bundlesResp = useClientRequest((reqConfig) =>
    client.getInstance().profilingListBundles(reqConfig)
  )

  const targetsResp = useClientRequest((reqConfig) =>
    client.getInstance().profilingListTargets(reqConfig)
  )

  const { data: ngMonitoringConfig } = useClientRequest((reqConfig) =>
    client.getInstance().continuousProfilingConfigGet(reqConfig)
  )

  const conprofEnable =
    ngMonitoringConfig?.continuous_profiling?.enable ?? false

  const { t } = useTranslation()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const handleFinish = useCallback(
    async (fieldsValue) => {
      if (!fieldsValue.instances || fieldsValue.instances.length === 0) {
        Modal.error({
          content: 'Some required fields are not filled',
        })
        return
      }

      const targetsBySignature: Record<string, TopoCompInfoWithSignature> =
        _.keyBy(targetsResp.data?.targets ?? [], 'signature')

      const selectedTargets: Array<TopoSignedCompDescriptor> =
        fieldsValue.instances
          .map((sig) => targetsBySignature[sig])
          .filter((v) => !!v)

      const req: ViewStartBundleReq = {
        duration_sec: fieldsValue.duration,
        kinds: fieldsValue.type.map((t) => t.toLowerCase()),
        targets: selectedTargets,
      }
      try {
        setSubmitting(true)
        const res = await client.getInstance().profilingStartBundle(req)
        navigate(`/instance_profiling/detail?id=${res.data.bundle_id}`)
      } finally {
        setSubmitting(false)
      }
    },
    [navigate, targetsResp]
  )

  const handleRowClick = usePersistFn(
    (rec: ViewBundle, _idx, ev: React.MouseEvent<HTMLElement>) => {
      openLink(`/instance_profiling/detail?id=${rec.bundle_id}`, ev, navigate)
    }
  )

  const historyTableColumns = useMemo(
    () => [
      {
        name: t('instance_profiling.list.table.columns.targets'),
        key: 'targets',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec: ViewBundle) => {
          return stringifyTopoCount(rec.targets_count ?? {})
        },
      },
      {
        name: t('instance_profiling.list.table.columns.status'),
        key: 'status',
        minWidth: 100,
        maxWidth: 150,
        onRender: (rec: ViewBundle) => {
          if (rec.state === BundleState.AllFailed) {
            return (
              <Badge
                status="error"
                text={t('instance_profiling.common.bundle_state.all_failed')}
              />
            )
          } else if (rec.state === BundleState.Running) {
            return (
              <Badge
                status="processing"
                text={t('instance_profiling.common.bundle_state.running')}
              />
            )
          } else if (rec.state === BundleState.AllSucceeded) {
            return (
              <Badge
                status="success"
                text={t('instance_profiling.common.bundle_state.all_succeeded')}
              />
            )
          } else if (rec.state === BundleState.PartialSucceeded) {
            return (
              <Badge
                status="warning"
                text={t(
                  'instance_profiling.common.bundle_state.partial_succeeded'
                )}
              />
            )
          } else {
            return (
              <Badge
                status="warning"
                text={t('instance_profiling.common.bundle_state.unknown')}
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
        onRender: (rec: ViewBundle) => {
          return <DateTime.Calendar unixTimestampMs={rec.start_at ?? 0} />
        },
      },
      {
        name: t('instance_profiling.list.table.columns.duration'),
        key: 'duration',
        minWidth: 100,
        maxWidth: 150,
        fieldName: 'duration_sec',
      },
      {
        name: t(
          'instance_profiling.list.table.columns.requsted_profiling_types'
        ),
        key: 'types',
        minWidth: 100,
        maxWidth: 200,
        onRender: (rec: ViewBundle) => {
          return (rec.kinds ?? ['cpu'])
            .map((p) => (p === 'cpu' ? 'CPU' : upperFirst(p)))
            .join(', ')
        },
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
            <InstanceSelectV2
              disabled={conprofEnable || targetsResp.isLoading}
              instances={targetsResp.data?.targets}
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item
            name="type"
            label={t(
              'instance_profiling.list.control_form.profiling_type.label'
            )}
            rules={[{ required: true }]}
          >
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
      </Card>

      {conprofEnable && (
        <Card noMarginTop>
          <Alert
            type="warning"
            message={t('instance_profiling.list.disable_warning')}
            showIcon
          />
        </Card>
      )}

      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <CardTable
            cardNoMarginTop
            loading={bundlesResp.isLoading}
            items={bundlesResp.data?.bundles || []}
            columns={historyTableColumns}
            errors={[bundlesResp.error]}
            onRowClicked={handleRowClick}
            extendLastColumn
          />
        </ScrollablePane>
      </div>
    </div>
  )
}
