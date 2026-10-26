import { Button, Descriptions, Progress } from 'antd'
import React, { useContext, useState } from 'react'
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
  const [isOpening, setIsOpening] = useState(false)

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

  async function handleViewReport() {
    if (!report?.id) {
      return
    }
    const reportWindow = window.open('', '_blank')
    if (reportWindow) {
      reportWindow.opener = null
    }
    setIsOpening(true)
    try {
      const tokenResp = await ctx!.ds.diagnoseReportsIdActionTokenGet(report.id)
      const reportURL = ctx!.cfg.fullReportLink(report.id, tokenResp.data)
      if (reportWindow) {
        reportWindow.location.replace(reportURL)
      } else {
        window.open(reportURL, '_blank', 'noopener,noreferrer')
      }
    } catch {
      reportWindow?.close()
    } finally {
      setIsOpening(false)
    }
  }

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
          <Button
            type="primary"
            disabled={report?.progress! < 100}
            loading={isOpening}
            onClick={handleViewReport}
          >
            {t('system_report.status.head.view')}
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
