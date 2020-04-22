import { DeleteOutlined } from '@ant-design/icons'
import {
  STATUS_DOWN,
  STATUS_OFFLINE,
  STATUS_TOMBSTONE,
  STATUS_UP,
} from '@lib/apps/ClusterInfo/status/status'
import client from '@lib/client'
import { CardTableV2 } from '@lib/components'
import DateTime from '@lib/components/DateTime'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { Badge, Divider, Popconfirm, Tooltip } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'

function useStatusColumnRender(handleHideTiDB) {
  const { t } = useTranslation()
  return (node) => {
    if (node.status == null) {
      // Tree node
      return
    }
    let statusNode = null
    switch (node.status) {
      case STATUS_DOWN:
        statusNode = (
          <Badge
            status="error"
            text={t('cluster_info.list.instance_table.status.down')}
          />
        )
        break
      case STATUS_UP:
        statusNode = (
          <Badge
            status="success"
            text={t('cluster_info.list.instance_table.status.up')}
          />
        )
        break
      case STATUS_TOMBSTONE:
        statusNode = (
          <Badge
            status="default"
            text={t('cluster_info.list.instance_table.status.tombstone')}
          />
        )
        break
      case STATUS_OFFLINE:
        statusNode = (
          <Badge
            status="processing"
            text={t('cluster_info.list.instance_table.status.offline')}
          />
        )
        break
      default:
        statusNode = (
          <Badge
            status="error"
            text={t('cluster_info.list.instance_table.status.unknown')}
          />
        )
        break
    }
    return (
      <span>
        {statusNode}
        {node.nodeKind === 'tidb' && node.status !== STATUS_UP && (
          <>
            <Divider type="vertical" />
            <Popconfirm
              title={t(
                'cluster_info.list.instance_table.actions.hide_db.confirm'
              )}
              onConfirm={() => handleHideTiDB(node)}
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
}

function useHideTiDBHandler(updateData) {
  return async (node) => {
    await client
      .getInstance()
      .topologyTidbAddressDelete(`${node.ip}:${node.port}`)
    updateData()
  }
}

function buildData(data) {
  if (data === undefined) {
    return {}
  }
  const tableData = []
  const groupData = []
  let startIndex = 0
  const kinds = ['tidb', 'tikv', 'pd', 'tiflash']
  kinds.forEach((nodeKind) => {
    const nodes = data[nodeKind]
    if (nodes.err) {
      return
    }
    const count = nodes.nodes.length
    groupData.push({
      key: nodeKind,
      name: nodeKind,
      startIndex: startIndex,
      count: count,
      level: 0,
    })
    startIndex += count
    const children = nodes.nodes.map((node) => {
      if (node.deploy_path === undefined && node.binary_path !== null) {
        node.deploy_path = node.binary_path.substring(
          0,
          node.binary_path.lastIndexOf('/')
        )
      }
      return {
        key: `${node.ip}:${node.port}`,
        ...node,
        nodeKind,
      }
    })
    tableData.push(...children)
  })
  return { tableData, groupData }
}

export default function ListPage() {
  const { t } = useTranslation()

  const { data, isLoading, sendRequest } = useClientRequest((cancelToken) =>
    client.getInstance().topologyAllGet({ cancelToken })
  )
  const { tableData, groupData } = buildData(data)

  const handleHideTiDB = useHideTiDBHandler(sendRequest)
  const renderStatusColumn = useStatusColumnRender(handleHideTiDB)

  const columns = [
    {
      name: t('cluster_info.list.instance_table.columns.node'),
      key: 'node',
      minWidth: 100,
      maxWidth: 200,
      isResizable: true,
      onRender: (node) => (
        <Tooltip title={`${node.ip}.${node.port}`}>
          {node.ip}.{node.port}
        </Tooltip>
      ),
    },
    {
      name: t('cluster_info.list.instance_table.columns.status'),
      key: 'status',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      onRender: renderStatusColumn,
    },
    {
      name: t('cluster_info.list.instance_table.columns.up_time'),
      key: 'start_timestamp',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
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
      minWidth: 150,
      maxWidth: 300,
      isResizable: true,
    },
    {
      name: t('cluster_info.list.instance_table.columns.deploy_path'),
      fieldName: 'deploy_path',
      key: 'deploy_path',
      minWidth: 150,
      maxWidth: 300,
      isResizable: true,
    },
  ]

  return (
    <CardTableV2
      loading={isLoading}
      columns={columns}
      items={tableData || []}
      groups={groupData || []}
    />
  )
}
