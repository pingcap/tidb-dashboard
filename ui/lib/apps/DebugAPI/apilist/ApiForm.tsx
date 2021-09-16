import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Button, Space, Row, Col } from 'antd'
import { isNull, isUndefined } from 'lodash'
import { DownloadOutlined, UndoOutlined } from '@ant-design/icons'
import client, {
  EndpointAPIModel,
  EndpointAPIParam,
  TopologyPDInfo,
  TopologyStoreInfo,
  TopologyTiDBInfo,
} from '@lib/client'
import { ApiFormWidgetConfig, createFormWidget } from './widgets'
import { isConstantModel } from './widgets/Constant'
import { distro } from '@lib/utils/i18n'

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
  endpoint: EndpointAPIModel
  topology: Topology
}) {
  const { t } = useTranslation()
  const { id, path_params, query_params, component } = endpoint
  const endpointHostParamKey = useMemo(
    () => `${distro[component!]?.toLowerCase()}_host`,
    [component]
  )
  const pathParams = (path_params ?? []).map((p) => {
    p.required = true
    return p
  })
  const params = [...pathParams, ...(query_params ?? [])]
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const formPathWithoutConstant = params
    .filter((p) => !isConstantModel(p))
    .map((p) => p.name!)

  const download = useCallback(
    async (values: any) => {
      try {
        setLoading(true)
        const { [endpointHostParamKey]: host, ...p } = values
        const [hostname, port] = host.split(':')
        // filter the null value params
        const params = Object.entries(p).reduce((prev, [k, v]) => {
          if (!(isUndefined(v) || isNull(v) || v === '')) {
            prev[k] = v
          }
          return prev
        }, {})
        const resp = await client.getInstance().debugAPIRequestEndpoint({
          id,
          host: hostname,
          port: Number(port),
          params,
        })
        const token = resp.data
        window.location.href = `${client.getBasePath()}/debug_api/download?token=${token}`
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    },
    [id, endpointHostParamKey]
  )

  const endpointParam = useMemo<EndpointAPIParam>(
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
    />
  )
  useEffect(() => {
    formPathWithoutConstant.push(endpointHostParamKey)
  })

  return (
    <Form layout="vertical" form={form} onFinish={download}>
      <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
        <FormItemCol>
          <EndpointHost />
        </FormItemCol>
        {params
          // hide constant param model widget
          .filter((param) => !isConstantModel(param))
          .map((param) => (
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
          <Button
            icon={<UndoOutlined />}
            htmlType="button"
            onClick={() => form.resetFields(formPathWithoutConstant)}
          >
            {t('debug_api.form.reset')}
          </Button>
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
  return (
    <Form.Item
      rules={[{ required: !!param.required }]}
      name={param.name}
      label={param.name}
    >
      {createFormWidget(widgetConfig)}
    </Form.Item>
  )
}
