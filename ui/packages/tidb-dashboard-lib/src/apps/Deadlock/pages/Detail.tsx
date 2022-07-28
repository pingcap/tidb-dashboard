import React, { useContext, useState } from 'react'
import { DeadlockModel } from '@lib/client'
import { useLocation } from 'react-router-dom'
import { useEffectOnce } from 'react-use'
import { useTranslation } from 'react-i18next'

import { CardTable, HighlightSQL } from '@lib/components'
import { CacheContext } from '@lib/utils/useCache'
import DeadlockChainGraph from '../components/DeadlockChainGraph'
import { DeadlockContext } from '../context'

function Detail() {
  const ctx = useContext(DeadlockContext)
  const { t } = useTranslation()
  const cache = useContext(CacheContext)
  const instance = new URLSearchParams(useLocation().search).get('instance')
  const id = new URLSearchParams(useLocation().search).get('id')
  let [isLoading, setIsLoading] = useState(true)
  let [items, setItems] = useState<DeadlockModel[]>([])
  useEffectOnce(() => {
    setIsLoading(true)
    if (cache?.get(`deadlock-${instance}-${id}`) !== undefined) {
      setItems(cache.get(`deadlock-${instance}-${id}`))
      setIsLoading(false)
    } else {
      ctx!.ds.deadlockListGet().then(({ data }) => {
        data.forEach((it) => {
          let items = cache?.get(`deadlock-${it.instance}-${it.id}`) || []
          items.push(it)
          cache?.set(`deadlock-${it.instance}-${it.id}`, items)
        })
        setItems(
          data.filter(
            (it) =>
              it.id?.toString() === id && it.instance?.toString() === instance
          )
        )
        setIsLoading(false)
      })
    }
  })
  const columns = [
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
  ]
  return (
    <>
      <DeadlockChainGraph deadlockChain={items} />
      <CardTable
        loading={isLoading}
        columns={columns}
        items={items}
        orderBy="try_lock_trx_id"
        desc={false}
        data-e2e="detail_tabs_deadlock"
      />
    </>
  )
}

export default Detail
