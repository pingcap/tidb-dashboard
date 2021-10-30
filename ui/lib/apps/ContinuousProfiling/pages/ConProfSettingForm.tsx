import React, { useState, useCallback, useMemo } from 'react'
import {
  Form,
  Skeleton,
  Switch,
  Input,
  Space,
  Button,
  Modal,
  Select,
} from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import client, {
  ErrorStrategy,
  ProfilingContinuousProfilingConfig,
} from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { ErrorBar, InstanceSelect } from '@lib/components'
import { useIsWriteable } from '@lib/utils/store'

const RETENTION_SECONDS = [
  3 * 24 * 60 * 60,
  5 * 24 * 60 * 60,
  10 * 24 * 60 * 60,
]

interface Props {
  onClose: () => void
  onConfigUpdated: () => any
}

function ConProfSettingForm({ onClose, onConfigUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation()
  const isWriteable = useIsWriteable()

  const { data: initialConfig, isLoading: loading, error } = useClientRequest(
    () =>
      client.getInstance().continuousProfilingConfigGet({
        errorStrategy: ErrorStrategy.Custom,
      })
  )

  const { data: estimateSize } = useClientRequest(() =>
    client.getInstance().continuousProfilingEstimateSizeGet({
      errorStrategy: ErrorStrategy.Custom,
    })
  )

  const dataRetentionSeconds = useMemo(() => {
    const curRetentionSec =
      initialConfig?.continuous_profiling?.data_retention_seconds
    if (curRetentionSec && RETENTION_SECONDS.indexOf(curRetentionSec) === -1) {
      return RETENTION_SECONDS.concat(curRetentionSec).sort()
    }
    return RETENTION_SECONDS
  }, [initialConfig])

  const handleSubmit = useCallback(
    (values) => {
      async function updateConfig(values) {
        const newConfig: ProfilingContinuousProfilingConfig = {
          enable: values.enable,
          data_retention_seconds: values.data_retention_seconds,
        }
        try {
          setSubmitting(true)
          await client.getInstance().continuousProfilingConfigPost({
            continuous_profiling: newConfig,
          })
          onClose()
          onConfigUpdated()
        } finally {
          setSubmitting(false)
        }
      }

      if (!values.enable) {
        // confirm
        Modal.confirm({
          title: t('continuous_profiling.settings.close_feature'),
          icon: <ExclamationCircleOutlined />,
          content: t('continuous_profiling.settings.close_feature_confirm'),
          okText: t('continuous_profiling.settings.actions.close'),
          cancelText: t('continuous_profiling.settings.actions.cancel'),
          okButtonProps: { danger: true },
          onOk: () => updateConfig(values),
        })
      } else {
        updateConfig(values)
      }
    },
    [t, onClose, onConfigUpdated]
  )

  return (
    <>
      {error && <ErrorBar errors={[error]} />}
      {loading && <Skeleton active={true} paragraph={{ rows: 5 }} />}
      {!loading && initialConfig && (
        <Form
          layout="vertical"
          initialValues={initialConfig.continuous_profiling}
          onFinish={handleSubmit}
        >
          <Form.Item
            valuePropName="checked"
            label={t('continuous_profiling.settings.switch')}
            extra={t('continuous_profiling.settings.switch_tooltip')}
          >
            <Form.Item noStyle name="enable" valuePropName="checked">
              <Switch disabled={!isWriteable} />
            </Form.Item>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.enable !== cur.enable}
          >
            {({ getFieldValue }) =>
              getFieldValue('enable') && (
                <>
                  <Form.Item
                    label={t('continuous_profiling.settings.profile_targets')}
                    extra={t(
                      'continuous_profiling.settings.profile_targets_tooltip',
                      {
                        n: estimateSize?.instance_count || '?',
                        size: estimateSize?.profile_size
                          ? getValueFormat('decbytes')(
                              estimateSize.profile_size,
                              0
                            )
                          : '?',
                      }
                    )}
                  >
                    <InstanceSelect
                      defaultSelectAll={true}
                      enableTiFlash={true}
                      disabled={true}
                      style={{ width: 200 }}
                    />
                  </Form.Item>

                  <Form.Item
                    label={t(
                      'continuous_profiling.settings.profile_retention_duration'
                    )}
                    extra={t(
                      'continuous_profiling.settings.profile_retention_duration_tooltip'
                    )}
                  >
                    <Input.Group>
                      <Form.Item noStyle name="data_retention_seconds">
                        <Select style={{ width: 180 }}>
                          {dataRetentionSeconds.map((val) => (
                            <Select.Option key={val} value={val}>
                              {getValueFormat('dtdurations')(val, 1)}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Input.Group>
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                disabled={!isWriteable}
              >
                {t('statement.settings.actions.save')}
              </Button>
              <Button onClick={onClose}>
                {t('statement.settings.actions.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </>
  )
}

export default ConProfSettingForm
