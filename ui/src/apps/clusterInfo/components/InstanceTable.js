import {
  STATUS_DOWN,
  STATUS_OFFLINE,
  STATUS_TOMBSTONE,
  STATUS_UP,
} from '@/apps/clusterInfo/status/status'
import { CardTableV2 } from '@/components'
import DateTime from '@/components/DateTime'
import { DeleteOutlined } from '@ant-design/icons'
import client from '@pingcap-incubator/dashboard_client'
import { Badge, Divider, Popconfirm, Tooltip } from 'antd'
import React, { useEffect, useState } from 'react'
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

function useClusterNodeDataSource() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState([])
  const [groupData, setGroupData] = useState([])

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true)
      try {
        const res = await client.getInstance().topologyAllGet()
        const items = []
        const groupItems = []
        let startIndex = 0
        const kinds = ['tidb', 'tikv', 'pd']
        kinds.forEach((nodeKind) => {
          const nodes = res.data[nodeKind]
          if (nodes.err) {
            return
          }
          const count = nodes.nodes.length
          groupItems.push({
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
          items.push(...children)
        })

        setGroupData(groupItems)
        setData(items)
      } catch (e) {}
      setIsLoading(false)
    }

    fetch()
  }, [])

  return [isLoading, data, groupData, fetch]
}

export default function ListPage() {
  const { t } = useTranslation()
  const [
    isLoading,
    tableData,
    groupData,
    updateData,
  ] = useClusterNodeDataSource()
  const handleHideTiDB = useHideTiDBHandler(updateData)
  const renderStatusColumn = useStatusColumnRender(handleHideTiDB)

  const columns = [
    {
      name: t('cluster_info.list.instance_table.columns.node'),
      key: 'node',
      ellipsis: true,
      minWidth: 80,
      maxWidth: 150,
      onRender: (node) => (
        <Tooltip title={`${node.ip}.${node.port}`}>
          {node.ip}.{node.port}
        </Tooltip>
      ),
    },
    {
      name: t('cluster_info.list.instance_table.columns.status'),
      key: 'status',
      minWidth: 80,
      maxWidth: 80,
      onRender: renderStatusColumn,
    },
    {
      name: t('cluster_info.list.instance_table.columns.up_time'),
      key: 'start_timestamp',
      minWidth: 100,
      maxWidth: 100,
      onRender: ({ start_timestamp: ts }) => {
        if (ts !== undefined && ts !== 0) {
          return <DateTime.Calendar unixTimeStampMs={ts * 1000} />
        }
      },
    },
    {
      name: t('cluster_info.list.instance_table.columns.version'),
      fieldName: 'version',
      key: 'version',
      minWidth: 100,
      maxWidth: 200,
      ellipsis: true,
    },
    {
      name: t('cluster_info.list.instance_table.columns.deploy_path'),
      fieldName: 'deploy_path',
      key: 'deploy_path',
      minWidth: 100,
      maxWidth: 200,
      ellipsis: true,
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
