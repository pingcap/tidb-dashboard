import React from 'react'
import { useTranslation } from 'react-i18next'

import { Head } from '@lib/components'

import { ListDetailTable } from './ListDetailTable'
import type { SQLRecord } from '../ListTable'

interface ListDetailProps {
  record: SQLRecord
  capacity: number
}

export function ListDetail({ record, capacity }: ListDetailProps) {
  const { t } = useTranslation()

  return (
    <>
      <Head title={t('topsql.detail.title')} />
      <ListDetailTable record={record} capacity={capacity} />
    </>
  )
}
