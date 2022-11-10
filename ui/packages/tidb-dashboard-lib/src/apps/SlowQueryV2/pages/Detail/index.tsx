import React, { useState, useContext } from 'react'
import { Space, Modal, Tabs } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'

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
  TextWithInfo
} from '@lib/components'
import { useVersionedLocalStorageState } from '@lib/utils/useVersionedLocalStorageState'
import { telemetry } from '../../utils/telemetry'

import DetailTabs from './DetailTabs'
import { SlowQueryContext } from '../../context'

import {
  VisualPlanThumbnailView,
  VisualPlanView
} from '@lib/components/VisualPlan'

export interface IPageQuery {
  connectId?: string
  digest?: string
  timestamp?: number
}

const SLOW_QUERY_DETAIL_EXPAND = 'slow_query.detail_expand'

function DetailPage() {
  const ctx = useContext(SlowQueryContext)

  const query = DetailPage.parseQuery(useLocation().search)

  const { t } = useTranslation()

  const { data, isLoading, error } = useClientRequest((reqConfig) =>
    ctx!.ds.slowQueryDetailGet(
      query.connectId!,
      query.digest!,
      query.timestamp!,
      reqConfig
    )
  )

  const binaryPlan = data?.binary_plan && JSON.parse(data.binary_plan)

  const [detailExpand, setDetailExpand] = useVersionedLocalStorageState(
    SLOW_QUERY_DETAIL_EXPAND,
    {
      defaultValue: {
        prev_query: false,
        query: false,
        plan: false
      }
    }
  )

  const togglePrevQuery = () =>
    setDetailExpand((prev) => ({ ...prev, prev_query: !prev.prev_query }))
  const toggleQuery = () =>
    setDetailExpand((prev) => ({ ...prev, query: !prev.query }))
  const togglePlan = () =>
    setDetailExpand((prev) => ({ ...prev, plan: !prev.plan }))

  const [isVpVisible, setIsVpVisable] = useState(false)
  const toggleVisualPlan = (action: 'open' | 'close') => {
    telemetry.toggleVisualPlanModal(action)
    setIsVpVisable(!isVpVisible)
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
              </Descriptions>
              {(binaryPlan || !!data.plan) && (
                <>
                  <Space size="middle" style={{ color: '#8c8c8c' }}>
                    {t('slow_query.detail.plan.title')}
                  </Space>
                  <Tabs
                    defaultActiveKey={
                      binaryPlan && !binaryPlan.main.discardedDueToTooLong
                        ? 'binary_plan'
                        : 'text_plan'
                    }
                    onTabClick={(key) =>
                      telemetry.clickPlanTabs(key, data.digest!)
                    }
                  >
                    {binaryPlan && !binaryPlan.main.discardedDueToTooLong && (
                      <Tabs.TabPane
                        tab={t('slow_query.detail.plan.visual')}
                        key="binary_plan"
                      >
                        <Modal
                          title={t('slow_query.detail.plan.modal_title')}
                          centered
                          visible={isVpVisible}
                          width={window.innerWidth}
                          onCancel={() => toggleVisualPlan('close')}
                          footer={null}
                          destroyOnClose={true}
                          bodyStyle={{
                            background: '#f5f5f5',
                            height: window.innerHeight - 100
                          }}
                        >
                          <VisualPlanView data={binaryPlan} />
                        </Modal>
                        <Descriptions>
                          <Descriptions.Item span={2}>
                            <div onClick={() => toggleVisualPlan('open')}>
                              <VisualPlanThumbnailView data={binaryPlan} />
                            </div>
                          </Descriptions.Item>
                        </Descriptions>
                      </Tabs.TabPane>
                    )}

                    <Tabs.TabPane
                      tab={t('slow_query.detail.plan.text')}
                      key="text_plan"
                    >
                      <Descriptions>
                        <Descriptions.Item
                          span={2}
                          multiline={detailExpand.plan}
                          label={
                            <Space size="middle">
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
                    </Tabs.TabPane>
                  </Tabs>
                </>
              )}
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
