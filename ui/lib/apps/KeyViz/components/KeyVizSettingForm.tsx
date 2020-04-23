import React, { useEffect, useState, useCallback } from 'react'
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

  const onFetchServiceStatus = useCallback(() => {
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
  }, [])

  useEffect(() => {
    onFetchServiceStatus()
  }, [onFetchServiceStatus])

  const onSubmitted = useCallback(() => {
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
  }, [onClose, onConfigUpdated])

  const onUpdateServiceStatus = useCallback(
    (status) => {
      setSubmitting(true)
      updateServiceStatus(status).then(onSubmitted, onSubmitted)
    },
    [onSubmitted]
  )

  const onSubmit = useCallback(
    (values) => {
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
    },
    [config, onUpdateServiceStatus, t]
  )

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
