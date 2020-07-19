import { Button, Form, Select, Space } from 'antd'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { LogoutOutlined } from '@ant-design/icons'
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

import { ConfigProvider } from 'antd'
import i18next from 'i18next'
import enUS from 'antd/es/locale/en_US'
import zhCN from 'antd/es/locale/zh_CN'

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

  const { data, isLoading } = useClientRequest((cancelToken) =>
    client.getInstance().getInfo({ cancelToken })
  )

  return (
    <Root>
      <ConfigProvider locale={i18next.language === 'en' ? enUS : zhCN}>
        <Card title={t('user_profile.user.title')}>
          <Button danger onClick={handleLogout}>
            <LogoutOutlined /> {t('user_profile.user.sign_out')}
          </Button>
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
            {data && (
              <Descriptions>
                <Descriptions.Item
                  span={2}
                  label={
                    <Space size="middle">
                      <TextWithInfo.TransKey transKey="user_profile.version.internal_version" />
                      <CopyLink data={data.version?.internal_version} />
                    </Space>
                  }
                >
                  {data.version?.internal_version}
                </Descriptions.Item>
                <Descriptions.Item
                  span={2}
                  label={
                    <Space size="middle">
                      <TextWithInfo.TransKey transKey="user_profile.version.build_git_hash" />
                      <CopyLink data={data.version?.build_git_hash} />
                    </Space>
                  }
                >
                  {data.version?.build_git_hash}
                </Descriptions.Item>
                <Descriptions.Item
                  span={2}
                  label={
                    <TextWithInfo.TransKey transKey="user_profile.version.build_time" />
                  }
                >
                  {data.version?.build_time}
                </Descriptions.Item>
                <Descriptions.Item
                  span={2}
                  label={
                    <TextWithInfo.TransKey transKey="user_profile.version.standalone" />
                  }
                >
                  {data.version?.standalone}
                </Descriptions.Item>
                <Descriptions.Item
                  span={2}
                  label={
                    <Space size="middle">
                      <TextWithInfo.TransKey transKey="user_profile.version.pd_version" />
                      <CopyLink data={data.version?.pd_version} />
                    </Space>
                  }
                >
                  {data.version?.pd_version}
                </Descriptions.Item>
              </Descriptions>
            )}
          </AnimatedSkeleton>
        </Card>
      </ConfigProvider>
    </Root>
  )
}

export default App
