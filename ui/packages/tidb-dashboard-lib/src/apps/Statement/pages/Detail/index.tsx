import { Alert, Space, Typography } from 'antd'
import { SelectionMode } from 'office-ui-fabric-react/lib/DetailsList'
import { Selection } from 'office-ui-fabric-react/lib/Selection'
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useIsFeatureSupport } from '@lib/utils/store'

import { StatementModel } from '@lib/client'
import {
  AnimatedSkeleton,
  CardTable,
  DateTime,
  Descriptions,
  ErrorBar,
  Expand,
  Head,
  HighlightSQL,
  TextWithInfo
} from '@lib/components'
import CopyLink from '@lib/components/CopyLink'
import formatSql from '@lib/utils/sqlFormatter'
import { buildQueryFn, parseQueryFn } from '@lib/utils/query'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { useVersionedLocalStorageState } from '@lib/utils/useVersionedLocalStorageState'

import { planColumns as genPlanColumns } from '../../utils/tableColumns'
import PlanDetail from './PlanDetail'
import PlanBind from './PlanBind'
import { StatementContext } from '../../context'

export interface IPageQuery {
  digest?: string
  schema?: string
  beginTime?: number
  endTime?: number
}

const STMT_DETAIL_EXPAND = 'statement.detail_expand'

// sort plans by plan_count first,
// if plan_count is the same, sort plans by ava_latency
const compareFn = (a: StatementModel, b: StatementModel) => {
  if (a.exec_count! === b.exec_count!) {
    return b.avg_latency! - a.avg_latency!
  }

  return b.exec_count! - a.exec_count!
}

function DetailPage() {
  const ctx = useContext(StatementContext)

  const location = useLocation()
  const navigate = useNavigate()

  const query = DetailPage.parseQuery(location.search)
  const historyBack = (location.state ?? ({} as any)).historyBack ?? false

  const {
    data: plans,
    isLoading,
    error
  } = useClientRequest((reqConfig) =>
    ctx!.ds.statementsPlansGet(
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
      }
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
      plans.sort(compareFn)
    }
  }, [plans])

  const supportPlanBinding = useIsFeatureSupport('plan_binding')

  return (
    <div>
      <Head
        title={t('statement.pages.detail.head.title')}
        back={
          <Typography.Link
            onClick={() =>
              historyBack ? navigate(-1) : navigate('/statement')
            }
          >
            <ArrowLeftOutlined /> {t('statement.pages.detail.head.back')}
          </Typography.Link>
        }
        titleExtra={
          ctx?.cfg.enablePlanBinding &&
          supportPlanBinding &&
          plans &&
          plans.length > 0 ? (
            <PlanBind query={query} plans={plans!} />
          ) : null
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
                  <div style={{ whiteSpace: 'pre-wrap', paddingRight: '8px' }}>
                    {plans[0].digest}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item
                  label={
                    <TextWithInfo.TransKey transKey="statement.pages.detail.desc.time_range" />
                  }
                >
                  <DateTime.Calendar
                    unixTimestampMs={
                      Number(plans[0].summary_begin_time!) * 1000
                    }
                  />
                  {' ~ '}
                  <DateTime.Calendar
                    unixTimestampMs={Number(plans[0].summary_end_time!) * 1000}
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
                  display: plans && plans.length > 1 ? 'block' : 'none'
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
                  orderBy="exec_count"
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
            allPlans: plans.length
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
