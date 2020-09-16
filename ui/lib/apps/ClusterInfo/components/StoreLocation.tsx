import React, { useMemo } from 'react'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client, { TopologyStoreLocation } from '@lib/client'
import { AnimatedSkeleton } from '@lib/components'
import StoreLocationTree from './StoreLocationTree'

type TreeNode = {
  name: string
  value: string
  children: TreeNode[]
}

function buildTreeData(data: TopologyStoreLocation | undefined): TreeNode {
  let treeData: TreeNode = { name: 'Stores', value: '', children: [] }
  if ((data?.location_labels?.length || 0) > 0) {
    const locationLabels: string[] = data?.location_labels || []

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
        name: store.address!,
        value: '',
        children: [],
      })
    }
  }
  return treeData
}

export default function StoreLocation() {
  const { data, isLoading } = useClientRequest((reqConfig) =>
    client.getInstance().getStoreLocationTopology(reqConfig)
  )
  const treeData = useMemo(() => buildTreeData(data), [data])

  return (
    <AnimatedSkeleton showSkeleton={isLoading}>
      <StoreLocationTree dataSource={treeData} />
    </AnimatedSkeleton>
  )
}
