import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button, message, Progress } from 'antd'
import moment from 'moment'
import { useTranslation } from 'react-i18next'

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

// TODO: move a better place, and duplicated with useSetInterval in SearchProgess.tsx
// https://overreacted.io/zh-hans/making-setinterval-declarative-with-react-hooks/
function useInterval(callback: () => void, delay: null | number) {
  const savedCallback = useRef<() => void>(callback)

  // save new callback
  useEffect(() => {
    savedCallback.current = callback
  })

  // set interval
  useEffect(() => {
    function tick() {
      savedCallback.current()
    }
    if (delay !== null) {
      tick()
      let id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}

interface Props {
  basePath: string
  fetchReport: (reportId: string) => Promise<Report>
}

interface Report {
  ID: string
  start_time: string
  end_time: string
  progress: number
}

function reportUrl(report: Report | undefined, basePath: string) {
  if (report && report.progress >= 100) {
    return `${basePath}/diagnose/reports/${report.ID}`
  }
  return ''
}

function DiagnoseStatus({ basePath, fetchReport }: Props) {
  const [report, setReport] = useState<Report | undefined>(undefined)
  const [stopInterval, setStopInterval] = useState(false)
  const { id } = useParams()
  const { t } = useTranslation()

  useInterval(
    () => {
      async function fetchData() {
        if (!id) {
          setStopInterval(true)
          return
        }
        try {
          const res = await fetchReport(id)
          setReport(res)
          if (res.progress >= 100) {
            setStopInterval(true)
            window.open(reportUrl(res, basePath))
          }
        } catch (error) {
          message.error(error.message)
        }
      }
      fetchData()
    },
    stopInterval ? null : 2000
  )

  const reportFullUrl = reportUrl(report, basePath)

  return (
    <div>
      <h1>{t('diagnose.report_status')}</h1>
      <p>
        {t('diagnose.time_range')}:{' '}
        {report && (
          <span>
            {moment(report.start_time).format(DATE_TIME_FORMAT)} ~{' '}
            {moment(report.end_time).format(DATE_TIME_FORMAT)}
          </span>
        )}
      </p>
      <p>
        {t('diagnose.progress')}:{' '}
        <Progress
          style={{ width: 200 }}
          percent={report?.progress || 0}
          status={report?.progress === 100 ? 'normal' : 'active'}
        />
      </p>
      <p>
        {t('diagnose.full_report')}:{' '}
        {reportFullUrl && (
          <a href={reportFullUrl} target="_blank">
            {reportFullUrl}
          </a>
        )}
      </p>
      <Link to="/diagnose">
        <Button type="primary">{t('diagnose.back_to_gen_report')}</Button>
      </Link>
    </div>
  )
}

export default DiagnoseStatus
