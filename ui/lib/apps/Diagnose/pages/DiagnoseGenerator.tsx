import { Button, Form, Input, InputNumber, Select } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { Card } from '@lib/components'
import { DatePicker } from '@lib/components'
import DiagnosisTable from '../components/DiagnosisTable'

const DURATIONS = [5, 10, 30, 60, 24 * 60]

export default function DiagnoseGenerator() {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 0])

  async function handleFinish(fieldsValue) {
    const start_time = fieldsValue['rangeBegin'].unix()
    let range_duration = fieldsValue['rangeDuration']
    if (fieldsValue['rangeDuration'] === 0) {
      range_duration = fieldsValue['rangeDurationCustom']
    }

    const end_time = start_time + range_duration * 60
    setTimeRange([start_time, end_time])
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Card title={t('diagnose.generate.title')}>
        <Form
          layout="inline"
          onFinish={handleFinish}
          initialValues={{ rangeDuration: 10, rangeDurationCustom: 10 }}
        >
          <Form.Item
            name="rangeBegin"
            rules={[{ required: true }]}
            label={t('diagnose.generate.range_begin')}
          >
            <DatePicker showTime />
          </Form.Item>
          <Form.Item label={t('diagnose.generate.range_duration')} required>
            <Input.Group compact>
              <Form.Item
                name="rangeDuration"
                rules={[{ required: true }]}
                noStyle
              >
                <Select style={{ width: 120 }}>
                  {DURATIONS.map((val) => (
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
                          parser={(value) => value?.replace(/[^\d]/g, '') || ''}
                          style={{ width: 120 }}
                        />
                      </Form.Item>
                    )
                  )
                }}
              </Form.Item>
            </Input.Group>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {t('diagnose.generate.submit')}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <DiagnosisTable timeRange={timeRange} kind="config" />
          <DiagnosisTable timeRange={timeRange} kind="error" />
          <DiagnosisTable timeRange={timeRange} kind="profile" />
        </ScrollablePane>
      </div>
    </div>
  )
}
