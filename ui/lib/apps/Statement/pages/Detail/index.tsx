import React, { useRef, useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import client, { StatementPlanDetailModel } from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { parseQueryFn, buildQueryFn } from '@lib/utils/query'
import {
  Head,
  Descriptions,
  TextWithInfo,
  DateTime,
  CardTableV2,
  HighlightSQL,
  Expand,
} from '@lib/components'
import { useTranslation } from 'react-i18next'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Space, Skeleton } from 'antd'
import { IColumn, SelectionMode } from 'office-ui-fabric-react/lib/DetailsList'
import { Selection } from 'office-ui-fabric-react/lib/Selection'
import * as useStatementColumn from '../../utils/useColumn'
import * as useColumn from '@lib/utils/useColumn'
import PlanDetail from './PlanDetail'
import CopyLink from '@lib/components/CopyLink'
import formatSql from '@lib/utils/formatSql'
import { useToggle } from '@umijs/hooks'

export interface IPageQuery {
  digest?: string
  schema?: string
  beginTime?: number
  endTime?: number
}

function usePlanColumns(rows: StatementPlanDetailModel[]): IColumn[] {
  return [
    useStatementColumn.usePlanDigestColumn(rows),
    useStatementColumn.useSumLatencyColumn(rows),
    useStatementColumn.useAvgMinMaxLatencyColumn(rows),
    useStatementColumn.useExecCountColumn(rows),
    useStatementColumn.useAvgMaxMemColumn(rows),
    useColumn.useDummyColumn(),
  ]
}

function DetailPage() {
  const query = DetailPage.parseQuery(useLocation().search)
  const { data: plans, isLoading } = useClientRequest((cancelToken) =>
    client
      .getInstance()
      .statementsPlansGet(
        query.beginTime!,
        query.digest!,
        query.endTime!,
        query.schema!,
        { cancelToken }
      )
  )
  const { t } = useTranslation()
  const planColumns = usePlanColumns(plans || [])

  const [selectedPlans, setSelectedPlans] = useState<string[]>([])
  const selection = useRef(
    new Selection({
      onSelectionChanged: () => {
        const s = selection.current.getSelection() as StatementPlanDetailModel[]
        setSelectedPlans(s.map((v) => v.plan_digest || ''))
      },
    })
  )

  const { state: sqlExpanded, toggle: toggleSqlExpanded } = useToggle(false)

  useEffect(() => {
    if (plans && plans.length > 0) {
      selection.current.setAllSelected(true)
    }
  }, [plans])

  return (
    <div>
      <Head
        title={t('statement.detail.head.title')}
        back={
          <Link to={`/statement`}>
            <ArrowLeftOutlined /> {t('statement.detail.head.back')}
          </Link>
        }
      >
        {isLoading && <Skeleton active />}
        {!isLoading && (!plans || plans.length === 0) && (
          <TextWithInfo tooltip="TODO" type="danger">
            载入数据失败
          </TextWithInfo>
        )}
        {!isLoading && plans && plans.length > 0 && (
          <>
            <Descriptions>
              <Descriptions.Item
                span={2}
                multiline={sqlExpanded}
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="statement.common.columns.digest_text" />
                    <Expand.Link
                      expanded={sqlExpanded}
                      onClick={() => toggleSqlExpanded()}
                    />
                    <CopyLink data={formatSql(plans[0].digest_text!)} />
                  </Space>
                }
              >
                <Expand
                  expanded={sqlExpanded}
                  collapsedContent={
                    <HighlightSQL sql={plans[0].digest_text!} compact />
                  }
                >
                  <HighlightSQL sql={plans[0].digest_text!} />
                </Expand>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="statement.common.columns.digest" />
                    <CopyLink data={plans[0].digest!} />
                  </Space>
                }
              >
                {plans[0].digest}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <TextWithInfo.TransKey transKey="statement.detail.desc.time_range" />
                }
              >
                <DateTime.Calendar
                  unixTimestampMs={Number(query.beginTime!) * 1000}
                />{' '}
                ~{' '}
                <DateTime.Calendar
                  unixTimestampMs={Number(query.endTime!) * 1000}
                />
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size="middle">
                    <TextWithInfo.TransKey transKey="statement.common.columns.schema_name" />
                    <CopyLink data={query.schema!} />
                  </Space>
                }
              >
                {query.schema!}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <TextWithInfo.TransKey transKey="statement.detail.desc.plan_count" />
                }
              >
                {plans.length}
              </Descriptions.Item>
            </Descriptions>
            <CardTableV2
              cardNoMargin
              columns={planColumns}
              items={plans}
              getKey={(row) => row.plan_digest}
              selectionMode={SelectionMode.multiple}
              selection={selection.current}
              selectionPreservedOnEmptyClick
            />
          </>
        )}
      </Head>
      {selectedPlans.length > 0 && (
        <PlanDetail
          query={{ ...query, plans: selectedPlans }}
          key={JSON.stringify(selectedPlans)}
        />
      )}
    </div>
  )
}

DetailPage.buildQuery = buildQueryFn<IPageQuery>()
DetailPage.parseQuery = parseQueryFn<IPageQuery>()

export default DetailPage
