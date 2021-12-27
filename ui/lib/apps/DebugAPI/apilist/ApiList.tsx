import React, { useEffect, useMemo, useState } from 'react'
import { Collapse, Space, Input, Empty, Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { SearchOutlined } from '@ant-design/icons'
import { debounce } from 'lodash'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'

import { AnimatedSkeleton, Card, Root } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client, { EndpointAPIDefinition } from '@lib/client'

import style from './ApiList.module.less'
import ApiForm, { Topology } from './ApiForm'
import { buildQueryString } from './widgets'
import { distro } from '@lib/utils/i18n'

const getEndpointTranslationKey = (endpoint: EndpointAPIDefinition) =>
  `debug_api.${endpoint.component}.endpoints.${endpoint.id}`

const useFilterEndpoints = (endpoints?: EndpointAPIDefinition[]) => {
  const [keywords, setKeywords] = useState('')
  const nonNullEndpoints = useMemo(() => endpoints || [], [endpoints])
  const [filteredEndpoints, setFilteredEndpoints] =
    useState<EndpointAPIDefinition[]>(nonNullEndpoints)
  const { t } = useTranslation()

  useEffect(() => {
    const k = keywords.trim()
    if (!!k) {
      setFilteredEndpoints(
        nonNullEndpoints.filter((e) => {
          return (
            e.id?.includes(k) ||
            e.path?.includes(k) ||
            t(getEndpointTranslationKey(e)).includes(k)
          )
        })
      )
    } else {
      setFilteredEndpoints(nonNullEndpoints)
    }
  }, [nonNullEndpoints, keywords, t])

  return {
    endpoints: filteredEndpoints,
    filterBy: debounce(setKeywords, 100),
  }
}

export default function Page() {
  const { t, i18n } = useTranslation()
  const { data: endpointData, isLoading: isEndpointLoading } = useClientRequest(
    (reqConfig) => client.getInstance().debugAPIGetEndpoints(reqConfig)
  )
  const { endpoints, filterBy } = useFilterEndpoints(endpointData)

  // TODO: refine with components/InstanceSelect
  const { data: tidbTopology = [], isLoading: isTiDBTopology } =
    useClientRequest((reqConfig) =>
      client.getInstance().getTiDBTopology(reqConfig)
    )
  const { data: pdTopology = [], isLoading: isPDLoading } = useClientRequest(
    (reqConfig) => client.getInstance().getPDTopology(reqConfig)
  )
  const { data: storeTopology, isLoading: isStoreLoading } = useClientRequest(
    (reqConfig) => client.getInstance().getStoreTopology(reqConfig)
  )
  const topology: Topology = {
    tidb: tidbTopology!,
    tikv: storeTopology?.tikv || [],
    tiflash: storeTopology?.tiflash || [],
    pd: pdTopology!,
  }
  const isTopologyLoading = isTiDBTopology || isPDLoading || isStoreLoading

  const groups = useMemo(
    () =>
      endpoints.reduce((prev, endpoint) => {
        const groupName = endpoint.component!
        if (!prev[groupName]) {
          prev[groupName] = []
        }
        prev[groupName].push(endpoint)
        return prev
      }, {} as { [group: string]: EndpointAPIDefinition[] }),
    [endpoints]
  )
  const sortedGroups = useMemo(
    () =>
      ['tidb', 'tikv', 'tiflash', 'pd']
        .filter((sortKey) => groups[sortKey])
        .map((sortKey) => groups[sortKey]),
    [groups]
  )

  function EndpointGroup({ group }: { group: EndpointAPIDefinition[] }) {
    return (
      <Card
        noMarginLeft
        noMarginRight
        noMarginTop
        title={t(`debug_api.${group[0].component!}.name`)}
      >
        <Collapse ghost>
          {group.map((endpoint) => {
            const descTranslationKey = `debug_api.${endpoint.component}.endpoints.${endpoint.id}_desc`
            const descExists = i18n.exists(descTranslationKey)

            return (
              <Collapse.Panel
                className={style.collapse_panel}
                header={
                  <CustomHeader endpoint={endpoint} translation={{ t }} />
                }
                key={endpoint.id!}
              >
                {descExists && (
                  <Alert
                    style={{ marginBottom: 16 }}
                    message={t(descTranslationKey)}
                    type="info"
                    showIcon
                  />
                )}
                <ApiForm endpoint={endpoint} topology={topology} />
              </Collapse.Panel>
            )
          })}
        </Collapse>
      </Card>
    )
  }

  return (
    <Root>
      <ScrollablePane style={{ height: '100vh' }}>
        <Card noMarginBottom>
          <Alert
            message={t(`debug_api.warning_header.title`)}
            description={t(`debug_api.warning_header.body`)}
            type="warning"
            showIcon
          />
        </Card>
        <Sticky stickyPosition={StickyPositionType.Header} isScrollSynced>
          <div style={{ display: 'flow-root' }}>
            <Card>
              <Input
                placeholder={t(`debug_api.keyword_search`)}
                prefix={<SearchOutlined />}
                onChange={(e) => filterBy(e.target.value)}
              />
            </Card>
          </div>
        </Sticky>
        <Card noMarginTop>
          <AnimatedSkeleton
            showSkeleton={isEndpointLoading || isTopologyLoading}
          >
            {endpoints.length ? (
              sortedGroups.map((g) => (
                <EndpointGroup key={g[0].component!} group={g} />
              ))
            ) : (
              <Empty description={t('debug_api.endpoints_not_found')} />
            )}
          </AnimatedSkeleton>
        </Card>
      </ScrollablePane>
    </Root>
  )
}

function CustomHeader({
  endpoint,
  translation,
}: {
  endpoint: EndpointAPIDefinition
  translation: {
    t: TFunction
  }
}) {
  const { t } = translation
  return (
    <div className={style.header}>
      <Space direction="vertical">
        <Space>
          <h4>{t(getEndpointTranslationKey(endpoint))}</h4>
        </Space>
        <Schema endpoint={endpoint} />
      </Space>
    </div>
  )
}

// e.g. http://{tidb_ip}/stats/dump/{db}/{table}?queryName={queryName}
function Schema({ endpoint }: { endpoint: EndpointAPIDefinition }) {
  const query = buildQueryString(endpoint.query_params ?? [])
  return (
    <p className={style.schema}>
      {`http://{${distro[endpoint.component!]?.toLowerCase()}_instance}${
        endpoint.path
      }${query}`}
    </p>
  )
}
