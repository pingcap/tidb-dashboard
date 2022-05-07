import React from 'react'
import styles from './index.module.less'

import LinksWrapper from './LinksWrapper'
import NodesWrapper from './NodesWrapper'

const MainChart = (props) => {
  return (
    // The <svg> uses to wrap SVG element.
    <svg
      ref={props.mainChartSVGRef}
      className={styles.mainChartContainerSVG}
      width={props.viewPortWidth}
      height={props.viewPortHeight}
    >
      {/* The <g> uses to wrap links and nodes as a group. */}
      <g
        ref={props.mainChartGroupRef}
        className="main-chart-group"
        transform={`translate(${props.translate.x}, ${props.translate.y}) scale(${props.translate.k})`}
      >
        <g className="links-wrapper">
          {props.links.length > 0 &&
            props.links.map((link, i) => (
              <LinksWrapper
                key={i}
                data={link}
                collapsiableButtonSize={props.collapsiableButtonSize}
              ></LinksWrapper>
            ))}
        </g>
        <g className="nodes-wrapper">
          {props.nodes.length > 0 &&
            props.nodes.map((node) => (
              <NodesWrapper
                key={node.data.name}
                data={node}
                collapsiableButtonSize={props.collapsiableButtonSize}
                handleNodeExpandBtnToggle={props.handleNodeExpandBtnToggle}
                centerNode={props.centerNode}
                handleExpandNodeToggle={props.handleExpandNodeToggle}
                totalTime={props.totalTime}
              ></NodesWrapper>
            ))}
        </g>
      </g>
    </svg>
  )
}

export default MainChart
