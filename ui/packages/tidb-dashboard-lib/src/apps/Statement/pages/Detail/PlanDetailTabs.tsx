import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { CardTable, CardTabs } from '@lib/components'
import { StatementModel } from '@lib/client'
import { valueColumns, timeValueColumns } from '@lib/utils/tableColumns'

import { tabBasicItems } from './PlanDetailTabBasic'
import { tabTimeItems } from './PlanDetailTabTime'
import { tabCoprItems } from './PlanDetailTabCopr'
import { tabTxnItems } from './PlanDetailTabTxn'
import SlowQueryTab from './SlowQueryTab'
import { useSchemaColumns } from '../../utils/useSchemaColumns'
import type { IQuery } from './PlanDetail'
import { StatementContext } from '../../context'
import { telemetry as stmtTelemetry } from '../../utils/telemetry'

export default function DetailTabs({
  data,
  query
}: {
  data: StatementModel
  query: IQuery
}) {
  const ctx = useContext(StatementContext)

  const { t } = useTranslation()
  const { schemaColumns } = useSchemaColumns(
    ctx!.ds.statementsAvailableFieldsGet
  )
  const columnsSet = new Set(schemaColumns)

  const tabs = [
    {
      key: 'basic',
      title: t('statement.pages.detail.tabs.basic'),
      content: () => {
        const items = tabBasicItems(data)
        const columns = valueColumns('statement.fields.')
        return (
          <CardTable
            cardNoMargin
            columns={columns}
            items={items}
            extendLastColumn
            data-e2e="statement_pages_detail_tabs_basic"
          />
        )
      }
    },
    {
      key: 'time',
      title: t('statement.pages.detail.tabs.time'),
      content: () => {
        const items = tabTimeItems(data, t)
        const columns = timeValueColumns('statement.fields.', items)
        return (
          <CardTable
            cardNoMargin
            columns={columns}
            items={items}
            extendLastColumn
            data-e2e="statement_pages_detail_tabs_time"
          />
        )
      }
    },
    {
      key: 'copr',
      title: t('statement.pages.detail.tabs.copr'),
      content: () => {
        const items = tabCoprItems(data).filter((item) =>
          columnsSet.has(item.key)
        )
        const columns = valueColumns('statement.fields.')
        return (
          <CardTable
            cardNoMargin
            columns={columns}
            items={items}
            extendLastColumn
            data-e2e="statement_pages_detail_tabs_copr"
          />
        )
      }
    },
    {
      key: 'txn',
      title: t('statement.pages.detail.tabs.txn'),
      content: () => {
        const items = tabTxnItems(data)
        const columns = valueColumns('statement.fields.')
        return (
          <CardTable
            cardNoMargin
            columns={columns}
            items={items}
            extendLastColumn
            data-e2e="statement_pages_detail_tabs_txn"
          />
        )
      }
    },
    {
      key: 'slow_query',
      title: t('statement.pages.detail.tabs.slow_query'),
      content: () => <SlowQueryTab query={query} />
    }
  ]
  return (
    <CardTabs
      animated={false}
      tabs={tabs}
      onChange={(tab) => {
        stmtTelemetry.switchDetailTab(tab)
      }}
    />
  )
}
