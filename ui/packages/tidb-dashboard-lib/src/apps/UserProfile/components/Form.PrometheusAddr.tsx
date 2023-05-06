import { AnimatedSkeleton, Blink, ErrorBar } from '@lib/components'
import { useIsWriteable } from '@lib/utils/store'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { Button, Form, Input, Radio, Space, Typography } from 'antd'
import React, { useContext } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_FORM_ITEM_STYLE } from '../utils/helper'
import { UserProfileContext } from '../context'

export function PrometheusAddressForm() {
  const ctx = useContext(UserProfileContext)

  const { t } = useTranslation()
  const isWriteable = useIsWriteable()
  const [isChanged, setIsChanged] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const handleValuesChange = useCallback(() => setIsChanged(true), [])
  const { error, isLoading, data } = useClientRequest(
    ctx!.ds.metricsGetPromAddress
  )
  const isInitialLoad = useRef(true)
  const initialForm = useRef<any>(null) // Used for "Cancel" behaviour
  const [form] = Form.useForm()

  useEffect(() => {
    if (data && isInitialLoad.current) {
      isInitialLoad.current = false
      form.setFieldsValue({
        sourceType:
          (data.customized_addr?.length ?? 0) > 0 ? 'custom' : 'deployment',
        customAddr: data.customized_addr
      })
      initialForm.current = { ...form.getFieldsValue() }
    }
  }, [data, form])

  const handleFinish = useCallback(
    async (values) => {
      let address = ''
      if (values.sourceType === 'custom') {
        address = values.customAddr || ''
      }
      try {
        setIsPosting(true)
        const resp = await ctx!.ds.metricsSetCustomPromAddress({ address })
        const customAddr = resp?.data?.normalized_address ?? ''
        form.setFieldsValue({ customAddr })
        initialForm.current = { ...form.getFieldsValue() }
        setIsChanged(false)
      } finally {
        setIsPosting(false)
      }
    },
    [form, ctx]
  )

  const handleCancel = useCallback(() => {
    form.setFieldsValue({ ...initialForm.current })
    setIsChanged(false)
  }, [form])

  return (
    <Blink activeId="profile.prometheus">
      <Form
        layout="vertical"
        onValuesChange={handleValuesChange}
        form={form}
        onFinish={handleFinish}
      >
        <AnimatedSkeleton loading={isLoading}>
          <Form.Item
            name="sourceType"
            label={t('user_profile.service_endpoints.prometheus.title')}
          >
            <Radio.Group disabled={isLoading || error || !data || !isWriteable}>
              <Space direction="vertical">
                {error && <ErrorBar errors={[error]} />}
                <Radio value="deployment">
                  <Space>
                    <span>
                      {t(
                        'user_profile.service_endpoints.prometheus.form.deployed'
                      )}
                    </span>
                    <span>
                      {(data?.deployed_addr?.length ?? 0) > 0 &&
                        `(${data!.deployed_addr})`}
                      {data && data.deployed_addr?.length === 0 && (
                        <Typography.Text type="secondary">
                          (
                          {t(
                            'user_profile.service_endpoints.prometheus.form.not_deployed'
                          )}
                          )
                        </Typography.Text>
                      )}
                    </span>
                  </Space>
                </Radio>
                <Radio value="custom">
                  {t('user_profile.service_endpoints.prometheus.form.custom')}
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </AnimatedSkeleton>
        <Form.Item noStyle shouldUpdate>
          {(f) =>
            f.getFieldValue('sourceType') === 'custom' && (
              <Form.Item
                name="customAddr"
                label={t(
                  'user_profile.service_endpoints.prometheus.custom_form.address'
                )}
                rules={[{ required: true }]}
              >
                <Input
                  style={DEFAULT_FORM_ITEM_STYLE}
                  placeholder="http://IP:PORT"
                  disabled={!isWriteable}
                />
              </Form.Item>
            )
          }
        </Form.Item>
        {isChanged && (
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isPosting}>
                {t('user_profile.service_endpoints.prometheus.form.update')}
              </Button>
              <Button onClick={handleCancel}>
                {t('user_profile.service_endpoints.prometheus.form.cancel')}
              </Button>
            </Space>
          </Form.Item>
        )}
      </Form>
    </Blink>
  )
}
