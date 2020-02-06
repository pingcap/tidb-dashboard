import React, { useState, useEffect } from 'react'
import { Spin } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'

import StatementDetailTable from './StatementDetailTable'
import StatementSummaryTable from './StatementSummaryTable'
import { StatementDetailInfo } from './statement-types'

import styles from './StatementDetail.module.css'

function StatisCard({ detail: { statis } }: { detail: StatementDetailInfo }) {
  return (
    <div className={styles.statement_statis}>
      <p>总时长：{getValueFormat('s')(statis.total_duration, 2, null)}</p>
      <p>总次数：{getValueFormat('short')(statis.total_times, 0, 0)}</p>
      <p>
        平均影响行数：{getValueFormat('short')(statis.avg_affect_lines, 0, 0)}
      </p>
      <p>
        平均扫描行数：{getValueFormat('short')(statis.avg_scan_lines, 0, 0)}
      </p>
    </div>
  )
}

interface Props {
  sqlCategory: string
  onFetchDetail: (string) => Promise<StatementDetailInfo | undefined>
}

export default function StatementDetail({ sqlCategory, onFetchDetail }: Props) {
  const [detail, setDetail] = useState<StatementDetailInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function query() {
      setLoading(true)
      const res = await onFetchDetail(sqlCategory)
      if (res) {
        setDetail(res)
      } else {
        setDetail(null)
      }
      setLoading(false)
    }
    query()
  }, [sqlCategory, onFetchDetail])

  return (
    <div className={styles.statement_detail}>
      {loading && <Spin />}
      {!loading && detail == null && <p>query failed!</p>}
      {!loading && detail && (
        <>
          <div className={styles.statement_summary}>
            <div className={styles.table_wrapper}>
              <StatementSummaryTable detail={detail} />
            </div>
            <StatisCard detail={detail} />
          </div>
          <div className={styles.table_wrapper}>
            <StatementDetailTable detail={detail} />
          </div>
        </>
      )}
    </div>
  )
}
