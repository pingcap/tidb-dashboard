import React, { useEffect, useMemo, useState } from 'react'
import { Collapse, Space, Input, Empty, Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { SearchOutlined } from '@ant-design/icons'
import { debounce } from 'lodash'

import { AnimatedSkeleton, Card } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client, { DebugapiEndpointAPIModel } from '@lib/client'

import style from './ApiList.module.less'
import ApiForm, { Topology } from './ApiForm'

const useFilterEndpoints = (endpoints?: DebugapiEndpointAPIModel[]) => {
  const [keywords, setKeywords] = useState('')
  const nonNullEndpoints = useMemo(() => endpoints || [], [endpoints])
  const [filteredEndpoints, setFilteredEndpoints] = useState<
    DebugapiEndpointAPIModel[]
  >(nonNullEndpoints)

  useEffect(() => {
    const k = keywords.trim()
    if (!!k) {
      setFilteredEndpoints(
        nonNullEndpoints.filter((e) => e.id?.includes(k) || e.path?.includes(k))
      )
    } else {
      setFilteredEndpoints(nonNullEndpoints)
    }
  }, [nonNullEndpoints, keywords])

  return {
    endpoints: filteredEndpoints,
    filterBy: debounce(setKeywords, 300),
  }
}

export default function Page() {
  const { t } = useTranslation()
  const {
    data: endpointData,
    isLoading: isEndpointLoading,
  } = useClientRequest((reqConfig) =>
    client.getInstance().debugapiEndpointsGet(reqConfig)
  )
  const { endpoints, filterBy } = useFilterEndpoints(endpointData)

  const groups = useMemo(
    () =>
      endpoints.reduce((prev, endpoint) => {
        const groupName = endpoint.component!
        if (!prev[groupName]) {
          prev[groupName] = []
        }
        prev[groupName].push(endpoint)
        return prev
      }, {} as { [group: string]: DebugapiEndpointAPIModel[] }),
    [endpoints]
  )
  const sortingOfGroups = useMemo(() => ['tidb', 'tikv', 'tiflash', 'pd'], [])
  // TODO: other components topology
  const {
    data: tidbTopology = [],
    isLoading: isTopologyLoading,
  } = useClientRequest((reqConfig) =>
    client.getInstance().getTiDBTopology(reqConfig)
  )
  const topology: Topology = {
    tidb: tidbTopology!,
  }

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
                      <ApiForm endpoint={endpoint} topology={topology} />
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
    <AnimatedSkeleton showSkeleton={isEndpointLoading || isTopologyLoading}>
      <Card>
        <Alert
          message={t(`debug_api.warning_header.title`)}
          description={t(`debug_api.warning_header.body`)}
          type="warning"
          showIcon
        />
      </Card>
      <Card>
        <Input
          placeholder={t(`debug_api.keyword_search`)}
          prefix={<SearchOutlined />}
          onChange={(e) => filterBy(e.target.value)}
        />
      </Card>
      <EndpointGroups />
    </AnimatedSkeleton>
  )
}

function CustomHeader({
  endpoint,
  t,
}: {
  endpoint: DebugapiEndpointAPIModel
  t: TFunction
}) {
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
function Schema({ endpoint }: { endpoint: DebugapiEndpointAPIModel }) {
  const query =
    endpoint.query_params?.reduce((prev, { name }, i) => {
      if (i === 0) {
        prev += '?'
      }
      prev += `${name}={${name}}`
      return prev
    }, '') || ''
  return (
    <p className={style.schema}>
      {`http://{${endpoint.component}_host}${endpoint.path}${query}`}
    </p>
  )
}
