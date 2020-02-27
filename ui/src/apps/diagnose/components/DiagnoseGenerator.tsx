import React, { useState } from 'react'
import { Button, DatePicker } from 'antd'
import { RangePickerValue } from 'antd/lib/date-picker/interface'
import { useTranslation } from 'react-i18next'

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

function DiagnoseGenerator({ basePath }: { basePath: string }) {
  const [timeRange, setTimeRange] = useState<[string, string]>(['', ''])
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

  function reportUrl() {
    return `${basePath}/diagnose/report?start_time=${timeRange[0]}&end_time=${timeRange[1]}`
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
      <Button disabled={timeRange[0] === ''}>
        <a href={reportUrl()} target="_blank">
          Generate Diagnose Report
        </a>
      </Button>
    </div>
  )
}

export default DiagnoseGenerator
