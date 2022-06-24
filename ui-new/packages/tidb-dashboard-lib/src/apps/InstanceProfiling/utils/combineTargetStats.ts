import { ModelRequestTargetStatistics } from '@lib/client'
import { instanceKindName } from '@lib/utils/instanceTable'

const targetNameMap = {
  num_tidb_nodes: () => instanceKindName('tidb'),
  num_tikv_nodes: () => instanceKindName('tikv'),
  num_pd_nodes: () => instanceKindName('pd'),
  num_tiflash_nodes: () => instanceKindName('tiflash')
}

export const combineTargetStats = (stats: ModelRequestTargetStatistics) =>
  Object.entries(stats)
    .reduce((prev, [key, stat]) => {
      const targetName = targetNameMap[key]()
      targetName && prev.push(`${stat} ${targetName}`)
      return prev
    }, [] as string[])
    .join(', ')
