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
  notification,
} from 'antd'
import { Card } from '@lib/components'
import { useTranslation } from 'react-i18next'
const { Option } = Select

export default function DBUserList() {
  const [dbUserList, setDbUserList] = useState<Object[]>([])
  const { t } = useTranslation()
  const [formModalVisible, setFormModalVisible] = useState(false)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [formModalInfo, setFormModalInfo] = useState<any>({
    title: '',
  })
  const [confirmModalInfo, setConfirmModalInfo] = useState<any>({
    title: '',
    message: '',
    userInfo: {},
  })

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
        <a
          onClick={showConfirmModal({
            title: t('dbusers_manager.delete_user_title'),
            message: t('dbusers_manager.delete_user_title'),
            userInfo: user,
          })}
        >
          {t('data_manager.delete')}
        </a>
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
      openNotificationWithIcon('success', 'Delete Success', '')
    } catch (e) {
      openNotificationWithIcon('error', 'Delete Failed', e)
    }

    setConfirmModalVisible(false)
  }

  const openNotificationWithIcon = (type, title, error) => {
    notification[type]({
      message: title,
      description: error.message,
    })
  }

  const onFinish = async (values) => {
    delete values['confirm']
    const { user, host, password, privileges } = values
    try {
      await Database.createUser(user, host, password, privileges)
      getDBUserList()
      openNotificationWithIcon('success', 'Create Success', '')
    } catch (e) {
      openNotificationWithIcon('error', 'Create Failed', e)
    }

    setFormModalVisible(false)
  }

  const FormOnModal = () => {
    return (
      <Form onFinish={onFinish} initialValues={{ password: '' }}>
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
                if (!value || getFieldValue('password') === value) {
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

        <Form.Item>
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

  const FormModal = () => {
    return (
      <Modal
        title={formModalInfo.title}
        visible={formModalVisible}
        onCancel={onCancel}
        footer={null}
      >
        <FormOnModal />
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
