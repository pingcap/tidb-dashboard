import * as xcClient from '@lib/utils/xcClient/database'

import {
  ArrowLeftOutlined,
  DownOutlined,
  EyeOutlined,
  TableOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import {
  Button,
  Dropdown,
  Form,
  Input,
  Menu,
  Modal,
  Space,
  Table,
  Typography,
} from 'antd'
import { Card, Head, Pre } from '@lib/components'
import React, { useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import useQueryParams from '@lib/utils/useQueryParams'
import { useTranslation } from 'react-i18next'

function CreateViewButton({ db, reload }) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [refForm] = Form.useForm()

  async function handleFinish(f) {
    try {
      await xcClient.createView(db, f.name, f.view_def)
      setVisible(false)
      Modal.success({
        content: t('data_manager.create_success_txt'),
      })
      reload()
    } catch (e) {
      Modal.error({
        title: t('data_manager.create_failed_txt'),
        content: <Pre>{e.message}</Pre>,
      })
    }
  }

  return (
    <>
      <Button
        onClick={() => {
          setVisible(true)
          refForm.resetFields()
        }}
      >
        <EyeOutlined /> {t('data_manager.create_view')}
      </Button>
      <Modal
        title={t('data_manager.create_view_modal.title')}
        visible={visible}
        onOk={refForm.submit}
        onCancel={() => setVisible(false)}
        destroyOnClose
      >
        <Form layout="vertical" form={refForm} onFinish={handleFinish}>
          <Form.Item
            name="name"
            label={t('data_manager.name')}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="view_def"
            label={t('data_manager.create_view_modal.view_def')}
            rules={[{ required: true }]}
          >
            <Input.TextArea placeholder="SELECT ... FROM ..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// route: /data/tables?db=xxx
export default function DBTableList() {
  const navigate = useNavigate()
  const { db } = useQueryParams()

  const { t } = useTranslation()

  const [form] = Form.useForm()

  const [tables, setTables] = useState<xcClient.TableInfo[]>()
  const [visible, setVisible] = useState(false)
  const [modalInfo, setModalInfo] = useState<any>({
    type: '',
    title: '',
  })

  const fetchTables = async () =>
    setTables((await xcClient.getTables(db)).tables)

  useEffect(() => {
    fetchTables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showModal = (info) => () => {
    setModalInfo(info)
    setVisible(true)
  }

  const handleOk = async (values) => {
    switch (modalInfo.type) {
      case 'editTable':
        try {
          await xcClient.renameTable(db, modalInfo.tableName, values.tableName)
          Modal.success({
            content: t('data_manager.update_success_txt'),
          })
        } catch (e) {
          Modal.error({
            title: t('data_manager.update_failed_txt'),
            content: <Pre>{e.message}</Pre>,
          })
        }
        break
      case 'deleteTable':
        try {
          await xcClient.dropTable(db, modalInfo.tableName)
          Modal.success({
            content: t('data_manager.delete_success_txt'),
          })
        } catch (e) {
          Modal.error({
            title: t('data_manager.delete_failed_txt'),
            content: <Pre>{e.message}</Pre>,
          })
        }
        break
      case 'deleteView':
        try {
          await xcClient.dropView(db, modalInfo.tableName)
          Modal.success({
            content: t('data_manager.delete_success_txt'),
          })
        } catch (e) {
          Modal.error({
            title: t('data_manager.delete_failed_txt'),
            content: <Pre>{e.message}</Pre>,
          })
        }
        break
      default:
        break
    }

    setTimeout(fetchTables, 1000)
    handleCancel()
  }

  const handleCancel = () => {
    setVisible(false)
    form.resetFields()
  }

  const handleDeleteTable = (name) => () => {
    showModal({
      type: 'deleteTable',
      title: `${t('data_manager.delete')} ${name}`,
      tableName: name,
    })()
  }

  const handleDeleteView = (name) => () => {
    showModal({
      type: 'deleteView',
      title: `${t('data_manager.delete')} ${name}`,
      tableName: name,
    })()
  }

  const handleEditTable = (name) => () => {
    showModal({
      type: 'editTable',
      title: `${t('data_manager.edit')} ${name}`,
      tableName: name,
    })()
  }

  return (
    <>
      <Head
        title={db}
        back={
          <a onClick={() => navigate(-1)}>
            <ArrowLeftOutlined /> {t('data_manager.all_databases')}
          </a>
        }
        titleExtra={
          <Space>
            <Button href={`#/data/tables/create?db=${db}`}>
              <TableOutlined /> {t('data_manager.create_table')}
            </Button>
            <CreateViewButton db={db} reload={fetchTables} />
            <Button onClick={() => navigate(`/data/export?db=${db}`)}>
              <ExportOutlined /> {t('data_manager.export_database')}
            </Button>
          </Space>
        }
      />
      <Card>
        {tables && (
          <Table
            dataSource={tables}
            rowKey="name"
            columns={[
              {
                title: t('data_manager.view_db.name'),
                dataIndex: 'name',
                key: 'name',
                render: (name) => {
                  return (
                    <a href={`#/data/view?db=${db}&table=${name}`}>{name}</a>
                  )
                },
              },
              {
                title: t('data_manager.view_db.type'),
                dataIndex: 'type',
                key: 'type',
              },
              {
                title: t('data_manager.view_db.comment'),
                dataIndex: 'comment',
                key: 'comment',
              },
              {
                title: t('data_manager.view_db.operation'),
                key: 'operation',
                render: (_: any, record: any) => {
                  return (
                    <Dropdown
                      overlay={
                        <Menu>
                          <Menu.Item>
                            <a
                              href={`#/data/table_structure?db=${db}&table=${record.name}`}
                            >
                              {t('data_manager.view_db.op_structure')}
                            </a>
                          </Menu.Item>
                          <Menu.Item>
                            <a
                              href={`#/data/export?db=${db}&table=${record.name}`}
                            >
                              {t('data_manager.view_db.op_export')}
                            </a>
                          </Menu.Item>
                          <Menu.Divider />
                          {record.type !== xcClient.TableType.SYSTEM_VIEW && (
                            <Menu.Item>
                              <a onClick={handleEditTable(record.name)}>
                                {t('data_manager.view_db.op_rename')}
                              </a>
                            </Menu.Item>
                          )}
                          {record.type === xcClient.TableType.TABLE && (
                            <Menu.Item>
                              <a onClick={handleDeleteTable(record.name)}>
                                <Typography.Text type="danger">
                                  {t('data_manager.view_db.op_drop')}
                                </Typography.Text>
                              </a>
                            </Menu.Item>
                          )}
                          {record.type === xcClient.TableType.VIEW && (
                            <Menu.Item>
                              <a onClick={handleDeleteView(record.name)}>
                                <Typography.Text type="danger">
                                  {t('data_manager.view_db.op_drop_view')}
                                </Typography.Text>
                              </a>
                            </Menu.Item>
                          )}
                        </Menu>
                      }
                    >
                      <a>
                        {t('data_manager.view_db.operation')} <DownOutlined />
                      </a>
                    </Dropdown>
                  )
                },
              },
            ]}
          />
        )}
      </Card>
      <Modal
        visible={visible}
        title={modalInfo.title}
        width={1024}
        onOk={form.submit}
        onCancel={handleCancel}
      >
        <Form
          form={form}
          {...{
            labelCol: { span: 4 },
            wrapperCol: { span: 20 },
          }}
          onFinish={handleOk}
        >
          {modalInfo.type === 'editTable' && (
            <>
              <Form.Item
                label={t('data_manager.view_db.name')}
                name="tableName"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </>
          )}
          {modalInfo.type === 'deleteTable' &&
            `${t('data_manager.confirm_delete_txt')} ${modalInfo.tableName}`}
        </Form>
      </Modal>
    </>
  )
}
