import * as singleSpa from 'single-spa'
import React, { useState, useEffect, useRef } from 'react'
import {
  DownOutlined,
  GlobalOutlined,
  LockOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import { Form, Input, Button, Menu, Dropdown, message } from 'antd'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import LanguageDropdown from '@/components/LanguageDropdown'
import client from '@pingcap-incubator/dashboard_client'
import * as authUtil from '@/utils/auth'

import { ReactComponent as Logo } from './logo.svg'
import styles from './RootComponent.module.less'

const AnimationItem = (props) => {
  return (
    <motion.div
      variants={{ open: { y: 0, opacity: 1 }, initial: { y: 50, opacity: 0 } }}
      transition={{ ease: 'easeOut' }}
    >
      {props.children}
    </motion.div>
  )
}

function TiDBSignInForm({ registry }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [signInError, setSignInError] = useState(null)
  const [isTidbAuth, setIsTidbAuth] = useState(true)

  const refForm = useRef()
  const refPassword = useRef()

  const signIn = async (form) => {
    setLoading(true)
    clearErrorMessages()

    try {
      const r = await client.getInstance().userLoginPost({
        username: form.username,
        password: form.password,
        is_tidb_auth: isTidbAuth,
      })
      authUtil.setAuthToken(r.data.token)
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
        refForm.current.setFieldsValue({ password: '' })
        setTimeout(() => {
          // Focus after disable state is removed
          refPassword.current.focus()
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

  const handleAuthMode = (v) => {
    setIsTidbAuth(v.key === 'db_auth')
  }

  const menu = (
    <Menu onClick={handleAuthMode}>
      <Menu.Item key="db_auth">SQL User</Menu.Item>
      <Menu.Item key="kv_auth">TiKV User</Menu.Item>
    </Menu>
  )

  useEffect(() => {
    refPassword.current.focus()
  }, [isTidbAuth])

  return (
    <Form
      name="tidb_signin"
      onFinish={handleSubmit}
      layout="vertical"
      initialValues={{ username: 'root' }}
      ref={refForm}
    >
      <motion.div
        initial="initial"
        animate="open"
        variants={{
          open: { transition: { staggerChildren: 0.03, delayChildren: 0.5 } },
        }}
      >
        <AnimationItem>
          <Logo className={styles.logo} />
        </AnimationItem>
        <AnimationItem>
          <Form.Item>
            {isTidbAuth ? (
              <h2>{t('signin.form.auth.sql_title')}</h2>
            ) : (
              <h2>{t('signin.form.auth.kv_title')}</h2>
            )}
          </Form.Item>
        </AnimationItem>
        <AnimationItem>
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
        </AnimationItem>
        <AnimationItem>
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
        </AnimationItem>
        <AnimationItem>
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
        </AnimationItem>
        <AnimationItem>
          <div className={styles.extraLink}>
            <Dropdown overlay={menu}>
              <a
                className="ant-dropdown-link"
                onClick={(e) => e.preventDefault()}
              >
                <UserSwitchOutlined /> {t('signin.form.auth.mode')}{' '}
                <DownOutlined />
              </a>
            </Dropdown>
          </div>
        </AnimationItem>
        <AnimationItem>
          <div className={styles.extraLink}>
            <LanguageDropdown>
              <a>
                <GlobalOutlined /> Switch Language <DownOutlined />
              </a>
            </LanguageDropdown>
          </div>
        </AnimationItem>
      </motion.div>
    </Form>
  )
}

function App({ registry }) {
  return (
    <div className={styles.container}>
      <div className={styles.dialogContainer}>
        <div className={styles.dialog}>
          <TiDBSignInForm registry={registry} />
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ease: 'easeOut', duration: 0.5 }}
        className={styles.landing}
      ></motion.div>
    </div>
  )
}

export default App
