import { Button, Descriptions, Progress } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'

import client from '@lib/client'
import publicPathPrefix from '@lib/utils/publicPathPrefix'
import { AnimatedSkeleton, DateTime, ErrorBar, Head } from '@lib/components'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'
import useQueryParams from '@lib/utils/useQueryParams'

function DiagnoseStatus() {
  const { t } = useTranslation()
  const { id } = useQueryParams()

  const {
    data: report,
    isLoading,
    error
  } = useClientRequestWithPolling(
    (reqConfig) =>
      client.getInstance().diagnoseReportsIdStatusGet(id, reqConfig),
    {
      shouldPoll: (data) => data?.progress! < 100
    }
  )

  return (
    <Head
      title={t('diagnose.status.head.title')}
      back={
        <Link to={`/diagnose`}>
          <ArrowLeftOutlined /> {t('diagnose.status.head.back')}
        </Link>
      }
      titleExtra={
        report && (
          <Button type="primary" disabled={report?.progress! < 100}>
            {/* Not using client basePath intentionally so that it can be handled by webpack-dev-server */}
            <a
              href={`${publicPathPrefix}/api/diagnose/reports/${report.id}/detail`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('diagnose.status.head.view')}
            </a>
          </Button>
        )
      }
    >
      <AnimatedSkeleton showSkeleton={isLoading && !report}>
        {error && <ErrorBar errors={[error]} />}
        {report && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t('diagnose.status.range_begin')}>
              <DateTime.Calendar
                unixTimestampMs={new Date(report.start_time!).valueOf()}
              />
            </Descriptions.Item>
            <Descriptions.Item label={t('diagnose.status.range_end')}>
              <DateTime.Calendar
                unixTimestampMs={new Date(report.end_time!).valueOf()}
              />
            </Descriptions.Item>
            {report.compare_start_time && (
              <Descriptions.Item label={t('diagnose.status.baseline_begin')}>
                <DateTime.Calendar
                  unixTimestampMs={new Date(
                    report.compare_start_time
                  ).valueOf()}
                />
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('diagnose.status.progress')}>
              <Progress style={{ width: 200 }} percent={report.progress || 0} />
            </Descriptions.Item>
          </Descriptions>
        )}
      </AnimatedSkeleton>
    </Head>
  )
}

export default DiagnoseStatus
