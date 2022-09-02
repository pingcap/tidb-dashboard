import { Button, Descriptions, Progress } from 'antd'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'

import { AnimatedSkeleton, DateTime, ErrorBar, Head } from '@lib/components'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'
import useQueryParams from '@lib/utils/useQueryParams'
import { SystemReportContext } from '../context'

function ReportStatus() {
  const ctx = useContext(SystemReportContext)

  const { id } = useQueryParams()
  const { t } = useTranslation()

  const {
    data: report,
    isLoading,
    error
  } = useClientRequestWithPolling(
    (reqConfig) => ctx!.ds.diagnoseReportsIdStatusGet(id, reqConfig),
    {
      shouldPoll: (data) => data?.progress! < 100
    }
  )

  return (
    <Head
      title={t('system_report.status.head.title')}
      back={
        <Link to={`/system_report`}>
          <ArrowLeftOutlined /> {t('system_report.status.head.back')}
        </Link>
      }
      titleExtra={
        report && (
          <Button type="primary" disabled={report?.progress! < 100}>
            {/* Not using client basePath intentionally so that it can be handled by dev server */}
            <a
              // href={`${ctx!.cfg.publicPathBase}/api/diagnose/reports/${
              //   report.id
              // }/detail`}
              href={ctx!.cfg.fullReportLink(report.id!)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('system_report.status.head.view')}
            </a>
          </Button>
        )
      }
    >
      <AnimatedSkeleton showSkeleton={isLoading && !report}>
        {error && <ErrorBar errors={[error]} />}
        {report && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t('system_report.status.range_begin')}>
              <DateTime.Calendar
                unixTimestampMs={new Date(report.start_time!).valueOf()}
              />
            </Descriptions.Item>
            <Descriptions.Item label={t('system_report.status.range_end')}>
              <DateTime.Calendar
                unixTimestampMs={new Date(report.end_time!).valueOf()}
              />
            </Descriptions.Item>
            {report.compare_start_time && (
              <Descriptions.Item
                label={t('system_report.status.baseline_begin')}
              >
                <DateTime.Calendar
                  unixTimestampMs={new Date(
                    report.compare_start_time
                  ).valueOf()}
                />
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('system_report.status.progress')}>
              <Progress style={{ width: 200 }} percent={report.progress || 0} />
            </Descriptions.Item>
          </Descriptions>
        )}
      </AnimatedSkeleton>
    </Head>
  )
}

export default ReportStatus
