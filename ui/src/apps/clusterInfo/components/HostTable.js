import client from '@pingcap-incubator/dashboard_client'
import { CardTable } from '@pingcap-incubator/dashboard_components'
import { Progress, Tooltip } from 'antd'
import byteSize from 'byte-size'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

function useDataSource() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState([])

  const fetch = async () => {
    setIsLoading(true)
    try {
      const res = await client.getInstance().hostAllGet()
      const data = res.data.map((item, i) => {
        item.key = i
        return item
      })
      setData(data)
    } catch (e) {}
    setIsLoading(false)
  }

  useEffect(() => {
    fetch()
  }, [])

  return [isLoading, data]
}

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
  const [isLoading, tableData] = useDataSource()

  const columns = [
    {
      title: t('cluster_info.list.host_table.columns.ip'),
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: t('cluster_info.list.host_table.columns.cpu'),
      dataIndex: 'cpu_core',
      key: 'cpu_core',
      render: (cpu_core) => `${cpu_core} vCPU`,
    },
    {
      title: t('cluster_info.list.host_table.columns.cpu_usage'),
      dataIndex: 'cpu_usage',
      key: 'cpu_usage',
      render: (cpu_usage) => {
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
      title: t('cluster_info.list.host_table.columns.memory'),
      dataIndex: 'memory',
      key: 'memory',
      render: (memory) => byteSizeToStr(memory.total, 0),
    },
    {
      title: t('cluster_info.list.host_table.columns.memory_usage'),
      dataIndex: 'memory',
      key: 'memory_usage',
      render: (memory) => {
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
      title: t('cluster_info.list.host_table.columns.deploy'),
      dataIndex: 'partitions',
      key: 'deploy',
      render: (partitions) => {
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
      title: t('cluster_info.list.host_table.columns.disk_size'),
      dataIndex: 'partitions',
      key: 'disk_size',
      render: (partitions) => {
        if (partitions === undefined || partitions.length === 0) {
          return
        }
        return filterUniquePartitions(partitions).map((partiton, i) => {
          return <div key={i}>{byteSizeToStr(partiton.partition.total)}</div>
        })
      },
    },
    {
      title: t('cluster_info.list.host_table.columns.disk_usage'),
      dataIndex: 'partitions',
      key: 'disk_usage',
      render: (partitions) => {
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
    <CardTable
      title={t('cluster_info.list.host_table.title')}
      loading={isLoading}
      columns={columns}
      dataSource={tableData}
    />
  )
}
