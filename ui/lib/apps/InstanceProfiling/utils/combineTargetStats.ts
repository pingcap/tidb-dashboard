import { ModelRequestTargetStatistics } from '@lib/client'

const targetNameMap = {
  num_tidb_nodes: 'TiDB',
  num_tikv_nodes: 'TiKV',
  num_pd_nodes: 'PD',
  num_tiflash_nodes: 'TiFlash',
}

export const combineTargetStats = (targetStats: ModelRequestTargetStatistics) =>
  Object.entries(targetStats)
    .reduce((prev, [key, stat]) => {
      const targetName = targetNameMap[key]
      targetName && prev.push(`${stat} ${targetName}`)
      return prev
    }, [] as string[])
    .join(', ')
