import { AnimatedSkeleton, ErrorBar } from '@lib/components'
import { useCanManageSSO, useIsFeatureSupport } from '@lib/utils/store'
import { useChange } from '@lib/utils/useChange'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { Alert, Button, Checkbox, Form, Input, Space, Switch } from 'antd'
import React, { useCallback, useContext, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserProfileContext } from '../context'

export function SSOForm() {
  const ctx = useContext(UserProfileContext)

  const { t } = useTranslation()
  const [isChanged, setIsChanged] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const handleValuesChange = useCallback(() => setIsChanged(true), [])
  const [form] = Form.useForm()
  const {
    error,
    isLoading,
    data: config,
    sendRequest
  } = useClientRequest(ctx!.ds.userSSOGetConfig)
  const {
    error: impError,
    isLoading: impIsLoading,
    data: impData,
    sendRequest: impSendRequest
  } = useClientRequest(ctx!.ds.userSSOListImpersonations)
  const initialForm = useRef<any>(null) // Used for "Cancel" behaviour
  const canManageSSO = useCanManageSSO()
  const supportNonRootLogin = useIsFeatureSupport('nonRootLogin')

  useChange(() => {
    if (config) {
      form.setFieldsValue(config)
      initialForm.current = { ...initialForm.current, ...config }
    }
  }, [config])

  useChange(() => {
    if (impData) {
      const update = { sql_user: impData[0]?.sql_user || 'root' }
      form.setFieldsValue(update)
      initialForm.current = { ...initialForm.current, ...update }
    }
  }, [impData])

  // TODO: Extract common logic
  const handleCancel = useCallback(() => {
    form.setFieldsValue({ ...initialForm.current, password: '' })
    setIsChanged(false)
  }, [form])

  const handleFinish = useCallback(
    async (data) => {
      setIsPosting(true)
      try {
        const { sql_user, password, ...config } = data
        await ctx!.ds.userSSOSetConfig({ config, sql_user, password })
        form.setFieldsValue({ password: '' })
        sendRequest()
        impSendRequest()
        setIsChanged(false)
      } finally {
        setIsPosting(false)
      }
    },
    [sendRequest, impSendRequest, ctx, form]
  )

  return (
    <Form
      layout="vertical"
      onValuesChange={handleValuesChange}
      form={form}
      onFinish={handleFinish}
    >
      <AnimatedSkeleton loading={isLoading || impIsLoading}>
        {(error || impError) && <ErrorBar errors={[error || impError]} />}
        <Form.Item
          name="enabled"
          label={t('user_profile.sso.switch.label')}
          extra={t('user_profile.sso.switch.extra')}
          valuePropName="checked"
        >
          <Switch disabled={!canManageSSO} />
        </Form.Item>
        <Form.Item noStyle shouldUpdate>
          {(f) =>
            f.getFieldValue('enabled') && (
              <>
                <Form.Item
                  name="client_id"
                  label={t('user_profile.sso.form.client_id')}
                  rules={[{ required: true }]}
                >
                  <Input disabled={!canManageSSO} style={{ width: 320 }} />
                </Form.Item>
                {
                  // to compatible with old version
                  config?.client_secret !== undefined && (
                    <Form.Item
                      name="client_secret"
                      label={t('user_profile.sso.form.client_secret')}
                      rules={[{ required: false }]}
                      tooltip={t('user_profile.sso.form.client_secret_tooltip')}
                    >
                      <Input
                        disabled={!canManageSSO}
                        style={{ width: 320 }}
                        placeholder="********"
                      />
                    </Form.Item>
                  )
                }
                <Form.Item
                  name="scopes"
                  label={t('user_profile.sso.form.scopes')}
                  rules={[{ required: false }]}
                >
                  <Input
                    disabled={!canManageSSO}
                    style={{ width: 320 }}
                    placeholder="openid profile email"
                  />
                </Form.Item>
                <Form.Item
                  name="discovery_url"
                  label={t('user_profile.sso.form.discovery_url')}
                  rules={[{ required: true }]}
                >
                  <Input
                    disabled={!canManageSSO}
                    style={{ width: 320 }}
                    placeholder="https://example.com"
                  />
                </Form.Item>
                <Form.Item
                  name="is_read_only"
                  label={t('user_profile.sso.form.is_read_only')}
                  valuePropName="checked"
                >
                  <Checkbox disabled={!canManageSSO} />
                </Form.Item>
              </>
            )
          }
        </Form.Item>
        <Alert
          type="info"
          showIcon
          message={t('user_profile.sso.form.reauthorize')}
          style={{ marginBottom: 16 }}
        />
        <Form.Item
          name="sql_user"
          label={t('user_profile.sso.form.user.authn_dialog.user')}
          rules={[{ required: true }]}
        >
          <Input
            disabled={
              !canManageSSO || !supportNonRootLogin || Boolean(impData?.length)
            }
            style={{ width: 320 }}
            autoComplete="username"
          />
        </Form.Item>
        <Form.Item
          name="password"
          label={t('user_profile.sso.form.user.authn_dialog.password')}
        >
          <Input.Password
            disabled={!canManageSSO}
            style={{ width: 320 }}
            autoComplete="new-password"
          />
        </Form.Item>
        {isChanged && canManageSSO && (
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isPosting}>
                {t('user_profile.sso.form.update')}
              </Button>
              <Button onClick={handleCancel}>
                {t('user_profile.sso.form.cancel')}
              </Button>
            </Space>
          </Form.Item>
        )}
      </AnimatedSkeleton>
    </Form>
  )
}
