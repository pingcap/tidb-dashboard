import React, { useMemo, useState } from 'react'
import {
  Form,
  InputNumber,
  Skeleton,
  Switch,
  Input,
  Slider,
  Space,
  Button,
  Modal,
} from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import client, { StatementConfig } from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { ErrorBar } from '@lib/components'

interface Props {
  onClose: () => void
  onConfigUpdated: () => any
}

type InternalStatementConfig = StatementConfig & {
  keep_duration: number
  max_refresh_interval: number
  max_keep_duration: number
}

const convertArrToObj = (arr: number[]) =>
  arr.reduce((acc, cur) => {
    acc[cur] = cur
    return acc
  }, {})

const REFRESH_INTERVAL_MARKS = convertArrToObj([1, 5, 15, 30, 60])
const KEEP_DURATION_MARKS = {
  4: '4h',
  24: '1d',
  48: '2d',
  120: '5d',
  240: '10d',
}

const inputNumberFormatter = (value: number | string | undefined): string => {
  const day = Math.floor((value as number) / 24)
  const hour = (value as number) % 24
  return `${day} day ${hour} hour`
}

const inputNumberParser = (
  displayValue: string | undefined
): number | string => {
  const arr = displayValue?.split(' ') || []
  const day = parseInt(arr[0]) || 0
  const hour = parseInt(arr[2]) || 0
  return day * 24 + hour
}

function StatementSettingForm({ onClose, onConfigUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation()

  const {
    data: oriConfig,
    isLoading: loading,
    error,
  } = useClientRequest((reqConfig) =>
    client.getInstance().statementsConfigGet(reqConfig)
  )

  const config = useMemo(() => {
    if (oriConfig) {
      const refresh_interval = Math.ceil(oriConfig.refresh_interval! / 60)
      const max_refresh_interval = Math.max(refresh_interval, 60)
      const keep_duration = Math.ceil(
        (oriConfig.refresh_interval! * oriConfig.history_size!) / (60 * 60)
      )
      const max_keep_duration = Math.max(keep_duration, 10 * 24)

      return {
        ...oriConfig,
        refresh_interval,
        keep_duration,
        max_refresh_interval,
        max_keep_duration,
      } as InternalStatementConfig
    }
    return null
  }, [oriConfig])

  async function updateConfig(values) {
    const historySize = Math.ceil(
      (values.keep_duration * 60) / values.refresh_interval
    )
    if (historySize > 255) {
      Modal.error({
        title: t('statement.settings.setting_error_modal.title'),
        content: t('statement.settings.setting_error_modal.content', {
          historySize,
        }),
      })
      return
    }
    const newConfig: StatementConfig = {
      enable: values.enable,
      refresh_interval: values.refresh_interval * 60,
      history_size: historySize,
    }
    try {
      setSubmitting(true)
      await client.getInstance().statementsConfigPost(newConfig)
      onClose()
      onConfigUpdated()
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(values) {
    if (oriConfig?.enable && !values.enable) {
      // warning
      Modal.confirm({
        title: t('statement.settings.close_statement'),
        icon: <ExclamationCircleOutlined />,
        content: t('statement.settings.close_statement_warning'),
        okText: t('statement.settings.actions.close'),
        cancelText: t('statement.settings.actions.cancel'),
        okButtonProps: { danger: true },
        onOk: () => updateConfig(values),
      })
    } else {
      updateConfig(values)
    }
  }

  return (
    <>
      {error && <ErrorBar errors={[error]} />}
      {loading && <Skeleton active={true} paragraph={{ rows: 5 }} />}
      {!loading && config && (
        <Form layout="vertical" initialValues={config} onFinish={handleSubmit}>
          <Form.Item
            name="enable"
            valuePropName="checked"
            label={t('statement.settings.switch')}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.enable !== cur.enable}
          >
            {({ getFieldValue }) => {
              return (
                getFieldValue('enable') && (
                  <Form.Item noStyle>
                    <Form.Item label={t('statement.settings.refresh_interval')}>
                      <Input.Group>
                        <Form.Item noStyle name="refresh_interval">
                          <InputNumber
                            min={1}
                            max={config.max_refresh_interval}
                            formatter={(value) => `${value} min`}
                            parser={(value) =>
                              value?.replace(/[^\d]/g, '') || ''
                            }
                          />
                        </Form.Item>
                        <Form.Item noStyle name="refresh_interval">
                          <Slider
                            min={1}
                            max={config.max_refresh_interval}
                            marks={{
                              ...REFRESH_INTERVAL_MARKS,
                              [config.max_refresh_interval]: `${config.max_refresh_interval}`,
                            }}
                          />
                        </Form.Item>
                      </Input.Group>
                    </Form.Item>
                    <Form.Item label={t('statement.settings.keep_duration')}>
                      <Input.Group>
                        <Form.Item noStyle name="keep_duration">
                          <InputNumber
                            style={{ width: 140 }}
                            min={4}
                            max={config.max_keep_duration}
                            step={4}
                            formatter={inputNumberFormatter}
                            parser={inputNumberParser}
                          />
                        </Form.Item>
                        <Form.Item noStyle name="keep_duration">
                          <Slider
                            min={4}
                            max={config.max_keep_duration}
                            step={4}
                            marks={{
                              [config.max_keep_duration]: `${config.max_keep_duration}h`,
                              ...KEEP_DURATION_MARKS,
                            }}
                          />
                        </Form.Item>
                      </Input.Group>
                    </Form.Item>
                  </Form.Item>
                )
              )
            }}
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
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

export default StatementSettingForm
