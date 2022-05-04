import { DeleteOutlined } from '@ant-design/icons'
import { useMemoizedFn } from 'ahooks'
import { Divider, Popconfirm, Tooltip } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import client from '@lib/client'
import { CardTable, InstanceStatusBadge } from '@lib/components'
import DateTime from '@lib/components/DateTime'
import {
  buildInstanceTable,
  IInstanceTableItem,
  InstanceStatus,
} from '@lib/utils/instanceTable'
import { useClientRequest } from '@lib/utils/useClientRequest'

function StatusColumn({
  node,
  onHideTiDB,
}: {
  node: IInstanceTableItem
  onHideTiDB: (node) => void
}) {
  const { t } = useTranslation()

  const onConfirm = useMemoizedFn(() => {
    onHideTiDB && onHideTiDB(node)
  })

  return (
    <span>
      {node.instanceKind === 'tidb' && node.status !== InstanceStatus.Up && (
        <>
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
          <Divider type="vertical" />
        </>
      )}
      <InstanceStatusBadge status={node.status} />
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
  } = useClientRequest((reqConfig) =>
    client.getInstance().getTiDBTopology(reqConfig)
  )

  const {
    data: dataStores,
    isLoading: loadingStores,
    error: errStores,
  } = useClientRequest((reqConfig) =>
    client.getInstance().getStoreTopology(reqConfig)
  )

  const {
    data: dataPD,
    isLoading: loadingPD,
    error: errPD,
  } = useClientRequest((reqConfig) =>
    client.getInstance().getPDTopology(reqConfig)
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

  const handleHideTiDB = useCallback(
    async (node) => {
      await client
        .getInstance()
        .topologyTidbAddressDelete(`${node.ip}:${node.port}`)
      sendRequest()
    },
    [sendRequest]
  )

  const columns = useMemo(
    () => [
      {
        name: t('cluster_info.list.instance_table.columns.node'),
        key: 'node',
        minWidth: 100,
        maxWidth: 160,
        onRender: ({ ip, port }) => {
          const fullName = `${ip}:${port}`
          return (
            <Tooltip title={fullName}>
              <span>{fullName}</span>
            </Tooltip>
          )
        },
      },
      {
        name: t('cluster_info.list.instance_table.columns.status'),
        key: 'status',
        minWidth: 100,
        maxWidth: 120,
        onRender: (node) => (
          <StatusColumn node={node} onHideTiDB={handleHideTiDB} />
        ),
      },
      {
        name: t('cluster_info.list.instance_table.columns.up_time'),
        key: 'start_timestamp',
        minWidth: 100,
        maxWidth: 150,
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
        onRender: ({ version }) => (
          <Tooltip title={version}>
            <span>{version}</span>
          </Tooltip>
        ),
      },
      {
        name: t('cluster_info.list.instance_table.columns.git_hash'),
        fieldName: 'git_hash',
        key: 'git_hash',
        minWidth: 100,
        maxWidth: 200,
        onRender: ({ git_hash }) => (
          <Tooltip title={git_hash}>
            <span>{git_hash}</span>
          </Tooltip>
        ),
      },
      {
        name: t('cluster_info.list.instance_table.columns.deploy_path'),
        fieldName: 'deploy_path',
        key: 'deploy_path',
        minWidth: 150,
        maxWidth: 300,
        onRender: ({ deploy_path }) => (
          <Tooltip title={deploy_path}>
            <span>{deploy_path}</span>
          </Tooltip>
        ),
      },
    ],
    [t, handleHideTiDB]
  )

  return (
    <CardTable
      disableSelectionZone
      cardNoMargin
      loading={loadingTiDB || loadingStores || loadingPD}
      columns={columns}
      items={tableData}
      groups={groupData}
      errors={[errTiDB, errStores, errPD]}
    />
  )
}
