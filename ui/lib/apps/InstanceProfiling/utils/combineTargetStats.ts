import { ModelRequestTargetStatistics } from '@lib/client'
import { InstanceKindName, InstanceKinds } from '@lib/utils/instanceTable'

const targetNameMap = {
  num_tidb_nodes: InstanceKindName.tidb,
  num_tikv_nodes: InstanceKindName.tikv,
  num_pd_nodes: InstanceKindName.pd,
  num_tiflash_nodes: InstanceKindName.tiflash,
}

export const combineTargetStats = (stats: ModelRequestTargetStatistics) =>
  Object.entries(stats)
    .reduce((prev, [key, stat]) => {
      const targetName = targetNameMap[key]
      targetName && prev.push(`${stat} ${targetName}`)
      return prev
    }, [] as string[])
    .join(', ')

// Pretty-print util/topo.CompCount
export function stringifyTopoCount(count: { [key: string]: number }) {
  const val: string[] = []
  InstanceKinds.forEach((ik) => {
    if (count[ik] !== undefined) {
      val.push(`${count[ik]} ${InstanceKindName[ik]}`)
    }
  })
  return val.join(', ')
}
