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
} from 'antd'
import {
  CloseSquareOutlined,
  MinusSquareTwoTone,
  PlusOutlined,
  PlusSquareOutlined,
} from '@ant-design/icons'
import React, { useEffect, useState } from 'react'

import { Card } from '@lib/components'
import { parseColumnRelatedValues } from '@lib/utils/xcClient/util'
import { useNavigate } from 'react-router-dom'
import useQueryParams from '@lib/utils/useQueryParams'

const { Option } = Select

// route: /data/table_structure?db=xxx&table=yyy
export default function DBTableStructure() {
  const navigate = useNavigate()
  const { db, table } = useQueryParams()

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
      modalInfo.type === 'addColumnAtHead' ||
      modalInfo.type === 'addColumnAtTail' ||
      modalInfo.type === 'addColumnAfter'
    ) {
      _values = parseColumnRelatedValues(values)
    }

    switch (modalInfo.type) {
      case 'addColumnAtHead':
        try {
          await xcClient.addTableColumnAtHead(db, table, _values)
          notification.success({ message: 'Added successfully' })
        } catch (e) {
          notification.error({
            message: 'Fail to add column at head',
            description: e.toString(),
          })
        }
        break
      case 'addColumnAtTail':
        try {
          await xcClient.addTableColumnAtTail(db, table, _values)
          notification.success({ message: 'Added successfully' })
        } catch (e) {
          notification.error({
            message: 'Fail to add column at tail',
            description: e.toString(),
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
          notification.success({ message: 'Added successfully' })
        } catch (e) {
          notification.error({
            message: `Fail to add column after ${modalInfo.columnName}`,
            description: e.toString(),
          })
        }
        break
      case 'deleteColumn':
        try {
          await xcClient.dropTableColumn(db, table, modalInfo.columnName)
          notification.success({ message: 'Successfully deleted' })
        } catch (e) {
          notification.error({
            message: 'Fail to delete column',
            description: e.toString(),
          })
        }
        break
      case 'addIndex':
        try {
          await xcClient.addTableIndex(db, table, {
            ...values,
            ...{ columns: values.columns.map((c) => ({ columnName: c })) },
          })
          notification.success({ message: 'Added successfully' })
        } catch (e) {
          notification.error({
            message: 'Fail to add index',
            description: e.toString(),
          })
        }
        break
      case 'deleteIndex':
        try {
          await xcClient.dropTableIndex(db, table, modalInfo.indexName)
          notification.success({ message: 'Successfully deleted' })
        } catch (e) {
          notification.error({
            message: 'Fail to delete index',
            description: e.toString(),
          })
        }
        break
      default:
        break
    }

    setTimeout(fetchTableInfo, 1000)
    setVisible(false)
  }

  const handleCancel = () => {
    setVisible(false)
  }

  const handleDeleteColumn = (name) => () => {
    showModal({
      type: 'deleteColumn',
      title: `Delete Column ${name}`,
      columnName: name,
    })()
  }

  const handleAddColumnAfter = (name) => () => {
    showModal({
      type: 'addColumnAfter',
      title: `Add Column After ${name}`,
      columnName: name,
    })()
  }

  const handleDeleteIndex = (name) => () => {
    showModal({
      type: 'deleteIndex',
      title: `Delete Index ${name}`,
      indexName: name,
    })()
  }

  return (
    <>
      <PageHeader onBack={() => navigate(-1)} title={table} subTitle={db} />
      <Card noMarginTop>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <PageHeader title="Columns" style={{ padding: '0px 0px 16px 8px' }} />
          <Space>
            <Button
              type="primary"
              onClick={showModal({
                type: 'addColumnAtHead',
                title: 'Add Column at Head',
              })}
            >
              Add Column at Head
            </Button>
            <Button
              type="primary"
              onClick={showModal({
                type: 'addColumnAtTail',
                title: 'Add Column at Tail',
              })}
            >
              Add Column at Tail
            </Button>
          </Space>
        </div>
        {tableInfo && (
          <Table
            dataSource={tableInfo.columns.map((d, i) => ({
              ...{ key: d.name + i },
              ...d,
              ...{ isNotNull: d.isNotNull.toString() },
            }))}
            columns={[
              {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: 'Field Type',
                dataIndex: 'fieldType',
                key: 'fieldType',
              },
              {
                title: 'Not Null',
                dataIndex: 'isNotNull',
                key: 'isNotNull',
              },
              {
                title: 'Default Value',
                dataIndex: 'defaultValue',
                key: 'defaultValue',
              },
              {
                title: 'Comment',
                dataIndex: 'comment',
                key: 'comment',
              },
              {
                title: 'Add Column After',
                key: 'AddColumnAfter',
                fixed: 'right',
                width: 150,
                render: (_: any, record: any) => (
                  <Button
                    type="link"
                    icon={<PlusSquareOutlined />}
                    onClick={handleAddColumnAfter(record.name)}
                  />
                ),
              },
              {
                title: 'Delete Column',
                key: 'Delete',
                fixed: 'right',
                width: 150,
                render: (_: any, record: any) => (
                  <Button
                    type="link"
                    danger
                    icon={<CloseSquareOutlined />}
                    onClick={handleDeleteColumn(record.name)}
                  />
                ),
              },
            ]}
          />
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <PageHeader title="Indexes" style={{ padding: '0px 0px 16px 8px' }} />
          <Space>
            <Button
              type="primary"
              onClick={showModal({
                type: 'addIndex',
                title: 'Add Index',
              })}
            >
              Add Index
            </Button>
          </Space>
        </div>
        {tableInfo && (
          <Table
            dataSource={tableInfo.indexes.map((d, i) => ({
              ...{ key: d.name + i },
              ...d,
              ...{ columns: d.columns.join(', ') },
            }))}
            columns={[
              {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: 'Type',
                dataIndex: 'type',
                key: 'type',
              },
              {
                title: 'Columns',
                dataIndex: 'columns',
                key: 'columns',
              },
              {
                title: 'Delete',
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
      <Modal
        visible={visible}
        title={modalInfo.title}
        width={1024}
        onCancel={handleCancel}
        footer={null}
      >
        <Form
          {...{
            labelCol: { span: 6 },
            wrapperCol: { span: 18 },
          }}
          onFinish={handleOk}
        >
          {(modalInfo.type === 'addColumnAtHead' ||
            modalInfo.type === 'addColumnAtTail' ||
            modalInfo.type === 'addColumnAfter') && (
            <>
              <Form.Item label="Name" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Field Type">
                <Space style={{ display: 'flex', alignItems: 'center' }}>
                  <Form.Item name="typeName">
                    <Select style={{ width: 150 }}>
                      {Object.values(xcClient.FieldTypeName).map((t) => (
                        <Option key={t} value={t}>
                          {t}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="length">
                    <Input type="number" placeholder="Length" />
                  </Form.Item>

                  <Form.Item name="decimals">
                    <Input type="number" placeholder="Decimals" />
                  </Form.Item>

                  <Form.Item name="isNotNull" valuePropName="checked">
                    <Checkbox>Not Null?</Checkbox>
                  </Form.Item>

                  <Form.Item name="isUnsigned" valuePropName="checked">
                    <Checkbox>Unsigned?</Checkbox>
                  </Form.Item>
                </Space>
              </Form.Item>
              <Form.Item label="Default Value" name="defaultValue">
                <Input />
              </Form.Item>
              <Form.Item label="Comment" name="comment">
                <Input />
              </Form.Item>
            </>
          )}
          {modalInfo.type === 'addIndex' && (
            <>
              <Form.Item label="Name" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select>
                  {Object.entries(xcClient.TableInfoIndexType)
                    .filter((t) => typeof t[1] === 'number')
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
                                offset: 6,
                              },
                            }
                          : null)}
                        label={i === 0 ? 'Columns' : ''}
                      >
                        <Form.Item {...f} noStyle>
                          <Input style={{ width: '80%' }} />
                        </Form.Item>
                        <MinusSquareTwoTone
                          twoToneColor="#ff4d4f"
                          style={{ marginLeft: '1rem' }}
                          onClick={() => remove(f.name)}
                        />
                      </Form.Item>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => {
                          add()
                        }}
                      >
                        <PlusOutlined /> Add Column
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </>
          )}
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button key="back" onClick={handleCancel}>
                Cancel
              </Button>
              <Button key="submit" type="primary" htmlType="submit">
                Submit
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
