import { ModelRequestTargetStatistics } from '@lib/client'
import { instanceKindName } from '@lib/utils/instanceTable'

const targetNameMap = {
  num_tidb_nodes: () => instanceKindName('tidb'),
  num_tikv_nodes: () => instanceKindName('tikv'),
  num_pd_nodes: () => instanceKindName('pd'),
  num_tiflash_nodes: () => instanceKindName('tiflash'),
  num_ticdc_nodes: () => instanceKindName('ticdc'),
  num_tiproxy_nodes: () => instanceKindName('tiproxy'),
  num_tso_nodes: () => instanceKindName('tso'),
  num_scheduling_nodes: () => instanceKindName('scheduling')
}

export const combineTargetStats = (stats: ModelRequestTargetStatistics) =>
  Object.entries(stats)
    .reduce((prev, [key, stat]) => {
      if (targetNameMap[key]) {
        const targetName = targetNameMap[key]()
        targetName && prev.push(`${stat} ${targetName}`)
      }
      return prev
    }, [] as string[])
    .join(', ')
