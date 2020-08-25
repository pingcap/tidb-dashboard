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
  EditOutlined,
  MinusSquareTwoTone,
  PlusOutlined,
} from '@ant-design/icons'
import React, { useEffect, useState } from 'react'

import { AppstoreOutlined } from '@ant-design/icons'
import { Card } from '@lib/components'
import { parseColumnRelatedValues } from '@lib/utils/xcClient/util'
import { useNavigate } from 'react-router-dom'
import useQueryParams from '@lib/utils/useQueryParams'
import { useTranslation } from 'react-i18next'

const { Option } = Select

// route: /data/tables?db=xxx
export default function DBTableList() {
  const navigate = useNavigate()
  const { db } = useQueryParams()

  const { t } = useTranslation()

  const [form] = Form.useForm()

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
          notification.success({
            message: t('data_manager.create_success_txt'),
          })
        } catch (e) {
          notification.error({
            message: t('data_manager.create_failed_txt'),
            description: e.toString(),
          })
        }
        break
      case 'editTable':
        try {
          await xcClient.renameTable(db, modalInfo.tableName, values.tableName)
          notification.success({
            message: t('data_manager.update_success_txt'),
          })
        } catch (e) {
          notification.error({
            message: t('data_manager.update_failed_txt'),
            description: e.toString(),
          })
        }
        break
      case 'deleteTable':
        try {
          await xcClient.dropTable(db, modalInfo.tableName)
          notification.success({
            message: t('data_manager.delete_success_txt'),
          })
        } catch (e) {
          notification.error({
            message: t('data_manager.delete_failed_txt'),
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
    form.resetFields()
  }

  const handleDeleteTable = (name) => () => {
    showModal({
      type: 'deleteTable',
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
      <PageHeader onBack={() => navigate(-1)} title={db} />
      <Card noMarginTop>
        <Button
          type="primary"
          style={{ marginBottom: '1rem' }}
          onClick={showModal({
            title: t('data_manager.create_table'),
            type: 'newTable',
          })}
        >
          {t('data_manager.create_table')}
        </Button>
        {tables && (
          <Table
            dataSource={tables.map((d, i) => ({
              key: d + i,
              name: d,
            }))}
            columns={[
              {
                title: t('data_manager.name'),
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: t('data_manager.structure'),
                key: 'structure',
                fixed: 'right',
                width: 150,
                render: (_: any, __: any, i) => (
                  <Button
                    type="link"
                    icon={<AppstoreOutlined />}
                    href={`#/data/table_structure?db=${db}&table=${tables[i]}`}
                  />
                ),
              },
              {
                title: t('data_manager.edit'),
                key: 'edit',
                fixed: 'right',
                width: 150,
                render: (_: any, record: any) => (
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={handleEditTable(record.name)}
                  />
                ),
              },
              {
                title: t('data_manager.delete'),
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
          {modalInfo.type === 'newTable' && (
            <>
              <Form.Item
                label={t('data_manager.name')}
                name="tableName"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item label={t('data_manager.comment')} name="comment">
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
                                offset: 4,
                              },
                            }
                          : null)}
                        label={i === 0 ? t('data_manager.columns') : ''}
                      >
                        <Form.Item
                          name={[f.name, 'name']}
                          fieldKey={[f.fieldKey, 'name'] as any}
                        >
                          <Input placeholder={t('data_manager.name')} />
                        </Form.Item>
                        <Form.Item>
                          <Space
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            <Form.Item
                              name={[f.name, 'typeName']}
                              fieldKey={[f.fieldKey, 'typeName'] as any}
                            >
                              <Select
                                style={{ width: 150 }}
                                placeholder={t('data_manager.field_type')}
                              >
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
                              <Input
                                type="number"
                                placeholder={t('data_manager.length')}
                              />
                            </Form.Item>

                            <Form.Item
                              name={[f.name, 'decimals']}
                              fieldKey={[f.fieldKey, 'decimals'] as any}
                            >
                              <Input
                                type="number"
                                placeholder={t('data_manager.decimal')}
                              />
                            </Form.Item>

                            <Form.Item
                              name={[f.name, 'isNotNull']}
                              fieldKey={[f.fieldKey, 'isNotNull'] as any}
                              valuePropName="checked"
                            >
                              <Checkbox>{t('data_manager.not_null')}?</Checkbox>
                            </Form.Item>

                            <Form.Item
                              name={[f.name, 'isUnsigned']}
                              fieldKey={[f.fieldKey, 'isUnsigned'] as any}
                              valuePropName="checked"
                            >
                              <Checkbox>{t('data_manager.unsigned')}?</Checkbox>
                            </Form.Item>
                          </Space>
                        </Form.Item>
                        <Form.Item
                          name={[f.name, 'isAutoIncrement']}
                          fieldKey={[f.fieldKey, 'isAutoIncrement'] as any}
                          valuePropName="checked"
                        >
                          <Checkbox>
                            {t('data_manager.auto_increment')}?
                          </Checkbox>
                        </Form.Item>
                        <Form.Item
                          name={[f.name, 'isPrimaryKey']}
                          fieldKey={[f.fieldKey, 'isPrimaryKey'] as any}
                          valuePropName="checked"
                        >
                          <Checkbox>{t('data_manager.primary_key')}?</Checkbox>
                        </Form.Item>
                        <Form.Item
                          name={[f.name, 'defaultValue']}
                          fieldKey={[f.fieldKey, 'defaultValue'] as any}
                        >
                          <Input
                            placeholder={t('data_manager.default_value')}
                          />
                        </Form.Item>
                        <Form.Item
                          name={[f.name, 'comment']}
                          fieldKey={[f.fieldKey, 'comment'] as any}
                        >
                          <Input placeholder={t('data_manager.comment')} />
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
                        <PlusOutlined /> {t('data_manager.add_column')}
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </>
          )}
          {modalInfo.type === 'editTable' && (
            <>
              <Form.Item
                label={t('data_manager.name')}
                name="tableName"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </>
  )
}
