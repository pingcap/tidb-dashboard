import { Button, Form, Input, InputNumber, Select, Switch, Modal } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import React, { useState, useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { Card, Pre, DatePicker } from '@lib/components'

import ReportHistory from '../components/ReportHistory'
import { ISystemReportDataSource, SystemReportContext } from '../context'

const useFinishHandler = (
  navigate,
  genReport: ISystemReportDataSource['diagnoseReportsPost']
) => {
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

    const res = await genReport({
      start_time,
      end_time,
      compare_start_time,
      compare_end_time
    })
    navigate(`/system_report/detail?id=${res.data}`)
  }
}

const DURATIONS = [5, 10, 30, 60, 24 * 60]

export default function ReportGenerator() {
  const ctx = useContext(SystemReportContext)

  const { t } = useTranslation()
  const navigate = useNavigate()
  const handleFinish = useFinishHandler(navigate, ctx!.ds.diagnoseReportsPost)

  const [form] = Form.useForm()
  const [isGenerateRelationPosting, setGenerateRelationPosting] =
    useState(false)

  const handleMetricsRelation = useCallback(async () => {
    try {
      await form.validateFields()
    } catch (e) {
      return
    }

    const fieldsValue = form.getFieldsValue()

    const start_time = fieldsValue['rangeBegin'].unix()
    let range_duration = fieldsValue['rangeDuration']
    if (fieldsValue['rangeDuration'] === 0) {
      range_duration = fieldsValue['rangeDurationCustom']
    }
    const end_time = start_time + range_duration * 60

    try {
      setGenerateRelationPosting(true)

      const resp = await ctx!.ds.diagnoseGenerateMetricsRelationship({
        start_time,
        end_time,
        type: 'sum'
      })
      Modal.success({
        title: t('system_report.metrics_relation.success.title'),
        okText: t('system_report.metrics_relation.success.button'),
        okButtonProps: {
          target: '_blank',
          href:
            `${ctx!.cfg.apiPathBase}/diagnose/metrics_relation/view?token=` +
            encodeURIComponent(resp.data)
        }
      })
    } catch (e) {
      const err = e as any
      Modal.error({
        title: 'Error',
        content: <Pre>{err?.response?.data?.message ?? err.message}</Pre>
      })
    }

    setGenerateRelationPosting(false)
  }, [t, form, ctx])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Card title={t('system_report.generate.title')}>
        <Form
          style={{ rowGap: 16 }}
          form={form}
          layout="inline"
          onFinish={handleFinish}
          initialValues={{ rangeDuration: 10, rangeDurationCustom: 10 }}
        >
          <Form.Item
            name="rangeBegin"
            rules={[{ required: true }]}
            label={t('system_report.generate.range_begin')}
          >
            <DatePicker showTime />
          </Form.Item>
          <Form.Item
            label={t('system_report.generate.range_duration')}
            required
          >
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
                    {t('system_report.time_duration.custom')}
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
            label={t('system_report.generate.is_compare')}
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
                    label={t('system_report.generate.compare_range_begin')}
                  >
                    <DatePicker showTime />
                  </Form.Item>
                )
              )
            }}
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {t('system_report.generate.submit')}
            </Button>
          </Form.Item>
          <Form.Item>
            <Button
              onClick={handleMetricsRelation}
              loading={isGenerateRelationPosting}
            >
              {t('system_report.generate.metrics_relation')}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <ReportHistory />
        </ScrollablePane>
      </div>
    </div>
  )
}
