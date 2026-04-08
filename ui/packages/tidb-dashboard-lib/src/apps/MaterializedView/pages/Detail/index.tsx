import React, { useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Spin, Breadcrumb, Skeleton } from 'antd'
import { LeftOutlined } from '@ant-design/icons'

import { Card } from '@lib/components'
import { MaterializedViewContext } from '../../context'
import styles from './index.module.less'

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export default function RefreshHistoryDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ctx = useContext(MaterializedViewContext)

  useEffect(() => {
    document.title = t('materialized_view.page_title_detail', { id })
  }, [t, id])

  const { data: detail, isLoading } = useQuery({
    queryKey: ['materialized_view', 'detail', id],
    queryFn: () => {
      // Use the newly added method directly, fallback to empty to avoid typing issues if not fully propagated
      // @ts-ignore
      if (ctx?.ds?.materializedViewRefreshHistoryDetailGet) {
        // @ts-ignore
        return ctx.ds
          .materializedViewRefreshHistoryDetailGet(id!)
          .then((res) => res.data)
      }
      return null
    },
    enabled: !!id
  })

  // We only show failed reason prominently, others occupy less space
  return (
    <div className={styles.container}>
      <Card noMargin noMarginBottom>
        <Breadcrumb>
          <Breadcrumb.Item>
            <Link to="/materialized_view">
              <LeftOutlined style={{ marginRight: 8 }} />
              {t('materialized_view.page_title')}
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            {t('materialized_view.page_title_detail', 'Detail')}
          </Breadcrumb.Item>
        </Breadcrumb>
      </Card>

      <div className={styles.content}>
        {isLoading ? (
          <Skeleton active />
        ) : (
          <Card
            title={t(
              'materialized_view.page_title_detail',
              'Refresh History Detail'
            )}
          >
            <div className={styles.grid}>
              <div className={styles.gridItem}>
                <span className={styles.label}>
                  {t('materialized_view.columns.refresh_job_id', 'Job ID')}
                </span>
                <span className={styles.value}>
                  {detail?.refresh_job_id || '-'}
                </span>
              </div>
              <div className={styles.gridItem}>
                <span className={styles.label}>
                  {t('materialized_view.columns.schema', 'Schema')}
                </span>
                <span className={styles.value}>{detail?.schema || '-'}</span>
              </div>
              <div className={styles.gridItem}>
                <span className={styles.label}>
                  {t(
                    'materialized_view.columns.materialized_view',
                    'Materialized View'
                  )}
                </span>
                <span className={styles.value}>
                  {detail?.materialized_view || '-'}
                </span>
              </div>
              <div className={styles.gridItem}>
                <span className={styles.label}>
                  {t('materialized_view.columns.refresh_status', 'Status')}
                </span>
                <span className={styles.value}>
                  {detail?.refresh_status || '-'}
                </span>
              </div>
              <div className={styles.gridItem}>
                <span className={styles.label}>
                  {t(
                    'materialized_view.columns.refresh_start_time',
                    'Start Time'
                  )}
                </span>
                <span className={styles.value}>
                  {formatDateTime(detail?.refresh_time)}
                </span>
              </div>
              <div className={styles.gridItem}>
                <span className={styles.label}>
                  {t('materialized_view.columns.duration', 'Duration')}
                </span>
                <span className={styles.value}>
                  {detail?.duration != null
                    ? `${detail.duration.toFixed(3)}s`
                    : '-'}
                </span>
              </div>
              <div className={styles.gridItem}>
                <span className={styles.label}>
                  {t('materialized_view.columns.refresh_rows', 'Rows')}
                </span>
                <span className={styles.value}>
                  {detail?.refresh_rows || '-'}
                </span>
              </div>
              <div className={styles.gridItem}>
                <span className={styles.label}>
                  {t('materialized_view.columns.refresh_read_tso', 'Read TSO')}
                </span>
                <span className={styles.value}>
                  {detail?.refresh_read_tso || '-'}
                </span>
              </div>
            </div>

            {detail?.failed_reason && (
              <div className={styles.failedReason}>
                <div className={styles.failedReasonLabel}>
                  {t(
                    'materialized_view.columns.failed_reason',
                    'Failed Reason'
                  )}
                  :
                </div>
                <div className={styles.failedReasonValue}>
                  {detail.failed_reason}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
