import { Tooltip, Typography } from 'antd'
import React, { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { WarningOutlined } from '@ant-design/icons'

import { HostinfoInfo, HostinfoPartitionInfo } from '@lib/client'
import { Bar, CardTable } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import {
  InstanceKind,
  InstanceKinds,
  instanceKindName
} from '@lib/utils/instanceTable'

import { ClusterInfoContext } from '../context'

interface IExpandedDiskItem extends HostinfoPartitionInfo {
  key: string
  host?: string
  instancesCount: Record<InstanceKind, number>
}

function expandDisksItems(rows: HostinfoInfo[]): IExpandedDiskItem[] {
  const expanded: IExpandedDiskItem[] = []
  rows.forEach((row) => {
    const instancesPerPartition: Record<
      string,
      Record<InstanceKind, number>
    > = {}

    let partitions = 0

    Object.values(row.instances ?? {}).forEach((i) => {
      if (!i) {
        return
      }
      if (!instancesPerPartition[i.partition_path_lower!]) {
        instancesPerPartition[i.partition_path_lower!] = {
          pd: 0,
          tidb: 0,
          tikv: 0,
          tiflash: 0,
          ticdc: 0,
          tiproxy: 0,
          tso: 0,
          scheduling: 0
        }
      }
      instancesPerPartition[i.partition_path_lower!][i.type!]++
    })

    for (let pathL in row.partitions) {
      const instancesCount = instancesPerPartition[pathL]
      if (!instancesCount) {
        // This partition does not have deployed instances, skip
        continue
      }
      const partition = row.partitions[pathL]
      expanded.push({
        key: `${row.host} ${pathL}`,
        host: row.host,
        instancesCount,
        ...partition
      })
      partitions++
    }

    if (partitions === 0) {
      // Supply dummy item..
      expanded.push({
        key: row.host ?? '',
        host: row.host,
        instancesCount: {
          pd: 0,
          tidb: 0,
          tikv: 0,
          tiflash: 0,
          ticdc: 0,
          tiproxy: 0,
          tso: 0,
          scheduling: 0
        }
      })
    }
  })
  return expanded
}

export default function HostTable() {
  const { t } = useTranslation()

  const ctx = useContext(ClusterInfoContext)

  const { data, isLoading, error } = useClientRequest(
    ctx!.ds.clusterInfoGetHostsInfo
  )

  const diskData = useMemo(() => expandDisksItems(data?.hosts ?? []), [data])

  const columns: IColumn[] = useMemo(
    () => [
      {
        name: t('cluster_info.list.disk_table.columns.host'),
        key: 'host',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: IExpandedDiskItem) => {
          if (!row.free) {
            return (
              <Tooltip
                title={t('cluster_info.list.host_table.instanceUnavailable')}
              >
                <Typography.Text type="warning">
                  <WarningOutlined /> {row.host}
                </Typography.Text>
              </Tooltip>
            )
          }
          return (
            <Tooltip title={row.host}>
              <span>{row.host}</span>
            </Tooltip>
          )
        }
      },
      {
        name: t('cluster_info.list.disk_table.columns.mount_dir'),
        key: 'mount_dir',
        minWidth: 150,
        maxWidth: 200,
        onRender: (row: IExpandedDiskItem) => {
          if (!row.path) {
            return
          }
          return (
            <Tooltip title={row.path}>
              <span>{row.path}</span>
            </Tooltip>
          )
        }
      },
      {
        name: t('cluster_info.list.disk_table.columns.fs'),
        key: 'fs',
        minWidth: 50,
        maxWidth: 100,
        onRender: (row: IExpandedDiskItem) => {
          return row.fstype?.toUpperCase() ?? ''
        }
      },
      {
        name: t('cluster_info.list.disk_table.columns.disk_size'),
        key: 'disk_size',
        minWidth: 60,
        maxWidth: 100,
        onRender: (row: IExpandedDiskItem) => {
          if (!row.total) {
            return
          }
          return getValueFormat('bytes')(row.total, 1)
        }
      },
      {
        name: t('cluster_info.list.disk_table.columns.disk_usage'),
        key: 'disk_usage',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: IExpandedDiskItem) => {
          if (!row.total || !row.free) {
            return
          }
          const total = row.total
          const free = row.free
          const used = total - free
          const usedPercent = (used / total).toFixed(3)
          const tooltipContent = (
            <span>
              Used: {getValueFormat('bytes')(used, 1)} (
              {getValueFormat('percentunit')(+usedPercent, 1)})
            </span>
          )
          return (
            <Tooltip title={tooltipContent}>
              <Bar value={used} capacity={total} />
            </Tooltip>
          )
        }
      },
      {
        name: t('cluster_info.list.disk_table.columns.instances'),
        key: 'instances',
        minWidth: 100,
        maxWidth: 200,
        onRender: (row: IExpandedDiskItem) => {
          const item = InstanceKinds.map((ik) => {
            if (row.instancesCount[ik] > 0) {
              return `${row.instancesCount[ik]} ${instanceKindName(ik)}`
            } else {
              return ''
            }
          })
          const content = item.filter((v) => v.length > 0).join(', ')
          return (
            <Tooltip title={content}>
              <span>{content}</span>
            </Tooltip>
          )
        }
      }
    ],
    [t]
  )

  return (
    <CardTable
      cardNoMargin
      loading={isLoading}
      columns={columns}
      items={diskData}
      errors={[error, data?.warning]}
    />
  )
}
