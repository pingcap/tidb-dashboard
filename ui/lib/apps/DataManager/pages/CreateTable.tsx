import * as xcClient from '@lib/utils/xcClient/database'

import {
  ArrowLeftOutlined,
  MinusSquareTwoTone,
  PlusOutlined,
} from '@ant-design/icons'
import {
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
} from 'antd'
import { Card, Head, Pre } from '@lib/components'
import React, { useState } from 'react'

import { parseColumnRelatedValues } from '@lib/utils/xcClient/util'
import { useNavigate } from 'react-router-dom'
import useQueryParams from '@lib/utils/useQueryParams'
import { useTranslation } from 'react-i18next'

const { Option } = Select

const CreateTable = () => {
  const navigate = useNavigate()
  const { db } = useQueryParams()

  const { t } = useTranslation()

  const [form] = Form.useForm()

  const [addPartition, setaddPartition] = useState(false)
  const [partitionType, setPartitionType] = useState('')
  const [partitionConditions, setPartitionConditions] = useState<number[]>([])

  const handleOk = async (values) => {
    let _values

    if (!values.columns) {
      Modal.error({
        content: `${t('data_manager.please_input')}${t(
          'data_manager.columns'
        )}`,
      })
      return
    }

    const columns = values.columns.map(parseColumnRelatedValues)

    let partition
    if (values.partition) {
      partition = {
        type: values.partition,
        expr: values.expr,
      }

      switch (partition.type) {
        case xcClient.PartitionType.RANGE:
          partition.partitions = values.partitions.map((p) => ({
            name: p.name,
            boundaryValue: p.boundaryValue,
          }))
          break
        case xcClient.PartitionType.HASH:
          partition.numberOfPartitions = parseInt(values.numberOfPartitions)
          break
        case xcClient.PartitionType.LIST:
          partition.partitions = values.partitions.map((p) => ({
            name: p.name,
            values: p.values,
          }))
          break
        default:
          break
      }
    }

    _values = {
      dbName: db,
      tableName: values.tableName,
      comment: values.comment,
      columns,
      primaryKeys: columns
        .map((c) => (c.isPrimaryKey ? { columnName: c.name } : undefined))
        .filter((d) => d !== undefined),
      partition,
    }

    try {
      await xcClient.createTable(_values)
      Modal.success({
        content: t('data_manager.create_success_txt'),
      })
      navigate(-1)
    } catch (e) {
      Modal.error({
        title: t('data_manager.create_failed_txt'),
        content: <Pre>{e.message}</Pre>,
      })
    }
  }

  return (
    <>
      <Head
        title={t('data_manager.create_table')}
        back={
          <a onClick={() => navigate(-1)}>
            <ArrowLeftOutlined /> {t('data_manager.all_tables')}
          </a>
        }
      />
      <Card>
        <Form
          form={form}
          {...{
            labelCol: { span: 4 },
            wrapperCol: { span: 20 },
          }}
          onFinish={handleOk}
        >
          <Row>
            <Col span={12}>
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
                          rules={[
                            {
                              required: true,
                              message: `${t('data_manager.please_input')}${t(
                                'data_manager.name'
                              )}`,
                            },
                          ]}
                        >
                          <Input placeholder={t('data_manager.name')} />
                        </Form.Item>
                        <Form.Item>
                          <Space>
                            <Form.Item
                              name={[f.name, 'typeName']}
                              fieldKey={[f.fieldKey, 'typeName'] as any}
                              rules={[
                                {
                                  required: true,
                                  message: `${t(
                                    'data_manager.please_input'
                                  )}${t('data_manager.field_type')}`,
                                },
                              ]}
                              noStyle
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
                              noStyle
                            >
                              <Input
                                type="number"
                                placeholder={t('data_manager.length')}
                              />
                            </Form.Item>

                            <Form.Item
                              name={[f.name, 'decimals']}
                              fieldKey={[f.fieldKey, 'decimals'] as any}
                              noStyle
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
                              noStyle
                            >
                              <Checkbox>{t('data_manager.not_null')}?</Checkbox>
                            </Form.Item>

                            <Form.Item
                              name={[f.name, 'isUnsigned']}
                              fieldKey={[f.fieldKey, 'isUnsigned'] as any}
                              valuePropName="checked"
                              noStyle
                            >
                              <Checkbox>{t('data_manager.unsigned')}?</Checkbox>
                            </Form.Item>
                          </Space>
                        </Form.Item>
                        <Space style={{ marginBottom: 24 }}>
                          <Form.Item
                            name={[f.name, 'isPrimaryKey']}
                            fieldKey={[f.fieldKey, 'isPrimaryKey'] as any}
                            valuePropName="checked"
                            noStyle
                          >
                            <Checkbox>
                              {t('data_manager.primary_key')}?
                            </Checkbox>
                          </Form.Item>
                          <Form.Item
                            name={[f.name, 'isAutoIncrement']}
                            fieldKey={[f.fieldKey, 'isAutoIncrement'] as any}
                            valuePropName="checked"
                            noStyle
                          >
                            <Checkbox>
                              {t('data_manager.auto_increment')}?
                            </Checkbox>
                          </Form.Item>
                        </Space>
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
                    <Form.Item
                      {...{
                        wrapperCol: { offset: 4, span: 20 },
                      }}
                    >
                      <Button
                        type="dashed"
                        onClick={() => {
                          add()
                        }}
                      >
                        <PlusOutlined />
                        {t('data_manager.add_column')}
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
              <Form.Item
                {...{
                  wrapperCol: { offset: 4, span: 20 },
                }}
              >
                <Button type="primary" htmlType="submit">
                  {t('data_manager.submit')}
                </Button>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('data_manager.add_partition_table')}>
                <Checkbox onChange={() => setaddPartition(!addPartition)} />
              </Form.Item>
              {addPartition && (
                <>
                  <Form.Item
                    label={t('data_manager.partition_type')}
                    name="partition"
                  >
                    <Select
                      onChange={(value) => setPartitionType(value as any)}
                      placeholder={t('data_manager.partition_type')}
                    >
                      {Object.values(xcClient.PartitionType).map((t) => (
                        <Option key={t} value={t}>
                          {t}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  {partitionType && (
                    <Form.Item
                      label={t('data_manager.partition_expr')}
                      name="expr"
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                  )}

                  {partitionType === xcClient.PartitionType.RANGE && (
                    <>
                      <Form.List name="partitions">
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
                                label={
                                  i === 0 ? t('data_manager.partitions') : ''
                                }
                              >
                                <Space>
                                  <Form.Item
                                    name={[f.name, 'name']}
                                    fieldKey={[f.fieldKey, 'name'] as any}
                                    rules={[
                                      {
                                        required: true,
                                        message: `${t(
                                          'data_manager.please_input'
                                        )}${t('data_manager.name')}`,
                                      },
                                    ]}
                                    noStyle
                                  >
                                    <Input
                                      placeholder={t('data_manager.name')}
                                    />
                                  </Form.Item>
                                  <Form.Item noStyle>
                                    <Select
                                      onChange={(value) =>
                                        setPartitionConditions([
                                          ...partitionConditions.splice(0, i),
                                          value,
                                          ...partitionConditions.splice(
                                            i + 1,
                                            partitionConditions.length
                                          ),
                                        ])
                                      }
                                      style={{ width: 200 }}
                                      defaultValue={0}
                                    >
                                      <Option value={0}>LESS THAN</Option>
                                      <Option value={1}>
                                        LESS THAN MAXVALUE
                                      </Option>
                                    </Select>
                                  </Form.Item>
                                  {partitionConditions[i] === 0 && (
                                    <Form.Item
                                      name={[f.name, 'boundaryValue']}
                                      fieldKey={
                                        [f.fieldKey, 'boundaryValue'] as any
                                      }
                                      rules={[
                                        {
                                          required: true,
                                          message: `${t(
                                            'data_manager.please_input'
                                          )}${t(
                                            'data_manager.partition_value'
                                          )}`,
                                        },
                                      ]}
                                      noStyle
                                    >
                                      <Input
                                        placeholder={t(
                                          'data_manager.partition_value'
                                        )}
                                      />
                                    </Form.Item>
                                  )}
                                  <MinusSquareTwoTone
                                    twoToneColor="#ff4d4f"
                                    onClick={() => {
                                      remove(f.name)
                                      setPartitionConditions([
                                        ...partitionConditions.splice(0, i),
                                        ...partitionConditions.splice(
                                          i + 1,
                                          partitionConditions.length
                                        ),
                                      ])
                                    }}
                                  />
                                </Space>
                              </Form.Item>
                            ))}
                            <Form.Item
                              {...{
                                wrapperCol: { offset: 4, span: 20 },
                              }}
                            >
                              <Button
                                type="dashed"
                                onClick={() => {
                                  add()
                                  setPartitionConditions([
                                    ...partitionConditions,
                                    0,
                                  ])
                                }}
                              >
                                <PlusOutlined />
                                {t('data_manager.add_partition')}
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </>
                  )}

                  {partitionType === xcClient.PartitionType.HASH && (
                    <Form.Item
                      label={t('data_manager.number_of_partitions')}
                      name="numberOfPartitions"
                      rules={[{ required: true }]}
                    >
                      <Input type="number" />
                    </Form.Item>
                  )}

                  {partitionType === xcClient.PartitionType.LIST && (
                    <>
                      <Form.List name="partitions">
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
                                    name={[f.name, 'name']}
                                    fieldKey={[f.fieldKey, 'name'] as any}
                                    rules={[
                                      {
                                        required: true,
                                        message: `${t(
                                          'data_manager.please_input'
                                        )}${t('data_manager.name')}`,
                                      },
                                    ]}
                                    noStyle
                                  >
                                    <Input
                                      placeholder={t('data_manager.name')}
                                    />
                                  </Form.Item>
                                  <Form.Item
                                    name={[f.name, 'values']}
                                    fieldKey={[f.fieldKey, 'values'] as any}
                                    noStyle
                                  >
                                    <Input
                                      placeholder={t(
                                        'data_manager.partition_value'
                                      )}
                                    />
                                  </Form.Item>
                                  <MinusSquareTwoTone
                                    twoToneColor="#ff4d4f"
                                    onClick={() => remove(f.name)}
                                  />
                                </Space>
                              </Form.Item>
                            ))}
                            <Form.Item
                              {...{
                                wrapperCol: { offset: 4, span: 20 },
                              }}
                            >
                              <Button
                                type="dashed"
                                onClick={() => {
                                  add()
                                }}
                              >
                                <PlusOutlined />
                                {t('data_manager.add_partition')}
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </>
                  )}
                </>
              )}
            </Col>
          </Row>
        </Form>
      </Card>
    </>
  )
}

export default CreateTable
