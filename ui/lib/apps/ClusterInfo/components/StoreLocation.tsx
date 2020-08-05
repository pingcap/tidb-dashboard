import React, { useMemo } from 'react'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client, { TopologyStoreLocation } from '@lib/client'
import { Pre } from '@lib/components'

type TreeNode = {
  name: string
  value: string
  children: TreeNode[]
}

function buildTopology(data: TopologyStoreLocation | undefined) {
  let treeData: TreeNode = { name: '', value: '', children: [] }
  if ((data?.location_labels?.length || 0) > 0) {
    const locationLabels: string[] = data?.location_labels || []
    treeData.name = locationLabels[0]

    for (const store of data?.stores || []) {
      // reset curNode, point to tree nodes beginning
      let curNode = treeData
      for (const curLabel of locationLabels) {
        const curLabelVal = store.labels![curLabel]
        if (curLabelVal === undefined) {
          continue
        }
        let subNode: TreeNode | undefined = curNode.children.find(
          (el) => el.name === curLabel && el.value === curLabelVal
        )
        if (subNode === undefined) {
          subNode = { name: curLabel, value: curLabelVal, children: [] }
          curNode.children.push(subNode)
        }
        // make curNode point to subNode
        curNode = subNode
      }
      curNode.children.push({
        name: 'address',
        value: store.address!,
        children: [],
      })
    }
  }
  return treeData
}

export default function StoreLocation() {
  const { data } = useClientRequest((cancelToken) =>
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
