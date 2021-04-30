import React, { useMemo } from 'react'
import { Collapse, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'

import { AnimatedSkeleton, Card } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client, { DebugapiEndpointAPI } from '@lib/client'

import style from './ApiList.module.less'
import ApiForm from './ApiForm'

const CustomHeader = ({
  endpoint,
  t,
}: {
  endpoint: DebugapiEndpointAPI
  t: TFunction
}) => {
  return (
    <div className={style.header}>
      <Space direction="vertical">
        <Space>
          <h4>
            {t(`debug_api.${endpoint.component}.endpoint_ids.${endpoint.id}`)}
          </h4>
        </Space>
        <Schema endpoint={endpoint} />
      </Space>
    </div>
  )
}

// e.g. http://{tidb_ip}/stats/dump/{db}/{table}?queryName={queryName}
const Schema = ({ endpoint }: { endpoint: DebugapiEndpointAPI }) => {
  const query =
    endpoint.query?.reduce((prev, { name }, i) => {
      if (i === 0) {
        prev += '?'
      }
      prev += `${name}={${name}}`
      return prev
    }, '') || ''
  return (
    <p className={style.schema}>
      {`http://{${endpoint.host?.name}}${endpoint.path}${query}`}
    </p>
  )
}

const groupSorts = ['tidb', 'tikv', 'tiflash', 'pd']

export default function Page() {
  const { t } = useTranslation()
  const { data, isLoading } = useClientRequest((reqConfig) =>
    client.getInstance().debugapiEndpointsGet(reqConfig)
  )
  const groups = useMemo(
    () =>
      data?.reduce((prev, endpoint) => {
        const groupName = endpoint.component!
        if (!prev[groupName]) {
          prev[groupName] = []
        }
        prev[groupName].push(endpoint)
        return prev
      }, {} as { [group: string]: DebugapiEndpointAPI[] }),
    [data]
  )

  return (
    <AnimatedSkeleton showSkeleton={isLoading}>
      {groups &&
        groupSorts
          .filter((sortKey) => groups[sortKey])
          .map((sortKey) => {
            const g = groups[sortKey]
            return (
              <Card key={sortKey} title={t(`debug_api.${sortKey}.name`)}>
                <Collapse ghost>
                  {g.map((endpoint) => (
                    <Collapse.Panel
                      className={style.collapse_panel}
                      header={<CustomHeader endpoint={endpoint} t={t} />}
                      key={endpoint.id!}
                    >
                      <ApiForm endpoint={endpoint} />
                    </Collapse.Panel>
                  ))}
                </Collapse>
              </Card>
            )
          })}
    </AnimatedSkeleton>
  )
}
