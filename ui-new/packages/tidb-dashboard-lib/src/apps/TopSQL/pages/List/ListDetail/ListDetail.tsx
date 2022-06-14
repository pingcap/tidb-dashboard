import React from 'react'
import { useTranslation } from 'react-i18next'

import { Head } from '@lib/components'

import { InstanceType, ListDetailTable } from './ListDetailTable'
import type { SQLRecord } from '../ListTable'

interface ListDetailProps {
  record: SQLRecord
  capacity: number
  instanceType: InstanceType
}

export function ListDetail({
  record,
  capacity,
  instanceType
}: ListDetailProps) {
  const { t } = useTranslation()

  return (
    <>
      <Head title={t('topsql.detail.title')} />
      <ListDetailTable
        instanceType={instanceType}
        record={record}
        capacity={capacity}
      />
    </>
  )
}
