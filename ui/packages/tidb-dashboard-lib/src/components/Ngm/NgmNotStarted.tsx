// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.
import React, { ReactNode } from 'react'
import { Button, Result, Space } from 'antd'
import { useTranslation } from 'react-i18next'

import { Card } from '@lib/components'
import { addTranslationResource } from '@lib/utils/i18n'
import { isDistro } from '@lib/utils/distro'
import { useNgmState, NgmState } from '@lib/utils/store'

const translations = {
  en: {
    title: 'Feature Not Enabled',
    subTitle:
      'A required component `NgMonitoring` is not started in this cluster. This feature is not available.',
    help_text: 'Help',
    help_url:
      'https://docs.pingcap.com/tidb/dev/dashboard-faq#a-required-component-ngmonitoring-is-not-started-error-is-shown'
  },
  zh: {
    title: '该功能未启用',
    subTitle: '集群中未启动必要组件 `NgMonitoring`，本功能不可用。',
    help_text: '帮助',
    help_url:
      'https://docs.pingcap.com/zh/tidb/dev/dashboard-faq#界面提示-集群中未启动必要组件-ngmonitoring'
  }
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      ngmNotStarted: translations[key]
    }
  })
}

function NgmNotStarted() {
  const { t } = useTranslation()
  return (
    <Card data-e2e="ngm_not_started">
      <Result
        title={t('component.ngmNotStarted.title')}
        subTitle={t('component.ngmNotStarted.subTitle')}
        extra={
          <Space>
            {!isDistro() && (
              <Button
                onClick={() => {
                  window.open(t('component.ngmNotStarted.help_url'), '_blank')
                }}
              >
                {t('component.ngmNotStarted.help_text')}
              </Button>
            )}
          </Space>
        }
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
