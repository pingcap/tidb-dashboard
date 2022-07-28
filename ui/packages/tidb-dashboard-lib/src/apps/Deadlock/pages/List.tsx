import { DeadlockModel } from '@lib/client'
import {
  AnimatedSkeleton,
  AutoRefreshButton,
  Card,
  CardTable
} from '@lib/components'
import openLink from '@lib/utils/openLink'
import { useMemoizedFn } from 'ahooks'
import { CacheContext } from '@lib/utils/useCache'
import React, { useMemo, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEffectOnce } from 'react-use'
import { useTranslation } from 'react-i18next'
import { DeadlockContext } from '../context'

function List() {
  const ctx = useContext(DeadlockContext)

  const { t } = useTranslation()
  const cache = useContext(CacheContext)
  let [isLoading, setIsLoading] = useState(true)
  let [items, setItems] = useState<DeadlockModel[]>([])
  const navigate = useNavigate()

  const pullItems = async () => {
    cache?.clear()
    setIsLoading(true)
    const { data } = await ctx!.ds.deadlockListGet()
    data.forEach((it) => {
      let items = cache?.get(`deadlock-${it.instance}-${it.id}`) || []
      items.push(it)
      cache?.set(`deadlock-${it.instance}-${it.id}`, items)
    })
    setItems(data)
    setIsLoading(false)
  }
  const handleRowClick = useMemoizedFn(
    (record, index, ev: React.MouseEvent<HTMLElement>) => {
      openLink(
        `/deadlock/detail?id=${record.id}&instance=${record.instance}`,
        ev,
        navigate
      )
    }
  )
  useEffectOnce(() => {
    setIsLoading(true)
    cache?.clear()
    ctx!.ds
      .deadlockListGet()
      .then((res) => {
        setItems(res.data)
        res.data.forEach((it) => {
          let items = cache?.get(`deadlock-${it.instance}-${it.id}`) || []
          items.push(it)
          cache?.set(`deadlock-${it.instance}-${it.id}`, items)
        })
      })
      .catch((e) => {
        console.error(e)
      })
      .finally(() => {
        setIsLoading(false)
      })
  })
  const summary = useMemo(() => {
    let result = new Map()
    for (const item of items) {
      let summaryEntry = result.get(`${item.instance}-${item.id}`) || {
        id: item.id,
        instance: item.instance,
        occur_time: item.occur_time,
        items: []
      }
      summaryEntry.items.push(item)
      result.set(`${item.instance}-${item.id}`, summaryEntry)
    }
    return Array.from(result.values())
  }, [items])

  const columns = [
    {
      name: t('deadlock.fields.instance'),
      key: 'instance',
      minWidth: 100,
      onRender: (it) => it.instance
    },
    { name: 'ID', key: 'id', minWidth: 100, onRender: (it) => it.id },
    {
      name: 'Transaction Count',
      key: t('deadlock.fields.count'),
      minWidth: 300,
      onRender: (it) => it.items.length
    },
    {
      name: 'Occur time',
      key: t('deadlock.fields.occur_time'),
      minWidth: 300,
      onRender: (it) => new Date(it.occur_time).toLocaleString()
    }
  ]
  return (
    <div>
      <Card noMarginBottom>
        <AutoRefreshButton disabled={isLoading} onRefresh={pullItems} />
      </Card>
      <AnimatedSkeleton showSkeleton={isLoading}>
        <CardTable
          loading={isLoading}
          columns={columns}
          items={summary}
          orderBy={'occur_time'}
          desc={false}
          onRowClicked={handleRowClick}
          data-e2e="deadlock_list"
        />
      </AnimatedSkeleton>
    </div>
  )
}

export default List
