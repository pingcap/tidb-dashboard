import React, { useRef } from 'react'
import { Button, Progress } from 'antd'
import { PlusOutlined, MinusOutlined } from '@ant-design/icons'
import styles from './index.module.less'
import { TreeNodeDatum } from './types'
import { HierarchyPointNode } from 'd3-hierarchy'
import { interpolateOrRd } from 'd3-scale-chromatic'

interface NodeProps {
  data: HierarchyPointNode<TreeNodeDatum>
  totalTime: number
  handleNodeExpandBtnToggle?: any
  collapsiableButtonSize?: {
    width: number
    height: number
  }
  centerNode?: any
  handleExpandNodeToggle?: any
  isMinimap?: boolean
}

const NodesWrapper = (props: NodeProps) => {
  const {
    data: node,
    collapsiableButtonSize,
    handleNodeExpandBtnToggle,
    centerNode,
    handleExpandNodeToggle,
    totalTime,
    isMinimap = false,
  } = props

  const data = node.data

  const translate = {
    x: node.x - data.__node_attrs.nodeFlexSize!.width / 2,
    y: node.y,
    k: 1,
  }

  const nodeRef = useRef(null)

  const handleExpandBtnToggleOnClick = (e, node) => {
    handleNodeExpandBtnToggle(node.data.__node_attrs.id)
    // handleCenterNode(node)
  }

  const handleCenterNode = (d) => {
    centerNode(d)
  }

  const handleExpandNodeToggleOnClick = (node) => {
    handleExpandNodeToggle(node.data.__node_attrs.id)
  }

  const getNodeWidth = (): number => {
    return data.__node_attrs.nodeFlexSize!.width
  }

  const getNodeHeight = (): number => {
    return data.__node_attrs.nodeFlexSize!.height
  }

  const getColorGradient = (time: number): string => {
    const timePercent = time / totalTime
    const scaledColor = interpolateOrRd(timePercent)
    return scaledColor
  }

  return (
    <g
      ref={nodeRef}
      className="node"
      transform={`translate(${translate.x}, ${translate.y}) scale(${translate.k})`}
      key={data.name}
    >
      <rect
        className="node-rect"
        width={getNodeWidth()}
        height={getNodeHeight()}
        x={0}
        y={0}
        fill="none"
      ></rect>
      <foreignObject
        className="node-foreign-object"
        width={getNodeWidth()}
        height={getNodeHeight() + collapsiableButtonSize!.height}
        x={0}
        y={0}
      >
        <div
          className="node-foreign-object-div"
          style={{ width: getNodeWidth() }}
        >
          <div
            className={styles.nodeCard}
            style={{
              width: getNodeWidth(),
              height: getNodeHeight(),
            }}
            onClick={(e) =>
              isMinimap ? null : handleExpandNodeToggleOnClick(node)
            }
          >
            <div className={styles.nodeCardHeader}>
              {data.name}

              <Progress
                percent={Math.round((data.time_us / totalTime) * 100)}
                size="small"
                width={200}
                status="normal"
                strokeColor={getColorGradient(data.time_us)}
                format={(percent) => `${data.time_us} | ${percent}%`}
                className={styles.progress}
              />
            </div>
            <div className={styles.nodeCardBody}>
              <p>
                Actual Rows: <span>{data.act_rows}</span>
              </p>
              <p>
                Estimate Rows: <span>{data.est_rows}</span>
              </p>
              <p>
                Run at: <span>{data.run_at}</span>
              </p>
              {data.__node_attrs.isNodeDetailVisible && (
                <>
                  <p>
                    Cost: <span>{data.cost}</span>
                  </p>
                  <p>
                    Access Table: <span>{data.access_table}</span>
                  </p>
                  <p>
                    Access Partition: <span>{data.access_partition}</span>
                  </p>
                </>
              )}
            </div>
          </div>
          {data.__node_attrs.collapsiable && (
            <Button
              className={styles.collapsableButton}
              style={{
                width: collapsiableButtonSize!.width,
                height: collapsiableButtonSize!.height,
                top: getNodeHeight(),
                left: (getNodeWidth() - collapsiableButtonSize!.width) / 2,
              }}
              onClick={(e) =>
                isMinimap ? null : handleExpandBtnToggleOnClick(e, node)
              }
            >
              {node.data.__node_attrs.collapsed ? (
                <PlusOutlined />
              ) : (
                <MinusOutlined />
              )}
            </Button>
          )}
        </div>
      </foreignObject>
    </g>
  )
}

export default NodesWrapper
