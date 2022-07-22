import React from 'react'
import { RawNodeDatum, TreeDiagramProps, rectBound } from './types'

import TreeDigram from '@lib/components/TreeDiagram'
import TreeDiagramThumbnail from '@lib/components/TreeDiagram/Thumbnail'

interface TreeDiagramViewProps extends TreeDiagramProps {
  data: RawNodeDatum[]
  viewport?: rectBound
  showMinimap?: boolean
  isThumbnail?: boolean
}

const TreeDiagramView = ({
  data,
  viewport,
  showMinimap,
  isThumbnail
}: TreeDiagramViewProps) => {
  const nodeSize = { width: 250, height: 210 }

  return (
    <>
      {isThumbnail ? (
        <TreeDiagramThumbnail
          data={data}
          nodeSize={nodeSize}
          viewport={{
            width: window.innerWidth / 2,
            height: window.innerHeight / 2
          }}
        />
      ) : (
        <TreeDigram
          data={data}
          showMinimap={showMinimap}
          nodeSize={nodeSize}
          viewport={viewport!}
        />
      )}
    </>
  )
}

TreeDiagramView.defaultProps = {
  viewport: {
    width: window.innerWidth
  },
  showMinimap: false,
  isThumbnail: false
}

export default TreeDiagramView
