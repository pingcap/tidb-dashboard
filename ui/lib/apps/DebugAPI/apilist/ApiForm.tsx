import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Button, Space, Tooltip, Row, Col } from 'antd'
import { DownloadOutlined, UndoOutlined } from '@ant-design/icons'
import client, {
  DebugapiEndpointAPIModel,
  DebugapiEndpointAPIParam,
  TopologyTiDBInfo,
} from '@lib/client'
import {
  ApiFormWidgetConfig,
  paramWidgets,
  paramModelWidgets,
} from './ApiFormWidgets'

export interface Topology {
  tidb: TopologyTiDBInfo[]
}

export default function ApiForm({
  endpoint,
  topology,
}: {
  endpoint: DebugapiEndpointAPIModel
  topology: Topology
}) {
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const { id, path_params, query_params, component } = endpoint
  const endpointHostParamKey = useMemo(() => `${component}_host`, [component])
  const params = [...(path_params ?? []), ...(query_params ?? [])]
  const [loading, setLoading] = useState(false)

  const download = useCallback(
    async (values: any) => {
      let data: string
      let headers: any
      try {
        setLoading(true)
        const { [endpointHostParamKey]: host, ...params } = values
        const [hostname, port] = host.split(':')
        const resp = await client.getInstance().debugapiRequestEndpointPost({
          id,
          host: hostname,
          port: Number(port),
          params,
        })
        data = resp.data
        headers = resp.headers
      } catch (e) {
        setLoading(false)
        console.error(e)
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
    [id, endpointHostParamKey]
  )

  const endpointParam = useMemo<DebugapiEndpointAPIParam>(
    () => ({
      name: endpointHostParamKey,
      model: {
        type: 'host',
      },
    }),
    [endpointHostParamKey]
  )
  const EndpointHost = () => (
    <ApiFormItem
      key={endpointParam.name}
      endpoint={endpoint}
      param={endpointParam}
      topology={topology}
    ></ApiFormItem>
  )

  return (
    <Form layout="vertical" form={form} onFinish={download}>
      <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
        <FormItemCol>
          <EndpointHost />
        </FormItemCol>
        {params.map((param) => (
          <FormItemCol>
            <ApiFormItem
              key={param.name}
              endpoint={endpoint}
              param={param}
              topology={topology}
            ></ApiFormItem>
          </FormItemCol>
        ))}
      </Row>
      <Form.Item>
        <Space>
          <Button
            type="primary"
            loading={loading}
            icon={<DownloadOutlined />}
            htmlType="submit"
          >
            {t('debug_api.form.download')}
          </Button>
          <Tooltip title={t('debug_api.form.reset')}>
            <Button
              icon={<UndoOutlined />}
              htmlType="button"
              onClick={() => form.resetFields()}
            />
          </Tooltip>
        </Space>
      </Form.Item>
    </Form>
  )
}

function FormItemCol(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Col span={24} md={12} xl={8} xxl={6}>
      {props.children}
    </Col>
  )
}

function ApiFormItem({ param, endpoint, topology }: ApiFormWidgetConfig) {
  let widget =
    paramWidgets[param.name!] ||
    paramModelWidgets[param.model?.type!] ||
    paramModelWidgets.text

  return (
    <Form.Item
      rules={[{ required: true }]}
      name={param.name}
      label={param.name}
    >
      {widget({
        param,
        endpoint,
        topology,
      })}
    </Form.Item>
  )
}
