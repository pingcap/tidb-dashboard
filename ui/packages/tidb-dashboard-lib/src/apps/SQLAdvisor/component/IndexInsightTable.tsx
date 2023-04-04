import React, { useEffect, useMemo, useState, useContext, useRef } from 'react'

import { Card, HighlightSQL, TextWrap } from '@lib/components'
import { Tooltip, Table } from 'antd'

import { Link } from 'react-router-dom'
import { getSuggestedCommand } from '../utils/suggestedCommandMaps'
import { SQLAdvisorContext } from '../context'
import { SQLTunedListProps } from '../types'
import dayjs from 'dayjs'
import tz from '@lib/utils/timezone'

const DEF_PAGINATION_PARAMS = {
  pageNumber: 1,
  pageSize: 20
}

export const useSQLTunedListGet = () => {
  const ctx = useContext(SQLAdvisorContext)
  const [sqlTunedList, setSqlTunedList] = useState<SQLTunedListProps | null>(
    null
  )
  const [loading, setLoading] = useState(false)

  const sqlTunedListGet = useRef(
    async (pageNumber?: number, pageSize?: number) => {
      setLoading(true)
      try {
        const res = await ctx?.ds.tuningListGet(
          pageNumber || DEF_PAGINATION_PARAMS.pageNumber,
          pageSize || DEF_PAGINATION_PARAMS.pageSize
        )
        setSqlTunedList(res!)
      } catch (e) {
        console.log(e)
      } finally {
        setLoading(false)
      }
    }
  )

  useEffect(() => {
    sqlTunedListGet.current()
  }, [])

  return { sqlTunedList, refreshSQLTunedList: sqlTunedListGet.current, loading }
}

interface IndexInsightTableProps {
  sqlTunedList: SQLTunedListProps | null
  loading: boolean
  onHandlePaginationChange?: (pageNumber: number, pageSize: number) => void
}

const IndexInsightTable = ({
  sqlTunedList,
  loading,
  onHandlePaginationChange
}: IndexInsightTableProps) => {
  const columns = useMemo(
    () => [
      {
        title: 'Impact',
        dataIndex: 'impact',
        key: 'impact',
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
        title: 'Suggested Command',
        dataIndex: 'suggested_command',
        key: 'suggested_command',
        ellipsis: true,
        render: (_, record) => {
          return (
            <>
              {record.suggested_command?.map((command, idx) => (
                <Tooltip
                  title={getSuggestedCommand(
                    command.suggestion_key,
                    command.params
                  )}
                  placement="topLeft"
                  key={idx}
                >
                  <span>
                    {getSuggestedCommand(
                      command.suggestion_key,
                      command.params
                    )}
                  </span>
                </Tooltip>
              ))}
            </>
          )
        }
      },
      {
        title: 'Related Slow SQL',
        dataIndex: 'sql_statement',
        key: 'related_slow_sql',
        ellipsis: true,
        render: (_, record) => {
          return (
            <Tooltip
              title={<HighlightSQL sql={record.sql_statement} theme="dark" />}
              placement="left"
            >
              <TextWrap>
                <HighlightSQL sql={record.sql_statement} compact />
              </TextWrap>
            </Tooltip>
          )
        }
      },
      {
        title: `Check Up Time (UTC${
          tz.getTimeZone() < 0 ? '-' : '+'
        }${tz.getTimeZone()})`,
        dataIndex: 'checked_time',
        key: 'check_up_time',
        ellipsis: true,
        render: (_, record) => {
          return (
            <>
              {dayjs(record.checked_time)
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
          return <Link to={`/sql_advisor/detail?id=${record.id}`}>Detail</Link>
        }
      }
    ],
    []
  )

  return (
    <Card noMarginTop>
      <Table
        dataSource={sqlTunedList?.tuned_results!}
        columns={columns}
        loading={loading}
        size="small"
        pagination={{
          total: sqlTunedList?.count,
          defaultCurrent: DEF_PAGINATION_PARAMS.pageNumber,
          pageSize: DEF_PAGINATION_PARAMS.pageSize,
          onChange: (pageNumber, pageSize) => {
            onHandlePaginationChange?.(pageNumber, pageSize)
          }
        }}
      />
    </Card>
  )
}

export default IndexInsightTable
