import { Tooltip, Typography } from 'antd'
import React, { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { red } from '@ant-design/colors'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { HostinfoInfo } from '@lib/client'
import { Bar, CardTable, Pre } from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import {
  InstanceKind,
  InstanceKinds,
  instanceKindName
} from '@lib/utils/instanceTable'
import { WarningOutlined } from '@ant-design/icons'
import { ClusterInfoContext } from '../context'

interface IExpandedHostItem extends HostinfoInfo {
  key: string
  instancesCount: Record<InstanceKind, number>
}

function expandHostItems(rows: HostinfoInfo[]): IExpandedHostItem[] {
  const expanded: IExpandedHostItem[] = []
  rows.forEach((row) => {
    const instancesCount: Record<InstanceKind, number> = {
      pd: 0,
      tidb: 0,
      tikv: 0,
      tiflash: 0,
      ticdc: 0,
      tiproxy: 0,
      tso: 0,
      scheduling: 0
    }

    Object.values(row.instances ?? {}).forEach((i) => {
      if (!i) {
        return
      }
      instancesCount[i.type!]++
    })

    expanded.push({
      key: row.host ?? '',
      instancesCount,
      ...row
    })
  })
  return expanded
}

export default function HostTable() {
  const { t } = useTranslation()

  const ctx = useContext(ClusterInfoContext)

  const { data, isLoading, error } = useClientRequest(
    ctx!.ds.clusterInfoGetHostsInfo
  )

  const hostData = useMemo(() => expandHostItems(data?.hosts ?? []), [data])

  const columns: IColumn[] = useMemo(
    () => [
      {
        name: t('cluster_info.list.host_table.columns.host'),
        key: 'host',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: IExpandedHostItem) => {
          if (!row.cpu_info) {
            // We assume that CPU info must be successfully retrieved.
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
        name: t('cluster_info.list.host_table.columns.cpu'),
        key: 'cpu',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: IExpandedHostItem) => {
          const { cpu_info: c } = row
          if (!c) {
            return
          }
          const tooltipContent = `
Physical Cores: ${c.physical_cores}
Logical Cores:  ${c.logical_cores}`
          return (
            <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
              <span>{`${c.physical_cores!} (${c.logical_cores!} vCore)`}</span>
            </Tooltip>
          )
        }
      },
      {
        name: t('cluster_info.list.host_table.columns.cpu_arch'),
        key: 'cpu-arch',
        minWidth: 60,
        maxWidth: 100,
        onRender: (row: IExpandedHostItem) => {
          const { cpu_info: c } = row
          if (!c || !c.arch) {
            return <span>{'Unknow'}</span>
          }
          return <span>{`${c.arch}`}</span>
        }
      },
      {
        name: t('cluster_info.list.host_table.columns.cpu_usage'),
        key: 'cpu_usage',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: IExpandedHostItem) => {
          if (!row.cpu_usage) {
            return
          }
          const system = row.cpu_usage.system ?? 0
          const idle = row.cpu_usage.idle ?? 1
          const user = 1 - system - idle
          const tooltipContent = `
User:   ${getValueFormat('percentunit')(user)}
System: ${getValueFormat('percentunit')(system)}`
          return (
            <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
              <Bar
                value={[user, system]}
                colors={[null, red[4]]}
                capacity={1}
              />
            </Tooltip>
          )
        }
      },
      {
        name: t('cluster_info.list.host_table.columns.memory'),
        key: 'memory',
        minWidth: 60,
        maxWidth: 100,
        onRender: (row: IExpandedHostItem) => {
          if (!row.memory_usage) {
            return
          }
          return getValueFormat('bytes')(row.memory_usage.total ?? 0, 1)
        }
      },
      {
        name: t('cluster_info.list.host_table.columns.memory_usage'),
        key: 'memory_usage',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row: IExpandedHostItem) => {
          if (!row.memory_usage) {
            return
          }
          const { total, used } = row.memory_usage
          const usedPercent = (used! / total!).toFixed(3)
          const title = (
            <div>
              Used: {getValueFormat('bytes')(used!, 1)} (
              {getValueFormat('percentunit')(+usedPercent, 1)})
            </div>
          )
          return (
            <Tooltip title={title}>
              <Bar value={used!} capacity={total!} />
            </Tooltip>
          )
        }
      },
      {
        name: t('cluster_info.list.host_table.columns.instances'),
        key: 'instances',
        minWidth: 100,
        maxWidth: 200,
        onRender: (row: IExpandedHostItem) => {
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
      items={hostData}
      errors={[error, data?.warning]}
    />
  )
}
