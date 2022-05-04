import { Alert, Space } from 'antd'
import { SelectionMode } from 'office-ui-fabric-react/lib/DetailsList'
import { Selection } from 'office-ui-fabric-react/lib/Selection'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'

import client, { StatementModel } from '@lib/client'
import {
  AnimatedSkeleton,
  CardTable,
  DateTime,
  Descriptions,
  ErrorBar,
  Expand,
  Head,
  HighlightSQL,
  TextWithInfo,
} from '@lib/components'
import CopyLink from '@lib/components/CopyLink'
import formatSql from '@lib/utils/sqlFormatter'
import { buildQueryFn, parseQueryFn } from '@lib/utils/query'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { useVersionedLocalStorageState } from '@lib/utils/useVersionedLocalStorageState'

import { planColumns as genPlanColumns } from '../../utils/tableColumns'
import PlanDetail from './PlanDetail'

export interface IPageQuery {
  digest?: string
  schema?: string
  beginTime?: number
  endTime?: number
}

const STMT_DETAIL_EXPAND = 'statement.detail_expand'

function DetailPage() {
  const query = DetailPage.parseQuery(useLocation().search)
  const {
    data: plans,
    isLoading,
    error,
  } = useClientRequest((reqConfig) =>
    client
      .getInstance()
      .statementsPlansGet(
        query.beginTime!,
        query.digest!,
        query.endTime!,
        query.schema!,
        reqConfig
      )
  )
  const { t } = useTranslation()
  const planColumns = useMemo(() => genPlanColumns(plans || []), [plans])

  const [selectedPlans, setSelectedPlans] = useState<string[]>([])
  const selection = useRef(
    new Selection({
      onSelectionChanged: () => {
        const s = selection.current.getSelection() as StatementModel[]
        setSelectedPlans(s.map((v) => v.plan_digest || ''))
      },
    })
  )

  const [sqlExpanded, setSqlExpanded] = useVersionedLocalStorageState(
    STMT_DETAIL_EXPAND,
    { defaultValue: false }
  )
  const toggleSqlExpanded = () => setSqlExpanded((prev) => !prev)

  useEffect(() => {
    if (plans && plans.length > 0) {
      selection.current.setAllSelected(true)
    }
  }, [plans])

  return (
    <div>
      <Head
        title={t('statement.pages.detail.head.title')}
        back={
          <Link to={`/statement`}>
            <ArrowLeftOutlined /> {t('statement.pages.detail.head.back')}
          </Link>
        }
      >
        <AnimatedSkeleton showSkeleton={isLoading}>
          {error && <ErrorBar errors={[error]} />}
          {plans && plans.length > 0 && (
            <>
              <Descriptions>
                <Descriptions.Item
                  span={2}
                  multiline={sqlExpanded}
                  label={
                    <Space size="middle">
                      <TextWithInfo.TransKey transKey="statement.fields.digest_text" />
                      <Expand.Link
                        expanded={sqlExpanded}
                        onClick={toggleSqlExpanded}
                      />
                      <CopyLink
                        displayVariant="formatted_sql"
                        data={formatSql(plans[0].digest_text!)}
                      />
                      <CopyLink
                        displayVariant="original_sql"
                        data={plans[0].digest_text!}
                      />
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
                      <TextWithInfo.TransKey transKey="statement.fields.digest" />
                      <CopyLink data={plans[0].digest!} />
                    </Space>
                  }
                >
                  {plans[0].digest}
                </Descriptions.Item>
                <Descriptions.Item
                  label={
                    <TextWithInfo.TransKey transKey="statement.pages.detail.desc.time_range" />
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
                    <TextWithInfo.TransKey transKey="statement.fields.plan_count" />
                  }
                >
                  {plans.length}
                </Descriptions.Item>
                <Descriptions.Item
                  label={
                    <Space size="middle">
                      <TextWithInfo.TransKey transKey="statement.fields.schema_name" />
                      <CopyLink data={query.schema!} />
                    </Space>
                  }
                >
                  {query.schema!}
                </Descriptions.Item>
              </Descriptions>
              <div
                style={{
                  display: plans && plans.length > 1 ? 'block' : 'none',
                }}
                data-e2e="statement_multiple_execution_plans"
              >
                <Alert
                  message={t(`statement.pages.detail.desc.plans.note`)}
                  type="info"
                  showIcon
                />
                <CardTable
                  cardNoMargin
                  columns={planColumns}
                  items={plans}
                  selectionMode={SelectionMode.multiple}
                  selection={selection.current}
                  selectionPreservedOnEmptyClick
                />
              </div>
            </>
          )}
        </AnimatedSkeleton>
      </Head>

      {selectedPlans.length > 0 && plans && plans.length > 0 && (
        <PlanDetail
          query={{
            ...query,
            plans: selectedPlans,
            allPlans: plans.length,
          }}
          key={JSON.stringify(selectedPlans)}
        />
      )}
    </div>
  )
}

DetailPage.buildQuery = buildQueryFn<IPageQuery>()
DetailPage.parseQuery = parseQueryFn<IPageQuery>()

export default DetailPage
