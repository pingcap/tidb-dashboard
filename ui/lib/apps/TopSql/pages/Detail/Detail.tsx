import React from 'react'
import { useTranslation } from 'react-i18next'

import { Head } from '@lib/components'

import { DetailTable } from './DetailTable'
import type { SQLRecord } from '../TopSqlTable'

interface TopSqlDetailProps {
  record: SQLRecord
}

export function TopSqlDetail({ record }: TopSqlDetailProps) {
  const { t } = useTranslation()

  return (
    <div>
      <Head title={t('top_sql.detail.title')} noMarginLeft />
      <DetailTable record={record} />
    </div>
  )
}
