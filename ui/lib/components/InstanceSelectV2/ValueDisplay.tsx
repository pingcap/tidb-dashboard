import React, { useMemo } from 'react'
import { InstanceKind, InstanceKindName } from '@lib/utils/instanceTable'
import { useTranslation } from 'react-i18next'
import { TopoCompInfoWithSignature } from '@lib/client'

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
  items: TopoCompInfoWithSignature[]
  selectedKeys: string[]
}

export default function ValueDisplay({
  items,
  selectedKeys,
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
    }
    items.forEach((item) => {
      instanceStats[item.kind as InstanceKind].all++
      if (selectedKeysMap[item.signature!]) {
        instanceStats[item.kind as InstanceKind].selected++
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
            t('component.instanceSelectV2.selected.partial.all', {
              component: InstanceKindName[ik],
            })
          )
        } else {
          p.push(
            t('component.instanceSelectV2.selected.partial.n', {
              n: stats.selected,
              component: InstanceKindName[ik],
            })
          )
        }
      }
    }

    if (!hasUnselected) {
      return t('component.instanceSelectV2.selected.all')
    }

    return p.join(', ')
  }, [t, items, selectedKeys])

  return <>{text}</>
}
