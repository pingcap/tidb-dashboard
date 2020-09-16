import React from 'react'
import { Space } from 'antd'
import { useToggle } from '@umijs/hooks'
import { useTranslation } from 'react-i18next'
import {
  Card,
  Descriptions,
  HighlightSQL,
  TextWithInfo,
  Pre,
  CardTabs,
  Expand,
  CopyLink,
  AnimatedSkeleton,
} from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client from '@lib/client'
import formatSql from '@lib/utils/formatSql'

import { IPageQuery } from '.'
import TabBasic from './PlanDetailTabBasic'
import TabTime from './PlanDetailTabTime'
import TabCopr from './PlanDetailTabCopr'
import TabTxn from './PlanDetailTabTxn'
import SlowQueryTab from './SlowQueryTab'

export interface IQuery extends IPageQuery {
  plans: string[]
  allPlans: number
}

export interface IPlanDetailProps {
  query: IQuery
}

function PlanDetail({ query }: IPlanDetailProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useClientRequest((reqConfig) =>
    client
      .getInstance()
      .statementsPlanDetailGet(
        query.beginTime!,
        query.digest!,
        query.endTime!,
        query.plans,
        query.schema!,
        reqConfig
      )
  )
  const { state: sqlExpanded, toggle: toggleSqlExpanded } = useToggle(false)
  const { state: prevSqlExpanded, toggle: togglePrevSqlExpanded } = useToggle(
    false
  )
  const { state: planExpanded, toggle: togglePlanExpanded } = useToggle(false)

  let title_key
  if (query.allPlans === 1) {
    title_key = 'one_for_all'
  } else if (query.plans.length === query.allPlans) {
    title_key = 'all'
  } else {
    title_key = 'some'
  }

  return (
    <Card
      title={t(`statement.pages.detail.desc.plans.title.${title_key}`, {
        n: query.plans.length,
      })}
    >
      <AnimatedSkeleton showSkeleton={isLoading}>
        {data && (
          <>
            <Descriptions>
              <Descriptions.Item
                span={2}
                multiline={sqlExpanded}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="statement.fields.query_sample_text" />
                    <Expand.Link
                      expanded={sqlExpanded}
                      onClick={() => toggleSqlExpanded()}
                    />
                    <CopyLink data={formatSql(data.query_sample_text)} />
                  </Space>
                }
              >
                <Expand
                  expanded={sqlExpanded}
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
                  multiline={prevSqlExpanded}
                  label={
                    <Space size="middle">
                      <TextWithInfo.TransKey transKey="statement.fields.prev_sample_text" />
                      <Expand.Link
                        expanded={prevSqlExpanded}
                        onClick={() => togglePrevSqlExpanded()}
                      />
                      <CopyLink data={formatSql(data.prev_sample_text)} />
                    </Space>
                  }
                >
                  <Expand
                    expanded={prevSqlExpanded}
                    collapsedContent={
                      <HighlightSQL sql={data.prev_sample_text!} compact />
                    }
                  >
                    <HighlightSQL sql={data.prev_sample_text!} />
                  </Expand>
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item
                span={2}
                multiline={planExpanded}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="statement.fields.plan" />
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
                tab={t('statement.pages.detail.tabs.basic')}
                key="basic"
              >
                <TabBasic data={data} />
              </CardTabs.TabPane>
              <CardTabs.TabPane
                tab={t('statement.pages.detail.tabs.time')}
                key="time"
              >
                <TabTime data={data} />
              </CardTabs.TabPane>
              <CardTabs.TabPane
                tab={t('statement.pages.detail.tabs.copr')}
                key="copr"
              >
                <TabCopr data={data} />
              </CardTabs.TabPane>
              <CardTabs.TabPane
                tab={t('statement.pages.detail.tabs.txn')}
                key="txn"
              >
                <TabTxn data={data} />
              </CardTabs.TabPane>
              <CardTabs.TabPane
                tab={t('statement.pages.detail.tabs.slow_query')}
                key="slow_query"
              >
                <SlowQueryTab query={query} />
              </CardTabs.TabPane>
            </CardTabs>
          </>
        )}
      </AnimatedSkeleton>
    </Card>
  )
}

export default PlanDetail
