import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Button } from 'antd'
import { useRequest } from 'ahooks'
import { DownloadOutlined } from '@ant-design/icons'
import client, { SchemaEndpointAPI, SchemaEndpointAPIParam } from '@lib/client'
import { widgetsMap } from './ApiFormWidgets'

const formItemLayout = {
  labelCol: { offset: 1 },
  wrapperCol: { offset: 1 },
}

const buttonItemLayout = {
  wrapperCol: { offset: 1 },
}

export default function ApiForm({ endpoint }: { endpoint: SchemaEndpointAPI }) {
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const { id, host, segment, query } = endpoint
  const params = [host!, ...(segment ?? []), ...(query ?? [])]

  const {
    data,
    loading,
    error,
    run,
  } = useRequest(
    client.getInstance().debugapiProxyGet.bind(client.getInstance()),
    { manual: true }
  )
  const download = useCallback(
    async (values: any) => {
      const { data, headers } = await run({
        responseType: 'blob',
        query: { ...values, id },
      })

      const blob = new Blob([data], { type: headers['content-type'] })
      const link = document.createElement('a')
      const fileName = `${id}_${Date.now()}.json`

      // quick view backdoor
      blob.text().then((t) => console.log(t))

      link.href = window.URL.createObjectURL(blob)
      link.download = fileName
      link.click()
      window.URL.revokeObjectURL(link.href)
    },
    [id, run]
  )

  return (
    <Form {...formItemLayout} layout="vertical" form={form} onFinish={download}>
      {params.map((param) => (
        <ApiFormItem key={param.name} param={param}></ApiFormItem>
      ))}
      <p>{error?.message && data}</p>
      <Form.Item {...buttonItemLayout}>
        <Button
          type="primary"
          loading={loading}
          icon={<DownloadOutlined />}
          htmlType="submit"
        >
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
