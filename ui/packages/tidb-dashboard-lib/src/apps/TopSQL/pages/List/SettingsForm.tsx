import React, {
  useState,
  useCallback,
  useContext,
  useEffect,
  useMemo
} from 'react'
import { Form, Skeleton, Switch, Space, Button, Modal } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { TopsqlEditableConfig } from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { DrawerFooter, ErrorBar } from '@lib/components'
import { useIsWriteable } from '@lib/utils/store'
import { telemetry } from '../../utils/telemetry'
import { TopSQLContext } from '../../context'
import styles from './SettingsForm.module.less'

interface Props {
  onClose: () => void
  onConfigUpdated: () => any
}

interface FormValues {
  enable: boolean
  tikv_network_io_collection: boolean
}

export function SettingsForm({ onClose, onConfigUpdated }: Props) {
  const ctx = useContext(TopSQLContext)

  const [form] = Form.useForm<FormValues>()
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation()
  const isWriteable = useIsWriteable()

  const {
    data: initialConfig,
    isLoading: loading,
    error
  } = useClientRequest(ctx!.ds.topsqlConfigGet)

  const {
    data: initialTikvNetworkIoCollection,
    isLoading: loadingTikvNetworkIoCollection,
    error: errorTikvNetworkIoCollection
  } = useClientRequest(ctx!.ds.topsqlTikvNetworkIoCollectionGet)

  const handleSubmit = useCallback(
    (values: FormValues) => {
      async function updateConfig(values: FormValues) {
        const newConfig: TopsqlEditableConfig = {
          enable: values.enable
        }
        try {
          setSubmitting(true)
          const shouldCheckTikvCollectionResult =
            values.tikv_network_io_collection &&
            form.isFieldTouched('tikv_network_io_collection')
          const [, tikvCollectionUpdateResponse] = await Promise.all([
            ctx!.ds.topsqlConfigPost(newConfig),
            ctx!.ds.topsqlTikvNetworkIoCollectionPost({
              enable: values.tikv_network_io_collection
            })
          ])
          const tikvCollectionWarningMessages = (
            tikvCollectionUpdateResponse.data.warnings ?? []
          )
            .map((w) => w.message || w.full_text || '')
            .filter((msg) => !!msg)
          let tikvCollectionAfterSave:
            | { enable: boolean; is_multi_value?: boolean }
            | undefined
          if (shouldCheckTikvCollectionResult) {
            try {
              const resp = await ctx!.ds.topsqlTikvNetworkIoCollectionGet()
              tikvCollectionAfterSave = resp.data
            } catch {
              // Ignore this best-effort check so save flow remains non-blocking.
            }
          }

          telemetry.saveSettings({
            ...newConfig,
            tikv_network_io_collection: values.tikv_network_io_collection
          })
          onClose()
          onConfigUpdated()

          if (values.enable && !initialConfig?.enable) {
            Modal.success({
              title: t('topsql.settings.enable_info.title'),
              content: t('topsql.settings.enable_info.content')
            })
          }

          if (shouldCheckTikvCollectionResult) {
            const isPartialAfterSave =
              tikvCollectionAfterSave?.is_multi_value === true
            const isAllEnabledAfterSave =
              tikvCollectionAfterSave?.enable === true
            if (
              !isPartialAfterSave &&
              isAllEnabledAfterSave &&
              tikvCollectionWarningMessages.length === 0
            ) {
              Modal.success({
                title: t(
                  'topsql.settings.tikv_network_io_collection_info.title'
                ),
                content: (
                  <div className={styles.successInfoContent}>
                    <div>
                      {t(
                        'topsql.settings.tikv_network_io_collection_info.content_prefix'
                      )}
                    </div>
                    <strong className={styles.successInfoEmphasis}>
                      {t(
                        'topsql.settings.tikv_network_io_collection_info.content_emphasis'
                      )}
                    </strong>
                  </div>
                )
              })
            } else {
              Modal.warning({
                title: t(
                  'topsql.settings.tikv_network_io_collection_partial_info.title'
                ),
                content: (
                  <div className={styles.partialResultContent}>
                    <div>
                      {t(
                        'topsql.settings.tikv_network_io_collection_partial_info.content'
                      )}
                    </div>
                    {tikvCollectionWarningMessages.length > 0 && (
                      <pre className={styles.partialResultWarnings}>
                        {tikvCollectionWarningMessages.join('\n')}
                      </pre>
                    )}
                    <a
                      onClick={() =>
                        window.open(t('topsql.settings.help_url'), '_blank')
                      }
                    >
                      {t(
                        'topsql.settings.tikv_network_io_collection_partial_info.action'
                      )}
                    </a>
                  </div>
                )
              })
            }
          }
        } finally {
          setSubmitting(false)
        }
      }

      if (!values.enable && (initialConfig?.enable ?? true)) {
        // warning
        Modal.confirm({
          title: t('topsql.settings.disable_feature'),
          icon: <ExclamationCircleOutlined />,
          content: t('topsql.settings.disable_warning'),
          okText: t('topsql.settings.actions.close'),
          cancelText: t('topsql.settings.actions.cancel'),
          okButtonProps: { danger: true },
          onOk: () => updateConfig(values)
        })
      } else {
        updateConfig(values)
      }
    },
    [t, onClose, onConfigUpdated, initialConfig, ctx, form]
  )

  const combinedLoading = loading || loadingTikvNetworkIoCollection
  const combinedError = [error, errorTikvNetworkIoCollection].filter((e) => !!e)
  const topsqlEnabled = Form.useWatch('enable', form)
  const tikvNetworkIoCollectionEnabled = Form.useWatch(
    'tikv_network_io_collection',
    form
  )
  const tikvStatusText = useMemo(() => {
    if (topsqlEnabled === false) {
      return t('topsql.settings.tikv_network_io_collection_disabled_by_topsql')
    }
    if (!initialTikvNetworkIoCollection) {
      return ''
    }
    if (initialTikvNetworkIoCollection.is_multi_value) {
      return t('topsql.settings.tikv_network_io_collection_status.partial')
    }
    return initialTikvNetworkIoCollection.enable
      ? t('topsql.settings.tikv_network_io_collection_status.on')
      : t('topsql.settings.tikv_network_io_collection_status.off')
  }, [topsqlEnabled, initialTikvNetworkIoCollection, t])
  const showTikvNetworkIoCollectionPartialState = useMemo(() => {
    if (topsqlEnabled === false) {
      return false
    }
    if (!initialTikvNetworkIoCollection?.is_multi_value) {
      return false
    }
    if (form.isFieldTouched('tikv_network_io_collection')) {
      return false
    }
    return (
      tikvNetworkIoCollectionEnabled === initialTikvNetworkIoCollection.enable
    )
  }, [
    topsqlEnabled,
    initialTikvNetworkIoCollection,
    tikvNetworkIoCollectionEnabled,
    form
  ])
  const tikvNetworkIoCollectionTooltip = useMemo(() => {
    return showTikvNetworkIoCollectionPartialState
      ? t('topsql.settings.tikv_network_io_collection_tooltip_partial')
      : t('topsql.settings.tikv_network_io_collection_tooltip')
  }, [showTikvNetworkIoCollectionPartialState, t])

  useEffect(() => {
    if (topsqlEnabled === false) {
      form.setFieldsValue({ tikv_network_io_collection: false })
    }
  }, [topsqlEnabled, form])

  return (
    <>
      {combinedError.length > 0 && <ErrorBar errors={combinedError} />}
      {combinedLoading && <Skeleton active={true} paragraph={{ rows: 6 }} />}
      {!combinedLoading && initialConfig && (
        <Form
          layout="vertical"
          form={form}
          initialValues={{
            ...initialConfig,
            tikv_network_io_collection:
              initialTikvNetworkIoCollection?.enable ?? false
          }}
          onFinish={handleSubmit}
        >
          <Form.Item
            valuePropName="checked"
            label={t('topsql.settings.enable')}
            extra={t('topsql.settings.enable_tooltip')}
          >
            <Form.Item noStyle name="enable" valuePropName="checked">
              <Switch
                data-e2e="topsql_settings_enable"
                disabled={!isWriteable}
              />
            </Form.Item>
          </Form.Item>

          <Form.Item
            valuePropName="checked"
            label={t('topsql.settings.tikv_network_io_collection')}
            extra={tikvNetworkIoCollectionTooltip}
          >
            <div className={styles.switchWithStatus}>
              <Form.Item
                noStyle
                name="tikv_network_io_collection"
                valuePropName="checked"
              >
                <Switch
                  data-e2e="topsql_settings_tikv_network_io_collection"
                  disabled={!isWriteable || topsqlEnabled === false}
                  className={
                    showTikvNetworkIoCollectionPartialState
                      ? styles.partialSwitch
                      : undefined
                  }
                  checkedChildren={
                    showTikvNetworkIoCollectionPartialState ? '-' : undefined
                  }
                  unCheckedChildren={
                    showTikvNetworkIoCollectionPartialState ? '-' : undefined
                  }
                />
              </Form.Item>
              {tikvStatusText && (
                <span className={styles.switchStatus}>{tikvStatusText}</span>
              )}
            </div>
          </Form.Item>
          <DrawerFooter>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                disabled={!isWriteable}
                data-e2e="topsql_settings_save"
              >
                {t('topsql.settings.actions.save')}
              </Button>
              <Button onClick={onClose}>
                {t('topsql.settings.actions.cancel')}
              </Button>
            </Space>
          </DrawerFooter>
        </Form>
      )}
    </>
  )
}
