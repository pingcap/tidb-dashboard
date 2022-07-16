import { Button, Form, Input, InputNumber, Select } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { Card } from '@lib/components'
import { DatePicker } from '@lib/components'
import DiagnosisTable from '../components/DiagnosisTable'

const DURATION_MINS = [5, 10, 30, 60, 24 * 60]
const DEF_DURATION_MINS = 10

function minsAgo(mins: number): Dayjs {
  return dayjs().subtract(mins, 'm')
}

export default function DiagnoseGenerator() {
  const { t } = useTranslation()

  const [duration, setDuration] = useState(DEF_DURATION_MINS)
  const [startTime, setStartTime] = useState<Dayjs>(() => minsAgo(duration))
  const timeRange: [number, number] = useMemo(() => {
    const _startTime = dayjs(startTime).unix()
    return [_startTime, _startTime + duration * 60]
  }, [startTime, duration])

  const [stableTimeRange, setStableTimeRange] = useState<[number, number]>([
    0, 0
  ])

  function handleFinish() {
    setStableTimeRange(timeRange)
  }

  const timeChanged = useMemo(
    () =>
      timeRange[0] !== stableTimeRange[0] ||
      timeRange[1] !== stableTimeRange[1],
    [timeRange, stableTimeRange]
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Card title={t('diagnose.generate.title')}>
        <Form
          layout="inline"
          onFinish={handleFinish}
          initialValues={{
            rangeDuration: DEF_DURATION_MINS,
            rangeDurationCustom: DEF_DURATION_MINS
          }}
        >
          <Form.Item
            rules={[{ required: true }]}
            label={t('diagnose.generate.range_begin')}
          >
            <DatePicker
              value={startTime}
              showTime
              onChange={(val) => setStartTime(val || minsAgo(duration))}
            />
          </Form.Item>
          <Form.Item label={t('diagnose.generate.range_duration')} required>
            <Input.Group compact>
              <Form.Item
                name="rangeDuration"
                rules={[{ required: true }]}
                noStyle
              >
                <Select
                  style={{ width: 120 }}
                  onChange={(val) =>
                    setDuration((val as number) || DEF_DURATION_MINS)
                  }
                >
                  {DURATION_MINS.map((val) => (
                    <Select.Option key={val} value={val}>
                      {getValueFormat('m')(val, 0)}
                    </Select.Option>
                  ))}
                  <Select.Option value={0}>
                    {t('diagnose.time_duration.custom')}
                  </Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prev, cur) =>
                  prev.rangeDuration !== cur.rangeDuration
                }
              >
                {({ getFieldValue }) => {
                  return (
                    getFieldValue('rangeDuration') === 0 && (
                      <Form.Item
                        noStyle
                        name="rangeDurationCustom"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={1}
                          max={30 * 24 * 60}
                          formatter={(value) => `${value} min`}
                          parser={(value) =>
                            parseInt(value?.replace(/[^\d]/g, '') || '')
                          }
                          style={{ width: 120 }}
                          onChange={(val) => setDuration(val as number)}
                        />
                      </Form.Item>
                    )
                  )
                }}
              </Form.Item>
            </Input.Group>
          </Form.Item>
          {timeChanged && (
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {t('diagnose.generate.submit')}
              </Button>
            </Form.Item>
          )}
        </Form>
      </Card>

      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <DiagnosisTable
            stableTimeRange={stableTimeRange}
            unstableTimeRange={timeRange}
            kind="config"
          />
          <DiagnosisTable
            stableTimeRange={stableTimeRange}
            unstableTimeRange={timeRange}
            kind="performance"
          />
          <DiagnosisTable
            stableTimeRange={stableTimeRange}
            unstableTimeRange={timeRange}
            kind="error"
          />
        </ScrollablePane>
      </div>
    </div>
  )
}
