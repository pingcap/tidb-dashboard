// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.
import React, { ReactNode } from 'react'
import { Result } from 'antd'
import { useTranslation } from 'react-i18next'

import { Card } from '@lib/components'
import { addTranslationResource } from '@lib/utils/i18n'
import { useNgmState, NgmState } from '@lib/utils/store'

const translations = {
  en: {
    title: 'Feature Not Enabled',
    subTitle:
      'A required component `NgMonitoring` is not started in this cluster. This feature is not available.',
  },
  zh: {
    title: '该功能未启用',
    subTitle: '集群中未启动必要组件 `NgMonitoring`，本功能不可用。',
  },
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      ngmNotStarted: translations[key],
    },
  })
}

export function NgmNotStarted() {
  const { t } = useTranslation()
  return (
    <Card>
      <Result
        title={t('component.ngmNotStarted.title')}
        subTitle={t('component.ngmNotStarted.subTitle')}
      />
    </Card>
  )
}

export function NgmNotStartedGuard({ children }: { children: ReactNode }) {
  const ngmState = useNgmState()
  if (React.isValidElement(children)) {
    return ngmState === NgmState.Started ? children : <NgmNotStarted />
  }
  return null
}
