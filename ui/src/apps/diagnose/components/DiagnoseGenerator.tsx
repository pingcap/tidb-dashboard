import React, { useState } from 'react'
import { Button, DatePicker, message } from 'antd'
import { RangePickerValue } from 'antd/lib/date-picker/interface'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

interface Props {
  createReport: (
    startTime: string,
    endTime: string,
    compareStartTime?: string,
    compareEndTime?: string
  ) => Promise<ReportRes>
}

interface ReportRes {
  report_id: string
}

function DiagnoseGenerator({ createReport }: Props) {
  const [timeRange, setTimeRange] = useState<RangePickerValue>([])
  const [comparedTimeRange, setComparedTimeRange] = useState<RangePickerValue>(
    []
  )
  const [showCompare, setShowCompare] = useState(false)
  const { t } = useTranslation()
  const history = useHistory()

  async function genReport(compare: boolean) {
    try {
      let res
      if (compare) {
        res = await createReport(
          timeRange[0]?.unix() + '',
          timeRange[1]?.unix() + '',
          comparedTimeRange[0]?.unix() + '',
          comparedTimeRange[1]?.unix() + ''
        )
      } else {
        res = await createReport(
          timeRange[0]?.unix() + '',
          timeRange[1]?.unix() + ''
        )
      }
      history.push(`/diagnose/${res.report_id}`)
    } catch (error) {
      message.error(error.message)
    }
  }

  return (
    <div>
      <div>
        {/* if user clear the range picker, dates is [], _dateStrs is ['',''] */}
        <DatePicker.RangePicker
          style={{ width: 360, marginRight: 12 }}
          showTime
          format={DATE_TIME_FORMAT}
          placeholder={[
            t('diagnose.time_selector.start_time'),
            t('diagnose.time_selector.end_time'),
          ]}
          onChange={(dates, _dateStrs) => setTimeRange(dates)}
        />
        <Button
          disabled={timeRange[0] === undefined}
          onClick={() => genReport(false)}
        >
          {t('diagnose.gen_report')}
        </Button>
        <Button
          style={{ marginLeft: 12 }}
          onClick={() => setShowCompare(prev => !prev)}
        >
          {showCompare
            ? t('diagnose.cancel_compare')
            : t('diagnose.add_compare')}
        </Button>
      </div>
      {showCompare && (
        <div style={{ marginTop: 16 }}>
          <p>{t('diagnose.compare')}</p>
          <DatePicker.RangePicker
            style={{ width: 360, marginRight: 12 }}
            showTime
            format={DATE_TIME_FORMAT}
            placeholder={[
              t('diagnose.time_selector.start_time'),
              t('diagnose.time_selector.end_time'),
            ]}
            onChange={(dates, _dateStrs) => setComparedTimeRange(dates)}
          />
          <Button
            disabled={
              timeRange[0] === undefined || comparedTimeRange[0] === undefined
            }
            onClick={() => genReport(true)}
          >
            {t('diagnose.gen_compared_report')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default DiagnoseGenerator
