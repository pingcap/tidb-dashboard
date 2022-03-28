import React from 'react'
import styles from './index.module.less'

// Draws lines between parent and child node
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

const LinksWrapper = (props) => {
  const { data: link, collapsiableButtonSize } = props

  return (
    <path
      className={styles.pathLink}
      d={diagonal(
        {
          x: link.source.x,
          y:
            link.source.y +
            link.source.data.__node_attrs.nodeFlexSize.height +
            collapsiableButtonSize.height,
        },
        { x: link.target.x, y: link.target.y }
      )}
    />
  )
}

export default LinksWrapper
