import React from 'react'
import { RawNodeDatum, TreeDiagramProps, rectBound } from './types'
import TreeDigram from '../TreeDiagram'
import TreeDiagramThumbnail from '../TreeDiagram/TreeDiagramThumbnail'

interface TreeDiagramViewProps extends TreeDiagramProps {
  data: RawNodeDatum[]
  showMinimap?: boolean
  viewport: rectBound
  isThumbnail?: boolean
}

const TreeDiagramView = ({
  data,
  showMinimap,
  viewport,
  isThumbnail,
}: TreeDiagramViewProps) => {
  const nodeSize = { width: 250, height: 180 }
  console.log('data', data)

  return (
    <>
      {isThumbnail ? (
        <TreeDiagramThumbnail
          data={data}
          nodeSize={nodeSize}
          viewport={{
            width: window.innerWidth / 2,
            height: window.innerHeight / 2,
          }}
        />
      ) : (
        <TreeDigram
          data={data}
          showMinimap={showMinimap}
          nodeSize={nodeSize}
          viewport={viewport}
        />
      )}
    </>
  )
}

TreeDiagramView.defaultProps = {
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight - 150,
  },
  showMinimap: false,
  isThumbnail: false,
}

export default TreeDiagramView
