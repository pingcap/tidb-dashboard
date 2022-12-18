import React, { useMemo } from 'react'

import { CardTable, ICardTableProps, Card } from '@lib/components'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { Tooltip, Typography } from 'antd'

import { sqlTunedResultResp } from './mock_data'
import { useNavigate, Link } from 'react-router-dom'
import { useMemoizedFn } from 'ahooks'
import openLink from '@lib/utils/openLink'

const InsightIndexTable = () => {
  const sqlTunedResulstData = sqlTunedResultResp.data
  const navigate = useNavigate()
  const columns: IColumn[] = useMemo(
    () => [
      {
        name: 'Impact',
        key: 'impact',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row) => {
          return <>{row.impact}</>
        }
      },
      {
        name: 'Type',
        key: 'type',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row) => {
          return <>{row.insight_type}</>
        }
      },
      {
        name: 'Suggested Command',
        key: 'suggested_command',
        minWidth: 100,
        maxWidth: 300,
        onRender: (row) => {
          return (
            <Tooltip title={row.suggested_command}>
              {row.suggested_command}
            </Tooltip>
          )
        }
      },
      {
        name: 'Related Slow SQL',
        key: 'related_slow_sql',
        minWidth: 100,
        maxWidth: 300,
        onRender: (row) => {
          return (
            <Tooltip title={row.sql_statement}>
              <Link to={`/slow_query?digest=${row.sql_digest}`}>
                {row.sql_statement}
              </Link>
            </Tooltip>
          )
        }
      },
      {
        name: 'Check Up Time',
        key: 'check_up_time',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row) => {
          return <>{row.analyzed_time}</>
        }
      }
    ],
    []
  )

  const handleRowClick = useMemoizedFn(
    (rec, _idx, ev: React.MouseEvent<HTMLElement>) => {
      openLink(`/sql_advisor/detail?sql_digest=${rec.sql_digest}`, ev, navigate)
    }
  )

  return (
    <Card>
      <CardTable
        cardNoMargin
        loading={false}
        columns={columns}
        items={sqlTunedResulstData.sql_tuned_result}
        // errors={[error, data?.warning]}
        onRowClicked={handleRowClick}
      />
    </Card>
  )
}

export default InsightIndexTable
