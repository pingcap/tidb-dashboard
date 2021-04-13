import React, { useEffect, useMemo, useState } from 'react'
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
  max_refresh_interval: number
  max_history_size: number
}

const convertArrToObj = (arr: number[]) =>
  arr.reduce((acc, cur) => {
    acc[cur] = cur
    return acc
  }, {})

const REFRESH_INTERVAL_MARKS = convertArrToObj([1, 5, 15, 30, 60])
const HISTORY_SIZE_MARKS = convertArrToObj([1, 64, 128, 192, 255])

function StatementSettingForm({ onClose, onConfigUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation()

  const [curRefreshInterval, setCurRefreshInterval] = useState(0)
  const [curHistorySize, setCurHistorySize] = useState(0)
  const dataRetainDuration = useMemo(() => {
    const totalMins = curRefreshInterval * curHistorySize
    const day = Math.floor(totalMins / (24 * 60))
    const hour = Math.floor((totalMins - day * 24 * 60) / 60)
    const min = totalMins - day * 24 * 60 - hour * 60
    return `${day} day ${hour} hour ${min} min`
  }, [curRefreshInterval, curHistorySize])

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
      const max_history_size = Math.max(oriConfig.history_size!, 255)

      return {
        ...oriConfig,
        refresh_interval,
        max_refresh_interval,
        max_history_size,
      } as InternalStatementConfig
    }
    return null
  }, [oriConfig])

  useEffect(() => {
    if (config) {
      setCurRefreshInterval(config.refresh_interval!)
      setCurHistorySize(config.history_size!)
    }
  }, [config])

  async function updateConfig(values) {
    const newConfig: StatementConfig = {
      enable: values.enable,
      refresh_interval: values.refresh_interval * 60,
      history_size: values.history_size,
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
                            onChange={(val) =>
                              setCurRefreshInterval(val as number)
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
                            onChange={(val) => setCurRefreshInterval(val)}
                          />
                        </Form.Item>
                      </Input.Group>
                    </Form.Item>
                    <Form.Item label={t('statement.settings.history_size')}>
                      <Input.Group>
                        <Form.Item noStyle name="history_size">
                          <InputNumber
                            min={1}
                            max={config.max_history_size}
                            onChange={(val) => setCurHistorySize(val as number)}
                          />
                        </Form.Item>
                        <Form.Item noStyle name="history_size">
                          <Slider
                            min={1}
                            max={config.max_history_size}
                            marks={{
                              ...HISTORY_SIZE_MARKS,
                              [config.max_history_size]: `${config.max_history_size}`,
                            }}
                            onChange={(val) => setCurHistorySize(val)}
                          />
                        </Form.Item>
                      </Input.Group>
                    </Form.Item>
                    <Form.Item label={t('statement.settings.keep_duration')}>
                      <span style={{ color: '#555' }}>
                        {dataRetainDuration}
                      </span>
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
