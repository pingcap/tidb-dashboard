import React from 'react'
import {
  Button,
  DatePicker,
  Form,
  Select,
  Switch,
  Input,
  InputNumber,
  message,
} from 'antd'
import { useTranslation } from 'react-i18next'
import { Card } from '@lib/components'
import { useNavigate } from 'react-router-dom'
import client from '@lib/client'
import DiagnoseHistory from './DiagnoseHistory'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { getValueFormat } from '@baurine/grafana-value-formats'

const useFinishHandler = (navigate) => {
  return async (fieldsValue) => {
    const start_time = fieldsValue['rangeBegin'].unix()
    let range_duration = fieldsValue['rangeDuration']
    if (fieldsValue['rangeDuration'] === 0) {
      range_duration = fieldsValue['rangeDurationCustom']
    }
    const is_compare = fieldsValue['isCompare']
    const compare_range_begin = fieldsValue['compareRangeBegin']

    const end_time = start_time + range_duration * 60
    const compare_start_time = is_compare ? compare_range_begin.unix() : 0
    const compare_end_time = is_compare
      ? compare_start_time + range_duration * 60
      : 0

    try {
      const res = await client.getInstance().diagnoseReportsPost({
        start_time,
        end_time,
        compare_start_time,
        compare_end_time,
      })
      navigate(`/diagnose/${res.data}`)
    } catch (error) {
      message.error(error.message)
    }
  }
}

const DURATIONS = [5, 10, 30, 60, 24 * 60]

export default function DiagnoseGenerator() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const handleFinish = useFinishHandler(navigate)

  return (
    <ScrollablePane style={{ height: '100vh' }}>
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
          <Form.Item
            name="isCompare"
            valuePropName="checked"
            label={t('diagnose.generate.is_compare')}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.isCompare !== cur.isCompare}
          >
            {({ getFieldValue }) => {
              return (
                getFieldValue('isCompare') && (
                  <Form.Item
                    name="compareRangeBegin"
                    rules={[{ required: true }]}
                    label={t('diagnose.generate.compare_range_begin')}
                  >
                    <DatePicker showTime />
                  </Form.Item>
                )
              )
            }}
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {t('diagnose.generate.submit')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <DiagnoseHistory />
    </ScrollablePane>
  )
}
