import React, { useState } from 'react'
import { Button, DatePicker, message } from 'antd'
import { RangePickerValue } from 'antd/lib/date-picker/interface'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

interface Props {
  createReport: (startTime: string, endTime: string) => Promise<ReportRes>
}

interface ReportRes {
  report_id: string
}

function DiagnoseGenerator({ createReport }: Props) {
  const [timeRange, setTimeRange] = useState<[string, string]>(['', ''])
  const { t } = useTranslation()
  const history = useHistory()

  function handleRangeChange(
    dates: RangePickerValue,
    _dateStrings: [string, string]
  ) {
    // if user clear the range picker, dates is [], dataStrings is ['','']
    if (dates[0] && dates[1]) {
      setTimeRange([
        dates[0].format(DATE_TIME_FORMAT),
        dates[1].format(DATE_TIME_FORMAT),
      ])
    } else {
      setTimeRange(['', ''])
    }
  }

  async function genReport() {
    try {
      const res = await createReport(timeRange[0], timeRange[1])
      history.push(`/diagnose/${res.report_id}`)
    } catch (error) {
      message.error(error.message)
    }
  }

  return (
    <div>
      <DatePicker.RangePicker
        style={{ width: 360, marginRight: 12 }}
        showTime
        format={DATE_TIME_FORMAT}
        placeholder={[
          t('diagnose.time_selector.start_time'),
          t('diagnose.time_selector.end_time'),
        ]}
        onChange={handleRangeChange}
      />
      <Button disabled={timeRange[0] === ''} onClick={genReport}>
        {t('diagnose.gen_report')}
      </Button>
    </div>
  )
}

export default DiagnoseGenerator
