import React from 'react'
import { Table } from 'antd'

import { StatementPlan } from './statement-types'
import { useTranslation } from 'react-i18next'

export default function StatementPlansTable({
  plans,
}: {
  plans: StatementPlan[]
}) {
  const { t } = useTranslation()

  const columns = [
    {
      title: t('statement.plan.plan'),
      dataIndex: 'plan',
      key: 'plan',
      render: (text, _plan) => {
        return (
          <pre>
            <code style={{ whiteSpace: 'pre-wrap' }}>{text}</code>
          </pre>
        )
      },
    },
    {
      title: t('statement.plan.prev_sample_text'),
      dataIndex: 'prev_sample_text',
      key: 'prev_sample_text',
      width: 400,
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={plans}
      rowKey={(record: StatementPlan, index) =>
        `${record.plan_digest}_${index}`
      }
      pagination={false}
    />
  )
}
