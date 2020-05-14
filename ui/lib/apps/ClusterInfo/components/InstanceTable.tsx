import { Divider, Popconfirm, Tooltip, Alert } from 'antd'
import { ColumnActionsMode } from 'office-ui-fabric-react/lib/DetailsList'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DeleteOutlined } from '@ant-design/icons'
import { CardTableV2, InstanceStatusBadge } from '@lib/components'
import DateTime from '@lib/components/DateTime'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { usePersistFn } from '@umijs/hooks'
import {
  buildInstanceTable,
  IInstanceTableItem,
  InstanceStatus,
} from '@lib/utils/instanceTable'
import client from '@lib/client'

function StatusColumn({
  node,
  onHideTiDB,
}: {
  node: IInstanceTableItem
  onHideTiDB: (node) => void
}) {
  const { t } = useTranslation()

  const onConfirm = usePersistFn(() => {
    onHideTiDB && onHideTiDB(node)
  })

  return (
    <span>
      <InstanceStatusBadge status={node.status} />
      {node.instanceKind === 'tidb' && node.status !== InstanceStatus.Up && (
        <>
          <Divider type="vertical" />
          <Popconfirm
            title={t(
              'cluster_info.list.instance_table.actions.hide_db.confirm'
            )}
            onConfirm={onConfirm}
          >
            <Tooltip
              title={t(
                'cluster_info.list.instance_table.actions.hide_db.tooltip'
              )}
            >
              <a>
                <DeleteOutlined />
              </a>
            </Tooltip>
          </Popconfirm>
        </>
      )}
    </span>
  )
}

export default function ListPage() {
  const { t } = useTranslation()
  const {
    data: dataTiDB,
    isLoading: loadingTiDB,
    error: errTiDB,
    sendRequest,
  } = useClientRequest((cancelToken) =>
    client.getInstance().getTiDBTopology({ cancelToken })
  )
  const {
    data: dataStores,
    isLoading: loadingStores,
    error: errStores,
  } = useClientRequest((cancelToken) =>
    client.getInstance().getStoreTopology({ cancelToken })
  )
  const {
    data: dataPD,
    isLoading: loadingPD,
    error: errPD,
  } = useClientRequest((cancelToken) =>
    client.getInstance().getPDTopology({ cancelToken })
  )

  const [tableData, groupData] = useMemo(
    () =>
      buildInstanceTable({
        dataPD,
        dataTiDB,
        dataTiKV: dataStores?.tikv,
        dataTiFlash: dataStores?.tiflash,
        includeTiFlash: true,
      }),
    [dataTiDB, dataStores, dataPD]
  )

  const columns = [
    {
      name: t('cluster_info.list.instance_table.columns.node'),
      key: 'node',
      minWidth: 100,
      maxWidth: 200,
      isResizable: true,
      columnActionsMode: ColumnActionsMode.disabled,
      onRender: (node) => (
        <Tooltip title={`${node.ip}:${node.port}`}>
          <span>
            {node.ip}:{node.port}
          </span>
        </Tooltip>
      ),
    },
    {
      name: t('cluster_info.list.instance_table.columns.status'),
      key: 'status',
      minWidth: 100,
      maxWidth: 100,
      isResizable: true,
      columnActionsMode: ColumnActionsMode.disabled,
      onRender: (node) => (
        <StatusColumn
          node={node}
          onHideTiDB={async (node) => {
            await client
              .getInstance()
              .topologyTidbAddressDelete(`${node.ip}:${node.port}`)
            sendRequest()
          }}
        />
      ),
    },
    {
      name: t('cluster_info.list.instance_table.columns.up_time'),
      key: 'start_timestamp',
      minWidth: 100,
      maxWidth: 200,
      isResizable: true,
      columnActionsMode: ColumnActionsMode.disabled,
      onRender: ({ start_timestamp: ts }) => {
        if (ts !== undefined && ts !== 0) {
          return <DateTime.Calendar unixTimestampMs={ts * 1000} />
        }
      },
    },
    {
      name: t('cluster_info.list.instance_table.columns.version'),
      fieldName: 'version',
      key: 'version',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      columnActionsMode: ColumnActionsMode.disabled,
    },
    {
      name: t('cluster_info.list.instance_table.columns.git_hash'),
      fieldName: 'git_hash',
      key: 'git_hash',
      minWidth: 100,
      maxWidth: 200,
      isResizable: true,
      columnActionsMode: ColumnActionsMode.disabled,
    },
    {
      name: t('cluster_info.list.instance_table.columns.deploy_path'),
      fieldName: 'deploy_path',
      key: 'deploy_path',
      minWidth: 150,
      maxWidth: 300,
      isResizable: true,
      columnActionsMode: ColumnActionsMode.disabled,
    },
  ]

  return (
    <>
      {errTiDB && (
        <Alert message="Load TiDB instances failed" type="error" showIcon />
      )}
      {errStores && (
        <Alert
          message="Load TiKV / TiFlash instances failed"
          type="error"
          showIcon
        />
      )}
      {errPD && (
        <Alert message="Load PD instances failed" type="error" showIcon />
      )}
      <CardTableV2
        cardNoMargin
        loading={loadingTiDB || loadingStores || loadingPD}
        columns={columns}
        items={tableData}
        groups={groupData}
      />
    </>
  )
}
