import React, { useState, useCallback, useContext } from 'react'
import { Form, Skeleton, Switch, Space, Button, Modal } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { TopsqlEditableConfig } from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { DrawerFooter, ErrorBar } from '@lib/components'
import { useIsWriteable } from '@lib/utils/store'
import { telemetry } from '../../utils/telemetry'
import { TopSQLContext } from '../../context'

interface Props {
  onClose: () => void
  onConfigUpdated: () => any
}

export function SettingsForm({ onClose, onConfigUpdated }: Props) {
  const ctx = useContext(TopSQLContext)

  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation()
  const isWriteable = useIsWriteable()

  const {
    data: initialConfig,
    isLoading: loading,
    error
  } = useClientRequest(ctx!.ds.topsqlConfigGet)

  const handleSubmit = useCallback(
    (values) => {
      async function updateConfig(values) {
        const newConfig: TopsqlEditableConfig = {
          enable: values.enable
        }
        try {
          setSubmitting(true)
          await ctx!.ds.topsqlConfigPost(newConfig)
          telemetry.saveSettings(newConfig)
          onClose()
          onConfigUpdated()

          if (values.enable && !initialConfig?.enable) {
            Modal.success({
              title: t('topsql.settings.enable_info.title'),
              content: t('topsql.settings.enable_info.content')
            })
          }
        } finally {
          setSubmitting(false)
        }
      }

      if (!values.enable && (initialConfig?.enable ?? true)) {
        // warning
        Modal.confirm({
          title: t('topsql.settings.disable_feature'),
          icon: <ExclamationCircleOutlined />,
          content: t('topsql.settings.disable_warning'),
          okText: t('topsql.settings.actions.close'),
          cancelText: t('topsql.settings.actions.cancel'),
          okButtonProps: { danger: true },
          onOk: () => updateConfig(values)
        })
      } else {
        updateConfig(values)
      }
    },
    [t, onClose, onConfigUpdated, initialConfig, ctx]
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
          <DrawerFooter>
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
          </DrawerFooter>
        </Form>
      )}
    </>
  )
}
