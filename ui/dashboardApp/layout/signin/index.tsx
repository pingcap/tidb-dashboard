import cx from 'classnames'
import * as singleSpa from 'single-spa'
import { Root } from '@lib/components'
import React, { useState, useEffect, useRef } from 'react'
import {
  DownOutlined,
  GlobalOutlined,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Form, Input, Button, message } from 'antd'
import { useTranslation } from 'react-i18next'
import LanguageDropdown from '@lib/components/LanguageDropdown'
import client from '@lib/client'
import * as auth from '@lib/utils/auth'

import { ReactComponent as Logo } from './logo.svg'
import styles from './index.module.less'

function TiDBSignInForm({ registry }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [signInError, setSignInError] = useState(null)

  const [refForm] = Form.useForm()
  const refPassword = useRef<Input>(null)

  const signIn = async (form) => {
    setLoading(true)
    clearErrorMessages()

    try {
      const r = await client.getInstance().userLoginPost({
        username: form.username,
        password: form.password,
        is_tidb_auth: true,
      })
      auth.setAuthToken(r.data.token)
      message.success(t('signin.message.success'))
      singleSpa.navigateToUrl('#' + registry.getDefaultRouter())
    } catch (e) {
      console.log(e)
      if (!e.handled) {
        let msg
        if (e.response.data) {
          msg = t(e.response.data.code)
        } else {
          msg = e.message
        }
        setSignInError(t('signin.message.error', { msg }))
        refForm.setFieldsValue({ password: '' })
        setTimeout(() => {
          // Focus after disable state is removed
          refPassword?.current?.focus()
        }, 0)
      }
    }
    setLoading(false)
  }

  const handleSubmit = (values) => {
    signIn(values)
  }

  const clearErrorMessages = () => {
    setSignInError(null)
  }

  useEffect(() => {
    refPassword?.current?.focus()
  }, [])

  return (
    <Form
      className="formAnimation"
      name="tidb_signin"
      onFinish={handleSubmit}
      layout="vertical"
      initialValues={{ username: 'root' }}
      form={refForm}
    >
      <Logo className={styles.logo} />
      <Form.Item>
        <h2>{t('signin.form.tidb_auth.title')}</h2>
      </Form.Item>
      <Form.Item
        name="username"
        label={t('signin.form.username')}
        rules={[
          {
            required: true,
            message: t('signin.form.tidb_auth.check.username'),
          },
        ]}
      >
        <Input
          onInput={clearErrorMessages}
          prefix={<UserOutlined />}
          disabled
        />
      </Form.Item>
      <Form.Item
        name="password"
        label={t('signin.form.password')}
        {...(signInError && {
          help: signInError,
          validateStatus: 'error',
        })}
      >
        <Input
          prefix={<LockOutlined />}
          type="password"
          disabled={loading}
          onInput={clearErrorMessages}
          ref={refPassword}
        />
      </Form.Item>
      <Form.Item>
        <Button
          id="signin_btn"
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
      <div className={styles.extraLink}>
        <LanguageDropdown>
          <a>
            <GlobalOutlined /> Switch Language <DownOutlined />
          </a>
        </LanguageDropdown>
      </div>
    </Form>
  )
}

function App({ registry }) {
  return (
    <Root>
      <div className={styles.container}>
        <div className={styles.dialogContainer}>
          <div className={styles.dialog}>
            <TiDBSignInForm registry={registry} />
          </div>
        </div>
        <div className={cx(styles.landing, 'landingAnimation')}></div>
      </div>
    </Root>
  )
}

export default App
