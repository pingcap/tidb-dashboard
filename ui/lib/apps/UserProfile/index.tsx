import {
  Button,
  Form,
  Select,
  Space,
  Modal,
  Alert,
  Divider,
  Tooltip,
  Radio,
  Input,
  Typography,
} from 'antd'
import React, { useCallback, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { HashRouter as Router } from 'react-router-dom'
import {
  LogoutOutlined,
  ShareAltOutlined,
  CopyOutlined,
  CheckOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import {
  Card,
  Root,
  AnimatedSkeleton,
  Descriptions,
  CopyLink,
  TextWithInfo,
  Pre,
  ErrorBar,
  Blink,
} from '@lib/components'
import * as auth from '@lib/utils/auth'
import { ALL_LANGUAGES } from '@lib/utils/i18n'
import _ from 'lodash'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client from '@lib/client'
import { getValueFormat } from '@baurine/grafana-value-formats'
import ReactMarkdown from 'react-markdown'

const DEFAULT_FORM_ITEM_STYLE = { width: 200 }
const SHARE_SESSION_EXPIRY_HOURS = [
  0.25,
  0.5,
  1,
  2,
  3,
  6,
  12,
  24,
  24 * 3,
  24 * 7,
  24 * 30,
]

function ShareSessionButton() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [code, setCode] = useState<string | undefined>(undefined)
  const [isCopied, setIsCopied] = useState(false)

  const { data } = useClientRequest((reqConfig) =>
    client.getInstance().infoWhoami(reqConfig)
  )

  const handleOpen = useCallback(() => {
    setVisible(true)
  }, [])

  const handleClose = useCallback(() => {
    setVisible(false)
    setCode(undefined)
    setIsPosting(false)
    setIsCopied(false)
  }, [])

  const handleFinish = useCallback(async (values) => {
    try {
      setIsPosting(true)
      const r = await client.getInstance().userShareSession({
        expire_in_sec: values.expire * 60 * 60,
      })
      setCode(r.data.code)
    } finally {
      setIsPosting(false)
    }
  }, [])

  const handleCopy = useCallback(() => {
    setIsCopied(true)
  }, [])

  let button = (
    <Button onClick={handleOpen} disabled={!data || data.is_shared}>
      <ShareAltOutlined /> {t('user_profile.session.share')}
      {data?.is_shared && <QuestionCircleOutlined />}
    </Button>
  )

  if (data?.is_shared) {
    button = (
      <Tooltip title={t('user_profile.session.share_unavailable_tooltip')}>
        {button}
      </Tooltip>
    )
  }

  return (
    <>
      {button}
      <Modal
        closable={false}
        destroyOnClose
        footer={
          <Space>
            <CopyToClipboard text={code} onCopy={handleCopy}>
              <Button type={isCopied ? 'default' : 'primary'}>
                {isCopied && (
                  <span>
                    <CheckOutlined />{' '}
                    {t('user_profile.share_session.success_dialog.copied')}
                  </span>
                )}
                {!isCopied && (
                  <span>
                    <CopyOutlined />{' '}
                    {t('user_profile.share_session.success_dialog.copy')}
                  </span>
                )}
              </Button>
            </CopyToClipboard>
            <Button onClick={handleClose}>
              {t('user_profile.share_session.close')}
            </Button>
          </Space>
        }
        visible={!!code}
      >
        <Alert
          message={t('user_profile.share_session.success_dialog.title')}
          description={<Pre>{code}</Pre>}
          type="success"
          showIcon
        />
      </Modal>
      <Modal
        title={t('user_profile.session.share')}
        visible={visible}
        destroyOnClose
        footer={
          <Button onClick={handleClose}>
            {t('user_profile.share_session.close')}
          </Button>
        }
        onCancel={handleClose}
        width={600}
      >
        <ReactMarkdown source={t('user_profile.share_session.text')} />
        <Alert
          message={t('user_profile.share_session.warning')}
          type="warning"
          showIcon
        />
        <Divider />
        <Form
          layout="inline"
          initialValues={{ expire: 3 }}
          onFinish={handleFinish}
        >
          <Form.Item
            name="expire"
            label={t('user_profile.share_session.form.expire')}
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
            <Button type="primary" htmlType="submit" loading={isPosting}>
              {t('user_profile.share_session.form.submit')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function PrometheusAddressForm() {
  const { t } = useTranslation()
  const [isChanged, setIsChanged] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const handleValuesChange = useCallback(() => setIsChanged(true), [])
  const { error, isLoading, data } = useClientRequest((reqConfig) =>
    client.getInstance().metricsGetPromAddress(reqConfig)
  )
  const isInitialLoad = useRef(true)
  const initialForm = useRef<any>(null) // Used for "Cancel" behaviour
  const [form] = Form.useForm()

  useEffect(() => {
    if (data && isInitialLoad.current) {
      isInitialLoad.current = false
      form.setFieldsValue({
        sourceType:
          (data.customized_addr?.length ?? 0) > 0 ? 'custom' : 'deployment',
        customAddr: data.customized_addr,
      })
      initialForm.current = { ...form.getFieldsValue() }
    }
  }, [data, form])

  const handleFinish = useCallback(
    async (values) => {
      let address = ''
      if (values.sourceType === 'custom') {
        address = values.customAddr || ''
      }
      try {
        setIsPosting(true)
        const resp = await client.getInstance().metricsSetCustomPromAddress({
          address,
        })
        const customAddr = resp?.data?.normalized_address ?? ''
        form.setFieldsValue({ customAddr })
        initialForm.current = { ...form.getFieldsValue() }
        setIsChanged(false)
      } finally {
        setIsPosting(false)
      }
    },
    [form]
  )

  const handleCancel = useCallback(() => {
    form.setFieldsValue({ ...initialForm.current })
    setIsChanged(false)
  }, [form])

  return (
    <Blink activeId="profile.prometheus">
      <Form
        layout="vertical"
        onValuesChange={handleValuesChange}
        form={form}
        onFinish={handleFinish}
      >
        <AnimatedSkeleton loading={isLoading}>
          <Form.Item
            name="sourceType"
            label={t('user_profile.service_endpoints.prometheus.title')}
          >
            <Radio.Group disabled={isLoading || error || !data}>
              <Space direction="vertical">
                {error && <ErrorBar errors={[error]} />}
                <Radio value="deployment">
                  <Space>
                    <span>
                      {t(
                        'user_profile.service_endpoints.prometheus.form.deployed'
                      )}
                    </span>
                    <span>
                      {(data?.deployed_addr?.length ?? 0) > 0 &&
                        `(${data!.deployed_addr})`}
                      {data && data.deployed_addr?.length === 0 && (
                        <Typography.Text type="secondary">
                          (
                          {t(
                            'user_profile.service_endpoints.prometheus.form.not_deployed'
                          )}
                          )
                        </Typography.Text>
                      )}
                    </span>
                  </Space>
                </Radio>
                <Radio value="custom">
                  {t('user_profile.service_endpoints.prometheus.form.custom')}
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </AnimatedSkeleton>
        <Form.Item noStyle shouldUpdate>
          {(f) =>
            f.getFieldValue('sourceType') === 'custom' && (
              <Form.Item
                name="customAddr"
                label={t(
                  'user_profile.service_endpoints.prometheus.custom_form.address'
                )}
                rules={[{ required: true }]}
              >
                <Input
                  style={DEFAULT_FORM_ITEM_STYLE}
                  placeholder="http://IP:PORT"
                />
              </Form.Item>
            )
          }
        </Form.Item>
        {isChanged && (
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isPosting}>
                {t('user_profile.service_endpoints.prometheus.form.update')}
              </Button>
              <Button onClick={handleCancel}>
                {t('user_profile.service_endpoints.prometheus.form.cancel')}
              </Button>
            </Space>
          </Form.Item>
        )}
      </Form>
    </Blink>
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

  const { data: info, isLoading, error } = useClientRequest((reqConfig) =>
    client.getInstance().infoGet(reqConfig)
  )

  return (
    <Root>
      <Router>
        <Card title={t('user_profile.session.title')}>
          <Space>
            <ShareSessionButton />
            <Button danger onClick={handleLogout}>
              <LogoutOutlined /> {t('user_profile.session.sign_out')}
            </Button>
          </Space>
        </Card>
        <Card title={t('user_profile.service_endpoints.title')}>
          <PrometheusAddressForm />
        </Card>
        <Card title={t('user_profile.i18n.title')}>
          <Form layout="vertical" initialValues={{ language: i18n.language }}>
            <Form.Item name="language" label={t('user_profile.i18n.language')}>
              <Select
                onChange={handleLanguageChange}
                style={DEFAULT_FORM_ITEM_STYLE}
              >
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
            {error && <ErrorBar errors={[error]} />}
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
      </Router>
    </Root>
  )
}

export default App
