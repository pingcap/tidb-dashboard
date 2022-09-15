import React, { useState } from 'react'
import { VisualPlanThumbnail, VisualPlan, RawNodeDatum } from 'visual-plan'

import DetailDrawer from './DetailDrawer'

export const VisualPlanThumbnailView = (props) => {
  const binaryPlan = props.data
  const minimap = false
  const cte = { gap: 10 }
  return (
    <VisualPlanThumbnail
      data={binaryPlan}
      minimap={minimap}
      cte={cte}
      theme={'light'}
    />
  )
}

export const VisualPlanView = (props) => {
  const binaryPlan = props.data
  const minimap = { scale: 0.15 }
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)
  const [detailData, setDetailData] = useState<RawNodeDatum | null>(null)

  return (
    <>
      <VisualPlan
        data={binaryPlan}
        onNodeClick={(n) => {
          setDetailData(n)
          setShowDetailDrawer(true)
        }}
        minimap={minimap}
        cte={{ gap: 10 }}
      />
      <DetailDrawer
        data={detailData!}
        theme={'light'}
        visible={showDetailDrawer}
        onClose={() => setShowDetailDrawer(false)}
      />
    </>
  )
}
