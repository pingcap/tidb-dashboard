import React, { useCallback } from 'react'
import { Input, Select } from 'antd'
import client, {
  DebugapiEndpointAPI,
  DebugapiEndpointAPIParam,
} from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'

export interface IApiFormWidget {
  (config: IApiFormWidgetConfig): JSX.Element
}

export interface IApiFormWidgetConfig {
  param: DebugapiEndpointAPIParam
  endpoint: DebugapiEndpointAPI
}

// TODO: multi component type support
const IPPortSelect: IApiFormWidget = ({ endpoint }) => {
  // TODO: cache maybe
  const { data, error, isLoading } = useClientRequest((reqConfig) =>
    client.getInstance().getTiDBTopology(reqConfig)
  )

  // TODO: restrict to one option only
  const handleChange = useCallback((val: string[]) => {
    // console.log(val)
    // if (val.length > 1) {
    //   return
    // }
  }, [])

  return (
    <Select
      mode="tags"
      loading={isLoading}
      placeholder={`Please select or enter the ${endpoint.component} ip with status port`}
      onChange={handleChange}
    >
      {!error &&
        data?.map((d) => {
          const val = `${d.ip}:${d.status_port}`
          return (
            <Select.Option key={val} value={val}>
              {val}
            </Select.Option>
          )
        })}
    </Select>
  )
}

export const widgetsMap: { [type: string]: IApiFormWidget } = {
  text: ({ param }) => <Input placeholder={`Please enter the ${param.name}`} />,
  ip_port: IPPortSelect,
}
