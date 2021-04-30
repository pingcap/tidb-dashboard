import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Button } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import client, { DebugapiEndpointAPI } from '@lib/client'
import { IApiFormWidgetConfig, widgetsMap } from './ApiFormWidgets'

const formItemLayout = {
  labelCol: { offset: 1 },
  wrapperCol: { offset: 1 },
}

const buttonItemLayout = {
  wrapperCol: { offset: 1 },
}

export default function ApiForm({
  endpoint,
}: {
  endpoint: DebugapiEndpointAPI
}) {
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const { id, host, segment, query } = endpoint
  const params = [host!, ...(segment ?? []), ...(query ?? [])]
  const [loading, setLoading] = useState(false)

  const download = useCallback(
    async (values: any) => {
      let data: string
      let headers: any
      try {
        setLoading(true)
        const resp = await client.getInstance().debugapiEndpointPost({
          query: { ...values, id },
        })
        data = resp.data
        headers = resp.headers
      } catch (e) {
        setLoading(false)
        return
      }

      const blob = new Blob([data], { type: headers['content-type'] })
      const link = document.createElement('a')
      const fileName = `${id}_${Date.now()}.json`

      // quick view backdoor
      blob.text().then((t) => console.log(t))

      link.href = window.URL.createObjectURL(blob)
      link.download = fileName
      link.click()
      window.URL.revokeObjectURL(link.href)

      setLoading(false)
    },
    [id]
  )

  return (
    <Form {...formItemLayout} layout="vertical" form={form} onFinish={download}>
      {params.map((param) => (
        <ApiFormItem
          key={param.name}
          endpoint={endpoint}
          param={param}
        ></ApiFormItem>
      ))}
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

function ApiFormItem({ param, endpoint }: IApiFormWidgetConfig) {
  return (
    <Form.Item
      rules={[{ required: true }]}
      name={param.name}
      label={param.name}
    >
      {(widgetsMap[param.model?.type!] || widgetsMap.text)({ param, endpoint })}
    </Form.Item>
  )
}
