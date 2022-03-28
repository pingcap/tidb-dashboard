import React, { useEffect, useState } from 'react'
import { Space, Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'

import client from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { buildQueryFn, parseQueryFn } from '@lib/utils/query'
import formatSql from '@lib/utils/sqlFormatter'
import {
  AnimatedSkeleton,
  CopyLink,
  Descriptions,
  ErrorBar,
  Expand,
  Head,
  HighlightSQL,
  Pre,
  TextWithInfo,
  TreeDiagram,
} from '@lib/components'
import { useLocalStorageState } from '@lib/utils/useLocalStorageState'

import DetailTabs from './DetailTabs'
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

  const [vpVisible, setVpVisable] = useState(false)

  const openVisualPlan = () => {
    setVpVisable(!vpVisible)
  }

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
                {(() => {
                  if (data.plan)
                    return (
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
                    )
                })()}

                {(() => {
                  if (data.visual_plan)
                    return (
                      <Descriptions.Item
                        span={2}
                        label={
                          <Space size="middle" onClick={openVisualPlan}>
                            <TextWithInfo.TransKey transKey="slow_query.detail.head.tree_diagram" />
                          </Space>
                        }
                      >
                        <Modal
                          title="Visual Plan Tree Diagram"
                          centered
                          visible={vpVisible}
                          width={window.innerWidth}
                          onCancel={openVisualPlan}
                          footer={null}
                          bodyStyle={{ background: '#f5f5f5' }}
                        >
                          <TreeDiagram
                            data={JSON.parse(data.visual_plan).main}
                          />
                        </Modal>
                      </Descriptions.Item>
                    )
                })()}
              </Descriptions>
              <DetailTabs data={data} />
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
