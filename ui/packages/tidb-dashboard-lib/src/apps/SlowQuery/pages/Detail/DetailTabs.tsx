import React, { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ReactJson from 'react-json-view'

import { SlowqueryModel } from '@lib/client'
import { valueColumns, timeValueColumns } from '@lib/utils/tableColumns'
import { CardTabs, CardTable } from '@lib/components'

import { tabBasicItems } from './DetailTabBasic'
import { tabTimeItems } from './DetailTabTime'
import { tabCoprItems } from './DetailTabCopr'
import { tabTxnItems } from './DetailTabTxn'
import { useSchemaColumns } from '../../utils/useSchemaColumns'
import { SlowQueryContext } from '../../context'

export default function DetailTabs({ data }: { data: SlowqueryModel }) {
  const ctx = useContext(SlowQueryContext)

  const { t } = useTranslation()
  const { schemaColumns } = useSchemaColumns(
    ctx!.ds.slowQueryAvailableFieldsGet
  )

  const tabs = useMemo(() => {
    const tbs = [
      {
        key: 'basic',
        title: t('slow_query.detail.tabs.basic'),
        content: () => {
          const items = tabBasicItems(data)
          const columns = valueColumns('slow_query.fields.')
          return (
            <CardTable
              cardNoMargin
              columns={columns}
              items={items}
              extendLastColumn
              data-e2e="details_list"
            />
          )
        }
      },
      {
        key: 'time',
        title: t('slow_query.detail.tabs.time'),
        content: () => {
          const items = tabTimeItems(data, t)
          const columns = timeValueColumns('slow_query.fields.', items)
          return (
            <CardTable
              cardNoMargin
              columns={columns}
              items={items}
              extendLastColumn
            />
          )
        }
      },
      {
        key: 'copr',
        title: t('slow_query.detail.tabs.copr'),
        content: () => {
          const columnsSet = new Set(schemaColumns)
          const items = tabCoprItems(data).filter((item) =>
            columnsSet.has(item.key)
          )
          const columns = valueColumns('slow_query.fields.')
          return (
            <CardTable
              cardNoMargin
              columns={columns}
              items={items}
              extendLastColumn
            />
          )
        }
      },
      {
        key: 'txn',
        title: t('slow_query.detail.tabs.txn'),
        content: () => {
          const items = tabTxnItems(data)
          const columns = valueColumns('slow_query.fields.')
          return (
            <CardTable
              cardNoMargin
              columns={columns}
              items={items}
              extendLastColumn
            />
          )
        }
      }
    ]
    if (data.warnings) {
      tbs.push({
        key: 'warnings',
        title: t('slow_query.detail.tabs.warnings'),
        content: () => {
          return (
            <ReactJson
              src={data.warnings! as any}
              enableClipboard={false}
              displayObjectSize={false}
              displayDataTypes={false}
              name={false}
              iconStyle="circle"
              groupArraysAfterLength={10}
            />
          )
        }
      })
    }
    return tbs
  }, [schemaColumns, data, t])
  return <CardTabs animated={false} tabs={tabs} />
}
