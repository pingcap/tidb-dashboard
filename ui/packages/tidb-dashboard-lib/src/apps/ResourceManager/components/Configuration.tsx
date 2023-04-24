import { Card, CardTable } from '@lib/components'
import React, { useMemo } from 'react'
import { useResourceManagerContext } from '../context'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { Space, Switch, Typography } from 'antd'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { ResourcemanagerResourceInfoRowDef } from '@lib/client'

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

  const columns: IColumn[] = useMemo(() => {
    return [
      {
        name: 'Resource Group',
        key: 'resource_group',
        minWidth: 100,
        maxWidth: 200,
        onRender: (row: any) => {
          return <span>{row.name}</span>
        }
      },
      {
        name: 'RUs/sec',
        key: 'ru_per_sec',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: any) => {
          return <span>{row.ru_per_sec}</span>
        }
      },
      {
        name: 'Priority',
        key: 'priority',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: any) => {
          return <span>{row.priority}</span>
        }
      },
      {
        name: 'Burstable',
        key: 'burstable',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: any) => {
          return <span>{row.burstable}</span>
        }
      }
    ]
  }, [])

  return (
    <Card title="Configuration">
      <Space direction="vertical" style={{ paddingBottom: 8 }}>
        <Typography.Text>TiDB Resource Manager Enabled</Typography.Text>
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
