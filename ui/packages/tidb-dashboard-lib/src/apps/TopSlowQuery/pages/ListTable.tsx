import React, { useMemo } from 'react'
import { useTopSlowQueryContext } from '../context'
import { useTopSlowQueryUrlState } from '../uilts/url-state'
import { useQuery } from '@tanstack/react-query'

import { CardTable, HighlightSQL, TextWrap } from '@lib/components'
import {
  ColumnActionsMode,
  IColumn
} from 'office-ui-fabric-react/lib/DetailsList'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { useMemoizedFn } from 'ahooks'
import { useNavigate } from 'react-router-dom'
import openLink from '@lib/utils/openLink'

import styles from './List.module.less'

function useTopSlowQueryData() {
  const ctx = useTopSlowQueryContext()
  const { tw, order, db, internal } = useTopSlowQueryUrlState()

  const query = useQuery({
    queryKey: [
      'top_slowquery_list',
      ctx.cfg.orgName,
      ctx.cfg.clusterName,
      tw,
      order,
      db,
      internal
    ],
    queryFn: () => {
      return ctx.api.getTopSlowQueries({
        start: tw[0],
        end: tw[1],
        order,
        db,
        internal
      })
    }
  })
  return query
}

export function TopSlowQueryListTable() {
  const { tw, order, setOrder } = useTopSlowQueryUrlState()
  const { isLoading, data: slowQueries } = useTopSlowQueryData()
  const navigate = useNavigate()

  const handleRowClick = useMemoizedFn(
    (rec, idx, ev: React.MouseEvent<HTMLElement>) => {
      sessionStorage.setItem(
        'slow_query.query_options',
        JSON.stringify({
          visibleColumnKeys: {
            query: true,
            timestamp: true,
            query_time: true,
            memory_max: true
          },
          digest: rec.sql_digest,
          limit: 100,
          timeRange: {
            type: 'absolute',
            value: tw
          }
        })
      )

      openLink(`/slow_query?from=${tw[0]}&to=${tw[1]}`, ev, navigate)
    }
  )

  const columns: IColumn[] = useMemo(() => {
    return [
      {
        name: 'Query',
        key: 'query',
        minWidth: 100,
        maxWidth: 500,
        onRender: (row: any) => {
          return (
            <Tooltip
              title={<HighlightSQL sql={row.sql_text} theme="dark" />}
              placement="right"
            >
              <TextWrap>
                <HighlightSQL sql={row.sql_text} compact />
              </TextWrap>
            </Tooltip>
          )
        }
      },
      {
        name: 'SQL Digest',
        key: 'sql_digest',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: any) => {
          return (
            <Tooltip title={row.sql_digest}>
              <TextWrap>{row.sql_digest}</TextWrap>
            </Tooltip>
          )
        }
      },
      {
        name: 'Total Latency',
        headerClassName:
          order === 'sum_latency' ? styles.sorted_column_header : '',
        key: 'sum_latency',
        fieldName: 'sum_latency',
        minWidth: 100,
        maxWidth: 150,
        columnActionsMode: ColumnActionsMode.clickable,
        onRender: (row: any) => {
          return <span>{getValueFormat('s')(row.sum_latency, 1)}</span>
        }
      },
      {
        name: 'Max Latency',
        headerClassName:
          order === 'max_latency' ? styles.sorted_column_header : '',
        key: 'max_latency',
        fieldName: 'max_latency', // fieldName is used to sort
        minWidth: 100,
        maxWidth: 150,
        columnActionsMode: ColumnActionsMode.clickable,
        onRender: (row: any) => {
          return <span>{getValueFormat('s')(row.max_latency, 1)}</span>
        }
      },
      {
        name: 'Avg Latency',
        headerClassName:
          order === 'avg_latency' ? styles.sorted_column_header : '',
        key: 'avg_latency',
        fieldName: 'avg_latency',
        minWidth: 100,
        maxWidth: 150,
        columnActionsMode: ColumnActionsMode.clickable,
        onRender: (row: any) => {
          return <span>{getValueFormat('s')(row.avg_latency, 1)}</span>
        }
      },
      {
        name: 'Total Memory',
        headerClassName:
          order === 'sum_memory' ? styles.sorted_column_header : '',
        key: 'sum_memory',
        fieldName: 'sum_memory',
        minWidth: 100,
        maxWidth: 150,
        columnActionsMode: ColumnActionsMode.clickable,
        onRender: (row: any) => {
          return <span>{getValueFormat('bytes')(row.sum_memory, 1)}</span>
        }
      },
      {
        name: 'Max Memory',
        headerClassName:
          order === 'max_memory' ? styles.sorted_column_header : '',
        key: 'max_memory',
        fieldName: 'max_memory',
        minWidth: 100,
        maxWidth: 150,
        columnActionsMode: ColumnActionsMode.clickable,
        onRender: (row: any) => {
          return <span>{getValueFormat('bytes')(row.max_memory, 1)}</span>
        }
      },
      {
        name: 'Avg Memory',
        headerClassName:
          order === 'avg_memory' ? styles.sorted_column_header : '',
        key: 'avg_memory',
        fieldName: 'avg_memory',
        minWidth: 100,
        maxWidth: 150,
        columnActionsMode: ColumnActionsMode.clickable,
        onRender: (row: any) => {
          return <span>{getValueFormat('bytes')(row.avg_memory, 1)}</span>
        }
      },
      {
        name: 'Total Count',
        headerClassName: order === 'count' ? styles.sorted_column_header : '',
        key: 'count',
        fieldName: 'count',
        minWidth: 100,
        maxWidth: 150,
        columnActionsMode: ColumnActionsMode.clickable,
        onRender: (row: any) => {
          return <span>{getValueFormat('short')(row.count, 0, 1)}</span>
        }
      },
      {
        name: 'Total Disk',
        key: 'sum_disk',
        fieldName: 'sum_disk',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: any) => {
          return <span>{getValueFormat('bytes')(row.sum_disk, 1)}</span>
        }
      }
      // {
      //   name: 'Database',
      //   key: 'database',
      //   minWidth: 100,
      //   maxWidth: 150,
      //   onRender: (row: any) => {
      //     return (
      //       <Tooltip title={row.schema_name}>
      //         <TextWrap>{row.schema_name}</TextWrap>
      //       </Tooltip>
      //     )
      //   }
      // },
      // {
      //   name: 'Table',
      //   key: 'table',
      //   minWidth: 100,
      //   maxWidth: 150,
      //   onRender: (row: any) => {
      //     return (
      //       <Tooltip title={row.table_names}>
      //         <TextWrap>{row.table_names}</TextWrap>
      //       </Tooltip>
      //     )
      //   }
      // }
    ]
  }, [order])

  return (
    <CardTable
      cardNoMargin
      loading={isLoading}
      columns={columns}
      items={slowQueries ?? []}
      onRowClicked={handleRowClick}
      orderBy={order}
      onChangeOrder={setOrder}
    />
  )
}
