import React from 'react'
import { RawNodeDatum, TreeDiagramProps, rectBound } from './types'
import TreeDigram from '../TreeDiagram'
import TreeDiagramThumbnail from '../TreeDiagram/TreeDiagramThumbnail'
import styles from './index.module.less'
import { Button } from 'antd'
import { PlusOutlined, MinusOutlined } from '@ant-design/icons'

interface TreeDiagramViewProps extends TreeDiagramProps {
  data: RawNodeDatum[]
  showMinimap?: boolean
  viewPort: rectBound
  isThumbnail?: boolean
}

const collapsableButtonSize = {
  width: 60,
  height: 30,
}

const customNodeElements = (nodeProps) => {
  const {
    nodeDatum,
    hierarchyPointNode,
    onNodeExpandBtnToggle,
    onNodeDetailClick,
  } = nodeProps
  const { width: nodeWidth, height: nodeHeight } =
    nodeDatum.__node_attrs.nodeFlexSize

  const { x, y } = hierarchyPointNode
  const nodeTranslate = {
    x: x - nodeWidth / 2,
    y: y,
    k: 1,
  }

  const handleExpandBtnToggleOnClick = (e, node) => {
    onNodeExpandBtnToggle(node.__node_attrs.id)
  }

  const handleOnNodeDetailClick = (e, node) => {
    onNodeDetailClick(node)
  }

  return (
    <React.Fragment>
      <g
        className="node"
        transform={`translate(${nodeTranslate.x}, ${nodeTranslate.y}) scale(${nodeTranslate.k})`}
      >
        <rect
          className="node-rect"
          width={nodeWidth}
          height={nodeHeight}
          x={0}
          y={0}
          fill="none"
        ></rect>
        <foreignObject
          className="node-foreign-object"
          width={nodeWidth}
          height={nodeHeight}
          x={0}
          y={0}
        >
          <div className="node-foreign-object-div" style={{ width: nodeWidth }}>
            <div
              className={styles.nodeCard}
              style={{
                width: nodeWidth,
                height: nodeHeight - collapsableButtonSize.height,
              }}
              onClick={(e) => handleOnNodeDetailClick(e, nodeDatum)}
            >
              <div className={styles.nodeCardHeader}>{nodeDatum.name}</div>
              <div className={styles.nodeCardBody}>
                <p>
                  Actual Rows: <span>{nodeDatum.act_rows}</span>
                </p>
                <p>
                  Estimate Rows: <span>{nodeDatum.est_rows}</span>
                </p>
                <p>
                  Run at: <span>{nodeDatum.run_at}</span>
                </p>
              </div>
            </div>
            {nodeDatum.__node_attrs.collapsiable && (
              <Button
                className={styles.collapsableButton}
                style={{
                  width: collapsableButtonSize.width,
                  height: collapsableButtonSize.height,
                  top: nodeHeight - collapsableButtonSize.height,
                  left: (nodeWidth - 60) / 2,
                }}
                onClick={(e) => handleExpandBtnToggleOnClick(e, nodeDatum)}
              >
                {nodeDatum.__node_attrs.collapsed ? (
                  <PlusOutlined />
                ) : (
                  <MinusOutlined />
                )}
              </Button>
            )}
          </div>
        </foreignObject>
      </g>
    </React.Fragment>
  )
}

const customLinkElements = (linkProps) => {
  const { data: link } = linkProps
  // Draws lines between parent and child node
  // Generates horizontal diagonal - play with it here - https://observablehq.com/@bumbeishvili/curved-edges-horizontal-d3-v3-v4-v5-v6
  function diagonal(s, t) {
    const x = s.x
    const y = s.y
    const ex = t.x
    const ey = t.y

    let xrvs = ex - x < 0 ? -1 : 1
    let yrvs = ey - y < 0 ? -1 : 1

    // Sets a default radius
    let rdef = 35
    let r = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef

    r = Math.abs(ey - y) / 2 < r ? Math.abs(ey - y) / 2 : r

    let h = Math.abs(ey - y) / 2 - r
    let w = Math.abs(ex - x) - r * 2
    const path = `
                M ${x} ${y}
                L ${x} ${y + h * yrvs}
                C  ${x} ${y + h * yrvs + r * yrvs} ${x} ${
      y + h * yrvs + r * yrvs
    } ${x + r * xrvs} ${y + h * yrvs + r * yrvs}
                L ${x + w * xrvs + r * xrvs} ${y + h * yrvs + r * yrvs}
                C  ${ex}  ${y + h * yrvs + r * yrvs} ${ex}  ${
      y + h * yrvs + r * yrvs
    } ${ex} ${ey - h * yrvs}
                L ${ex} ${ey}
        `
    return path
  }

  return (
    <React.Fragment>
      <path
        className={styles.pathLink}
        d={diagonal(
          // source node
          {
            x: link.source.x,
            y:
              link.source.y + link.source.data.__node_attrs.nodeFlexSize.height,
          },
          // target node
          { x: link.target.x, y: link.target.y }
        )}
      />
    </React.Fragment>
  )
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
  viewPort,
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
              customNodeElement={customNodeElements}
              customLinkElement={customLinkElements}
              viewPort={{
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
          customNodeElement={customNodeElements}
          customLinkElement={customLinkElements}
          customNodeDetailElement={customNodeDetailElement}
          viewPort={viewPort}
        />
      )}
    </>
  )
}

TreeDiagramView.defaultProps = {
  viewPort: {
    width: window.innerWidth,
    height: window.innerHeight - 150,
  },
  showMinimap: false,
  isThumbnail: false,
}

export default TreeDiagramView
