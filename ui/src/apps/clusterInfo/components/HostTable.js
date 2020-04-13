import { CardTableV2 } from '@/components'
import { useClientRequest } from '@/utils/useClientRequest'
import client from '@pingcap-incubator/dashboard_client'
import { Progress, Tooltip } from 'antd'
import byteSize from 'byte-size'
import React from 'react'
import { useTranslation } from 'react-i18next'

function byteSizeToStr(num, precision) {
  if (num === undefined) {
    return ''
  }
  const b = byteSize(num, { units: 'iec', precision: precision })
  return `${b.value} ${b.unit}`
}

function toPercentStr(num) {
  if (num === undefined) {
    return ''
  }
  return '' + Number(num * 100).toFixed(1) + '%'
}

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
      fieldName: 'ip',
      key: 'ip',
      minWidth: 100,
      maxWidth: 100,
      isResizable: true,
      isCollapsible: true,
    },
    {
      name: t('cluster_info.list.host_table.columns.cpu'),
      key: 'cpu_core',
      minWidth: 60,
      maxWidth: 60,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ cpu_core }) => `${cpu_core} vCPU`,
    },
    {
      name: t('cluster_info.list.host_table.columns.cpu_usage'),
      key: 'cpu_usage',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ cpu_usage }) => {
        if (cpu_usage === undefined) {
          return
        }
        const { system, idle } = cpu_usage
        const user = (1 - system - idle).toFixed(3)
        const title = (
          <>
            <div>User: {toPercentStr(user)}</div>
            <div>System: {toPercentStr(system)}</div>
          </>
        )
        return (
          <Tooltip title={title}>
            <Progress
              percent={(1 - idle) * 100}
              successPercent={user * 100}
              size="small"
              showInfo={false}
            />
          </Tooltip>
        )
      },
    },
    {
      name: t('cluster_info.list.host_table.columns.memory'),
      key: 'memory',
      minWidth: 60,
      maxWidth: 60,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ memory }) => byteSizeToStr(memory.total, 0),
    },
    {
      name: t('cluster_info.list.host_table.columns.memory_usage'),
      key: 'memory_usage',
      minWidth: 80,
      maxWidth: 100,
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
            Used: {byteSizeToStr(used, 1)} ({toPercentStr(usedPercent)})
          </div>
        )
        return (
          <Tooltip title={title}>
            <Progress
              percent={usedPercent * 100}
              size="small"
              showInfo={false}
            />
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
            ' '
          )}: ${partition.partition.fstype.toUpperCase()} ${currentMountPoint}`
        })
      },
    },
    {
      name: t('cluster_info.list.host_table.columns.disk_size'),
      key: 'disk_size',
      minWidth: 80,
      maxWidth: 80,
      isResizable: true,
      isCollapsible: true,
      onRender: ({ partitions }) => {
        if (partitions === undefined || partitions.length === 0) {
          return
        }
        return filterUniquePartitions(partitions).map((partiton, i) => {
          return <div key={i}>{byteSizeToStr(partiton.partition.total)}</div>
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
              Used: {byteSizeToStr(used, 1)} ({toPercentStr(usedPercent)})
            </div>
          )
          return (
            <Tooltip title={title} key={i}>
              <Progress
                percent={usedPercent * 100}
                size="small"
                showInfo={false}
              />
            </Tooltip>
          )
        })
      },
    },
  ]

  return (
    <CardTableV2
      loading={isLoading}
      columns={columns}
      items={tableData || []}
    />
  )
}
