import React from 'react'
import { Button, Card } from 'antd'
import {
  PlusOutlined,
  MinusOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons'
import { toFixed } from '@baurine/grafana-value-formats'

import styles from './DefaultNode.module.less'

const collapsableButtonSize = {
  width: 60,
  height: 30,
}

export const DefaultNode = (nodeProps) => {
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
          className={styles.NodeForeginObject}
          width={nodeWidth}
          height={nodeHeight}
          x={0}
          y={0}
        >
          <div
            className="node-foreign-object-div"
            style={{ width: nodeWidth, height: nodeHeight }}
          >
            <Card
              size="small"
              title={nodeDatum.name}
              extra={
                nodeDatum.diagnosis.length > 0 && (
                  <>
                    <ExclamationCircleFilled
                      style={{ color: 'red', paddingRight: 5 }}
                    />
                    {nodeDatum.diagnosis.length}
                  </>
                )
              }
              className={styles.nodeCard}
              style={{
                width: nodeWidth,
                height: nodeHeight - collapsableButtonSize.height,
              }}
              onClick={(e) => handleOnNodeDetailClick(e, nodeDatum)}
            >
              <div className={styles.cardContentP}>
                Actual Rows: <span>{nodeDatum.actRows}</span>
              </div>
              <div className={styles.cardContentP}>
                Estimate Rows: <span>{toFixed(nodeDatum.estRows, 2)}</span>
              </div>
              <div className={styles.cardContentP}>
                Run at: <span>{nodeDatum.storeType}</span>
              </div>
            </Card>
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
