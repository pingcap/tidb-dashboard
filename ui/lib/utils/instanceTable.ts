import {
  TopologyPDInfo,
  TopologyTiDBInfo,
  TopologyStoreInfo,
  TopoCompInfoWithSignature,
} from '@lib/client'
import { IGroup } from 'office-ui-fabric-react/lib/DetailsList'
import _ from 'lodash'
import i18next from 'i18next'

export type InstanceKind = 'pd' | 'tidb' | 'tikv' | 'tiflash'

// Deprecated. Use InstanceStatusV2.
export const InstanceStatus = {
  Unreachable: 0,
  Up: 1,
  Tombstone: 2,
  Offline: 3,
  Down: 4,
}

export const InstanceKindName: { [key in InstanceKind]: string } = {
  pd: i18next.t('distro.pd'),
  tidb: i18next.t('distro.tidb'),
  tikv: i18next.t('distro.tikv'),
  tiflash: i18next.t('distro.tiflash'),
}

export const InstanceKinds = Object.keys(InstanceKindName) as InstanceKind[]

export interface IInstanceTableItem
  extends TopologyPDInfo,
    TopologyTiDBInfo,
    TopologyStoreInfo {
  key: string
  instanceKind: InstanceKind
}

export interface IBuildInstanceTableProps {
  dataPD?: TopologyPDInfo[]
  dataTiDB?: TopologyTiDBInfo[]
  dataTiKV?: TopologyStoreInfo[]
  dataTiFlash?: TopologyStoreInfo[]
  includeTiFlash?: boolean
}

export function buildInstanceTable({
  dataPD,
  dataTiDB,
  dataTiKV,
  dataTiFlash,
  includeTiFlash,
}: IBuildInstanceTableProps): [IInstanceTableItem[], IGroup[]] {
  const tableData: IInstanceTableItem[] = []
  const groupData: IGroup[] = []
  let startIndex = 0

  const kinds: {
    [key in InstanceKind]?:
      | TopologyPDInfo[]
      | TopologyTiDBInfo[]
      | TopologyStoreInfo[]
      | undefined
  } = {}
  kinds.pd = dataPD
  kinds.tidb = dataTiDB
  kinds.tikv = dataTiKV
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
      name: InstanceKindName[ik],
      startIndex: startIndex,
      count: instances.length,
      level: 0,
    })
    startIndex += instances.length
    instances.forEach((instance) => {
      const key = `${instance.ip}:${instance.port}`
      tableData.push({
        key: key,
        instanceKind: ik,
        ...instance,
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
      name: InstanceKindName[ik],
      startIndex: startIndex,
      count: instances.length,
      level: 0,
    })
    startIndex += instances.length
    instances.forEach((instance) => {
      tableData.push(instance)
    })
  }
  return [tableData, groupData]
}

// Below are utilities for util/topo

export enum InstanceStatusV2 {
  Unknown = '',
  Unreachable = 'unreachable',
  Up = 'up',
  Tombstone = 'tombstone',
  Leaving = 'leaving',
  Down = 'down',
}

export function filterComponentsList(
  items: TopoCompInfoWithSignature[],
  filterKeyword: string
): [TopoCompInfoWithSignature[], IGroup[]] {
  const kw = filterKeyword.toLowerCase()
  let filteredItems = items
  if (filterKeyword.length > 0) {
    filteredItems = items.filter((i) => {
      const searchableText = `${i.kind} ${i.ip}:${i.port}`
      return searchableText.indexOf(kw) > -1
    })
  }

  const tableData: TopoCompInfoWithSignature[] = []
  const groupData: IGroup[] = []
  let startIndex = 0

  // TODO: Support other instance kinds
  const itemsByKind = _.groupBy(filteredItems, 'kind') as unknown as Record<
    InstanceKind,
    TopoCompInfoWithSignature[]
  >
  for (const ik of InstanceKinds) {
    const instances = itemsByKind[ik]
    if (!instances || instances.length === 0) {
      continue
    }
    const sortedInstances = _.sortBy(instances, [(i) => `${i.ip}:${i.port}`])
    groupData.push({
      key: ik,
      name: InstanceKindName[ik],
      startIndex: startIndex,
      count: sortedInstances.length,
      level: 0,
    })
    startIndex += sortedInstances.length
    sortedInstances.forEach((i) => tableData.push(i))
  }
  return [tableData, groupData]
}
