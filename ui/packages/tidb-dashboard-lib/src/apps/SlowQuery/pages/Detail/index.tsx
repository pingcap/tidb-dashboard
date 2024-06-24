import React, { useState, useContext, useMemo } from 'react'
import { Space, Modal, Tabs, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'

import formatSql from '@lib/utils/sqlFormatter'
import {
  AnimatedSkeleton,
  BinaryPlanTable,
  PlanText,
  CopyLink,
  Descriptions,
  ErrorBar,
  Expand,
  Head,
  HighlightSQL,
  TextWithInfo
} from '@lib/components'
import {
  VisualPlanThumbnailView,
  VisualPlanView
} from '@lib/components/VisualPlan'
import { useVersionedLocalStorageState } from '@lib/utils/useVersionedLocalStorageState'

import DetailTabs from './DetailTabs'
import { SlowQueryContext } from '../../context'
import { useSlowQueryDetailUrlState } from '../../utils/detail-url-state'
import { telemetry } from '../../utils/telemetry'

const SLOW_QUERY_DETAIL_EXPAND = 'slow_query.detail_expand'

function useSlowQueryDetailData() {
  const ctx = useContext(SlowQueryContext)
  const { digest, connectionId, timestamp } = useSlowQueryDetailUrlState()

  const query = useQuery({
    queryKey: ['slow_query', 'detail', digest, connectionId, timestamp],
    queryFn: () => {
      return ctx?.ds
        .slowQueryDetailGet(connectionId, digest, timestamp, {
          handleError: 'custom'
        })
        .then((res) => res.data)
    }
  })

  return query
}

function DetailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const historyBack = (location.state ?? ({} as any)).historyBack ?? false

  const { data, isLoading, error } = useSlowQueryDetailData()

  const binaryPlanObj = useMemo(() => {
    const json = data?.binary_plan_json ?? data?.binary_plan
    if (json) {
      return JSON.parse(json)
    }
    return undefined
  }, [data?.binary_plan, data?.binary_plan_json])

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

  const [isVpVisible, setIsVpVisible] = useState(false)
  const toggleVisualPlan = (action: 'open' | 'close') => {
    telemetry.toggleVisualPlanModal(action)
    setIsVpVisible(!isVpVisible)
  }

  return (
    <div>
      <Head
        title={t('slow_query.detail.head.title')}
        back={
          <Typography.Link
            onClick={() =>
              historyBack ? navigate(-1) : navigate('/slow_query')
            }
          >
            <ArrowLeftOutlined /> {t('slow_query.detail.head.back')}
          </Typography.Link>
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
              {(binaryPlanObj || !!data.plan) && (
                <>
                  <Space size="middle" style={{ color: '#8c8c8c' }}>
                    {t('slow_query.detail.plan.title')}
                  </Space>
                  <Tabs
                    defaultActiveKey={
                      !!data.binary_plan_text
                        ? 'binary_plan_table'
                        : 'text_plan'
                    }
                    onTabClick={(key) =>
                      telemetry.clickPlanTabs(key, data.digest!)
                    }
                  >
                    {!!data.binary_plan_text && (
                      <Tabs.TabPane
                        tab={t('slow_query.detail.plan.table')}
                        key="binary_plan_table"
                      >
                        <BinaryPlanTable
                          data={data.binary_plan_text}
                          downloadFileName={`${data.digest}.txt`}
                        />
                        <div style={{ height: 24 }} />
                      </Tabs.TabPane>
                    )}

                    <Tabs.TabPane
                      tab={t('slow_query.detail.plan.text')}
                      key="text_plan"
                    >
                      <PlanText
                        data={data.binary_plan_text || data.plan || ''}
                        downloadFileName={`${data.digest}.txt`}
                      />
                    </Tabs.TabPane>

                    {binaryPlanObj && !binaryPlanObj.discardedDueToTooLong && (
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
                          <VisualPlanView data={binaryPlanObj} />
                        </Modal>
                        <Descriptions>
                          <Descriptions.Item span={2}>
                            <div onClick={() => toggleVisualPlan('open')}>
                              <VisualPlanThumbnailView data={binaryPlanObj} />
                            </div>
                          </Descriptions.Item>
                        </Descriptions>
                      </Tabs.TabPane>
                    )}
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

export default DetailPage
