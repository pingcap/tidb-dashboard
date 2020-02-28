import React, { useState } from 'react'
import { Button, DatePicker } from 'antd'
import { RangePickerValue } from 'antd/lib/date-picker/interface'
import { useTranslation } from 'react-i18next'

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

interface Props {
  basePath: string
  createReport: (
    startTime: string,
    endTime: string
  ) => Promise<ReportRes | undefined>
}

interface ReportRes {
  report_id: string
}

function DiagnoseGenerator({ basePath, createReport }: Props) {
  const [timeRange, setTimeRange] = useState<[string, string]>(['', ''])
  const [loading, setLoading] = useState(false)
  const [reportUrl, setReportUrl] = useState('')
  const { t } = useTranslation()

  function handleRangeChange(
    dates: RangePickerValue,
    _dateStrings: [string, string]
  ) {
    // if user clear the range picker, dates is [], dataStrings is ['','']
    if (dates[0] && dates[1]) {
      setTimeRange([
        dates[0].format(DATE_TIME_FORMAT),
        dates[1].format(DATE_TIME_FORMAT)
      ])
    } else {
      setTimeRange(['', ''])
    }
  }

  async function genReport() {
    setReportUrl('')
    setLoading(true)
    const res = await createReport(timeRange[0], timeRange[1])
    setLoading(false)
    if (res) {
      const reportUrl = `${basePath}/diagnose/reports/${res.report_id}`
      setReportUrl(reportUrl)
      window.open(reportUrl, '_blank')
    }
  }

  return (
    <div>
      <DatePicker.RangePicker
        style={{ marginRight: 12 }}
        showTime
        format={DATE_TIME_FORMAT}
        placeholder={[
          t('diagnose.time_selector.start_time'),
          t('diagnose.time_selector.end_time')
        ]}
        onChange={handleRangeChange}
      />
      <Button
        disabled={timeRange[0] === ''}
        onClick={genReport}
        loading={loading}
      >
        {loading ? t('diagnose.keep_wait') : t('diagnose.gen_report')}
      </Button>
      {reportUrl && (
        <p style={{ marginTop: 12 }}>
          {t('diagnose.open_link')}:
          <br />
          <a href={reportUrl} target="_blank">
            {reportUrl}
          </a>
        </p>
      )}
    </div>
  )
}

export default DiagnoseGenerator
