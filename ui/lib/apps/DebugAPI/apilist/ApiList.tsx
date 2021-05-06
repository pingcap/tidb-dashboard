import React, { useEffect, useMemo, useState } from 'react'
import { Collapse, Space, Input, Empty } from 'antd'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { SearchOutlined } from '@ant-design/icons'
import { debounce } from 'lodash'

import { AnimatedSkeleton, Card } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client, { DebugapiEndpointAPI } from '@lib/client'

import style from './ApiList.module.less'
import ApiForm from './ApiForm'

const useFilterEndpoints = (endpoints: DebugapiEndpointAPI[]) => {
  const [keywords, setKeywords] = useState('')
  const [filteredEndpoints, setFilteredEndpoints] = useState<
    DebugapiEndpointAPI[]
  >(endpoints)

  useEffect(() => {
    const k = keywords.trim()
    if (!!k) {
      setFilteredEndpoints(
        endpoints.filter(
          (e) =>
            e.id?.includes(k) ||
            e.host?.name?.includes(k) ||
            e.path?.includes(k)
        )
      )
    } else {
      setFilteredEndpoints(endpoints)
    }
  }, [endpoints, keywords])

  return {
    endpoints: filteredEndpoints,
    filterBy: debounce(setKeywords, 300),
  }
}

export default function Page() {
  const { t } = useTranslation()
  const sortingOfGroups = useMemo(() => ['tidb', 'tikv', 'tiflash', 'pd'], [])
  const { data, isLoading } = useClientRequest((reqConfig) =>
    client.getInstance().debugapiEndpointsGet(reqConfig)
  )
  const { endpoints, filterBy } = useFilterEndpoints(data || [])

  const groups = useMemo(
    () =>
      endpoints.reduce((prev, endpoint) => {
        const groupName = endpoint.component!
        if (!prev[groupName]) {
          prev[groupName] = []
        }
        prev[groupName].push(endpoint)
        return prev
      }, {} as { [group: string]: DebugapiEndpointAPI[] }),
    [endpoints]
  )
  const EndpointGroups = () =>
    endpoints.length ? (
      <>
        {sortingOfGroups
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
      </>
    ) : (
      <Empty description={t('debug_api.endpoints_not_found')} />
    )

  return (
    <AnimatedSkeleton showSkeleton={isLoading}>
      <Card>
        <Space>
          <Input
            placeholder={t(`debug_api.keyword_search`)}
            prefix={<SearchOutlined />}
            onChange={(e) => filterBy(e.target.value)}
          />
        </Space>
      </Card>
      <EndpointGroups />
    </AnimatedSkeleton>
  )
}

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
