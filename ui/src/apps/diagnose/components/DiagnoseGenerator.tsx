import React from 'react'
import { Button, DatePicker, Form, Select, Switch, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { Card } from '@pingcap-incubator/dashboard_components'
import { useHistory } from 'react-router-dom'
import client from '@pingcap-incubator/dashboard_client'

const useSubmitHandler = (form) => {
  const history = useHistory()
  return (e) => {
    e.preventDefault()
    form.validateFields(async (err, values) => {
      if (err) {
        return
      }

      const start_time = values.rangeBegin.unix()
      const end_time = start_time + values.rangeDuration * 60
      const compare_start_time = values.isCompare
        ? values.compareRangeBegin.unix()
        : 0
      const compare_end_time = values.isCompare
        ? compare_start_time + values.rangeDuration * 60
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
    })
  }
}

function DiagnoseGenerator(props) {
  const { t } = useTranslation()

  const { getFieldDecorator } = props.form
  const isComapre = props.form.getFieldValue('isCompare')
  const handleSubmit = useSubmitHandler(props.form)

  return (
    <Card title={t('diagnose.generate.title')}>
      <Form onSubmit={handleSubmit}>
        <Form.Item label={t('diagnose.generate.range_begin')}>
          {getFieldDecorator('rangeBegin', {
            rules: [
              {
                required: true,
              },
            ],
          })(<DatePicker showTime />)}
        </Form.Item>
        <Form.Item label={t('diagnose.generate.range_duration')}>
          {getFieldDecorator('rangeDuration', {
            initialValue: 10,
            rules: [
              {
                required: true,
              },
            ],
          })(
            <Select style={{ width: 120 }}>
              <Select.Option value={5}>5 min</Select.Option>
              <Select.Option value={10}>10 min</Select.Option>
              <Select.Option value={30}>30 min</Select.Option>
              <Select.Option value={60}>1 hour</Select.Option>
              <Select.Option value={24 * 60}>1 day</Select.Option>
            </Select>
          )}
        </Form.Item>
        <Form.Item label={t('diagnose.generate.is_compare')}>
          {getFieldDecorator('isCompare', { valuePropName: 'checked' })(
            <Switch />
          )}
        </Form.Item>
        {isComapre && (
          <Form.Item label={t('diagnose.generate.compare_range_begin')}>
            {getFieldDecorator('compareRangeBegin', {
              rules: [
                {
                  required: isComapre,
                },
              ],
            })(<DatePicker showTime />)}
          </Form.Item>
        )}
        <Form.Item>
          <Button type="primary" htmlType="submit">
            {t('diagnose.generate.submit')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

const GenerateForm = Form.create()(DiagnoseGenerator)

export default GenerateForm
