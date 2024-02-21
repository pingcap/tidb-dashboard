import React, { useMemo } from 'react'
import {
  IInstanceTableItem,
  InstanceKind,
  instanceKindName
} from '@lib/utils/instanceTable'
import { useTranslation } from 'react-i18next'

interface InstanceStat {
  all: number
  selected: number
}

function newInstanceStat(): InstanceStat {
  return {
    all: 0,
    selected: 0
  }
}

export interface IValueDisplayProps {
  items: IInstanceTableItem[]
  selectedKeys: string[]
}

export default function ValueDisplay({
  items,
  selectedKeys
}: IValueDisplayProps) {
  const { t } = useTranslation()

  const text = useMemo(() => {
    const selectedKeysMap = {}
    selectedKeys.forEach((key) => (selectedKeysMap[key] = true))
    const instanceStats: { [key in InstanceKind]: InstanceStat } = {
      pd: newInstanceStat(),
      tidb: newInstanceStat(),
      tikv: newInstanceStat(),
      tiflash: newInstanceStat(),
      ticdc: newInstanceStat(),
      tiproxy: newInstanceStat(),
      tso: newInstanceStat(),
      scheduling: newInstanceStat()
    }
    items.forEach((item) => {
      instanceStats[item.instanceKind].all++
      if (selectedKeysMap[item.key]) {
        instanceStats[item.instanceKind].selected++
      }
    })

    let hasUnselected = false
    const p: string[] = []
    for (const ik in instanceStats) {
      const stats = instanceStats[ik] as InstanceStat
      if (stats.selected !== stats.all) {
        hasUnselected = true
      }
      if (stats.selected > 0) {
        if (stats.all === stats.selected) {
          p.push(
            t('component.instanceSelect.selected.partial.all', {
              component: instanceKindName(ik as InstanceKind)
            })
          )
        } else {
          p.push(
            t('component.instanceSelect.selected.partial.n', {
              n: stats.selected,
              component: instanceKindName(ik as InstanceKind)
            })
          )
        }
      }
    }

    if (!hasUnselected) {
      return t('component.instanceSelect.selected.all')
    }

    return p.join(', ')
  }, [t, items, selectedKeys])

  return <>{text}</>
}
