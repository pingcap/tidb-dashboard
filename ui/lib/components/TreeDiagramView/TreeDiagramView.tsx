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

const customNodeDetailElement = (nodeDetailProps) => {
  const nodeDatum = nodeDetailProps.data

  return (
    <div>
      <p>
        Actual Rows: <span>{nodeDatum.act_rows}</span>
      </p>
      <p>
        Estimate Rows: <span>{nodeDatum.est_rows}</span>
      </p>
      <p>
        Run at: <span>{nodeDatum.run_at}</span>
      </p>
      <p>
        Cost: <span>{nodeDatum.cost}</span>
      </p>
      <p>
        Disk Bytes: <span>{nodeDatum.disk_bytes}</span>
      </p>
      <p>
        Memory Bytes: <span>{nodeDatum.memory_bytes}</span>
      </p>
      <p>
        Operator Info: <span>{nodeDatum.operator_info}</span>
      </p>
      <p>
        Root Basic Exec Info: <span>{nodeDatum.root_basic_exec_info}</span>
      </p>
      <p>
        Root Group Exec Info: <span>{nodeDatum.root_group_exec_info}</span>
      </p>
      <p>
        Store Type: <span>{nodeDatum.store_type}</span>
      </p>
      <p>
        Task Type: <span>{nodeDatum.task_type}</span>
      </p>
    </div>
  )
}

const TreeDiagramView = ({
  data,
  showMinimap,
  viewport,
  isThumbnail,
}: TreeDiagramViewProps) => {
  const nodeSize = { width: 250, height: 150 }

  const treeDataArr = data

  return (
    <>
      {isThumbnail ? (
        <div style={{ height: 1000 }}>
          {treeDataArr.map((d, idx) => (
            <TreeDiagramThumbnail
              key={idx}
              data={d}
              nodeSize={nodeSize}
              viewport={{
                width: window.innerWidth / 2,
                height: window.innerHeight / 2,
              }}
            />
          ))}
        </div>
      ) : (
        <TreeDigram
          data={data}
          showMinimap={showMinimap}
          nodeSize={nodeSize}
          customNodeDetailElement={customNodeDetailElement}
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
