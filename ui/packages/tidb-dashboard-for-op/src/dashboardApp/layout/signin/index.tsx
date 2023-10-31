import CSSMotion from 'rc-animate/es/CSSMotion'
import cx from 'classnames'
import * as singleSpa from 'single-spa'
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  ReactNode
} from 'react'
import {
  DownOutlined,
  GlobalOutlined,
  LockOutlined,
  UserOutlined,
  KeyOutlined,
  ArrowRightOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { Form, Input, InputRef, Button, message, Typography, Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useMount } from 'react-use'
import Flexbox from '@g07cha/flexbox-react'
import { useMemoizedFn } from 'ahooks'
import JSEncrypt from 'jsencrypt'

import {
  // distro
  isDistro,
  // store
  useIsFeatureSupport,
  // components
  Root,
  AppearAnimate,
  LanguageDropdown
} from '@pingcap/tidb-dashboard-lib'

import client, { UserAuthenticateForm } from '~/client'
import auth from '~/utils/auth'
import { getAuthURL } from '~/utils/authSSO'
import { landingSvg, logoSvg } from '~/utils/distro/assetsRes'

import styles from './index.module.less'

enum DisplayFormType {
  uninitialized,
  tidbCredential,
  shareCode,
  sso
}

function AlternativeAuthLink({ onClick }) {
  const { t } = useTranslation()
  return (
    <div className={cx(styles.extraLink, styles.clickable)}>
      <a onClick={onClick}>
        <LockOutlined /> {t('signin.form.use_alternative')}
      </a>
    </div>
  )
}

function LanguageDrop() {
  return (
    <div className={styles.extraLink}>
      <LanguageDropdown>
        <a>
          <GlobalOutlined /> Switch Language <DownOutlined />
        </a>
      </LanguageDropdown>
    </div>
  )
}

interface IAlternativeFormButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title: string
  description: string
  className?: string
}

function AlternativeFormButton({
  title,
  description,
  className,
  ...restProps
}: IAlternativeFormButtonProps) {
  return (
    <button className={cx(className, styles.alternativeButton)} {...restProps}>
      <div className={styles.title}>{title}</div>
      <div>
        <Typography.Text type="secondary">
          <small>{description}</small>
        </Typography.Text>
      </div>
      <div className={styles.icon}>
        <ArrowRightOutlined />
      </div>
    </button>
  )
}

function AlternativeAuthForm({
  className,
  onClose,
  onSwitchForm,
  supportedAuthTypes,
  ...restProps
}) {
  const { t } = useTranslation()

  return (
    <div className={cx(className, styles.alternativeFormLayer)} {...restProps}>
      <div className={styles.dialogContainer}>
        <div className={styles.dialog}>
          <Form>
            <Form.Item>
              <h2>
                <Flexbox
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <div>{t('signin.form.alternative.title')}</div>
                  <button
                    className={styles.alternativeCloseButton}
                    onClick={onClose}
                  >
                    <CloseOutlined />
                  </button>
                </Flexbox>
              </h2>
            </Form.Item>
            <Form.Item>
              <AlternativeFormButton
                title={t('signin.form.tidb_auth.switch.title')}
                description={t('signin.form.tidb_auth.switch.description')}
                onClick={() => onSwitchForm(DisplayFormType.tidbCredential)}
              />
            </Form.Item>
            <Form.Item>
              <AlternativeFormButton
                title={t('signin.form.code_auth.switch.title')}
                description={t('signin.form.code_auth.switch.description')}
                onClick={() => onSwitchForm(DisplayFormType.shareCode)}
              />
            </Form.Item>
            {Boolean(supportedAuthTypes.indexOf(auth.AuthTypes.SSO) > -1) && (
              <Form.Item>
                <AlternativeFormButton
                  title={t('signin.form.sso.switch.title')}
                  description={t('signin.form.sso.switch.description')}
                  onClick={() => onSwitchForm(DisplayFormType.sso)}
                />
              </Form.Item>
            )}
            <LanguageDrop />
          </Form>
        </div>
      </div>
    </div>
  )
}

function useSignInSubmit(
  successRoute,
  fnLoginForm: (form) => UserAuthenticateForm,
  onSuccess: (form) => void,
  onFailure: () => void
) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | ReactNode | null>(null)

  const clearErrorMsg = useCallback(() => {
    setError(null)
  }, [])

  const handleSubmit = useMemoizedFn(async (form) => {
    try {
      clearErrorMsg()
      setLoading(true)
      const r = await client
        .getInstance()
        .userLogin({ message: fnLoginForm(form) }, {
          handleError: 'custom'
        } as any)
      auth.setAuthToken(r.data.token)
      message.success(t('signin.message.success'))
      singleSpa.navigateToUrl(successRoute)
      onSuccess(form)
    } catch (e) {
      const { handled, message, errCode } = e as any
      if (!handled) {
        const errMsg = t('signin.message.error', { msg: message })
        if (errCode !== 'api.user.signin.insufficient_priv') {
          setError(errMsg)
        } else {
          // only add help link for TiDB distro when meeting insufficient_privileges error
          const errComp = (
            <>
              {errMsg}
              {!isDistro() && (
                <>
                  {' '}
                  <a
                    href={t('signin.message.access_doc_link')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('signin.message.access_doc')}
                  </a>
                </>
              )}
            </>
          )
          setError(errComp)
        }
        onFailure()
      }
    } finally {
      setLoading(false)
    }
  })

  return { handleSubmit, loading, errorMsg: error, clearErrorMsg }
}

const LAST_LOGIN_USERNAME_KEY = 'dashboard_last_login_username'

function TiDBSignInForm({ successRoute, onClickAlternative, publicKey }) {
  const supportNonRootLogin = useIsFeatureSupport('nonRootLogin')

  const { t } = useTranslation()

  const [refForm] = Form.useForm()
  const refPassword = useRef<InputRef>(null)

  const { handleSubmit, loading, errorMsg, clearErrorMsg } = useSignInSubmit(
    successRoute,
    (form) => {
      let password = form.password ?? ''
      if (!!publicKey) {
        const jsEncrypt = new JSEncrypt()
        if (publicKey.startsWith('-----BEGIN PUBLIC KEY-----')) {
          // if publicKey is generated by `ExportPublicKeyAsString(s.rsaPublicKey)`, it has header and footer, so we use it directly
          jsEncrypt.setPublicKey(publicKey)
        } else {
          // if publicKey is generated by `DumpPublicKeyBase64(s.rsaPublicKey)`, it has no header and footer, so we need to add them
          jsEncrypt.setPublicKey(
            '-----BEGIN PUBLIC KEY-----' +
              publicKey +
              '-----END PUBLIC KEY-----'
          )
        }
        password = jsEncrypt.encrypt(password)
      }
      return {
        username: form.username,
        password,
        type: auth.AuthTypes.SQLUser
      }
    },
    (form) => {
      localStorage.setItem(LAST_LOGIN_USERNAME_KEY, form.username)
    },
    () => {
      refForm.setFieldsValue({ password: '' })
      setTimeout(() => {
        refPassword.current?.focus()
      }, 0)
    }
  )

  useMount(() => {
    refPassword?.current?.focus()
  })

  const lastLoginUsername = useMemo(() => {
    return localStorage.getItem(LAST_LOGIN_USERNAME_KEY) || ''
  }, [])

  return (
    <div className={styles.dialogContainer}>
      <div className={styles.dialog}>
        <Form
          name="tidb_signin"
          onFinish={handleSubmit}
          layout="vertical"
          initialValues={{ username: lastLoginUsername }}
          form={refForm}
        >
          <img src={logoSvg} className={styles.logo} />
          <Form.Item>
            <h2>{t('signin.form.tidb_auth.title')}</h2>
          </Form.Item>
          <Form.Item
            name="username"
            label={t('signin.form.username')}
            rules={[{ required: true }]}
            tooltip={!supportNonRootLogin && t('signin.form.username_tooltip')}
          >
            <Input
              data-e2e="signin_username_input"
              onInput={clearErrorMsg}
              prefix={<UserOutlined />}
              disabled={!supportNonRootLogin}
            />
          </Form.Item>
          <Form.Item
            data-e2e="signin_password_form_item"
            name="password"
            label={t('signin.form.password')}
            {...(errorMsg && {
              help: errorMsg,
              validateStatus: 'error'
            })}
          >
            <Input
              prefix={<KeyOutlined />}
              type="password"
              disabled={loading}
              onInput={clearErrorMsg}
              ref={refPassword}
              data-e2e="signin_password_input"
            />
          </Form.Item>
          <Form.Item>
            <Button
              data-e2e="signin_submit"
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              className={styles.signInButton}
              block
            >
              {t('signin.form.button')}
            </Button>
          </Form.Item>
          <AlternativeAuthLink onClick={onClickAlternative} />
          <LanguageDrop />
        </Form>
      </div>
    </div>
  )
}

function CodeSignInForm({ successRoute, onClickAlternative }) {
  const { t } = useTranslation()

  const [refForm] = Form.useForm()
  const refPassword = useRef<InputRef>(null)

  const { handleSubmit, loading, errorMsg, clearErrorMsg } = useSignInSubmit(
    successRoute,
    (form) => ({
      password: form.code,
      type: auth.AuthTypes.SharingCode
    }),
    () => {},
    () => {
      refForm.setFieldsValue({ code: '' })
      setTimeout(() => {
        refPassword.current?.focus()
      }, 0)
    }
  )

  useMount(() => {
    refPassword?.current?.focus()
  })

  return (
    <div className={styles.dialogContainer}>
      <div className={styles.dialog}>
        <Form onFinish={handleSubmit} layout="vertical" form={refForm}>
          <img src={logoSvg} className={styles.logo} />
          <Form.Item>
            <h2>{t('signin.form.code_auth.title')}</h2>
          </Form.Item>
          <Form.Item
            name="code"
            label={t('signin.form.code_auth.code')}
            {...(errorMsg && {
              help: errorMsg,
              validateStatus: 'error'
            })}
          >
            <Input
              prefix={<KeyOutlined />}
              type="password"
              onInput={clearErrorMsg}
              disabled={loading}
              ref={refPassword}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              className={styles.signInButton}
              block
            >
              {t('signin.form.button')}
            </Button>
          </Form.Item>
          <AlternativeAuthLink onClick={onClickAlternative} />
          <LanguageDrop />
        </Form>
      </div>
    </div>
  )
}

function SSOSignInForm({ successRoute, onClickAlternative }) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = useCallback(async () => {
    setIsLoading(true)
    try {
      const url = await getAuthURL()
      window.location.href = url
      // Do not hide loading status when url is resolved, since we are now jumping
    } catch (e) {
      setIsLoading(false)
    }
  }, [])

  return (
    <div className={styles.dialogContainer}>
      <div className={styles.dialog}>
        <Form>
          <img src={logoSvg} className={styles.logo} />
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isLoading}
              className={styles.signInButton}
              block
              onClick={handleSignIn}
            >
              {t('signin.form.sso.button')}
            </Button>
          </Form.Item>
          <AlternativeAuthLink onClick={onClickAlternative} />
          <LanguageDrop />
        </Form>
      </div>
    </div>
  )
}

function App({ registry }) {
  const successRoute = useMemo(
    () => `#${registry.getDefaultRouter()}`,
    [registry]
  )
  const [alternativeVisible, setAlternativeVisible] = useState(false)
  const [formType, setFormType] = useState(DisplayFormType.uninitialized)
  const [supportedAuthTypes, setSupportedAuthTypes] = useState<Array<number>>([
    0
  ])
  const [publicKey, setPublicKey] = useState('')

  const handleClickAlternative = useCallback(() => {
    setAlternativeVisible(true)
  }, [])

  const handleAlternativeClose = useCallback(() => {
    setAlternativeVisible(false)
  }, [])

  const handleSwitchForm = useCallback((k: DisplayFormType) => {
    setFormType(k)
    setAlternativeVisible(false)
  }, [])

  useEffect(() => {
    async function run() {
      try {
        const resp = await client
          .getInstance()
          .userGetLoginInfo({ handleError: 'custom' } as any)
        const loginInfo = resp.data
        if (
          (loginInfo.supported_auth_types?.indexOf(auth.AuthTypes.SSO) ?? -1) >
          -1
        ) {
          setFormType(DisplayFormType.sso)
        } else {
          setFormType(DisplayFormType.tidbCredential)
        }
        setSupportedAuthTypes(loginInfo.supported_auth_types ?? [])
        if (!!loginInfo.sql_auth_public_key) {
          setPublicKey(loginInfo.sql_auth_public_key)
        }
      } catch (e) {
        if ((e as any).response?.status === 404) {
          setFormType(DisplayFormType.tidbCredential)
        } else {
          Modal.error({
            title: 'Initialize Sign in failed',
            content: '' + e,
            okText: 'Reload',
            onOk: () => window.location.reload()
          })
        }
      }
    }
    run()
  }, [])

  return (
    <Root>
      <div className={styles.container}>
        <AppearAnimate
          className={styles.contantContainer}
          motionName="formAnimation"
        >
          <CSSMotion visible={alternativeVisible} motionName="fade">
            {({ style, className }) => (
              <AlternativeAuthForm
                style={style}
                className={className}
                onClose={handleAlternativeClose}
                onSwitchForm={handleSwitchForm}
                supportedAuthTypes={supportedAuthTypes}
              />
            )}
          </CSSMotion>
          {formType === DisplayFormType.tidbCredential && (
            <TiDBSignInForm
              successRoute={successRoute}
              onClickAlternative={handleClickAlternative}
              publicKey={publicKey}
            />
          )}
          {formType === DisplayFormType.shareCode && (
            <CodeSignInForm
              successRoute={successRoute}
              onClickAlternative={handleClickAlternative}
            />
          )}
          {formType === DisplayFormType.sso && (
            <SSOSignInForm
              successRoute={successRoute}
              onClickAlternative={handleClickAlternative}
            />
          )}
        </AppearAnimate>
        <AppearAnimate
          motionName="landingAnimation"
          className={styles.landingContainer}
        >
          <div
            style={{
              backgroundImage: `url(${landingSvg})`
            }}
            className={styles.landing}
          />
        </AppearAnimate>
      </div>
    </Root>
  )
}

export default App
