import React, { useContext, useState } from 'react'
import client, { DeadlockModel } from '@lib/client'
import { useLocation } from 'react-router'
import { CardTable, HighlightSQL } from '@lib/components'
import { useEffectOnce } from 'react-use'
import DeadlockChainGraph from '../components/DeadlockChainGraph'
import { CacheContext } from '@lib/utils/useCache'
import { useTranslation } from 'react-i18next'

function Detail() {
  const { t } = useTranslation()
  const cache = useContext(CacheContext)
  const id = new URLSearchParams(useLocation().search).get('id')
  let [isLoading, setIsLoading] = useState(true)
  let [items, setItems] = useState([] as DeadlockModel[])
  useEffectOnce(() => {
    setIsLoading(true)
    if (cache?.get(`deadlock-${id}`) !== undefined) {
      setItems(cache.get(`deadlock-${id}`))
      setIsLoading(false)
    } else {
      client
        .getInstance()
        .deadlockListGet()
        .then(({ data }) => {
          data.forEach((it) => {
            let items = cache?.get(`deadlock-${it.id}`) || []
            items.push(it)
            cache?.set(`deadlock-${it.id}`, items)
          })
          setItems(data.filter((it) => it.id?.toString() === id))
          setIsLoading(false)
        })
    }
  })
  return (
    <>
      <DeadlockChainGraph
        deadlockChain={items}
        onHover={(id: string) => {
          console.log(id)
        }}
      />
      <CardTable
        loading={isLoading}
        columns={[
          {
            name: t('deadlock.fields.try_lock_trx_id'),
            key: 'try_lock_trx_id',
            minWidth: 100,
            onRender: (it) => it.try_lock_trx_id
          },
          {
            name: t('deadlock.fields.current_sql'),
            key: 'current_sql',
            minWidth: 350,
            onRender: (it) => <HighlightSQL sql={it.current_sql} compact />
          },
          {
            name: t('deadlock.fields.key'),
            key: 'key',
            minWidth: 300,
            onRender: (it) => it.key
          },
          {
            name: t('deadlock.fields.trx_holding_lock'),
            key: 'trx_holding_lock',
            minWidth: 150,
            onRender: (it) => it.trx_holding_lock
          }
        ]}
        items={items}
        orderBy={'try_lock_trx_id'}
        desc={false}
        data-e2e="detail_tabs_deadlock"
      />
    </>
  )
}

export default Detail
