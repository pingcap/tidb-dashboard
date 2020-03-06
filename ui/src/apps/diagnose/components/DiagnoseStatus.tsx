import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button, message, Progress, Table, Skeleton, Card } from 'antd'
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
  compare_start_time: string | null
  compare_end_time: string | null
  progress: number
}

type align = 'left' | 'right' | 'center'

const columns = [
  {
    title: 'kind',
    dataIndex: 'kind',
    key: 'kind',
    align: 'right' as align,
    width: 180,
  },
  {
    title: 'content',
    dataIndex: 'content',
    key: 'content',
    align: 'left' as align,
  },
]

function reportUrl(report: Report | undefined, basePath: string) {
  if (report && report.progress >= 100) {
    return `${basePath}/diagnose/reports/${report.ID}`
  }
  return ''
}

function BackLink() {
  const { t } = useTranslation()

  return (
    <Link to="/diagnose">
      <Button type="primary" style={{ marginTop: 16 }}>
        {t('diagnose.back_to_gen_report')}
      </Button>
    </Link>
  )
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

  if (report === undefined) {
    return (
      <Card title={t('diagnose.report_status')} loading={true}>
        <BackLink />
      </Card>
    )
  }

  const reportFullUrl = reportUrl(report, basePath)

  const dataSource = [
    {
      kind: t('diagnose.time_range'),
      content: `
      ${moment(report?.start_time).format(DATE_TIME_FORMAT)}
      ~
      ${moment(report?.end_time).format(DATE_TIME_FORMAT)}`,
    },
    {
      kind: t('diagnose.progress'),
      content: (
        <Progress
          style={{ width: 200 }}
          percent={report?.progress || 0}
          status={report?.progress === 100 ? 'normal' : 'active'}
        />
      ),
    },
    {
      kind: t('diagnose.full_report'),
      content: reportFullUrl ? (
        <a href={reportFullUrl} target="_blank">
          {reportFullUrl}
        </a>
      ) : (
        ''
      ),
    },
  ]
  if (report?.compare_start_time && report?.compare_end_time) {
    dataSource.splice(1, 0, {
      kind: t('diagnose.compare_time_range'),
      content: `
      ${moment(report?.compare_start_time).format(DATE_TIME_FORMAT)}
      ~
      ${moment(report?.compare_end_time).format(DATE_TIME_FORMAT)}`,
    })
  }

  return (
    <Card
      title={
        report?.compare_start_time
          ? t('diagnose.compare_report_status')
          : t('diagnose.report_status')
      }
    >
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        showHeader={false}
        rowKey={'kind'}
      />
      <BackLink />
    </Card>
  )
}

export default DiagnoseStatus
