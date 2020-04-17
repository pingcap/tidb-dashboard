import React, { useEffect, useState } from 'react'
import {
  Form,
  message,
  InputNumber,
  Skeleton,
  Switch,
  Input,
  Slider,
  Space,
  Button,
  Modal,
} from 'antd'
import { StatementConfig } from '@lib/client'
import { ExclamationCircleOutlined } from '@ant-design/icons'

interface Props {
  instanceId: string

  onClose: () => void
  onFetchConfig: (instanceId: string) => Promise<StatementConfig | undefined>
  onUpdateConfig: (instanceId: string, config: StatementConfig) => Promise<any>
  onConfigUpdated: () => any
}

type InternalStatementConfig = StatementConfig & {
  keep_duration: number
  max_refresh_interval: number
  max_keep_duration: number
}

const REFRESH_INTERVAL_MARKS = {
  1: '1',
  5: '5',
  15: '15',
  30: '30',
  60: '60',
}

const KEEY_DURATION_MARKS = {
  1: '1',
  2: '2',
  5: '5',
  10: '10',
  20: '20',
  30: '30',
}

function StatementSettingForm({
  instanceId,
  onClose,
  onFetchConfig,
  onUpdateConfig,
  onConfigUpdated,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [oriConfig, setOriConfig] = useState<StatementConfig | null>(null)
  const [config, setConfig] = useState<InternalStatementConfig | null>(null)

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true)
      const res = await onFetchConfig(instanceId)
      if (res !== undefined) {
        setOriConfig(res)

        const refresh_interval = Math.ceil(res.refresh_interval / 60)
        const max_refresh_interval = Math.max(refresh_interval, 60)
        const keep_duration = Math.ceil(
          (res.refresh_interval * res.history_size) / (24 * 60 * 60)
        )
        const max_keep_duration = Math.max(keep_duration, 30)
        setConfig({
          ...res,
          refresh_interval,
          keep_duration,
          max_refresh_interval,
          max_keep_duration,
        })
      }
      setLoading(false)
    }
    fetchConfig()
  }, [instanceId, onFetchConfig])

  async function updateConfig(values) {
    setSubmitting(true)
    const newConfig: StatementConfig = {
      enable: values.enable,
      refresh_interval: values.refresh_interval * 60,
      history_size: Math.ceil(
        (values.keep_duration * 24 * 60) / values.refresh_interval
      ),
    }
    const res = await onUpdateConfig(instanceId, newConfig)
    setSubmitting(false)
    if (res !== undefined) {
      message.success(`设置 Statement 成功！`)
      onClose()
      onConfigUpdated()
    }
  }

  function handleSubmit(values) {
    if (oriConfig.enable && !values.enable) {
      // warning
      Modal.confirm({
        title: '关闭 SQL 语句分析功能',
        icon: <ExclamationCircleOutlined />,
        content: '确认要关闭该功能吗？关闭后现有历史记录也将被清空！',
        okText: '关闭',
        cancelText: '取消',
        okButtonProps: { type: 'danger' },
        onOk: () => updateConfig(values),
      })
    } else {
      updateConfig(values)
    }
  }

  return (
    <>
      {loading && <Skeleton active={true} paragraph={{ rows: 5 }} />}
      {!loading && config && (
        <Form layout="vertical" initialValues={config} onFinish={handleSubmit}>
          <Form.Item name="enable" valuePropName="checked" label="总开关">
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
                    <Form.Item label="数据收集周期">
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
                    <Form.Item label="数据保留时间">
                      <Input.Group>
                        <Form.Item noStyle name="keep_duration">
                          <InputNumber
                            min={1}
                            max={config.max_keep_duration}
                            formatter={(value) => `${value} day`}
                            parser={(value) =>
                              value?.replace(/[^\d]/g, '') || ''
                            }
                          />
                        </Form.Item>
                        <Form.Item noStyle name="keep_duration">
                          <Slider
                            min={1}
                            max={config.max_keep_duration}
                            marks={{
                              ...KEEY_DURATION_MARKS,
                              [config.max_keep_duration]: `${config.max_keep_duration}`,
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
                保存
              </Button>
              <Button onClick={onClose}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </>
  )
}

export default StatementSettingForm
