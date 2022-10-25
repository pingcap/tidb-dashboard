import React, { useState, useContext } from 'react'
import { Space, Tabs, Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  AnimatedSkeleton,
  Card,
  CopyLink,
  Descriptions,
  ErrorBar,
  Expand,
  HighlightSQL,
  Pre,
  TextWithInfo
} from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import formatSql from '@lib/utils/sqlFormatter'
import { useVersionedLocalStorageState } from '@lib/utils/useVersionedLocalStorageState'

import type { IPageQuery } from '.'
import DetailTabs from './PlanDetailTabs'
import { useSchemaColumns } from '../../utils/useSchemaColumns'
import { telemetry } from '../../utils/telemetry'
import { StatementContext } from '../../context'
// import {
//   VisualPlanThumbnail,
//   VisualPlan,
//   RawNodeDatum,
//   DetailDrawer
// } from 'visual-plan'

import {
  VisualPlanThumbnailView,
  VisualPlanView
} from '@lib/components/VisualPlan'

export interface IQuery extends IPageQuery {
  plans: string[]
  allPlans: number
}

export interface IPlanDetailProps {
  query: IQuery
}

const STMT_DETAIL_PLAN_EXPAND = 'statement.detail_plan_expand'

// const VisualPlanThumbnailView = (props) => {
//   const binaryPlan = props.data
//   const minimap = false
//   const cte = { gap: 10 }
//   return (
//     <div style={{ height: window.innerHeight / 2 }}>
//       <VisualPlanThumbnail
//         data={binaryPlan}
//         minimap={minimap}
//         cte={cte}
//         theme={'light'}
//       />
//     </div>
//   )
// }

// const VisualPlanView = (props) => {
//   const binaryPlan = props.data
//   const minimap = { scale: 0.2 }
//   const [showDetailDrawer, setShowDetailDrawer] = useState(false)
//   const [detailData, setDetailData] = useState<RawNodeDatum | null>(null)

//   return (
//     <>
//       <VisualPlan
//         data={binaryPlan}
//         onNodeClick={(n) => {
//           setDetailData(n)
//           setShowDetailDrawer(true)
//         }}
//         minimap={minimap}
//         cte={{ gap: 10 }}
//       />
//       <DetailDrawer
//         data={detailData!}
//         theme={'light'}
//         visible={showDetailDrawer}
//         onClose={() => setShowDetailDrawer(false)}
//       />
//     </>
//   )
// }

function PlanDetail({ query }: IPlanDetailProps) {
  const ctx = useContext(StatementContext)

  const { t } = useTranslation()
  const {
    data,
    isLoading: isDataLoading,
    error
  } = useClientRequest((reqConfig) =>
    ctx!.ds.statementsPlanDetailGet(
      query.beginTime!,
      query.digest!,
      query.endTime!,
      query.plans,
      query.schema!,
      reqConfig
    )
  )
  const { isLoading: isSchemaLoading } = useSchemaColumns(
    ctx!.ds.statementsAvailableFieldsGet
  )
  const isLoading = isDataLoading || isSchemaLoading

  const binaryPlan = data?.binary_plan && JSON.parse(data.binary_plan)

  const [isVpVisible, setIsVpVisable] = useState(false)
  const toggleVisualPlan = (action: 'open' | 'close') => {
    telemetry.toggleVisualPlanModal(action)
    setIsVpVisable(!isVpVisible)
  }

  const [detailExpand, setDetailExpand] = useVersionedLocalStorageState(
    STMT_DETAIL_PLAN_EXPAND,
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

  let titleKey
  if (query.allPlans === 1) {
    titleKey = 'one_for_all'
  } else if (query.plans.length === query.allPlans) {
    titleKey = 'all'
  } else {
    titleKey = 'some'
  }

  return (
    <Card
      title={t(`statement.pages.detail.desc.plans.title.${titleKey}`, {
        n: query.plans.length
      })}
    >
      <AnimatedSkeleton showSkeleton={isLoading}>
        {error && <ErrorBar errors={[error]} />}
        {data && (
          <>
            <Descriptions>
              <Descriptions.Item
                span={2}
                multiline={detailExpand.query}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="statement.fields.query_sample_text" />
                    <Expand.Link
                      expanded={detailExpand.query}
                      onClick={toggleQuery}
                    />
                    <CopyLink
                      displayVariant="formatted_sql"
                      data={formatSql(data.query_sample_text)}
                    />
                    <CopyLink
                      displayVariant="original_sql"
                      data={data.query_sample_text}
                    />
                  </Space>
                }
              >
                <Expand
                  expanded={detailExpand.query}
                  collapsedContent={
                    <HighlightSQL sql={data.query_sample_text!} compact />
                  }
                >
                  <HighlightSQL sql={data.query_sample_text!} />
                </Expand>
              </Descriptions.Item>
              {data.prev_sample_text ? (
                <Descriptions.Item
                  span={2}
                  multiline={detailExpand.prev_query}
                  label={
                    <Space size="middle">
                      <TextWithInfo.TransKey transKey="statement.fields.prev_sample_text" />
                      <Expand.Link
                        expanded={detailExpand.prev_query}
                        onClick={togglePrevQuery}
                      />
                      <CopyLink
                        displayVariant="formatted_sql"
                        data={formatSql(data.prev_sample_text)}
                      />
                      <CopyLink
                        displayVariant="original_sql"
                        data={data.prev_sample_text}
                      />
                    </Space>
                  }
                >
                  <Expand
                    expanded={detailExpand.prev_query}
                    collapsedContent={
                      <HighlightSQL sql={data.prev_sample_text!} compact />
                    }
                  >
                    <HighlightSQL sql={data.prev_sample_text!} />
                  </Expand>
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            {(binaryPlan || data.plan) && (
              <>
                <Space size="middle" style={{ color: '#8c8c8c' }}>
                  {t('statement.pages.detail.desc.plans.execution.title')}
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
                    tab={t('statement.pages.detail.desc.plans.execution.text')}
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

            <DetailTabs data={data} query={query} />
          </>
        )}
      </AnimatedSkeleton>
    </Card>
  )
}

export default PlanDetail
