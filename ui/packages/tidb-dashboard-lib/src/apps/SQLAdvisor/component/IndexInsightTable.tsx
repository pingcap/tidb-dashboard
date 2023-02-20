import React, { useEffect, useMemo, useState, useContext, useRef } from 'react'

import { Card, HighlightSQL, TextWrap } from '@lib/components'
import { Tooltip, Table } from 'antd'

import { Link } from 'react-router-dom'
import { getSuggestedCommand } from '../utils/suggestedCommandMaps'
import { SQLAdvisorContext } from '../context'
import { TuningDetailProps } from '../types'
import dayjs from 'dayjs'
import tz from '@lib/utils/timezone'

const TYPE__OPTIONS = ['missing_index', 'sql_not_parse', 'poor_stats']

export const useSQLTunedListGet = () => {
  const ctx = useContext(SQLAdvisorContext)
  const [sqlTunedList, setSqlTunedList] = useState<TuningDetailProps[] | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  const sqlTunedListGet = useRef(async () => {
    await ctx?.ds
      .tuningListGet()
      .then((data) => {
        setSqlTunedList(data)
      })
      .finally(() => {
        setLoading(false)
      })
  })

  useEffect(() => {
    sqlTunedListGet.current()
  }, [])

  return { sqlTunedList, refreshSQLTunedList: sqlTunedListGet.current, loading }
}

interface IndexInsightTableProps {
  sqlTunedList: TuningDetailProps[] | null
  loading: boolean
}

const IndexInsightTable = ({
  sqlTunedList,
  loading
}: IndexInsightTableProps) => {
  const columns = useMemo(
    () => [
      {
        title: 'Impact',
        dataIndex: 'impact',
        key: 'impact',
        width: 50,
        ellipsis: true,
        render: (_, record) => {
          return <>{record.impact}</>
        }
      },
      {
        title: 'Type',
        dataIndex: 'insight_type',
        key: 'type',
        width: 90,
        ellipsis: true,
        render: (_, record) => {
          return <>{record.insight_type}</>
        },
        filters: TYPE__OPTIONS.map((type) => ({
          text: type,
          value: type
        })),
        onFilter: (value, record) => {
          return record.insight_type.indexOf(value as string) === 0
        }
      },
      {
        title: 'Suggested Command',
        dataIndex: 'suggested_command',
        key: 'suggested_command',
        width: 200,
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
        width: 250,
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
        width: 140,
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
        width: 80,
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
        dataSource={sqlTunedList!}
        columns={columns}
        loading={loading}
        size="small"
      />
    </Card>
  )
}

export default IndexInsightTable
