import React, { useMemo } from 'react'
import { IInstanceTableItem, InstanceKind } from '@lib/utils/instanceTable'
import { Typography } from 'antd'

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

export default function SelectDisplay({
  items,
  selectedKeys,
}: {
  items: IInstanceTableItem[]
  selectedKeys: string[]
}) {
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

  if (items.length === 0 || selectedKeys.length === 0) {
    // Not yet loaded
    return <Typography.Text type="secondary">Select Instance</Typography.Text>
  } else {
    return <span>{text}</span>
  }
}
