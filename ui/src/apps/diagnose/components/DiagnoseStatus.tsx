import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Descriptions, message, Skeleton, Progress, Button } from 'antd'
import { Head } from '@pingcap-incubator/dashboard_components'
import { DateTime } from '@/components'
import { DiagnoseReport } from '@pingcap-incubator/dashboard_client'
import { useTranslation } from 'react-i18next'
import client from '@pingcap-incubator/dashboard_client'

function DiagnoseStatus() {
  const [report, setReport] = useState<DiagnoseReport | undefined>(undefined)
  const { id } = useParams()
  const { t } = useTranslation()

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null
    if (!id) {
      return
    }
    async function fetchData() {
      try {
        const res = await client.getInstance().diagnoseReportsIdStatusGet(id!)
        const { data } = res
        setReport(data)
        if (data.progress! >= 100) {
          if (t !== null) {
            clearInterval(t)
          }
        }
      } catch (error) {
        message.error(error.message)
      }
    }
    t = setInterval(() => fetchData(), 1000)
    fetchData()
    return () => {
      if (t !== null) {
        clearInterval(t)
      }
    }
  }, [id])

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
            <a
              href={`${client.getBasePath()}/diagnose/reports/${report!['ID']}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('diagnose.status.head.view')}
            </a>
          </Button>
        )
      }
    >
      {!report ? (
        <Skeleton active />
      ) : (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('diagnose.status.range_begin')}>
            <DateTime.Calendar unixTimeStampMs={new Date(report.start_time!)} />
          </Descriptions.Item>
          <Descriptions.Item label={t('diagnose.status.range_end')}>
            <DateTime.Calendar unixTimeStampMs={new Date(report.end_time!)} />
          </Descriptions.Item>
          {report.compare_start_time && (
            <Descriptions.Item label={t('diagnose.status.baseline_begin')}>
              <DateTime.Calendar
                unixTimeStampMs={new Date(report.compare_start_time!)}
              />
            </Descriptions.Item>
          )}
          <Descriptions.Item label={t('diagnose.status.progress')}>
            <Progress style={{ width: 200 }} percent={report.progress || 0} />
          </Descriptions.Item>
        </Descriptions>
      )}
    </Head>
  )
}

export default DiagnoseStatus
