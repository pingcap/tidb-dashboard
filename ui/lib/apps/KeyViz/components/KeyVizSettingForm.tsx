import React, { useEffect, useState } from 'react'
import { Form, Skeleton, Switch, Space, Button, Modal } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { fetchServiceStatus, updateServiceStatus } from '../utils'
import { ConfigKeyVisualConfig } from '@lib/client'

interface Props {
  onClose: () => void
  onConfigUpdated: () => any
}

function KeyVizSettingForm({ onClose, onConfigUpdated }: Props) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [config, setConfig] = useState<ConfigKeyVisualConfig | null>(null)
  const { t } = useTranslation()

  const onFetchServiceStatus = () => {
    setLoading(true)
    fetchServiceStatus().then(
      (status) => {
        setConfig({ auto_collection_enabled: status })
        setLoading(false)
      },
      () => {
        setLoading(false)
      }
    )
  }

  const onSubmitted = () => {
    fetchServiceStatus().then(
      (status) => {
        setConfig({ auto_collection_enabled: status })
        setSubmitting(false)
        onClose()
        setTimeout(onConfigUpdated, 500)
      },
      () => {
        setSubmitting(false)
      }
    )
  }

  const onUpdateServiceStatus = (status) => {
    setSubmitting(true)
    updateServiceStatus(status).then(onSubmitted, onSubmitted)
  }

  const onSubmit = (values) => {
    if (config?.auto_collection_enabled && !values.auto_collection_enabled) {
      Modal.confirm({
        title: t('keyviz.settings.close_keyviz'),
        icon: <ExclamationCircleOutlined />,
        content: t('keyviz.settings.close_keyviz_warning'),
        okText: t('keyviz.settings.actions.close'),
        cancelText: t('keyviz.settings.actions.cancel'),
        okButtonProps: { type: 'danger' },
        onOk: () => onUpdateServiceStatus(false),
      })
    } else {
      onUpdateServiceStatus(values.auto_collection_enabled)
    }
  }

  useEffect(onFetchServiceStatus, [])

  return (
    <>
      {loading && <Skeleton active={true} paragraph={{ rows: 2 }} />}
      {!loading && config && (
        <Form layout="vertical" initialValues={config} onFinish={onSubmit}>
          <Form.Item
            name="auto_collection_enabled"
            valuePropName="checked"
            label={t('keyviz.settings.switch')}
          >
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {t('keyviz.settings.actions.save')}
              </Button>
              <Button onClick={onClose}>
                {t('keyviz.settings.actions.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </>
  )
}

export default KeyVizSettingForm
