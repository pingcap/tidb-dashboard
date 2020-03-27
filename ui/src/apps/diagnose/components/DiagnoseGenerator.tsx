import React from 'react'
import { Button, DatePicker, Form, Select, Switch, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { Card } from '@pingcap-incubator/dashboard_components'
import { useHistory } from 'react-router-dom'
import client from '@pingcap-incubator/dashboard_client'

const useFinishHandler = (history) => {
  return async (fieldsValue) => {
    const start_time = fieldsValue['rangeBegin'].unix()
    const range_duration = fieldsValue['rangeDuration']
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
      history.push(`/diagnose/${res.data}`)
    } catch (error) {
      message.error(error.message)
    }
  }
}

export default function DiagnoseGenerator() {
  const { t } = useTranslation()
  const history = useHistory()
  const handleFinish = useFinishHandler(history)

  return (
    <Card title={t('diagnose.generate.title')}>
      <Form
        layout="vertical"
        style={{ minWidth: 500 }}
        onFinish={handleFinish}
        initialValues={{ rangeDuration: 10 }}
      >
        <Form.Item
          name="rangeBegin"
          rules={[{ required: true }]}
          label={t('diagnose.generate.range_begin')}
        >
          <DatePicker showTime />
        </Form.Item>
        <Form.Item
          name="rangeDuration"
          rules={[{ required: true }]}
          label={t('diagnose.generate.range_duration')}
        >
          <Select style={{ width: 120 }}>
            <Select.Option value={5}>5 min</Select.Option>
            <Select.Option value={10}>10 min</Select.Option>
            <Select.Option value={30}>30 min</Select.Option>
            <Select.Option value={60}>1 hour</Select.Option>
            <Select.Option value={24 * 60}>1 day</Select.Option>
          </Select>
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
