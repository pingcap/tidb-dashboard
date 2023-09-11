import React, { useState, useCallback, useMemo, useContext } from 'react'
import {
  Form,
  Skeleton,
  Switch,
  Input,
  Space,
  Button,
  Modal,
  Select
} from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation, TFunction } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { ConprofContinuousProfilingConfig } from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { DrawerFooter, ErrorBar, InstanceSelect } from '@lib/components'
import { useIsWriteable } from '@lib/utils/store'
import { telemetry } from '../utils/telemetry'
import { ConProfilingContext } from '../context'

const ONE_DAY_SECONDS = 24 * 60 * 60
const RETENTION_SECONDS = [
  3 * ONE_DAY_SECONDS,
  5 * ONE_DAY_SECONDS,
  10 * ONE_DAY_SECONDS
]

function translateSecToDay(seconds: number, t: TFunction) {
  // in our case, the seconds value must be the multiple of one day seconds
  if (seconds % ONE_DAY_SECONDS !== 0) {
    console.warn(`${seconds} is not the mulitple of one day seconds`)
  }
  const day = seconds / ONE_DAY_SECONDS
  return t('conprof.settings.profile_retention_duration_option', {
    d: day
  })
}

interface Props {
  onClose: () => void
  onConfigUpdated: () => any
}

function ConProfSettingForm({ onClose, onConfigUpdated }: Props) {
  const ctx = useContext(ConProfilingContext)

  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation()
  const isWriteable = useIsWriteable()

  const {
    data: initialConfig,
    isLoading: loading,
    error
  } = useClientRequest(() =>
    ctx!.ds.continuousProfilingConfigGet({ handleError: 'custom' })
  )

  const { data: estimateSize } = useClientRequest(() =>
    ctx!.ds.continuousProfilingEstimateSizeGet({ handleError: 'custom' })
  )

  const dataRetentionSeconds = useMemo(() => {
    const curRetentionSec =
      initialConfig?.continuous_profiling?.data_retention_seconds
    if (
      curRetentionSec &&
      RETENTION_SECONDS.indexOf(curRetentionSec) === -1 &&
      // filter out the duration that is not multiple of ONE_DAY_SECONDS
      curRetentionSec % ONE_DAY_SECONDS === 0
    ) {
      return RETENTION_SECONDS.concat(curRetentionSec).sort()
    }
    return RETENTION_SECONDS
  }, [initialConfig])

  const handleSubmit = useCallback(
    (values) => {
      async function updateConfig(values) {
        const newConfig: ConprofContinuousProfilingConfig = {
          enable: values.enable,
          data_retention_seconds: values.data_retention_seconds
        }
        try {
          setSubmitting(true)
          await ctx!.ds.continuousProfilingConfigPost({
            continuous_profiling: newConfig
          })
          telemetry.saveSettings(newConfig)
          onClose()
          onConfigUpdated()
        } finally {
          setSubmitting(false)
        }
      }

      if (!values.enable) {
        // confirm
        Modal.confirm({
          title: t('conprof.settings.close_feature'),
          icon: <ExclamationCircleOutlined />,
          content: t('conprof.settings.close_feature_confirm'),
          okText: t('conprof.settings.actions.close'),
          cancelText: t('conprof.settings.actions.cancel'),
          okButtonProps: { danger: true },
          onOk: () => updateConfig(values)
        })
      } else {
        updateConfig(values)
      }
    },
    [t, onClose, onConfigUpdated, ctx]
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
            label={t('conprof.settings.switch')}
            extra={t('conprof.settings.switch_tooltip')}
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
                    label={t('conprof.settings.profile_targets')}
                    extra={t('conprof.settings.profile_targets_tooltip', {
                      n: estimateSize?.instance_count || '?',
                      size: estimateSize?.profile_size
                        ? getValueFormat('decbytes')(
                            estimateSize.profile_size,
                            0
                          )
                        : '?'
                    })}
                  >
                    <InstanceSelect
                      defaultSelectAll={true}
                      enableTiFlash={true}
                      disabled={true}
                      style={{ width: 200 }}
                      getTiDBTopology={ctx!.ds.getTiDBTopology}
                      getStoreTopology={ctx!.ds.getStoreTopology}
                      getPDTopology={ctx!.ds.getPDTopology}
                    />
                  </Form.Item>

                  <Form.Item
                    label={t('conprof.settings.profile_retention_duration')}
                    extra={t(
                      'conprof.settings.profile_retention_duration_tooltip'
                    )}
                  >
                    <Input.Group>
                      <Form.Item noStyle name="data_retention_seconds">
                        <Select style={{ width: 180 }}>
                          {dataRetentionSeconds.map((val) => (
                            <Select.Option key={val} value={val}>
                              {translateSecToDay(val, t)}
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
          <DrawerFooter>
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
          </DrawerFooter>
        </Form>
      )}
    </>
  )
}

export default ConProfSettingForm
