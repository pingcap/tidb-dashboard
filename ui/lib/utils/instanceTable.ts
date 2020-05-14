import {
  TopologyPDInfo,
  TopologyTiDBInfo,
  TopologyStoreInfo,
} from '@lib/client'
import { IGroup } from 'office-ui-fabric-react/lib/DetailsList'

export type InstanceKind = 'pd' | 'tidb' | 'tikv' | 'tiflash'

export const InstanceStatus = {
  Unreachable: 0,
  Up: 1,
  Tombstone: 2,
  Offline: 3,
  Down: 4,
}

export const InstanceKindName: { [key in InstanceKind]: string } = {
  pd: 'PD',
  tidb: 'TiDB',
  tikv: 'TiKV',
  tiflash: 'TiFlash',
}

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
  filterHost?: string
}

export function buildInstanceTable({
  dataPD,
  dataTiDB,
  dataTiKV,
  dataTiFlash,
  includeTiFlash,
  filterHost,
}: IBuildInstanceTableProps): [IInstanceTableItem[], IGroup[]] {
  const tableData: IInstanceTableItem[] = []
  const groupData: IGroup[] = []
  let startIndex = 0
  const kinds: [
    InstanceKind,
    TopologyPDInfo[] | TopologyTiDBInfo[] | TopologyStoreInfo[] | undefined
  ][] = [
    ['pd', dataPD],
    ['tidb', dataTiDB],
    ['tikv', dataTiKV],
  ]
  if (includeTiFlash) {
    kinds.push(['tiflash', dataTiFlash])
  }
  for (const item of kinds) {
    const [ik, instances] = item
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
      if (filterHost != null && filterHost.length > 0) {
        if (key.indexOf(filterHost) === -1) {
          return
        }
      }
      tableData.push({
        key: key,
        instanceKind: ik,
        ...instance,
      })
    })
  }
  return [tableData, groupData]
}
