import React, { useMemo } from 'react'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client, { TopologyStoreLocation } from '@lib/client'
import { Pre } from '@lib/components'

type TreeNode = {
  name: string
  children?: TreeNode[]
  value?: any
}

function buildTopology(data: TopologyStoreLocation | undefined) {
  let treeData: TreeNode = { name: '' }
  if ((data?.location_labels?.length || 0) > 0) {
    const locationLabels: string[] = data?.location_labels?.split(',') || []
    treeData.name = locationLabels[0]
    treeData.children = []

    for (const store of data?.stores || []) {
      let curNode = treeData
      for (const curLabel of locationLabels) {
      }
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
