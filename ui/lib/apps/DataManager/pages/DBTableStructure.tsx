import * as xcClient from '@lib/utils/xcClient/database'

import {
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  PageHeader,
  Select,
  Space,
  Table,
  notification,
  Typography,
  Divider,
  Dropdown,
  Menu,
} from 'antd'
import {
  CloseSquareOutlined,
  MinusSquareTwoTone,
  PlusOutlined,
  PlusSquareOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  DownOutlined,
} from '@ant-design/icons'
import React, { useEffect, useState } from 'react'

import { Card, Head, Pre } from '@lib/components'
import { parseColumnRelatedValues } from '@lib/utils/xcClient/util'
import { useNavigate } from 'react-router-dom'
import useQueryParams from '@lib/utils/useQueryParams'
import { useTranslation } from 'react-i18next'

const { Option } = Select

// route: /data/table_structure?db=xxx&table=yyy
export default function DBTableStructure() {
  const navigate = useNavigate()
  const { db, table } = useQueryParams()

  const { t } = useTranslation()

  const [form] = Form.useForm()

  const [tableInfo, setTableInfo] = useState<xcClient.GetTableInfoResult>()
  const [visible, setVisible] = useState(false)
  const [modalInfo, setModalInfo] = useState<any>({
    type: '',
    title: '',
  })

  const fetchTableInfo = async () =>
    setTableInfo(await xcClient.getTableInfo(db, table))

  useEffect(() => {
    fetchTableInfo()
  }, [])

  const showModal = (info) => () => {
    setModalInfo(info)
    setVisible(true)
  }

  const handleOk = async (values) => {
    let _values
    if (
      modalInfo.type === 'insertColumnAtHead' ||
      modalInfo.type === 'insertColumnAtTail' ||
      modalInfo.type === 'addColumnAfter'
    ) {
      _values = parseColumnRelatedValues(values)
    }

    switch (modalInfo.type) {
      case 'insertColumnAtHead':
        try {
          await xcClient.addTableColumnAtHead(db, table, _values)
          Modal.success({
            content: t('data_manager.create_success_txt'),
          })
        } catch (e) {
          Modal.error({
            title: t('data_manager.create_failed_txt'),
            content: <Pre>{e.message}</Pre>,
          })
        }
        break
      case 'insertColumnAtTail':
        try {
          await xcClient.addTableColumnAtTail(db, table, _values)
          Modal.success({
            content: t('data_manager.create_success_txt'),
          })
        } catch (e) {
          Modal.error({
            title: t('data_manager.create_failed_txt'),
            content: <Pre>{e.message}</Pre>,
          })
        }
        break
      case 'addColumnAfter':
        try {
          await xcClient.addTableColumnAfter(
            db,
            table,
            _values,
            modalInfo.columnName
          )
          Modal.success({
            content: t('data_manager.create_success_txt'),
          })
        } catch (e) {
          Modal.error({
            title: t('data_manager.create_failed_txt'),
            content: <Pre>{e.message}</Pre>,
          })
        }
        break
      case 'deleteColumn':
        try {
          await xcClient.dropTableColumn(db, table, modalInfo.columnName)
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
      case 'addIndex':
        if (!values.columns) {
          Modal.error({
            content: `${t('data_manager.please_input')}${t(
              'data_manager.columns'
            )}`,
          })
          return
        }

        try {
          await xcClient.addTableIndex(db, table, values)
          Modal.success({
            content: t('data_manager.create_success_txt'),
          })
        } catch (e) {
          Modal.error({
            title: t('data_manager.create_failed_txt'),
            content: <Pre>{e.message}</Pre>,
          })
        }
        break
      case 'deleteIndex':
        try {
          await xcClient.dropTableIndex(db, table, modalInfo.indexName)
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

    setTimeout(fetchTableInfo, 1000)
    handleCancel()
  }

  const handleCancel = () => {
    setVisible(false)
    form.resetFields()
  }

  const handleDeleteColumn = (name) => () => {
    showModal({
      type: 'deleteColumn',
      title: `${t('data_manager.delete_column')} ${name}`,
      columnName: name,
    })()
  }

  const handleAddColumnAfter = (name) => () => {
    showModal({
      type: 'addColumnAfter',
      title: t('data_manager.insert_column'),
      columnName: name,
    })()
  }

  const handleDeleteIndex = (name) => () => {
    showModal({
      type: 'deleteIndex',
      title: `${t('data_manager.delete_index')} ${name}`,
      indexName: name,
    })()
  }

  return (
    <>
      <Head
        title={table}
        back={
          <a onClick={() => navigate(-1)}>
            <ArrowLeftOutlined /> {db}
          </a>
        }
      />
      {tableInfo?.viewDefinition && (
        <Card title={t('data_manager.view_definition')}>
          <Pre>{tableInfo?.viewDefinition}</Pre>
        </Card>
      )}
      <Card
        title={t('data_manager.columns')}
        extra={
          tableInfo?.info.type === xcClient.TableType.TABLE && (
            <Space>
              <Button
                type="primary"
                onClick={showModal({
                  type: 'insertColumnAtHead',
                  title: t('data_manager.insert_column_at_head'),
                })}
              >
                {t('data_manager.insert_column_at_head')}
              </Button>
              <Button
                type="primary"
                onClick={showModal({
                  type: 'insertColumnAtTail',
                  title: t('data_manager.insert_column_at_tail'),
                })}
              >
                {t('data_manager.insert_column_at_tail')}
              </Button>
            </Space>
          )
        }
      >
        {tableInfo && (
          <Table
            dataSource={tableInfo.columns}
            rowKey="name"
            columns={[
              {
                title: t('data_manager.name'),
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: t('data_manager.field_type'),
                dataIndex: 'fieldType',
                key: 'fieldType',
              },
              {
                title: t('data_manager.not_null'),
                dataIndex: 'isNotNull',
                key: 'isNotNull',
                render: (v) => {
                  if (v) {
                    return <CheckOutlined />
                  } else {
                    return ''
                  }
                },
              },
              {
                title: t('data_manager.default_value'),
                dataIndex: 'defaultValue',
                key: 'defaultValue',
              },
              {
                title: t('data_manager.comment'),
                dataIndex: 'comment',
                key: 'comment',
              },
              {
                title: t('data_manager.view_db.operation'),
                key: 'operation',
                render: (_: any, record: any) => {
                  return (
                    tableInfo?.info.type === xcClient.TableType.TABLE && (
                      <Dropdown
                        overlay={
                          <Menu>
                            <Menu.Item>
                              <a onClick={handleAddColumnAfter(record.name)}>
                                {t('data_manager.db_structure.op_insert')}
                              </a>
                            </Menu.Item>
                            <Menu.Item>
                              <a onClick={handleDeleteColumn(record.name)}>
                                <Typography.Text type="danger">
                                  {t('data_manager.db_structure.op_drop')}
                                </Typography.Text>
                              </a>
                            </Menu.Item>
                          </Menu>
                        }
                      >
                        <a>
                          {t('data_manager.view_db.operation')} <DownOutlined />
                        </a>
                      </Dropdown>
                    )
                  )
                },
              },
            ]}
          />
        )}
      </Card>
      {tableInfo?.info.type !== xcClient.TableType.VIEW && (
        <Card
          title={t('data_manager.indexes')}
          extra={
            tableInfo?.info.type === xcClient.TableType.TABLE && (
              <Space>
                <Button
                  type="primary"
                  onClick={showModal({
                    type: 'addIndex',
                    title: t('data_manager.add_index'),
                  })}
                >
                  {t('data_manager.add_index')}
                </Button>
              </Space>
            )
          }
        >
          {tableInfo && (
            <Table
              dataSource={tableInfo.indexes.map((d, i) => ({
                ...{ key: d.name + i },
                ...d,
                ...{ columns: d.columns.join(', ') },
              }))}
              columns={[
                {
                  title: t('data_manager.name'),
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: 'Type',
                  dataIndex: 'type',
                  key: 'type',
                  render: (_: any, record: any) =>
                    xcClient.TableInfoIndexType[record.type],
                },
                {
                  title: t('data_manager.columns'),
                  dataIndex: 'columns',
                  key: 'columns',
                },
                {
                  title: t('data_manager.delete'),
                  key: 'isDeleteble',
                  render: (_: any, record: any) => (
                    <Button
                      type="link"
                      danger
                      disabled={!record.isDeleteble}
                      icon={<CloseSquareOutlined />}
                      onClick={handleDeleteIndex(record.name)}
                    />
                  ),
                },
              ]}
            />
          )}
        </Card>
      )}
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
          {(modalInfo.type === 'insertColumnAtHead' ||
            modalInfo.type === 'insertColumnAtTail' ||
            modalInfo.type === 'addColumnAfter') && (
            <>
              <Form.Item
                label={t('data_manager.name')}
                name="name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item label={t('data_manager.field_type')}>
                <Space style={{ display: 'flex', alignItems: 'center' }}>
                  <Form.Item
                    name="typeName"
                    rules={[
                      {
                        required: true,
                        message: `${t('data_manager.please_input')}${t(
                          'data_manager.field_type'
                        )}`,
                      },
                    ]}
                  >
                    <Select
                      style={{ width: 150 }}
                      placeholder={t('data_manager.field_type')}
                    >
                      {Object.values(xcClient.FieldTypeName).map((t) => (
                        <Option key={t} value={t}>
                          {t}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="length">
                    <Input
                      type="number"
                      placeholder={t('data_manager.length')}
                    />
                  </Form.Item>

                  <Form.Item name="decimals">
                    <Input
                      type="number"
                      placeholder={t('data_manager.decimal')}
                    />
                  </Form.Item>

                  <Form.Item name="isNotNull" valuePropName="checked">
                    <Checkbox>{t('data_manager.not_null')}?</Checkbox>
                  </Form.Item>

                  <Form.Item name="isUnsigned" valuePropName="checked">
                    <Checkbox>{t('data_manager.unsigned')}?</Checkbox>
                  </Form.Item>
                </Space>
              </Form.Item>
              <Form.Item
                label={t('data_manager.default_value')}
                name="defaultValue"
              >
                <Input />
              </Form.Item>
              <Form.Item label={t('data_manager.comment')} name="comment">
                <Input />
              </Form.Item>
            </>
          )}
          {modalInfo.type === 'addIndex' && (
            <>
              <Form.Item
                label={t('data_manager.name')}
                name="name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="type"
                label={t('data_manager.type')}
                rules={[{ required: true }]}
              >
                <Select>
                  {Object.entries(xcClient.TableInfoIndexType)
                    .filter((t) => typeof t[1] === 'number')
                    .filter((t) => t[0] !== 'Primary')
                    .map((t) => (
                      <Option key={t[0]} value={t[1]}>
                        {t[0]}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
              <Form.List name="columns">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((f, i) => (
                      <Form.Item
                        key={f.key}
                        {...(i > 0
                          ? {
                              wrapperCol: {
                                offset: 4,
                              },
                            }
                          : null)}
                        label={i === 0 ? t('data_manager.columns') : ''}
                      >
                        <Space>
                          <Form.Item
                            name={[f.name, 'columnName']}
                            fieldKey={[f.fieldKey, 'columnName'] as any}
                            rules={[
                              {
                                required: true,
                                message: `${t('data_manager.please_input')}${t(
                                  'data_manager.name'
                                )}`,
                              },
                            ]}
                            noStyle
                          >
                            <Select style={{ width: 100 }}>
                              {tableInfo &&
                                (form.getFieldValue('columns')
                                  ? tableInfo.columns.filter(
                                      (c) =>
                                        !form
                                          .getFieldValue('columns')
                                          .filter((d) => d !== undefined)
                                          .map((c) => c.columnName)
                                          .includes(c.name)
                                    )
                                  : tableInfo.columns
                                )
                                  .map((c) => c.name)
                                  .map((d, i) => (
                                    <Option key={d + i} value={d}>
                                      {d}
                                    </Option>
                                  ))}
                            </Select>
                          </Form.Item>
                          <Form.Item
                            name={[f.name, 'keyLength']}
                            fieldKey={[f.fieldKey, 'keyLength'] as any}
                            noStyle
                          >
                            <Input
                              type="number"
                              placeholder={t('data_manager.length')}
                            />
                          </Form.Item>
                          <MinusSquareTwoTone
                            twoToneColor="#ff4d4f"
                            onClick={() => remove(f.name)}
                          />
                        </Space>
                      </Form.Item>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => {
                          console.log(form.getFieldValue('columns'))
                          add()
                        }}
                      >
                        <PlusOutlined /> {t('data_manager.add_column')}
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </>
          )}
          {modalInfo.type === 'deleteColumn' &&
            `${t('data_manager.confirm_delete_txt')} ${modalInfo.columnName}`}
          {modalInfo.type === 'deleteIndex' &&
            `${t('data_manager.confirm_delete_txt')} ${modalInfo.indexName}`}
        </Form>
      </Modal>
    </>
  )
}
