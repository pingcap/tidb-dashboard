import React, { useState, useEffect } from 'react'
import { Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import {
  StatementDetail as StatementDetailInfo,
  StatementNode,
} from '@lib/client'
import { Head } from '@lib/components'

import StatementPlanTable from './StatementPlanTable'
import StatementNodesTable from './StatementNodesTable'
import StatementSummaryTable from './StatementSummaryTable'

import styles from './styles.module.less'

function StatisCard({ detail }: { detail: StatementDetailInfo }) {
  const { t } = useTranslation()

  return (
    <div className={styles.statement_statis}>
      <p>
        {t('statement.common.sum_latency')}:{' '}
        {getValueFormat('ns')(detail.sum_latency!, 2)}
      </p>
      <p>
        {t('statement.common.exec_count')}:{' '}
        {getValueFormat('short')(detail.exec_count!, 0, 2)}
      </p>
      <p>
        {t('statement.common.avg_affected_rows')}:{' '}
        {getValueFormat('short')(detail.avg_affected_rows!, 2)}
      </p>
      <p>
        {t('statement.common.avg_total_keys')}:{' '}
        {getValueFormat('short')(detail.avg_total_keys!, 2)}
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
  ) => Promise<StatementDetailInfo>
  onFetchNodes: (
    digest: string,
    schemaName: string,
    beginTime: string,
    endTime: string
  ) => Promise<StatementNode[]>
}

export default function StatementDetail({
  digest,
  schemaName,
  beginTime,
  endTime,
  onFetchDetail,
  onFetchNodes,
}: Props) {
  const [detail, setDetail] = useState<StatementDetailInfo | null>(null)
  const [nodes, setNodes] = useState<StatementNode[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

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
    // eslint-disable-next-line
  }, [digest, schemaName, beginTime, endTime])
  // don't add the dependent functions likes onFetchDetail into the dependency array
  // it will cause the infinite loop if use context inside it in the future
  // wrap them by useCallback() in the parent component can fix it but I don't think it is necessary

  return (
    <div>
      <Head
        title={t('statement.pages.detail')}
        back={
          <Link to="/statement">
            <ArrowLeftOutlined /> {t('statement.nav_title')}
          </Link>
        }
      />
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
          {detail.plans!.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <h3>{t('statement.plan.plans')}</h3>
              <div className={styles.table_wrapper}>
                {detail.plans!.map((plan) => (
                  <StatementPlanTable plan={plan} key={plan.digest} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
