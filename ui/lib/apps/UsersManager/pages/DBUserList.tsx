import React, { useState, useEffect } from 'react'
import * as Database from '@lib/utils/xcClient/database'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Divider,
} from 'antd'
import { Card, Pre } from '@lib/components'
import { useTranslation } from 'react-i18next'
const { Option } = Select

export default function DBUserList() {
  const [dbUserList, setDbUserList] = useState<Object[]>([])
  const { t } = useTranslation()
  const [formModalVisible, setFormModalVisible] = useState(false)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [formModalInfo, setFormModalInfo] = useState<any>({
    type: '',
    title: '',
    userInfo: {},
  })

  const [confirmModalInfo, setConfirmModalInfo] = useState<any>({
    title: '',
    type: '',
    message: '',
    userInfo: {},
  })

  const layout = {
    labelCol: { span: 6 },
    wrapperCol: { span: 18 },
  }

  const showFormModal = (info) => () => {
    setFormModalInfo(info)
    setFormModalVisible(true)
  }

  const showConfirmModal = (info) => () => {
    setConfirmModalInfo(info)
    setConfirmModalVisible(true)
  }

  async function getDBUserList() {
    try {
      const result = (await Database.getUserList()).users
      setDbUserList(result)
    } catch (e) {
      console.log('err', e)
    }
  }

  useEffect(() => {
    getDBUserList()
  }, [])

  const columns = [
    {
      title: t('dbusers_manager.user_name'),
      key: 'user',
      dataIndex: 'user',
      minWidth: 100,
      render: (user) => <p> {user} </p>,
    },
    {
      title: t('dbusers_manager.host'),
      key: 'host',
      dataIndex: 'host',
      render: (host) => <p> {host} </p>,
    },
    {
      title: t('dbusers_manager.action'),
      key: 'action',
      render: (user) => (
        <>
          {user.user !== 'root' && (
            <>
              <a
                onClick={showConfirmModal({
                  title: t('dbusers_manager.delete_user_title'),
                  message: t('dbusers_manager.delete_user_title'),
                  userInfo: user,
                })}
              >
                <Typography.Text type="danger">
                  {t('data_manager.delete')}
                </Typography.Text>
              </a>

              <Divider type="vertical" />
            </>
          )}
          <a
            onClick={showFormModal({
              title: t('dbusers_manager.edit_user_title'),
              userInfo: user,
            })}
          >
            {t('dbusers_manager.edit')}
          </a>
        </>
      ),
    },
  ]

  const onCancel = () => {
    setFormModalVisible(false)
    setConfirmModalVisible(false)
  }

  const onOk = async (userInfo) => {
    try {
      await Database.dropUser(userInfo.user, userInfo.host)
      getDBUserList()
      Modal.success({ title: t('data_manager.delete_success_txt') })
    } catch (error) {
      Modal.error({
        title: t('data_manager.delete_failed_txt'),
        content: <Pre>{error.message}</Pre>,
      })
    }

    setConfirmModalVisible(false)
  }

  const onFinish = async (values) => {
    const { user, host, password, privileges } = values
    try {
      await Database.createUser(user, host, password, privileges)
      getDBUserList()
      Modal.success({ title: t('data_manager.create_success_txt') })
    } catch (error) {
      Modal.error({
        title: t('data_manager.create_failed_txt'),
        content: <Pre>{error.message}</Pre>,
      })
    }

    setFormModalVisible(false)
  }

  const PasswordItem = () => {
    return (
      <>
        <Form.Item
          name="password"
          label={t('dbusers_manager.create_form.pwd_label')}
          hasFeedback
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="confirm"
          label={t('dbusers_manager.create_form.confirm_pwd.label')}
          dependencies={['password']}
          hasFeedback
          rules={[
            ({ getFieldValue }) => ({
              validator(rule, value) {
                console.log('password', getFieldValue('password'))

                console.log('confirm password', value)
                if (
                  (getFieldValue('password') &&
                    getFieldValue('password') === value) ||
                  (!getFieldValue('password') && !value)
                ) {
                  return Promise.resolve()
                }
                return Promise.reject(
                  t('dbusers_manager.create_form.confirm_pwd.error')
                )
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
      </>
    )
  }

  const CreateUserFormOnModal = () => {
    return (
      <Form {...layout} onFinish={onFinish} initialValues={{ password: '' }}>
        <Form.Item
          label={t('dbusers_manager.create_form.name_label')}
          name="user"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={t('dbusers_manager.create_form.host_label')}
          name="host"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <PasswordItem />
        <Form.Item
          name="privileges"
          label={t('dbusers_manager.create_form.privileges.label')}
          rules={[{ required: true, type: 'array' }]}
        >
          <Select
            mode="multiple"
            placeholder={t(
              'dbusers_manager.create_form.privileges.placeholder'
            )}
          >
            {Object.values(Database.UserPrivilegeId).map((gp) => (
              <Option key={gp} value={gp}>
                {gp}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 6 }}>
          <Space>
            <Button key="back" onClick={onCancel}>
              {t('dbusers_manager.cancel')}
            </Button>
            <Button key="submit" type="primary" htmlType="submit">
              {t('dbusers_manager.submit')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    )
  }

  const EditUserFormOnModal = () => {
    const [grantedPriv, setGrantedPriv] = useState<string[]>([])

    async function getUserList() {
      const result = await Database.getUserDetail(
        formModalInfo.userInfo.user,
        formModalInfo.userInfo.host
      )
      setGrantedPriv(result.grantedPrivileges)
    }

    useEffect(() => {
      getUserList()
    }, [])

    const handleResetPrivileges = async (values) => {
      const { user, host } = formModalInfo.userInfo

      try {
        await Database.resetUserPrivileges(user, host, values.privileges)
        Modal.success({
          title: t(
            'dbusers_manager.create_form.privileges.update_privileges_success_txt'
          ),
        })
      } catch (error) {
        Modal.error({
          title: t(
            'dbusers_manager.create_form.privileges.update_privileges_failed_txt'
          ),
          content: <Pre>{error.message}</Pre>,
        })
      }
    }

    const resetPassword = async (values) => {
      const { user, host } = formModalInfo.userInfo

      try {
        await Database.setUserPassword(user, host, values.password)
        Modal.success({
          title: t('dbusers_manager.create_form.reset_password_success_txt'),
        })
      } catch (error) {
        Modal.error({
          title: t('dbusers_manager.create_form.reset_password_failed_txt'),
          content: <Pre>{error.message}</Pre>,
        })
      }
    }

    return (
      <>
        {grantedPriv.length > 0 && (
          <Form
            {...layout}
            onFinish={handleResetPrivileges}
            initialValues={{ privileges: grantedPriv }}
          >
            <Form.Item
              name="privileges"
              label={t('dbusers_manager.create_form.privileges.label')}
              rules={[{ required: true, type: 'array' }]}
            >
              <Select
                mode="multiple"
                placeholder={t(
                  'dbusers_manager.create_form.privileges.placeholder'
                )}
              >
                {Object.values(Database.UserPrivilegeId).map((gp) => (
                  <Option key={gp} value={gp}>
                    {gp}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 6 }}>
              <Space>
                <Button key="submit" type="primary" htmlType="submit">
                  {t(
                    'dbusers_manager.create_form.privileges.update_privileges'
                  )}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}

        <Divider></Divider>
        <Form
          {...layout}
          onFinish={resetPassword}
          initialValues={{ password: '' }}
        >
          <PasswordItem />
          <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 6 }}>
            <Space>
              <Button key="submit" type="primary" htmlType="submit">
                {t('dbusers_manager.create_form.reset_password_label')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </>
    )
  }

  const FormModal = () => {
    return (
      <Modal
        title={
          formModalInfo.type === 'createUser'
            ? t('dbusers_manager.create_user_title')
            : t('dbusers_manager.edit_user_title')
        }
        visible={formModalVisible}
        onCancel={onCancel}
        footer={null}
      >
        {formModalInfo.type === 'createUser' ? (
          <CreateUserFormOnModal />
        ) : (
          <EditUserFormOnModal />
        )}
      </Modal>
    )
  }

  const ConfirmModal = () => {
    return (
      <Modal
        title={confirmModalInfo.title}
        visible={confirmModalVisible}
        onCancel={onCancel}
        onOk={() => onOk(confirmModalInfo.userInfo)}
      >
        <p>
          {confirmModalInfo.message}{' '}
          <span style={{ fontWeight: 'bold' }}>
            {confirmModalInfo.userInfo.user}
          </span>
        </p>
      </Modal>
    )
  }

  return (
    <Card>
      <Button
        type="primary"
        style={{ marginBottom: `2rem` }}
        onClick={showFormModal({
          type: 'createUser',
          title: t('dbusers_manager.create_user_title'),
        })}
      >
        {t('dbusers_manager.create_user_title')}
      </Button>
      <Table
        dataSource={dbUserList.map((user, i) => ({
          ...{ key: i },
          ...user,
        }))}
        columns={columns}
      />
      <FormModal />
      <ConfirmModal />
    </Card>
  )
}
