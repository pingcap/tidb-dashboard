import React from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { parseQueryFn, buildQueryFn } from '@lib/utils/query'
import client from '@lib/client'
import { Skeleton, Space, Alert } from 'antd'
import {
  Head,
  Descriptions,
  TextWithInfo,
  Pre,
  HighlightSQL,
  Expand,
} from '@lib/components'
import { useToggle } from '@umijs/hooks'
import CopyLink from '@lib/components/CopyLink'
import formatSql from '@lib/utils/formatSql'
import CardTabs from '@lib/components/CardTabs'
import TabBasic from './DetailTabBasic'
import TabTime from './DetailTabTime'
import TabCopr from './DetailTabCopr'
import TabTxn from './DetailTabTxn'

export interface IPageQuery {
  connectId?: number
  digest?: string
  time?: number
}

function DetailPage() {
  const query = DetailPage.parseQuery(useLocation().search)

  const { t } = useTranslation()

  const { data, isLoading } = useClientRequest((cancelToken) =>
    client
      .getInstance()
      .slowQueryDetailGet(query.connectId!, query.digest!, query.time!, {
        cancelToken,
      })
  )

  const { state: sqlExpanded, toggle: toggleSqlExpanded } = useToggle(false)
  const { state: prevSqlExpanded, toggle: togglePrevSqlExpanded } = useToggle(
    false
  )
  const { state: planExpanded, toggle: togglePlanExpanded } = useToggle(false)

  return (
    <div>
      <Head
        title={t('slow_query.detail.head.title')}
        back={
          <Link to={`/slow_query`}>
            <ArrowLeftOutlined /> {t('slow_query.detail.head.back')}
          </Link>
        }
      >
        {isLoading && <Skeleton active />}
        {!isLoading && !data && <Alert message="Error" type="error" showIcon />}
        {!isLoading && !!data && (
          <>
            <Descriptions>
              <Descriptions.Item
                span={2}
                multiline={sqlExpanded}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="slow_query.detail.head.sql" />
                    <Expand.Link
                      expanded={sqlExpanded}
                      onClick={() => toggleSqlExpanded()}
                    />
                    <CopyLink data={formatSql(data.query!)} />
                  </Space>
                }
              >
                <Expand
                  expanded={sqlExpanded}
                  collapsedContent={<HighlightSQL sql={data.query!} compact />}
                >
                  <HighlightSQL sql={data.query!} />
                </Expand>
              </Descriptions.Item>
              {(() => {
                if (!!data.prev_stmt && data.prev_stmt.length !== 0)
                  return (
                    <Descriptions.Item
                      span={2}
                      multiline={prevSqlExpanded}
                      label={
                        <Space size="middle">
                          <TextWithInfo.TransKey transKey="slow_query.detail.head.previous_sql" />
                          <Expand.Link
                            expanded={prevSqlExpanded}
                            onClick={() => togglePrevSqlExpanded()}
                          />
                          <CopyLink data={formatSql(data.prev_stmt!)} />
                        </Space>
                      }
                    >
                      <Expand
                        expanded={prevSqlExpanded}
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
                multiline={planExpanded}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="slow_query.detail.head.plan" />
                    <Expand.Link
                      expanded={planExpanded}
                      onClick={() => togglePlanExpanded()}
                    />
                    <CopyLink data={data.plan ?? ''} />
                  </Space>
                }
              >
                <Expand expanded={planExpanded}>
                  <Pre noWrap>{data.plan}</Pre>
                </Expand>
              </Descriptions.Item>
            </Descriptions>
            <CardTabs animated={false}>
              <CardTabs.TabPane
                tab={t('slow_query.detail.tabs.basic')}
                key="basic"
              >
                <TabBasic data={data} />
              </CardTabs.TabPane>
              <CardTabs.TabPane
                tab={t('slow_query.detail.tabs.time')}
                key="time"
              >
                <TabTime data={data} />
              </CardTabs.TabPane>
              <CardTabs.TabPane
                tab={t('slow_query.detail.tabs.copr')}
                key="copr"
              >
                <TabCopr data={data} />
              </CardTabs.TabPane>
              <CardTabs.TabPane tab={t('slow_query.detail.tabs.txn')} key="txn">
                <TabTxn data={data} />
              </CardTabs.TabPane>
            </CardTabs>
          </>
        )}
      </Head>
    </div>
  )
}

DetailPage.buildQuery = buildQueryFn<IPageQuery>()
DetailPage.parseQuery = parseQueryFn<IPageQuery>()

export default DetailPage
