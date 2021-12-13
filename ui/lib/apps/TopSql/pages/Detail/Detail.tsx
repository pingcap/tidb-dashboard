import React from 'react'
import { useTranslation } from 'react-i18next'
import { DetailTable } from './DetailTable'
import type { SQLRecord } from '../TopSqlTable'

interface TopSqlDetailProps {
  record: SQLRecord
}

export function TopSqlDetail({ record }: TopSqlDetailProps) {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t('top_sql.detail.title')}</h1>
      <DetailTable record={record} />
    </div>
  )
}
