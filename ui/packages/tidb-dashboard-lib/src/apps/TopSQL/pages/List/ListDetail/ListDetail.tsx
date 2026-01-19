import React from 'react'
import { useTranslation } from 'react-i18next'

import { Head } from '@lib/components'

import { InstanceType, ListDetailTable } from './ListDetailTable'
import type { SQLRecord } from '../ListTable'
import { OrderBy } from '../List'

interface ListDetailProps {
  record: SQLRecord
  capacity: number
  instanceType: InstanceType
  orderBy: OrderBy
}

export function ListDetail({
  record,
  capacity,
  instanceType,
  orderBy
}: ListDetailProps) {
  const { t } = useTranslation()

  return (
    <>
      <Head title={t('topsql.detail.title')} />
      <ListDetailTable
        instanceType={instanceType}
        record={record}
        capacity={capacity}
        orderBy={orderBy}
      />
    </>
  )
}
