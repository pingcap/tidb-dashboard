import React, { useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge, Space, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'

import {
  AnimatedSkeleton,
  CopyLink,
  DateTime,
  Descriptions,
  ErrorBar,
  Head
} from '@lib/components'
import { MaterializedViewContext } from '../../context'
import styles from './index.module.less'

function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation()

  const badgeStatus =
    status === 'success'
      ? 'success'
      : status === 'failed'
      ? 'error'
      : status === 'running'
      ? 'processing'
      : 'default'

  return (
    <Badge
      status={badgeStatus as 'success' | 'error' | 'processing' | 'default'}
      text={t(`materialized_view.status.${status ?? 'running'}`)}
    />
  )
}

function renderRefreshTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const unixTimestampMs = new Date(value).getTime()
  if (Number.isNaN(unixTimestampMs)) {
    return value
  }

  return <DateTime.Calendar unixTimestampMs={unixTimestampMs} />
}

export default function RefreshHistoryDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const ctx = useContext(MaterializedViewContext)
  const historyBack = (location.state ?? ({} as any)).historyBack ?? false

  useEffect(() => {
    document.title = t('materialized_view.page_title_detail', { id })
  }, [t, id])

  const {
    data: detail,
    isLoading,
    error
  } = useQuery({
    queryKey: ['materialized_view', 'detail', id],
    queryFn: () =>
      ctx!.ds
        .materializedViewRefreshHistoryDetailGet(id!, {
          handleError: 'custom'
        })
        .then((res) => res.data),
    enabled: !!id
  })

  return (
    <div className={styles.container}>
      <Head
        title={t(
          'materialized_view.page_title_detail',
          'Materialized View - Refresh History Detail'
        )}
        back={
          <Typography.Link
            onClick={() =>
              historyBack ? navigate(-1) : navigate('/materialized_view')
            }
          >
            <ArrowLeftOutlined /> {t('materialized_view.page_title')}
          </Typography.Link>
        }
      >
        <AnimatedSkeleton showSkeleton={isLoading}>
          {error && <ErrorBar errors={[error]} />}
          {detail && (
            <Descriptions>
              <Descriptions.Item
                label={
                  <Space size="middle">
                    <span>
                      {t(
                        'materialized_view.columns.refresh_job_id',
                        'Refresh Job ID'
                      )}
                    </span>
                    <CopyLink data={detail.refresh_job_id} />
                  </Space>
                }
              >
                <div className={styles.value}>
                  {detail.refresh_job_id || '-'}
                </div>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size="middle">
                    <span>
                      {t('materialized_view.columns.schema', 'Schema')}
                    </span>
                    <CopyLink data={detail.schema} />
                  </Space>
                }
              >
                <div className={styles.value}>{detail.schema || '-'}</div>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size="middle">
                    <span>
                      {t(
                        'materialized_view.columns.materialized_view',
                        'Materialized View'
                      )}
                    </span>
                    <CopyLink data={detail.materialized_view} />
                  </Space>
                }
              >
                <div className={styles.value}>
                  {detail.materialized_view || '-'}
                </div>
              </Descriptions.Item>
              <Descriptions.Item
                label={t(
                  'materialized_view.columns.refresh_status',
                  'Refresh Status'
                )}
              >
                <StatusBadge status={detail.refresh_status} />
              </Descriptions.Item>
              <Descriptions.Item
                label={t(
                  'materialized_view.columns.refresh_start_time',
                  'Refresh Start Time'
                )}
              >
                {renderRefreshTime(detail.refresh_time)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('materialized_view.columns.duration', 'Duration')}
              >
                <div className={styles.value}>
                  {detail.duration != null
                    ? `${detail.duration.toFixed(3)}s`
                    : '-'}
                </div>
              </Descriptions.Item>
              <Descriptions.Item
                label={t(
                  'materialized_view.columns.refresh_rows',
                  'Refresh Rows'
                )}
              >
                <div className={styles.value}>{detail.refresh_rows ?? '-'}</div>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size="middle">
                    <span>
                      {t(
                        'materialized_view.columns.refresh_read_tso',
                        'Refresh Read TSO'
                      )}
                    </span>
                    <CopyLink data={detail.refresh_read_tso} />
                  </Space>
                }
              >
                <div className={styles.value}>
                  {detail.refresh_read_tso || '-'}
                </div>
              </Descriptions.Item>
              {detail.failed_reason ? (
                <Descriptions.Item
                  span={2}
                  multiline
                  label={
                    <Space size="middle">
                      <span>
                        {t(
                          'materialized_view.columns.failed_reason',
                          'Failed Reason'
                        )}
                      </span>
                      <CopyLink data={detail.failed_reason} />
                    </Space>
                  }
                >
                  <pre className={styles.failedReasonValue}>
                    {detail.failed_reason}
                  </pre>
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          )}
        </AnimatedSkeleton>
      </Head>
    </div>
  )
}
