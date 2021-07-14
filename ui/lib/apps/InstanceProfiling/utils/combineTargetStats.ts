import i18next from 'i18next'

import { ModelRequestTargetStatistics } from '@lib/client'

const targetNameMap = {
  num_tidb_nodes: i18next.t('distro.tidb'),
  num_tikv_nodes: i18next.t('distro.tikv'),
  num_pd_nodes: i18next.t('distro.pd'),
  num_tiflash_nodes: i18next.t('distro.tiflash'),
}

export const combineTargetStats = (stats: ModelRequestTargetStatistics) =>
  Object.entries(stats)
    .reduce((prev, [key, stat]) => {
      const targetName = targetNameMap[key]
      targetName && prev.push(`${stat} ${targetName}`)
      return prev
    }, [] as string[])
    .join(', ')
