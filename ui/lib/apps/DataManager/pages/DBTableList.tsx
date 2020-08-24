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
} from '@ant-design/icons'
import React, { useEffect, useState } from 'react'

import { AppstoreOutlined } from '@ant-design/icons'
import { Card } from '@lib/components'
import { parseColumnRelatedValues } from '@lib/utils/xcClient/util'
import { useNavigate } from 'react-router-dom'
import useQueryParams from '@lib/utils/useQueryParams'

const { Option } = Select

// route: /data/tables?db=xxx
export default function DBTableList() {
  const navigate = useNavigate()
  const { db } = useQueryParams()

  const [tables, setTables] = useState<string[]>()
  const [visible, setVisible] = useState(false)
  const [modalInfo, setModalInfo] = useState<any>({
    type: '',
    title: '',
  })

  const fetchTables = async () =>
    setTables((await xcClient.getTables(db)).tables)

  useEffect(() => {
    fetchTables()
  }, [])

  const showModal = (info) => () => {
    setModalInfo(info)
    setVisible(true)
  }

  const handleOk = async (values) => {
    let _values
    if (modalInfo.type === 'newTable') {
      const columns = values.columns.map(parseColumnRelatedValues)
      _values = {
        ...values,
        ...{
          columns,
          primaryKeys: columns
            .map((c) => (c.isPrimaryKey ? { columnName: c.name } : undefined))
            .filter((d) => d !== undefined),
        },
      }
    }

    switch (modalInfo.type) {
      case 'newTable':
        console.log(_values)
        try {
          await xcClient.createTable({ ..._values, ...{ dbName: db } })
          notification.success({ message: 'Created successfully' })
        } catch (e) {
          notification.error({
            message: 'Fail to create table',
            description: e.toString(),
          })
        }
        break
      case 'deleteTable':
        try {
          await xcClient.dropTable(db, modalInfo.tableName)
          notification.success({ message: 'Successfully deleted' })
        } catch (e) {
          notification.error({
            message: 'Fail to delete table',
            description: e.toString(),
          })
        }
        break
      default:
        break
    }

    setTimeout(fetchTables, 1000)
    setVisible(false)
  }

  const handleCancel = () => {
    setVisible(false)
  }

  const handleDeleteTable = (name) => () => {
    showModal({
      type: 'deleteTable',
      title: `Delete Table ${name}`,
      tableName: name,
    })()
  }

  return (
    <>
      <PageHeader onBack={() => navigate(-1)} title={db} />
      <Card noMarginTop>
        <Button
          type="primary"
          style={{ marginBottom: '1rem' }}
          onClick={showModal({ title: 'Create Table', type: 'newTable' })}
        >
          Create Table
        </Button>
        {tables && (
          <Table
            dataSource={tables.map((d, i) => ({
              key: d + i,
              name: d,
            }))}
            columns={[
              {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: 'Structure',
                key: 'structure',
                fixed: 'right',
                width: 150,
                render: (_: any, __: any, i) => (
                  <Button
                    icon={<AppstoreOutlined />}
                    href={`#/data/table_structure?db=${db}&table=${tables[i]}`}
                  />
                ),
              },
              {
                title: 'Delete',
                key: 'delete',
                fixed: 'right',
                width: 150,
                render: (_: any, record: any) => (
                  <Button
                    type="link"
                    danger
                    icon={<CloseSquareOutlined />}
                    onClick={handleDeleteTable(record.name)}
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
          {modalInfo.type === 'newTable' && (
            <>
              <Form.Item
                label="Name"
                name="tableName"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item label="Comment" name="comment">
                <Input />
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
                        <Form.Item
                          name={[f.name, 'name']}
                          fieldKey={[f.fieldKey, 'name'] as any}
                        >
                          <Input placeholder="Name" />
                        </Form.Item>
                        <Form.Item>
                          <Space
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            <Form.Item
                              name={[f.name, 'typeName']}
                              fieldKey={[f.fieldKey, 'typeName'] as any}
                            >
                              <Select style={{ width: 150 }}>
                                {Object.values(xcClient.FieldTypeName).map(
                                  (t) => (
                                    <Option key={t} value={t}>
                                      {t}
                                    </Option>
                                  )
                                )}
                              </Select>
                            </Form.Item>

                            <Form.Item
                              name={[f.name, 'length']}
                              fieldKey={[f.fieldKey, 'length'] as any}
                            >
                              <Input type="number" placeholder="Length" />
                            </Form.Item>

                            <Form.Item
                              name={[f.name, 'decimals']}
                              fieldKey={[f.fieldKey, 'decimals'] as any}
                            >
                              <Input type="number" placeholder="Decimals" />
                            </Form.Item>

                            <Form.Item
                              name={[f.name, 'isNotNull']}
                              fieldKey={[f.fieldKey, 'isNotNull'] as any}
                              valuePropName="checked"
                            >
                              <Checkbox>Not Null?</Checkbox>
                            </Form.Item>

                            <Form.Item
                              name={[f.name, 'isUnsigned']}
                              fieldKey={[f.fieldKey, 'isUnsigned'] as any}
                              valuePropName="checked"
                            >
                              <Checkbox>Unsigned?</Checkbox>
                            </Form.Item>
                          </Space>
                        </Form.Item>
                        <Form.Item
                          name={[f.name, 'isAutoIncrement']}
                          fieldKey={[f.fieldKey, 'isAutoIncrement'] as any}
                          valuePropName="checked"
                        >
                          <Checkbox>Auto Increment?</Checkbox>
                        </Form.Item>
                        <Form.Item
                          name={[f.name, 'isPrimaryKey']}
                          fieldKey={[f.fieldKey, 'isPrimaryKey'] as any}
                          valuePropName="checked"
                        >
                          <Checkbox>Primary Key?</Checkbox>
                        </Form.Item>
                        <Form.Item
                          name={[f.name, 'defaultValue']}
                          fieldKey={[f.fieldKey, 'defaultValue'] as any}
                        >
                          <Input placeholder="Default Value" />
                        </Form.Item>
                        <Form.Item
                          name={[f.name, 'comment']}
                          fieldKey={[f.fieldKey, 'comment'] as any}
                        >
                          <Input placeholder="Comment" />
                        </Form.Item>
                        <MinusSquareTwoTone
                          twoToneColor="#ff4d4f"
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
