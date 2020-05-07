import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Form,
  Skeleton,
  Switch,
  Space,
  Button,
  Modal,
  Radio,
  Input,
} from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import client, { ConfigKeyVisualConfig } from '@lib/client'

interface Props {
  onClose: () => void
  onConfigUpdated: () => any
}

type SeparatorStatus = {
  validateStatus: 'warning' | 'success'
  hasFeedback: boolean
  help: string
}

function getSeparatorValidator(t) {
  const separatorEmptyStatus: SeparatorStatus = {
    validateStatus: 'warning',
    hasFeedback: true,
    help: t('keyviz.settings.separator_empty_warning'),
  }
  const separatorNotEmptyStatus: SeparatorStatus = {
    validateStatus: 'success',
    hasFeedback: true,
    help: '',
  }
  return (value: string | undefined) =>
    value === undefined || value === ''
      ? separatorEmptyStatus
      : separatorNotEmptyStatus
}

function getPolicyOptions(t) {
  return ['db', 'kv'].map((policy) => {
    let label = t(`keyviz.settings.policy_${policy}`)
    return (
      <Radio.Button key={policy} value={policy}>
        {label}
      </Radio.Button>
    )
  })
}

function KeyVizSettingForm({ onClose, onConfigUpdated }: Props) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [config, setConfig] = useState<ConfigKeyVisualConfig | null>(null)
  const { t } = useTranslation()

  const onFetchServiceStatus = () => {
    setLoading(true)
    client
      .getInstance()
      .keyvisualConfigGet()
      .then(
        (r) => {
          setConfig({ ...r.data })
          setLoading(false)
        },
        () => {
          setLoading(false)
        }
      )
  }

  const onSubmitted = () => {
    client
      .getInstance()
      .keyvisualConfigGet()
      .then(
        (r) => {
          setConfig({ ...r.data })
          setSubmitting(false)
          onClose()
          setTimeout(onConfigUpdated, 500)
        },
        () => {
          setSubmitting(false)
        }
      )
  }

  const onUpdateServiceStatus = (values) => {
    setSubmitting(true)
    client
      .getInstance()
      .keyvisualConfigPut(values)
      .then(onSubmitted, onSubmitted)
  }

  const onSubmit = (values) => {
    if (config?.auto_collection_enabled && !values.auto_collection_enabled) {
      Modal.confirm({
        title: t('keyviz.settings.close_keyviz'),
        icon: <ExclamationCircleOutlined />,
        content: t('keyviz.settings.close_keyviz_warning'),
        okText: t('keyviz.settings.actions.close'),
        cancelText: t('keyviz.settings.actions.cancel'),
        okButtonProps: { type: 'danger' },
        onOk: () => onUpdateServiceStatus(values),
      })
    } else {
      onUpdateServiceStatus(values)
    }
  }

  useEffect(onFetchServiceStatus, [])

  const [form] = Form.useForm()
  const prevPolicy = form.getFieldValue('policy')
  const onValuesChange = useCallback(
    (changedValues, values) => {
      if (changedValues?.auto_collection_enabled && !values?.policy) {
        form.setFieldsValue({ policy: 'db' })
      }
      if (
        prevPolicy !== 'kv' &&
        changedValues?.policy === 'kv' &&
        !values?.policy_kv_separator
      ) {
        form.setFieldsValue({ policy_kv_separator: '/' })
      }
    },
    [form, prevPolicy]
  )
  const policyOptions = useMemo(() => getPolicyOptions(t), [t])
  const separatorValidator = useMemo(() => getSeparatorValidator(t), [t])

  return (
    <>
      {loading && <Skeleton active={true} paragraph={{ rows: 5 }} />}
      {!loading && config && (
        <Form
          layout="vertical"
          form={form}
          initialValues={config}
          onFinish={onSubmit}
          onValuesChange={onValuesChange}
        >
          <Form.Item
            name="auto_collection_enabled"
            valuePropName="checked"
            label={t('keyviz.settings.switch')}
          >
            <Switch />
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) =>
              getFieldValue('auto_collection_enabled') && (
                <Form.Item name="policy" label={t('keyviz.settings.policy')}>
                  <Radio.Group>{policyOptions}</Radio.Group>
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) =>
              getFieldValue('auto_collection_enabled') &&
              getFieldValue('policy') === 'kv' && (
                <Form.Item
                  name="policy_kv_separator"
                  label={t('keyviz.settings.separator')}
                  {...separatorValidator(getFieldValue('policy_kv_separator'))}
                >
                  <Input
                    placeholder={t('keyviz.settings.separator_placeholder')}
                  />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {t('keyviz.settings.actions.save')}
              </Button>
              <Button onClick={onClose}>
                {t('keyviz.settings.actions.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </>
  )
}

export default KeyVizSettingForm
