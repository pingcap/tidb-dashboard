import React, { useMemo } from 'react'
import { Table } from 'antd'

import { StatementPlan, StatementPlanStep } from './statement-types'

function parsePlan(plan: string): StatementPlanStep[] {
  const lines = plan.split('\n')
  return lines.map((line) => {
    const [_, id, task, estRowsStr, operator_info] = line.split('\t')
    const estRows = +estRowsStr
    return {
      id,
      task,
      estRows,
      operator_info,
    }
  })
}

function cellRender(val: any, _row: StatementPlanStep) {
  return (
    <pre>
      <code style={{ whiteSpace: 'pre-wrap' }}>
        {typeof val === 'number' ? val.toFixed(2) : val}
      </code>
    </pre>
  )
}

const columns = [
  {
    title: 'id',
    dataIndex: 'id',
    key: 'id',
    render: cellRender,
  },
  {
    title: 'task',
    dataIndex: 'task',
    key: 'task',
    render: cellRender,
  },
  {
    title: 'estRows',
    dataIndex: 'estRows',
    key: 'estRows',
    render: cellRender,
  },
  {
    title: 'operator info',
    dataIndex: 'operator_info',
    key: 'operator_info',
    render: cellRender,
  },
]

export default function StatementPlanTable({ plan }: { plan: StatementPlan }) {
  const planSteps = useMemo(() => parsePlan(plan.content!), [plan])

  return (
    <Table
      columns={columns}
      dataSource={planSteps}
      rowKey="id"
      pagination={false}
    />
  )
}
