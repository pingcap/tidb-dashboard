import { WarningOutlined } from '@ant-design/icons'
import { getValueFormat } from '@baurine/grafana-value-formats'
import client from '@lib/client'
import { Bar, CardTableV2 } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { Tooltip, Typography } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { red } from '@ant-design/colors'
import { useDummyColumn } from '@lib/utils/useColumn'

const { Text } = Typography

function filterUniquePartitions(items) {
  return items.filter(
    (x, i, a) => a.findIndex((y) => y.partition.path === x.partition.path) === i
  )
}

export default function HostTable() {
  const { t } = useTranslation()

  const { data: tableData, isLoading } = useClientRequest((cancelToken) =>
    client.getInstance().hostAllGet({ cancelToken })
  )

  const columns = [
    {
      name: t('cluster_info.list.host_table.columns.ip'),
      key: 'ip',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ ip, unavailable }) => {
        if (unavailable) {
          return (
            <Tooltip
              title={t('cluster_info.list.host_table.instanceUnavailable')}
            >
              <Text type="warning">
                <WarningOutlined /> {ip}
              </Text>
            </Tooltip>
          )
        }
        return ip
      },
    },
    {
      name: t('cluster_info.list.host_table.columns.cpu'),
      key: 'cpu_core',
      minWidth: 60,
      maxWidth: 100,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ cpu_core }) =>
        cpu_core !== undefined ? `${cpu_core} vCPU` : '',
    },
    {
      name: t('cluster_info.list.host_table.columns.cpu_usage'),
      key: 'cpu_usage',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ cpu_usage }) => {
        if (cpu_usage === undefined) {
          return
        }
        const { system, idle } = cpu_usage
        const user = 1 - system - idle
        const title = (
          <>
            <div>User: {getValueFormat('percentunit')(user)}</div>
            <div>System: {getValueFormat('percentunit')(system)}</div>
          </>
        )
        return (
          <Tooltip title={title}>
            <Bar value={[user, system]} colors={[null, red[4]]} capacity={1} />
          </Tooltip>
        )
      },
    },
    {
      name: t('cluster_info.list.host_table.columns.memory'),
      key: 'memory',
      minWidth: 60,
      maxWidth: 100,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ memory }) =>
        memory !== undefined ? getValueFormat('bytes')(memory.total, 0) : '',
    },
    {
      name: t('cluster_info.list.host_table.columns.memory_usage'),
      key: 'memory_usage',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ memory }) => {
        if (memory === undefined) {
          return
        }
        const { total, used } = memory
        const usedPercent = (used / total).toFixed(3)
        const title = (
          <div>
            Used: {getValueFormat('bytes')(used, 1)} (
            {getValueFormat('percentunit')(usedPercent, 1)})
          </div>
        )
        return (
          <Tooltip title={title}>
            <Bar value={used} capacity={total} />
          </Tooltip>
        )
      },
    },
    {
      name: t('cluster_info.list.host_table.columns.deploy'),
      key: 'deploy',
      minWidth: 100,
      maxWidth: 200,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ partitions }) => {
        if (partitions === undefined || partitions.length === 0) {
          return
        }
        const serverTotal = {
          tidb: 0,
          tikv: 0,
          pd: 0,
        }
        return filterUniquePartitions(partitions).map((partition) => {
          const currentMountPoint = partition.partition.path
          partitions.forEach((item) => {
            if (item.partition.path !== currentMountPoint) {
              return
            }
            serverTotal[item.instance.server_type]++
          })
          const serverInfos = []
          if (serverTotal.tidb > 0) {
            serverInfos.push(`${serverTotal.tidb} TiDB`)
          }
          if (serverTotal.tikv > 0) {
            serverInfos.push(`${serverTotal.tikv} TiKV`)
          }
          if (serverTotal.pd > 0) {
            serverInfos.push(`${serverTotal.pd} PD`)
          }
          return `${serverInfos.join(
            ','
          )}: ${partition.partition.fstype.toUpperCase()} ${currentMountPoint}`
        })
      },
    },
    {
      name: t('cluster_info.list.host_table.columns.disk_size'),
      key: 'disk_size',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ partitions }) => {
        if (partitions === undefined || partitions.length === 0) {
          return
        }
        return filterUniquePartitions(partitions).map((partiton, i) => {
          return (
            <div key={i}>
              {getValueFormat('bytes')(partiton.partition.total, 0)}
            </div>
          )
        })
      },
    },
    {
      name: t('cluster_info.list.host_table.columns.disk_usage'),
      key: 'disk_usage',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ partitions }) => {
        if (partitions === undefined || partitions.length === 0) {
          return
        }
        return filterUniquePartitions(partitions).map((partiton, i) => {
          const { total, free } = partiton.partition
          const used = total - free
          const usedPercent = (used / total).toFixed(3)
          const title = (
            <div>
              Used: {getValueFormat('bytes')(used, 1)} (
              {getValueFormat('percentunit')(usedPercent, 1)})
            </div>
          )
          return (
            <Tooltip title={title} key={i}>
              <Bar value={used} capacity={total} />
            </Tooltip>
          )
        })
      },
    },
    useDummyColumn(),
  ]

  return (
    <CardTableV2
      loading={isLoading}
      columns={columns}
      items={tableData || []}
    />
  )
}
