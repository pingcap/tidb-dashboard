import * as xcClient from '@lib/utils/xcClient/database'
import React, { useState, useEffect } from 'react'
import useQueryParams from '@lib/utils/useQueryParams'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Head, Card, Pre } from '@lib/components'
import { useNavigate } from 'react-router-dom'
import { Form, Select, Button, Space, Modal } from 'antd'
import _ from 'lodash'
import { useForm } from 'antd/lib/form/util'
import client from '@lib/client'
import { useTranslation } from 'react-i18next'

export default function ExportTablesPage() {
  const { db, table } = useQueryParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [tables, setTables] = useState<xcClient.TableInfo[]>()
  const [form] = useForm()
  const { t } = useTranslation()

  useEffect(() => {
    async function f() {
      const t = (await xcClient.getTables(db)).tables
      setTables(t)
      if (table) {
        let v = t.find(
          (item) => item.name.toUpperCase() === table.toUpperCase()
        )
        if (v) {
          form.setFieldsValue({
            tables: [v.name],
          })
        }
      }
    }
    f()
  }, [])

  function selectAll() {
    form.setFieldsValue({
      tables: (tables ?? []).map((t) => t.name),
    })
  }

  const onFinish = async (f) => {
    setIsLoading(true)
    try {
      const data = await client.getInstance().queryEditorBulkExport({
        db,
        tables: f.tables,
      })
      Modal.success({
        title: t('data_manager.export_tables.export_success'),
        onOk: () => {
          const url = `${client.getBasePath()}/query_editor/download?token=${
            data.data.file_token
          }`
          window.open(url)
        },
        okText: t('data_manager.export_tables.export_download'),
      })
    } catch (e) {
      Modal.error({
        title: t('data_manager.export_tables.export_failed'),
        content: <Pre>{e.message}</Pre>,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Head
        title={t('data_manager.export_tables.title')}
        back={
          <a onClick={() => navigate(-1)}>
            <ArrowLeftOutlined /> {db}
          </a>
        }
      />
      <Card>
        <Form
          layout="vertical"
          name="basic"
          onFinish={onFinish}
          style={{ width: '400px' }}
          form={form}
        >
          <Form.Item
            label={t('data_manager.export_tables.form.tables')}
            name="tables"
            rules={[{ required: true }]}
          >
            <Select
              mode="multiple"
              placeholder={t(
                'data_manager.export_tables.form.tables_placeholder'
              )}
              allowClear
              disabled={isLoading}
            >
              {_(tables ?? [])
                .groupBy('type')
                .toPairs()
                .value()
                .map(([groupName, groupValues]) => {
                  return (
                    <Select.OptGroup label={groupName} key={groupName}>
                      {groupValues.map((table) => {
                        return (
                          <Select.Option key={table.name} value={table.name}>
                            {table.name}
                          </Select.Option>
                        )
                      })}
                    </Select.OptGroup>
                  )
                })}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button disabled={isLoading} onClick={() => selectAll()}>
                {t('data_manager.export_tables.form.select_all')}
              </Button>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                {t('data_manager.export_tables.form.submit')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </>
  )
}
