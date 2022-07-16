import React, { useState } from 'react'
import { Space } from 'antd'

import formatSql from '@lib/utils/sqlFormatter'
import {
  Descriptions,
  Expand,
  Pre,
  HighlightSQL,
  TextWithInfo,
  Card,
  CopyLink
} from '@lib/components'
import type { PlanRecord } from './ListDetailTable'
import type { SQLRecord } from '../ListTable'
import {
  isNoPlanRecord,
  isOverallRecord
} from '@lib/apps/TopSQL/utils/specialRecord'

interface ListDetailContentProps {
  sqlRecord: SQLRecord
  planRecord?: PlanRecord
}

export function ListDetailContent({
  sqlRecord,
  planRecord
}: ListDetailContentProps) {
  const [sqlExpanded, setSqlExpanded] = useState(false)
  const toggleSqlExpanded = () => setSqlExpanded((prev) => !prev)
  const [planExpanded, setPlanExpanded] = useState(false)
  const togglePlanExpanded = () => setPlanExpanded((prev) => !prev)

  return (
    <Card data-e2e="topsql_listdetail_content">
      <Descriptions>
        <Descriptions.Item
          span={2}
          multiline={sqlExpanded}
          label={
            <Space size="middle">
              <TextWithInfo.TransKey transKey="topsql.detail_content.fields.sql_text" />
              <Expand.Link expanded={sqlExpanded} onClick={toggleSqlExpanded} />
              <CopyLink
                displayVariant="formatted_sql"
                data={formatSql(sqlRecord.sql_text)}
              />
              <CopyLink
                displayVariant="original_sql"
                data={sqlRecord.sql_text}
                data-e2e="sql_text"
              />
            </Space>
          }
        >
          <Expand
            expanded={sqlExpanded}
            collapsedContent={
              <HighlightSQL sql={sqlRecord.sql_text!} compact />
            }
          >
            <HighlightSQL sql={sqlRecord.sql_text!} />
          </Expand>
        </Descriptions.Item>
        <Descriptions.Item
          label={
            <Space size="middle">
              <TextWithInfo.TransKey transKey="topsql.detail_content.fields.sql_digest" />
              <CopyLink data={sqlRecord.sql_digest} data-e2e="sql_digest" />
            </Space>
          }
        >
          {sqlRecord.sql_digest}
        </Descriptions.Item>
        {!!planRecord?.plan_digest &&
        !isOverallRecord(planRecord) &&
        !isNoPlanRecord(planRecord) ? (
          <Descriptions.Item
            label={
              <Space size="middle">
                <TextWithInfo.TransKey transKey="topsql.detail_content.fields.plan_digest" />
                <CopyLink
                  data={planRecord.plan_digest}
                  data-e2e="plan_digest"
                />
              </Space>
            }
          >
            {planRecord.plan_digest}
          </Descriptions.Item>
        ) : null}
        {!!planRecord?.plan_text ? (
          <Descriptions.Item
            span={2}
            multiline={planExpanded}
            label={
              <Space size="middle">
                <TextWithInfo.TransKey transKey="topsql.detail_content.fields.plan" />
                <Expand.Link
                  expanded={planExpanded}
                  onClick={togglePlanExpanded}
                />
                <CopyLink data={planRecord.plan_text} data-e2e="plan_text" />
              </Space>
            }
          >
            <Expand expanded={planExpanded}>
              <Pre noWrap>{planRecord.plan_text}</Pre>
            </Expand>
          </Descriptions.Item>
        ) : null}
      </Descriptions>
    </Card>
  )
}
