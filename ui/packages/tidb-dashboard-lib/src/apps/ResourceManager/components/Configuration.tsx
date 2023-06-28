import { Card, CardTable } from '@lib/components'
import React, { useMemo } from 'react'
import { useResourceManagerContext } from '../context'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { Space, Switch, Typography } from 'antd'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { ResourcemanagerResourceInfoRowDef } from '@lib/client'
import { useTranslation } from 'react-i18next'

type ConfigurationProps = {
  info: ResourcemanagerResourceInfoRowDef[]
  loadingInfo: boolean
}

export const Configuration: React.FC<ConfigurationProps> = ({
  info,
  loadingInfo
}) => {
  const ctx = useResourceManagerContext()
  const { data: config, isLoading: loadingConfig } = useClientRequest(
    ctx.ds.getConfig
  )
  const { t } = useTranslation()

  const columns: IColumn[] = useMemo(() => {
    return [
      {
        name: t('resource_manager.configuration.table_fields.resource_group'),
        key: 'resource_group',
        minWidth: 100,
        maxWidth: 400,
        onRender: (row: any) => {
          return <span>{row.name}</span>
        }
      },
      {
        name: t('resource_manager.configuration.table_fields.ru_per_sec'),
        key: 'ru_per_sec',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: any) => {
          return <span>{row.ru_per_sec}</span>
        }
      },
      {
        name: t('resource_manager.configuration.table_fields.priority'),
        key: 'priority',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: any) => {
          return <span>{row.priority}</span>
        }
      },
      {
        name: t('resource_manager.configuration.table_fields.burstable'),
        key: 'burstable',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: any) => {
          return <span>{row.burstable}</span>
        }
      }
    ]
  }, [t])

  return (
    <Card title={t('resource_manager.configuration.title')}>
      <Space direction="vertical" style={{ paddingBottom: 8 }}>
        <Typography.Text>
          {t('resource_manager.configuration.enabled')}
        </Typography.Text>
        <Switch
          loading={loadingConfig}
          checked={config?.enable}
          disabled={true}
        />
      </Space>

      <CardTable
        cardNoMargin
        loading={loadingInfo}
        columns={columns}
        items={info}
      />
    </Card>
  )
}
