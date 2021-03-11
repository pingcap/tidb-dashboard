import React from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 14 },
}

const buttonItemLayout = {
  wrapperCol: { span: 14, offset: 4 },
}

export default function ApiForm() {
  const [form] = Form.useForm()
  const { t } = useTranslation()

  return (
    <Form {...formItemLayout} layout="horizontal" form={form}>
      <Form.Item rules={[{ required: true }]} label="TiDB_IP">
        <Input />
      </Form.Item>
      <Form.Item {...buttonItemLayout}>
        <Button type="primary" icon={<DownloadOutlined />}>
          {t('debug_api.form.download')}
        </Button>
      </Form.Item>
    </Form>
  )
}
