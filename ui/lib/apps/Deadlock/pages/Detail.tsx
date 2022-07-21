import React, { useEffect, useRef, useState } from 'react'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client, { DeadlockModel } from '@lib/client'
import { graphviz } from 'd3-graphviz'
import { useLocation, useParams } from 'react-router'
import { Card } from 'antd'
import { CardTable, HighlightSQL } from '@lib/components'
import { useEffectOnce } from 'react-use'
import DeadlockChainGraph from '../components/DeadlockChainGraph'

function Detail() {
    const id = new URLSearchParams(useLocation().search).get('id')
    let [isLoading, setIsLoading] = useState(true)
    let [items, setItems] = useState([] as DeadlockModel[])
    useEffectOnce(() => {
        setIsLoading(true)
        client
            .getInstance()
            .deadlockListGet()
            .then((res) => {
                setItems(res.data.filter((it) => it.id?.toString() === id))
                setIsLoading(false)
            })
    })
    return (
        <DeadlockChainGraph
            deadlockChain={items}
            onHover={(id: string) => {
                console.log(id)
            }}
        />
    )
}

export default Detail