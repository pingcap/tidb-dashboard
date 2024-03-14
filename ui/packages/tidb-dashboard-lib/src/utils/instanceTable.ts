import _ from 'lodash'
import i18next from 'i18next'
import { IGroup } from 'office-ui-fabric-react/lib/DetailsList'

import {
  TopologyPDInfo,
  TopologyTiDBInfo,
  TopologyStoreInfo,
  TopologyTiCDCInfo,
  TopologyTiProxyInfo,
  TopologyTSOInfo,
  TopologySchedulingInfo
} from '@lib/client'

export const InstanceKinds = [
  'pd',
  'tidb',
  'tikv',
  'tiflash',
  'ticdc',
  'tiproxy',
  'tso',
  'scheduling'
] as const
export type InstanceKind = typeof InstanceKinds[number]

export const InstanceStatus = {
  Unreachable: 0,
  Up: 1,
  Tombstone: 2,
  Offline: 3,
  Down: 4
}

export function instanceKindName(kind: InstanceKind) {
  return i18next.t(`distro.${kind}`)
}

export interface IInstanceTableItem
  extends TopologyPDInfo,
    TopologyTiDBInfo,
    TopologyStoreInfo,
    TopologyTiCDCInfo,
    TopologyTiProxyInfo,
    TopologyTSOInfo,
    TopologySchedulingInfo {
  key: string
  instanceKind: InstanceKind
}

export interface IBuildInstanceTableProps {
  dataPD?: TopologyPDInfo[]
  dataTiDB?: TopologyTiDBInfo[]
  dataTiKV?: TopologyStoreInfo[]
  dataTiFlash?: TopologyStoreInfo[]
  dataTiCDC?: TopologyTiCDCInfo[]
  dataTiProxy?: TopologyTiProxyInfo[]
  dataTSO?: TopologyTSOInfo[]
  dataScheduling?: TopologySchedulingInfo[]
  includeTiFlash?: boolean
}

export function buildInstanceTable({
  dataPD,
  dataTiDB,
  dataTiKV,
  dataTiFlash,
  dataTiCDC,
  dataTiProxy,
  dataTSO,
  dataScheduling,
  includeTiFlash
}: IBuildInstanceTableProps): [IInstanceTableItem[], IGroup[]] {
  const tableData: IInstanceTableItem[] = []
  const groupData: IGroup[] = []
  let startIndex = 0

  const kinds: {
    [key in InstanceKind]?:
      | TopologyPDInfo[]
      | TopologyTiDBInfo[]
      | TopologyStoreInfo[]
      | TopologyTiCDCInfo[]
      | TopologyTiProxyInfo[]
      | TopologyTSOInfo[]
      | TopologySchedulingInfo[]
      | undefined
  } = {}
  kinds.pd = dataPD
  kinds.tidb = dataTiDB
  kinds.tikv = dataTiKV
  kinds.ticdc = dataTiCDC
  kinds.tiproxy = dataTiProxy
  kinds.tso = dataTSO
  kinds.scheduling = dataScheduling
  if (includeTiFlash) {
    kinds.tiflash = dataTiFlash
  }

  for (const ik of InstanceKinds) {
    const instances = kinds[ik]
    if (!instances || instances.length === 0) {
      continue
    }
    groupData.push({
      key: ik,
      name: instanceKindName(ik),
      startIndex: startIndex,
      count: instances.length,
      level: 0
    })
    startIndex += instances.length
    instances.forEach((instance) => {
      const key = `${instance.ip}:${instance.port}`
      tableData.push({
        key: key,
        instanceKind: ik,
        ...instance
      })
    })
  }
  return [tableData, groupData]
}

export function filterInstanceTable(
  items: IInstanceTableItem[],
  filterKeyword: string
): [IInstanceTableItem[], IGroup[]] {
  const tableData: IInstanceTableItem[] = []
  const groupData: IGroup[] = []
  let startIndex = 0

  const kw = filterKeyword.toLowerCase()
  const filteredItems = items.filter((i) => {
    if (filterKeyword.length === 0) {
      return true
    }
    return (
      i.key.toLowerCase().indexOf(kw) > -1 || i.instanceKind.indexOf(kw) > -1
    )
  })
  const itemsByIk = _.groupBy(filteredItems, 'instanceKind') as {
    [key in InstanceKind]: IInstanceTableItem[]
  }
  for (const ik of InstanceKinds) {
    const instances = itemsByIk[ik]
    if (!instances || instances.length === 0) {
      continue
    }
    groupData.push({
      key: ik,
      name: instanceKindName(ik),
      startIndex: startIndex,
      count: instances.length,
      level: 0
    })
    startIndex += instances.length
    instances.forEach((instance) => {
      tableData.push(instance)
    })
  }
  return [tableData, groupData]
}
