import React, { useMemo } from 'react'
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
import { Card } from '@pingcap-incubator/dashboard_components'
import { useNavigate } from 'react-router-dom'
import client from '@pingcap-incubator/dashboard_client'

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

export default function DiagnoseGenerator() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const handleFinish = useFinishHandler(navigate)

  const rangeDurationOptions = useMemo(
    () => [
      {
        val: 5,
        text: t('diagnose.time_duration.min_with_count', { count: 5 }),
      },
      {
        val: 10,
        text: t('diagnose.time_duration.min_with_count', { count: 10 }),
      },
      {
        val: 30,
        text: t('diagnose.time_duration.min_with_count', { count: 30 }),
      },
      {
        val: 60,
        text: t('diagnose.time_duration.hour_with_count', { count: 1 }),
      },
      {
        val: 24 * 60,
        text: t('diagnose.time_duration.day_with_count', { count: 1 }),
      },
      {
        val: 0,
        text: t('diagnose.time_duration.custom'),
      },
    ],
    [t]
  )

  return (
    <Card title={t('diagnose.generate.title')}>
      <Form
        layout="vertical"
        style={{ minWidth: 500 }}
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
                {rangeDurationOptions.map((item) => (
                  <Select.Option key={item.val} value={item.val}>
                    {item.text}
                  </Select.Option>
                ))}
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
                        formatter={(value) =>
                          `${value} ${t('diagnose.time_duration.min')}`
                        }
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
  )
}
