import { CopyToClipboard } from 'react-copy-to-clipboard'
import {
  CheckOutlined,
  CopyOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  RollbackOutlined,
  ShareAltOutlined
} from '@ant-design/icons'
import {
  Alert,
  Button,
  DatePicker,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Tooltip
} from 'antd'
import React, { useContext } from 'react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pre } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import ReactMarkdown from 'react-markdown'
import Checkbox from 'antd/lib/checkbox/Checkbox'
import { store } from '@lib/utils/store'
import { UserProfileContext } from '../context'
import dayjs from 'dayjs'

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
  24 * 365
]

function RevokeSessionButton() {
  const whoAmI = store.useState((s) => s.whoAmI)
  const { t } = useTranslation()
  const ctx = useContext(UserProfileContext)

  function showRevokeConfirm() {
    Modal.confirm({
      title: t('user_profile.revoke_modal.title'),
      content: t('user_profile.revoke_modal.content'),
      okText: t('user_profile.revoke_modal.ok'),
      cancelText: t('user_profile.revoke_modal.cancel'),
      onOk() {
        ctx?.ds.userRevokeSession().then(() => {
          message.success(t('user_profile.revoke_modal.success_message'))
        })
      }
    })
  }

  let button = (
    <Button
      onClick={showRevokeConfirm}
      disabled={!whoAmI || !whoAmI.is_shareable}
    >
      <RollbackOutlined /> {t('user_profile.session.revoke')}
      {Boolean(whoAmI && !whoAmI.is_shareable) && <QuestionCircleOutlined />}
    </Button>
  )

  if (whoAmI && !whoAmI.is_shareable) {
    button = (
      <Tooltip title={t('user_profile.session.revoke_unavailable_tooltip')}>
        {button}
      </Tooltip>
    )
  }

  return <>{button}</>
}

function ShareSessionButton() {
  const ctx = useContext(UserProfileContext)

  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [code, setCode] = useState<string | undefined>(undefined)
  const [isCopied, setIsCopied] = useState(false)
  const whoAmI = store.useState((s) => s.whoAmI)

  const handleOpen = useCallback(() => {
    setVisible(true)
  }, [])

  const handleClose = useCallback(() => {
    setVisible(false)
    setCode(undefined)
    setIsPosting(false)
    setIsCopied(false)
  }, [])

  const handleFinish = useCallback(
    async (values) => {
      const expire = values['expire']
      const expireCustom = values['expireCustom']

      let expireInSec = 0
      if (expire === 0) {
        // expireCustom has value because it is required
        expireInSec =
          dayjs.unix(expireCustom.unix()).endOf('day').unix() - dayjs().unix()
      } else if (expire === -1) {
        expireInSec = 100 * 365 * 24 * 60 * 60 // 100 years
      } else {
        expireInSec = expire * 60 * 60
      }

      try {
        setIsPosting(true)
        const r = await ctx!.ds.userShareSession({
          expire_in_sec: expireInSec,
          revoke_write_priv: !!values.read_only
        })
        setCode(r.data.code)
      } finally {
        setIsPosting(false)
      }
    },
    [ctx]
  )

  const handleCopy = useCallback(() => {
    setIsCopied(true)
  }, [])

  let button = (
    <Button onClick={handleOpen} disabled={!whoAmI || !whoAmI.is_shareable}>
      <ShareAltOutlined /> {t('user_profile.session.share')}
      {Boolean(whoAmI && !whoAmI.is_shareable) && <QuestionCircleOutlined />}
    </Button>
  )

  if (whoAmI && !whoAmI.is_shareable) {
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
            <CopyToClipboard text={code ?? ''} onCopy={handleCopy}>
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
        footer={null}
        onCancel={handleClose}
        width={600}
      >
        <ReactMarkdown>{t('user_profile.share_session.text')}</ReactMarkdown>
        <Divider />
        <Form
          layout="vertical"
          initialValues={{ expire: 3, read_only: true }}
          onFinish={handleFinish}
        >
          <Form.Item
            label={t('user_profile.share_session.form.expire')}
            required
          >
            <Input.Group compact>
              <Form.Item name="expire" rules={[{ required: true }]} noStyle>
                <Select style={{ width: 120 }}>
                  {SHARE_SESSION_EXPIRY_HOURS.map((val) => (
                    <Select.Option key={val} value={val}>
                      {getValueFormat('m')(val * 60, 0)}
                    </Select.Option>
                  ))}
                  <Select.Option value={0}>
                    {t('user_profile.share_session.form.custom_expiration')}
                  </Select.Option>
                  <Select.Option value={-1}>
                    {t('user_profile.share_session.form.no_expiration')}
                  </Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prev, cur) => prev.expire !== cur.expire}
              >
                {({ getFieldValue }) => {
                  return (
                    getFieldValue('expire') === 0 && (
                      <Form.Item
                        noStyle
                        name="expireCustom"
                        rules={[{ required: true }]}
                      >
                        <DatePicker
                          disabledDate={(date) =>
                            dayjs()
                              .endOf('day')
                              .isAfter(dayjs.unix(date.unix()))
                          }
                        />
                      </Form.Item>
                    )
                  )
                }}
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item
            name="read_only"
            label={t('user_profile.share_session.form.read_only')}
            valuePropName="checked"
          >
            <Checkbox />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isPosting}>
                {t('user_profile.share_session.form.submit')}
              </Button>
              <Button onClick={handleClose}>
                {t('user_profile.share_session.close')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export function SessionForm() {
  const ctx = useContext(UserProfileContext)
  const { t } = useTranslation()

  const handleLogout = useCallback(async () => {
    let signOutURL: string | undefined = undefined
    try {
      const resp = await ctx!.ds.userGetSignOutInfo(
        `${window.location.protocol}//${window.location.host}${window.location.pathname}`
      )
      signOutURL = resp.data.end_session_url
    } catch (e) {
      console.error(e)
    }

    ctx!.event.logOut()
    if (signOutURL) {
      window.location.href = signOutURL
    } else {
      window.location.reload()
    }
  }, [ctx])

  return (
    <Space>
      <ShareSessionButton />
      {/* only available for v8.4.0+, v6.5.11+ */}
      <RevokeSessionButton />
      <Button danger onClick={handleLogout}>
        <LogoutOutlined /> {t('user_profile.session.sign_out')}
      </Button>
    </Space>
  )
}
