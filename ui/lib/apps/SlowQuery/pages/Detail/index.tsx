import React from 'react'
import { Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useLocalStorageState } from 'ahooks'

import client from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { buildQueryFn, parseQueryFn } from '@lib/utils/query'
import formatSql from '@lib/utils/sqlFormatter'
import {
  AnimatedSkeleton,
  CardTabs,
  CopyLink,
  Descriptions,
  ErrorBar,
  Expand,
  Head,
  HighlightSQL,
  Pre,
  TextWithInfo,
} from '@lib/components'
import TabBasic from './DetailTabBasic'
import TabTime from './DetailTabTime'
import TabCopr from './DetailTabCopr'
import TabTxn from './DetailTabTxn'

export interface IPageQuery {
  connectId?: string
  digest?: string
  timestamp?: number
}

const SLOW_QUERY_DETAIL_EXPAND = 'slow_query.detail_expand'

function DetailPage() {
  const query = DetailPage.parseQuery(useLocation().search)

  const { t } = useTranslation()

  const { data, isLoading, error } = useClientRequest((reqConfig) =>
    client
      .getInstance()
      .slowQueryDetailGet(
        query.connectId!,
        query.digest!,
        query.timestamp!,
        reqConfig
      )
  )

  const [detailExpand, setDetailExpand] = useLocalStorageState(
    SLOW_QUERY_DETAIL_EXPAND,
    {
      prev_query: false,
      query: false,
      plan: false,
    }
  )

  const togglePrevQuery = () =>
    setDetailExpand((prev) => ({ ...prev, prev_query: !prev.prev_query }))
  const toggleQuery = () =>
    setDetailExpand((prev) => ({ ...prev, query: !prev.query }))
  const togglePlan = () =>
    setDetailExpand((prev) => ({ ...prev, plan: !prev.plan }))

  const tabs = [
    {
      key: 'basic',
      title: t('slow_query.detail.tabs.basic'),
      content: () => <TabBasic data={data!} />,
    },
    {
      key: 'time',
      title: t('slow_query.detail.tabs.time'),
      content: () => <TabTime data={data!} />,
    },
    {
      key: 'copr',
      title: t('slow_query.detail.tabs.copr'),
      content: () => <TabCopr data={data!} />,
    },
    {
      key: 'txn',
      title: t('slow_query.detail.tabs.txn'),
      content: () => <TabTxn data={data!} />,
    },
  ]

  return (
    <div>
      <Head title={t('slow_query.detail.head.title')}>
        <AnimatedSkeleton showSkeleton={isLoading}>
          {error && <ErrorBar errors={[error]} />}
          {!!data && (
            <>
              <Descriptions>
                <Descriptions.Item
                  span={2}
                  multiline={detailExpand.query}
                  label={
                    <Space size="middle">
                      <TextWithInfo.TransKey transKey="slow_query.detail.head.sql" />
                      <Expand.Link
                        expanded={detailExpand.query}
                        onClick={toggleQuery}
                      />
                      <CopyLink
                        displayVariant="formatted_sql"
                        data={formatSql(data.query!)}
                      />
                      <CopyLink
                        displayVariant="original_sql"
                        data={data.query!}
                      />
                    </Space>
                  }
                >
                  <Expand
                    expanded={detailExpand.query}
                    collapsedContent={
                      <HighlightSQL sql={data.query!} compact />
                    }
                  >
                    <HighlightSQL sql={data.query!} />
                  </Expand>
                </Descriptions.Item>
                {(() => {
                  if (!!data.prev_stmt && data.prev_stmt.length !== 0)
                    return (
                      <Descriptions.Item
                        span={2}
                        multiline={detailExpand.prev_query}
                        label={
                          <Space size="middle">
                            <TextWithInfo.TransKey transKey="slow_query.detail.head.previous_sql" />
                            <Expand.Link
                              expanded={detailExpand.prev_query}
                              onClick={togglePrevQuery}
                            />
                            <CopyLink
                              displayVariant="formatted_sql"
                              data={formatSql(data.prev_stmt!)}
                            />
                            <CopyLink
                              displayVariant="original_sql"
                              data={data.prev_stmt!}
                            />
                          </Space>
                        }
                      >
                        <Expand
                          expanded={detailExpand.prev_query}
                          collapsedContent={
                            <HighlightSQL sql={data.prev_stmt!} compact />
                          }
                        >
                          <HighlightSQL sql={data.prev_stmt!} />
                        </Expand>
                      </Descriptions.Item>
                    )
                })()}
                <Descriptions.Item
                  span={2}
                  multiline={detailExpand.plan}
                  label={
                    <Space size="middle">
                      <TextWithInfo.TransKey transKey="slow_query.detail.head.plan" />
                      <Expand.Link
                        expanded={detailExpand.plan}
                        onClick={togglePlan}
                      />
                      <CopyLink data={data.plan ?? ''} />
                    </Space>
                  }
                >
                  <Expand expanded={detailExpand.plan}>
                    <Pre noWrap>{data.plan}</Pre>
                  </Expand>
                </Descriptions.Item>
              </Descriptions>

              <CardTabs animated={false} tabs={tabs} />
            </>
          )}
        </AnimatedSkeleton>
      </Head>
    </div>
  )
}

DetailPage.buildQuery = buildQueryFn<IPageQuery>()
DetailPage.parseQuery = parseQueryFn<IPageQuery>()

export default DetailPage
