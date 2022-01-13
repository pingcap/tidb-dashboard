import React from 'react'
import { useTranslation } from 'react-i18next'
import { InstanceStatusV2 } from '@lib/utils/instanceTable'
import { Badge } from 'antd'
import { addTranslationResource } from '@lib/utils/i18n'
import { BadgeProps } from 'antd/lib/badge'

const translations = {
  en: {
    status: {
      up: 'Up',
      down: 'Down',
      tombstone: 'Tombstone',
      leaving: 'Leaving',
      unreachable: 'Unreachable',
      unknown: 'Unknown',
    },
  },
  zh: {
    status: {
      up: '在线',
      down: '离线',
      tombstone: '已缩容下线',
      leaving: '下线中',
      unreachable: '无法访问',
      unknown: '未知',
    },
  },
}

const badgeStatus: Record<InstanceStatusV2, BadgeProps['status']> = {
  [InstanceStatusV2.Down]: 'error',
  [InstanceStatusV2.Unreachable]: 'error',
  [InstanceStatusV2.Up]: 'success',
  [InstanceStatusV2.Tombstone]: 'default',
  [InstanceStatusV2.Leaving]: 'processing',
  [InstanceStatusV2.Unknown]: 'default',
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      instanceStatusBadgeV2: translations[key],
    },
  })
}

export interface IInstanceStatusBadgeV2Props {
  status?: InstanceStatusV2
}

function InstanceStatusBadgeV2({ status }: IInstanceStatusBadgeV2Props) {
  const { t } = useTranslation()
  const statusTranslationKey = (status as string) || 'unknown'
  return (
    <Badge
      status={badgeStatus[status ?? '']}
      text={t(`component.instanceStatusBadgeV2.status.${statusTranslationKey}`)}
    />
  )
}

export default React.memo(InstanceStatusBadgeV2)
