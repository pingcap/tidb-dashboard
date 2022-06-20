import { RawNodeDatum, TreeNodeDatum } from '../TreeDiagramView/types'
import { v4 as uuidv4 } from 'uuid'

type nodeFlexSize = {
  width: number
  height: number
}

export const AssignInternalProperties = (
  data: RawNodeDatum[] | RawNodeDatum,
  nodeFlexSize: nodeFlexSize
): TreeNodeDatum[] => {
  const d = Array.isArray(data) ? data : [data]
  return d.map((n) => {
    const nodeDatum = n as TreeNodeDatum
    // assign default properties.
    nodeDatum.__node_attrs = {
      id: '',
      collapsed: false,
      collapsiable: false,
      isNodeDetailVisible: false,
      nodeFlexSize: {
        width: nodeFlexSize.width,
        height: nodeFlexSize.height,
      },
    }
    nodeDatum.__node_attrs.id = uuidv4()

    // If there are children, recursively assign properties to them too.
    if (nodeDatum.children && nodeDatum.children.length > 0) {
      nodeDatum.__node_attrs.collapsiable = true
      nodeDatum.children = AssignInternalProperties(
        nodeDatum.children,
        nodeFlexSize
      )
    }
    return nodeDatum
  })
}
