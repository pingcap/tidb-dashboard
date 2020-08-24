import { Button, Form, Select, Space, Modal, Alert, Divider } from 'antd'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogoutOutlined, ShareAltOutlined } from '@ant-design/icons'
import {
  Card,
  Root,
  AnimatedSkeleton,
  Descriptions,
  CopyLink,
  TextWithInfo,
} from '@lib/components'
import * as auth from '@lib/utils/auth'
import { ALL_LANGUAGES } from '@lib/utils/i18n'
import _ from 'lodash'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client from '@lib/client'
import { getValueFormat } from '@baurine/grafana-value-formats'
import ReactMarkdown from 'react-markdown'

const SHARE_SESSION_EXPIRY_HOURS = [0.25, 0.5, 1, 2, 6, 12, 24]

function ShareSessionButton() {
  const [visible, setVisible] = useState(false)

  const handleOpen = useCallback(() => {
    setVisible(true)
  }, [])

  const handleClose = useCallback(() => {
    setVisible(false)
  }, [])

  const { t } = useTranslation()
  return (
    <>
      <Button onClick={handleOpen}>
        <ShareAltOutlined /> {t('user_profile.session.share')}
      </Button>
      <Modal
        title={t('user_profile.session.share')}
        visible={visible}
        destroyOnClose
        footer={<Button onClick={handleClose}>Close</Button>}
        onCancel={handleClose}
      >
        <ReactMarkdown source={t('user_profile.share_session.text')} />
        <Alert
          message={t('user_profile.share_session.warning')}
          type="warning"
          showIcon
        />
        <Divider />
        <Form layout="inline" initialValues={{ expire: 1 }}>
          <Form.Item
            name="expire"
            label={'Expire in'}
            rules={[{ required: true }]}
          >
            <Select style={{ width: 120 }}>
              {SHARE_SESSION_EXPIRY_HOURS.map((val) => (
                <Select.Option key={val} value={val}>
                  {getValueFormat('m')(val * 60, 0)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Generate Authorization Code
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function App() {
  const { t, i18n } = useTranslation()

  const handleLanguageChange = useCallback(
    (langKey) => {
      i18n.changeLanguage(langKey)
    },
    [i18n]
  )

  const handleLogout = useCallback(() => {
    auth.clearAuthToken()
    window.location.reload()
  }, [])

  const { data: info, isLoading } = useClientRequest((cancelToken) =>
    client.getInstance().infoGet({ cancelToken })
  )

  return (
    <Root>
      <Card title={t('user_profile.session.title')}>
        <Space>
          <ShareSessionButton />
          <Button danger onClick={handleLogout}>
            <LogoutOutlined /> {t('user_profile.session.sign_out')}
          </Button>
        </Space>
      </Card>
      <Card title={t('user_profile.i18n.title')}>
        <Form layout="vertical" initialValues={{ language: i18n.language }}>
          <Form.Item name="language" label={t('user_profile.i18n.language')}>
            <Select onChange={handleLanguageChange} style={{ width: 200 }}>
              {_.map(ALL_LANGUAGES, (name, key) => {
                return (
                  <Select.Option key={key} value={key}>
                    {name}
                  </Select.Option>
                )
              })}
            </Select>
          </Form.Item>
        </Form>
      </Card>
      <Card title={t('user_profile.version.title')}>
        <AnimatedSkeleton showSkeleton={isLoading}>
          {info && (
            <Descriptions>
              <Descriptions.Item
                span={2}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="user_profile.version.internal_version" />
                    <CopyLink data={info.version?.internal_version} />
                  </Space>
                }
              >
                {info.version?.internal_version}
              </Descriptions.Item>
              <Descriptions.Item
                span={2}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="user_profile.version.build_git_hash" />
                    <CopyLink data={info.version?.build_git_hash} />
                  </Space>
                }
              >
                {info.version?.build_git_hash}
              </Descriptions.Item>
              <Descriptions.Item
                span={2}
                label={
                  <TextWithInfo.TransKey transKey="user_profile.version.build_time" />
                }
              >
                {info.version?.build_time}
              </Descriptions.Item>
              <Descriptions.Item
                span={2}
                label={
                  <TextWithInfo.TransKey transKey="user_profile.version.standalone" />
                }
              >
                {info.version?.standalone}
              </Descriptions.Item>
              <Descriptions.Item
                span={2}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="user_profile.version.pd_version" />
                    <CopyLink data={info.version?.pd_version} />
                  </Space>
                }
              >
                {info.version?.pd_version}
              </Descriptions.Item>
            </Descriptions>
          )}
        </AnimatedSkeleton>
      </Card>
    </Root>
  )
}

export default App
