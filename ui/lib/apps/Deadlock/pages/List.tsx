import client, { DeadlockModel } from '@lib/client'
import {
    AnimatedSkeleton,
    AutoRefreshButton,
    Card,
    CardTable,
    HighlightSQL,
} from '@lib/components'
import openLink from '@lib/utils/openLink'
import { useMemoizedFn } from 'ahooks'
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEffectOnce } from 'react-use'

function List() {
    let [isLoading, setIsLoading] = useState(true)
    let [items, setItems] = useState([] as DeadlockModel[])
    const navigate = useNavigate()
    const handleRowClick = useMemoizedFn(
        (record, index, ev: React.MouseEvent<HTMLElement>) => {
            openLink(`/deadlock/detail?id=${record.id}`, ev, navigate)
        }
    )
    useEffectOnce(() => {
        setIsLoading(true)
        client
            .getInstance()
            .deadlockListGet()
            .then((res) => {
                setItems(res.data)
                setIsLoading(false)
            })
    })
    const summary = useMemo(() => {
        let result = new Map()
        for (const item of items) {
            let summeryEntry = result.get(item.id) || {
                id: item.id,
                occur_time: item.occur_time,
                items: [],
            }
            summeryEntry.items.push(item)
            result.set(item.id, summeryEntry)
        }
        return result
    }, [items])
    return (
        <div>
            <Card noMarginBottom>
                <AutoRefreshButton
                    disabled={isLoading}
                    onRefresh={async () => {
                        setIsLoading(true)
                        const { data } = await client.getInstance().deadlockListGet()
                        setItems(data)
                        setIsLoading(false)
                    }}
                />
            </Card>
            <AnimatedSkeleton showSkeleton={isLoading}>
                <CardTable
                    loading={isLoading}
                    columns={[
                        { name: 'id', key: 'id', minWidth: 100, onRender: (it) => it.id },
                        {
                            name: 'Transaction Count',
                            key: 'count',
                            minWidth: 300,
                            onRender: (it) => it.items.length,
                        },
                        {
                            name: 'Occur time',
                            key: 'occur_time',
                            minWidth: 300,
                            onRender: (it) => new Date(it.occur_time).toLocaleString(),
                        },
                    ]}
                    items={Array.from(summary.values())}
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