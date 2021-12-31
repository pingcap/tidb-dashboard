// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.
import React from 'react'
import { Result } from 'antd'
import { useTranslation } from 'react-i18next'
import { Card } from '@lib/components'

export function NgmNotStarted() {
  const { t } = useTranslation()
  return (
    <Card>
      <Result
        title={t('topsql.alert_header.title')}
        subTitle={t('topsql.ngm_not_started')}
      />
    </Card>
  )
}
