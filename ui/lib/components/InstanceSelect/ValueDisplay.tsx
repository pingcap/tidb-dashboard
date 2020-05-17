import React, { useMemo } from 'react'
import { IInstanceTableItem, InstanceKind } from '@lib/utils/instanceTable'

interface InstanceStat {
  all: number
  selected: number
}

function newInstanceStat(): InstanceStat {
  return {
    all: 0,
    selected: 0,
  }
}

export interface IValueDisplayProps {
  items: IInstanceTableItem[]
  selectedKeys: string[]
}

export default function ValueDisplay({
  items,
  selectedKeys,
}: IValueDisplayProps) {
  const text = useMemo(() => {
    const selectedKeysMap = {}
    selectedKeys.forEach((key) => (selectedKeysMap[key] = true))
    const instanceStats: { [key in InstanceKind]: InstanceStat } = {
      pd: newInstanceStat(),
      tidb: newInstanceStat(),
      tikv: newInstanceStat(),
      tiflash: newInstanceStat(),
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
          p.push('All ' + ik)
        } else {
          p.push(`${stats.selected} ${ik}`)
        }
      }
    }

    if (!hasUnselected) {
      return 'All Instances'
    }
    return p.join(', ')
  }, [items, selectedKeys])

  return <>{text}</>
}
