import React from 'react'
import { Space } from 'antd'
import { useLocalStorageState } from 'ahooks'
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
  TextWithInfo,
} from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client from '@lib/client'
import formatSql from '@lib/utils/sqlFormatter'

import type { IPageQuery } from '.'
import DetailTabs from './PlanDetailTabs'
import { useSchemaColumns } from '../../utils/useSchemaColumns'

export interface IQuery extends IPageQuery {
  plans: string[]
  allPlans: number
}

export interface IPlanDetailProps {
  query: IQuery
}

const STMT_DETAIL_PLAN_EXPAND = 'statement.detail_plan_expand'

function PlanDetail({ query }: IPlanDetailProps) {
  const { t } = useTranslation()
  const {
    data,
    isLoading: isDataLoading,
    error,
  } = useClientRequest((reqConfig) =>
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
  const { isLoading: isSchemaLoading } = useSchemaColumns()
  const isLoading = isDataLoading || isSchemaLoading

  const [detailExpand, setDetailExpand] = useLocalStorageState(
    STMT_DETAIL_PLAN_EXPAND,
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
        n: query.plans.length,
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
              <Descriptions.Item
                span={2}
                multiline={detailExpand.plan}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="statement.fields.plan" />
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

            <DetailTabs data={data} query={query} />
          </>
        )}
      </AnimatedSkeleton>
    </Card>
  )
}

export default PlanDetail
