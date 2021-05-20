import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Button, Space, Tooltip, Row, Col } from 'antd'
import { isNull, isUndefined } from 'lodash'
import { DownloadOutlined, UndoOutlined } from '@ant-design/icons'
import client, {
  DebugapiEndpointAPIModel,
  DebugapiEndpointAPIParam,
  TopologyPDInfo,
  TopologyStoreInfo,
  TopologyTiDBInfo,
} from '@lib/client'
import { ApiFormWidgetConfig, paramWidgets, paramModelWidgets } from './widgets'

export interface Topology {
  tidb: TopologyTiDBInfo[]
  tikv: TopologyStoreInfo[]
  tiflash: TopologyStoreInfo[]
  pd: TopologyPDInfo[]
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
  const pathParams = (path_params ?? []).map((p) => {
    p.required = true
    return p
  })
  const params = [...pathParams, ...(query_params ?? [])]
  const [loading, setLoading] = useState(false)

  const download = useCallback(
    async (values: any) => {
      let data: string
      let headers: any
      try {
        setLoading(true)
        const { [endpointHostParamKey]: host, ...p } = values
        const [hostname, port] = host.split(':')
        const params = Object.entries(p).reduce((prev, [k, v]) => {
          if (!(isUndefined(v) || isNull(v) || v === '')) {
            prev[k] = v
          }
          return prev
        }, {})
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
      required: true,
      model: {
        type: 'host',
      },
    }),
    [endpointHostParamKey]
  )
  const EndpointHost = () => (
    <ApiFormItem
      key={endpointParam.name}
      form={form}
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
          <FormItemCol key={param.name}>
            <ApiFormItem
              form={form}
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

function ApiFormItem(widgetConfig: ApiFormWidgetConfig) {
  const { param } = widgetConfig
  let widget =
    paramWidgets[param.name!] ||
    paramModelWidgets[param.model?.type!] ||
    paramModelWidgets.text

  return (
    <Form.Item
      rules={[{ required: !!param.required }]}
      name={param.name}
      label={param.name}
    >
      {widget(widgetConfig)}
    </Form.Item>
  )
}
