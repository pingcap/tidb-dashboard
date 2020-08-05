import React, { useMemo } from 'react'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client, { TopologyStoreLocation } from '@lib/client'
import { Pre } from '@lib/components'

type TreeNode = {
  name: string
  children: TreeNode[]
}

function buildTopology(data: TopologyStoreLocation | undefined) {
  let treeData: TreeNode = { name: '', children: [] }
  if ((data?.location_labels?.length || 0) > 0) {
    const locationLabels: string[] = data?.location_labels?.split(',') || []
    treeData.name = locationLabels[0]

    for (const store of data?.stores || []) {
      let curNode = treeData
      for (const curLabel of locationLabels) {
        const curLabelVal = store.labels![curLabel]
        if (curLabelVal === undefined) {
          continue
        }
        let subNode: TreeNode | undefined = curNode.children.find(
          (el) => el.name === curLabelVal
        )
        if (subNode === undefined) {
          subNode = { name: curLabelVal, children: [] }
          curNode.children.push(subNode)
        }
        curNode = subNode
      }
      curNode.children.push({ name: store.address!, children: [] })
    }
  }
  return treeData
}

export default function StoreLocation() {
  const { data, isLoading, error } = useClientRequest((cancelToken) =>
    client.getInstance().getStoreLocationTopology({ cancelToken })
  )
  const locationTopology = useMemo(() => buildTopology(data), [data])

  return (
    <div>
      <Pre>{JSON.stringify(data, undefined, 2)}</Pre>
      <Pre>{JSON.stringify(locationTopology, undefined, 2)}</Pre>
    </div>
  )
}
