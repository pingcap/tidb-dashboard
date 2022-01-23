import React, { useState, useCallback } from 'react'
import { Form, Skeleton, Switch, Space, Button, Modal } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import client, { TopsqlEditableConfig } from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { ErrorBar } from '@lib/components'
import { useIsWriteable } from '@lib/utils/store'

interface Props {
  onClose: () => void
  onConfigUpdated: () => any
}

export function SettingsForm({ onClose, onConfigUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation()
  const isWriteable = useIsWriteable()

  const {
    data: initialConfig,
    isLoading: loading,
    error,
  } = useClientRequest((reqConfig) =>
    client.getInstance().topsqlConfigGet(reqConfig)
  )

  const handleSubmit = useCallback(
    (values) => {
      async function updateConfig(values) {
        const newConfig: TopsqlEditableConfig = {
          enable: values.enable,
        }
        try {
          setSubmitting(true)
          await client.getInstance().topsqlConfigPost(newConfig)
          onClose()
          onConfigUpdated()
        } finally {
          setSubmitting(false)
        }
      }

      if (!values.enable) {
        // warning
        Modal.confirm({
          title: t('topsql.settings.disable_feature'),
          icon: <ExclamationCircleOutlined />,
          content: t('topsql.settings.disable_warning'),
          okText: t('topsql.settings.actions.close'),
          cancelText: t('topsql.settings.actions.cancel'),
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
          initialValues={initialConfig}
          onFinish={handleSubmit}
        >
          <Form.Item
            valuePropName="checked"
            label={t('topsql.settings.enable')}
            extra={t('topsql.settings.enable_tooltip')}
          >
            <Form.Item noStyle name="enable" valuePropName="checked">
              <Switch
                data-e2e="topsql_settings_enable"
                disabled={!isWriteable}
              />
            </Form.Item>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                disabled={!isWriteable}
                data-e2e="topsql_settings_save"
              >
                {t('topsql.settings.actions.save')}
              </Button>
              <Button onClick={onClose}>
                {t('topsql.settings.actions.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </>
  )
}
