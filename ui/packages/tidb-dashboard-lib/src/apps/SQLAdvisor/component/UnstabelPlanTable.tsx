import React, { useState, useRef, useEffect, useMemo } from 'react'
import { UnstablePlanData } from './unstablePlanData'
import { Card, HighlightSQL, TextWrap } from '@lib/components'
import { Tooltip, Table } from 'antd'
import { Link } from 'react-router-dom'

import dayjs from 'dayjs'
import tz from '@lib/utils/timezone'

export const useUnstablePlanListGet = () => {
  const [unstablePlanList, setUnstablePlanList] = useState<any | null>()
  const [loading, setLoading] = useState(false)
  const unstablePlanListGet = useRef(() => {
    const res = UnstablePlanData
    setUnstablePlanList(res!)
  })

  useEffect(() => {
    unstablePlanListGet.current()
  }, [])
  return {
    unstablePlanList,
    refreshUnstablePlanList: unstablePlanListGet.current,
    loading
  }
}

interface UnstabelPlanTableProps {
  unstablePlanList: any
  loading
}

const UnstablePlanTable = ({
  unstablePlanList,
  loading
}: UnstabelPlanTableProps) => {
  const columns = useMemo(
    () => [
      {
        title: 'Impact',
        dataIndex: 'impact',
        key: 'impact',
        width: 100,
        ellipsis: true,
        render: (_, record) => {
          return <>{record.impact}</>
        }
      },
      {
        title: 'Type',
        dataIndex: 'insight_type',
        key: 'type',
        ellipsis: true,
        render: (_, record) => {
          return <>{record.insight_type}</>
        }
      },
      {
        title: 'Number of Plans',
        dataIndex: 'plan_count',
        width: 100,
        key: 'plan_count',
        ellipsis: true,
        render: (_, record) => {
          return <>{record.plan_count}</>
        }
      },
      {
        title: 'Related SQL Statement',
        dataIndex: 'sql_statement',
        key: 'related_sql_statement',
        ellipsis: true,
        render: (_, record) => {
          return (
            <Tooltip
              title={
                <HighlightSQL
                  sql={record.suggest_plan_overview.plan_digest}
                  theme="dark"
                />
              }
              placement="left"
            >
              <TextWrap>
                <HighlightSQL
                  sql={record.suggest_plan_overview.plan_digest}
                  compact
                />
              </TextWrap>
            </Tooltip>
          )
        }
      },
      {
        title: `Check Up Time (UTC${
          tz.getTimeZone() < 0 ? '-' : '+'
        }${tz.getTimeZone()})`,
        dataIndex: 'task_created_at',
        key: 'task_created_at',
        ellipsis: true,
        render: (_, record) => {
          return (
            <>
              {dayjs(record.task_created_at)
                .utcOffset(tz.getTimeZone())
                .format('YYYY-MM-DD HH:mm:ss')}
            </>
          )
        }
      },
      {
        title: 'Results',
        dataIndex: 'detail',
        key: 'detail',
        render: (_, record) => {
          return (
            <Link
              to={`/sql_advisor/unstable_plan_detail?id=${record.statement_id}`}
            >
              Detail
            </Link>
          )
        }
      }
    ],
    []
  )
  console.log('unstablePlanList', unstablePlanList)
  return (
    <Card noMarginTop noMarginLeft noMarginRight>
      <Table
        dataSource={unstablePlanList.statements}
        columns={columns}
        loading={loading}
        size="small"
        pagination={{
          total: unstablePlanList?.total
        }}
      />
    </Card>
  )
}

export default UnstablePlanTable
