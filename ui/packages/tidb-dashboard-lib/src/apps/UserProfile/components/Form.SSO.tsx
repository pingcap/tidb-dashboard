import { CheckCircleFilled } from '@ant-design/icons'
import { SsoSSOImpersonationModel } from '@lib/client'
import { AnimatedSkeleton, ErrorBar } from '@lib/components'
import { useIsFeatureSupport, useIsWriteable } from '@lib/utils/store'
import { useChange } from '@lib/utils/useChange'
import { useClientRequest } from '@lib/utils/useClientRequest'
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Typography
} from 'antd'
import React, { useContext } from 'react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_FORM_ITEM_STYLE } from '../utils/helper'
import { UserProfileContext } from '../context'

interface IUserAuthInputProps {
  value?: SsoSSOImpersonationModel
  onChange?: (value: SsoSSOImpersonationModel) => void
}

function isImpersonationNotFailed(imp?: SsoSSOImpersonationModel) {
  return Boolean(
    imp &&
      imp.last_impersonate_status !== 'auth_fail' &&
      imp.last_impersonate_status !== 'insufficient_privileges'
  )
}

function UserAuthInput({ value, onChange }: IUserAuthInputProps) {
  const ctx = useContext(UserProfileContext)

  const { t } = useTranslation()
  const [modalVisible, setModalVisible] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const isWriteable = useIsWriteable()
  const handleClose = useCallback(() => {
    setModalVisible(false)
  }, [])

  const handleAuthnClick = useCallback(() => {
    setModalVisible(true)
  }, [])

  const supportNonRootLogin = useIsFeatureSupport('nonRootLogin')

  const handleFinish = useCallback(
    async (data) => {
      setIsPosting(true)
      try {
        const resp = await ctx!.ds.userSSOCreateImpersonation({
          sql_user: data.user,
          password: data.password
        })
        setModalVisible(false)
        onChange?.(resp.data)
      } finally {
        setIsPosting(false)
      }
    },
    [onChange, ctx]
  )

  return (
    <>
      {Boolean(!value) && (
        <Space>
          <Button onClick={handleAuthnClick} disabled={!isWriteable}>
            {t('user_profile.sso.form.user.authn_button')}
          </Button>
        </Space>
      )}
      {Boolean(value) && (
        <Space>
          <span>{value!.sql_user}</span>

          {isImpersonationNotFailed(value) && (
            <Typography.Text type="success">
              <CheckCircleFilled />{' '}
              {t('user_profile.sso.form.user.authn_status.ok')}
            </Typography.Text>
          )}
          {value?.last_impersonate_status === 'auth_fail' && (
            <Typography.Text type="danger">
              <CheckCircleFilled />{' '}
              {t('user_profile.sso.form.user.authn_status.auth_failed')}
            </Typography.Text>
          )}
          {value?.last_impersonate_status === 'insufficient_privileges' && (
            <Typography.Text type="danger">
              <CheckCircleFilled />{' '}
              {t(
                'user_profile.sso.form.user.authn_status.insufficient_privileges'
              )}
            </Typography.Text>
          )}

          <Button onClick={handleAuthnClick} disabled={!isWriteable}>
            {t('user_profile.sso.form.user.modify_authn_button')}
          </Button>
        </Space>
      )}
      <Modal
        title={t('user_profile.sso.form.user.authn_dialog.title')}
        visible={modalVisible}
        destroyOnClose
        onCancel={handleClose}
        width={600}
        footer={null}
      >
        <Form
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ user: value?.sql_user || 'root', password: '' }}
        >
          <Form.Item
            name="user"
            label={t('user_profile.sso.form.user.authn_dialog.user')}
          >
            <Input
              style={DEFAULT_FORM_ITEM_STYLE}
              disabled={!supportNonRootLogin}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('user_profile.sso.form.user.authn_dialog.password')}
          >
            <Input style={DEFAULT_FORM_ITEM_STYLE} type="password" />
          </Form.Item>
          <Form.Item>
            <Alert
              message={t('user_profile.sso.form.user.authn_dialog.info')}
              type="info"
              showIcon
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isPosting}>
                {t('user_profile.sso.form.user.authn_dialog.submit')}
              </Button>
              <Button onClick={handleClose}>
                {t('user_profile.sso.form.user.authn_dialog.close')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

const UserAuthInputMemo = React.memo(UserAuthInput)

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
  const isWriteable = useIsWriteable()

  useChange(() => {
    if (config) {
      form.setFieldsValue(config)
      initialForm.current = { ...config }
    }
  }, [config])

  useChange(() => {
    if (impData) {
      let rootImp: SsoSSOImpersonationModel | undefined = impData[0]
      const update = { user_authenticated: rootImp }
      form.setFieldsValue(update)
      initialForm.current = {
        ...initialForm.current,
        ...update
      }
    }
  }, [impData])

  // TODO: Extract common logic
  const handleCancel = useCallback(() => {
    form.setFieldsValue({ ...initialForm.current })
    setIsChanged(false)
  }, [form])

  const handleFinish = useCallback(
    async (data) => {
      setIsPosting(true)
      try {
        await ctx!.ds.userSSOSetConfig({ config: data })
        sendRequest()
        setIsChanged(false)
      } finally {
        setIsPosting(false)
      }
    },
    [sendRequest, ctx]
  )

  const handleAuthStateChange = useCallback(() => {
    impSendRequest()
  }, [impSendRequest])

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
          <Switch disabled={!isWriteable} />
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
                  <Input disabled={!isWriteable} style={{ width: 320 }} />
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
                        disabled={!isWriteable}
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
                    disabled={!isWriteable}
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
                    disabled={!isWriteable}
                    style={{ width: 320 }}
                    placeholder="https://example.com"
                  />
                </Form.Item>
                <Form.Item
                  label={t('user_profile.sso.form.user.label')}
                  extra={t('user_profile.sso.form.user.extra')}
                  name="user_authenticated"
                  rules={[
                    {
                      validator(_, value) {
                        if (!value) {
                          return Promise.reject(
                            new Error(t('user_profile.sso.form.user.must_auth'))
                          )
                        }
                        return Promise.resolve()
                      }
                    }
                  ]}
                >
                  <UserAuthInputMemo onChange={handleAuthStateChange} />
                </Form.Item>
                <Form.Item
                  name="is_read_only"
                  label={t('user_profile.sso.form.is_read_only')}
                  valuePropName="checked"
                >
                  <Checkbox disabled={!isWriteable} />
                </Form.Item>
              </>
            )
          }
        </Form.Item>
        {isChanged && (
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
