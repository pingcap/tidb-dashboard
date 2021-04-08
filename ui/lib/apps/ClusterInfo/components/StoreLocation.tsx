import React, { useMemo } from 'react'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client from '@lib/client'
import { AnimatedSkeleton, ErrorBar } from '@lib/components'
import StoreLocationTree, { buildTreeData } from './StoreLocationTree'

export default function StoreLocation() {
  const {
    data,
    isLoading,
    error,
    sendRequest,
  } = useClientRequest((reqConfig) =>
    client.getInstance().getStoreLocationTopology(reqConfig)
  )
  const treeData = useMemo(() => buildTreeData(data), [data])

  return (
    <div>
      <ErrorBar errors={[error]} />
      <AnimatedSkeleton showSkeleton={isLoading}>
        <StoreLocationTree
          dataSource={treeData}
          getMinHeight={
            () => document.documentElement.clientHeight - 80 - 48 * 2 // 48 = margin of cardInner
          }
          onReload={sendRequest}
        />
      </AnimatedSkeleton>
    </div>
  )
}
