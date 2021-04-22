import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Button } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import client, { SchemaEndpointAPI, SchemaEndpointAPIParam } from '@lib/client'
import { widgetsMap } from './ApiFormWidgets'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 14 },
}

const buttonItemLayout = {
  wrapperCol: { span: 14, offset: 4 },
}

export default function ApiForm({ endpoint }: { endpoint: SchemaEndpointAPI }) {
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const params = [endpoint.host!, ...endpoint.segment!, ...endpoint.query!]

  const download = useCallback(
    async (values: any) => {
      const rst = await client.getInstance().debugapiProxyGet({
        // const { data, headers } = await client.getInstance().debugapiProxyGet({
        // responseType: 'blob',
        query: { ...values, id: endpoint.id },
      })
      // const blob = new Blob([data], { type: headers['content-type'] })
      console.log(rst)
      const blob = new Blob([rst.data], { type: 'application/json' })
      blob.text().then((t) => console.log(t))
      // const link = document.createElement('a')
      // const fileName = `${Date.now()}.json`

      // link.href = window.URL.createObjectURL(blob)
      // link.download = fileName
      // link.click()
      // window.URL.revokeObjectURL(link.href)
    },
    [endpoint.id]
  )

  return (
    <Form
      {...formItemLayout}
      layout="horizontal"
      form={form}
      onFinish={download}
    >
      {params.map((param) => (
        <ApiFormItem key={param.name} param={param}></ApiFormItem>
      ))}
      <Form.Item {...buttonItemLayout}>
        <Button type="primary" icon={<DownloadOutlined />} htmlType="submit">
          {t('debug_api.form.download')}
        </Button>
      </Form.Item>
    </Form>
  )
}

function ApiFormItem({ param }: { param: SchemaEndpointAPIParam }) {
  return (
    <Form.Item
      rules={[{ required: true }]}
      name={param.name}
      label={param.name}
    >
      {widgetsMap[param.model?.type!] || widgetsMap.text}
    </Form.Item>
  )
}
