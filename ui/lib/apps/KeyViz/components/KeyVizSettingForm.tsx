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

const policyConfigurable = process.env.NODE_ENV === 'development'

interface Props {
  onClose: () => void
  onConfigUpdated: () => any
}

type SeparatorStatus = {
  validateStatus: 'warning' | 'success'
  hasFeedback: boolean
  help: string
}

const negateSwitchProps = {
  getValueProps: (value) => ({ checked: value !== true }),
  getValueFromEvent: (checked) => !checked,
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

  // ==MARK==
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

  // ==MARK==
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

  // ==MARK==
  const onUpdateServiceStatus = (values) => {
    setSubmitting(true)
    client
      .getInstance()
      .keyvisualConfigPut(values)
      .then(onSubmitted, onSubmitted)
  }

  const onSubmit = (values) => {
    if (
      config?.auto_collection_disabled !== true &&
      values.auto_collection_disabled === true
    ) {
      Modal.confirm({
        title: t('keyviz.settings.close_keyviz'),
        icon: <ExclamationCircleOutlined />,
        content: t('keyviz.settings.close_keyviz_warning'),
        okText: t('keyviz.settings.actions.close'),
        cancelText: t('keyviz.settings.actions.cancel'),
        okButtonProps: { danger: true },
        onOk: () => onUpdateServiceStatus(values),
      })
    } else {
      onUpdateServiceStatus(values)
    }
  }

  useEffect(onFetchServiceStatus, [])

  const [form] = Form.useForm()
  const onValuesChange = useCallback(
    (changedValues, values) => {
      if (changedValues?.auto_collection_disabled !== true && !values?.policy) {
        form.setFieldsValue({ policy: 'db' })
      }
      if (
        config?.policy !== 'kv' &&
        changedValues?.policy === 'kv' &&
        !values?.policy_kv_separator
      ) {
        form.setFieldsValue({ policy_kv_separator: '/' })
      }
    },
    [form, config]
  )
  const policyOptions = useMemo(() => getPolicyOptions(t), [t])
  const validateSeparator = useMemo(() => getSeparatorValidator(t), [t])

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
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const enabled = getFieldValue('auto_collection_disabled') !== true
              const policy = getFieldValue('policy')
              const separator = getFieldValue('policy_kv_separator')
              return (
                <>
                  <Form.Item
                    name="auto_collection_disabled"
                    label={t('keyviz.settings.switch')}
                    {...negateSwitchProps}
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name="policy"
                    label={t('keyviz.settings.policy')}
                    style={{
                      display:
                        !policyConfigurable || !enabled ? 'none' : undefined,
                    }}
                  >
                    <Radio.Group>{policyOptions}</Radio.Group>
                  </Form.Item>
                  <Form.Item
                    name="policy_kv_separator"
                    label={t('keyviz.settings.separator')}
                    style={{
                      display:
                        !policyConfigurable || !enabled || policy !== 'kv'
                          ? 'none'
                          : undefined,
                    }}
                    {...validateSeparator(separator)}
                  >
                    <Input
                      placeholder={t('keyviz.settings.separator_placeholder')}
                    />
                  </Form.Item>
                </>
              )
            }}
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
