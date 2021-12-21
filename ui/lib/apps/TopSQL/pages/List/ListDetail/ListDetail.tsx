import React from 'react'
import { useTranslation } from 'react-i18next'

import { Head } from '@lib/components'

import { ListDetailTable } from './ListDetailTable'
import type { SQLRecord } from '../ListTable'

interface ListDetailProps {
  record: SQLRecord
}

export function ListDetail({ record }: ListDetailProps) {
  const { t } = useTranslation()

  return (
    <div>
      <Head title={t('top_sql.detail.title')} noMarginLeft />
      <ListDetailTable record={record} />
    </div>
  )
}
