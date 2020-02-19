import React, { useState, useEffect } from 'react'
import { Spin } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'

import StatementNodesTable from './StatementNodesTable'
import StatementSummaryTable from './StatementSummaryTable'
import { StatementDetailInfo, StatementNode } from './statement-types'

import styles from './styles.module.css'

function StatisCard({ detail }: { detail: StatementDetailInfo }) {
  return (
    <div className={styles.statement_statis}>
      <p>总时长：{getValueFormat('ns')(detail.sum_latency, 2, null)}</p>
      <p>总次数：{getValueFormat('short')(detail.exec_count, 0, 0)}</p>
      <p>
        平均影响行数：{getValueFormat('short')(detail.avg_affected_rows, 0, 0)}
      </p>
      <p>
        平均扫描行数：{getValueFormat('short')(detail.avg_total_keys, 0, 0)}
      </p>
    </div>
  )
}

interface Props {
  digest: string
  schemaName: string
  beginTime: string
  endTime: string
  onFetchDetail: (
    digest: string,
    schemaName: string,
    beginTime: string,
    endTime: string
  ) => Promise<StatementDetailInfo | undefined>
  onFetchNodes: (
    digest: string,
    schemaName: string,
    beginTime: string,
    endTime: string
  ) => Promise<StatementNode[] | undefined>
}

export default function StatementDetail({
  digest,
  schemaName,
  beginTime,
  endTime,
  onFetchDetail,
  onFetchNodes
}: Props) {
  const [detail, setDetail] = useState<StatementDetailInfo | null>(null)
  const [nodes, setNodes] = useState<StatementNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function query() {
      setLoading(true)
      const detailRes = await onFetchDetail(
        digest,
        schemaName,
        beginTime,
        endTime
      )
      setDetail(detailRes || null)
      const nodesRes = await onFetchNodes(
        digest,
        schemaName,
        beginTime,
        endTime
      )
      setNodes(nodesRes || [])
      setLoading(false)
    }
    query()
  }, [digest, schemaName, beginTime, endTime, onFetchDetail, onFetchNodes])

  return (
    <div className={styles.statement_detail}>
      {loading && <Spin />}
      {!loading && detail == null && <p>query failed!</p>}
      {!loading && detail && (
        <>
          <div className={styles.statement_summary}>
            <div className={styles.table_wrapper}>
              <StatementSummaryTable
                detail={detail}
                beginTime={beginTime}
                endTime={endTime}
              />
            </div>
            <StatisCard detail={detail} />
          </div>
          <div className={styles.table_wrapper}>
            <StatementNodesTable nodes={nodes} />
          </div>
        </>
      )}
    </div>
  )
}
