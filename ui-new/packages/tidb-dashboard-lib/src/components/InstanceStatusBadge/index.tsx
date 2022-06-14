import React from 'react'
import { useTranslation } from 'react-i18next'
import { InstanceStatus } from '@lib/utils/instanceTable'
import { Badge } from 'antd'
import { addTranslationResource } from '@lib/utils/i18n'

const translations = {
  en: {
    status: {
      up: 'Up',
      down: 'Down',
      tombstone: 'Tombstone',
      offline: 'Leaving',
      unknown: 'Unknown',
      unreachable: 'Unreachable'
    }
  },
  zh: {
    status: {
      up: '在线',
      down: '离线',
      tombstone: '已缩容下线',
      offline: '下线中',
      unknown: '未知',
      unreachable: '无法访问'
    }
  }
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      instanceStatusBadge: translations[key]
    }
  })
}

export interface IInstanceStatusBadgeProps {
  status?: number
}

function InstanceStatusBadge({ status }: IInstanceStatusBadgeProps) {
  const { t } = useTranslation()
  switch (status) {
    case InstanceStatus.Down:
      return (
        <Badge
          status="error"
          text={t('component.instanceStatusBadge.status.down')}
        />
      )
    case InstanceStatus.Unreachable:
      return (
        <Badge
          status="error"
          text={t('component.instanceStatusBadge.status.unreachable')}
        />
      )
    case InstanceStatus.Up:
      return (
        <Badge
          status="success"
          text={t('component.instanceStatusBadge.status.up')}
        />
      )
    case InstanceStatus.Tombstone:
      return (
        <Badge
          status="default"
          text={t('component.instanceStatusBadge.status.tombstone')}
        />
      )
    case InstanceStatus.Offline:
      return (
        <Badge
          status="processing"
          text={t('component.instanceStatusBadge.status.offline')}
        />
      )
    default:
      return (
        <Badge
          status="error"
          text={t('component.instanceStatusBadge.status.unknown')}
        />
      )
  }
}

export default React.memo(InstanceStatusBadge)
