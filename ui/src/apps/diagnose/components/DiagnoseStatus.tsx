import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button, message, Progress } from 'antd'
import moment from 'moment'

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
      <h1>Report Status</h1>
      <p>
        Time Range:{' '}
        {report && (
          <span>
            {moment(report.start_time).format(DATE_TIME_FORMAT)} ~{' '}
            {moment(report.end_time).format(DATE_TIME_FORMAT)}
          </span>
        )}
      </p>
      <p>
        Progress:{' '}
        <Progress
          style={{ width: 200 }}
          percent={report?.progress || 0}
          status={report?.progress === 100 ? 'normal' : 'active'}
        />
      </p>
      <p>
        Full Report:{' '}
        {reportFullUrl && (
          <a href={reportFullUrl} target="_blank">
            {reportFullUrl}
          </a>
        )}
      </p>
      <Link to="/diagnose">
        <Button type="primary">Back to Generate New Report</Button>
      </Link>
    </div>
  )
}

export default DiagnoseStatus
