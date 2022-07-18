import React, { useContext, useMemo } from 'react'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { AnimatedSkeleton, ErrorBar } from '@lib/components'
import StoreLocationTree, {
  buildTreeData,
  getShortStrMap
} from './StoreLocationTree'
import { ClusterInfoContext } from '../context'

export default function StoreLocation() {
  const ctx = useContext(ClusterInfoContext)

  const { data, isLoading, error, sendRequest } = useClientRequest(
    ctx!.ds.getStoreLocationTopology
  )
  const treeData = useMemo(() => buildTreeData(data), [data])
  const shortStrMap = useMemo(() => getShortStrMap(data), [data])

  return (
    <div>
      <ErrorBar errors={[error]} />
      <AnimatedSkeleton showSkeleton={isLoading}>
        <StoreLocationTree
          dataSource={treeData}
          shortStrMap={shortStrMap}
          getMinHeight={
            () => document.documentElement.clientHeight - 80 - 48 * 2 // 48 = margin of cardInner
          }
          onReload={sendRequest}
        />
      </AnimatedSkeleton>
    </div>
  )
}
