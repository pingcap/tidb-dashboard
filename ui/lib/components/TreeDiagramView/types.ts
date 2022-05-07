export interface Translate {
  x: number
  y: number
  k: number
}

// Raw node data get from /api/slow_query/detail.
export interface RawNodeDatum {
  name: string
  cost: number
  est_rows: number
  act_rows: number
  access_table: string
  access_index: string
  access_partition: string
  time_us: number
  run_at: string
  children?: RawNodeDatum[]
}

// Tree node data contains node attributes.
export interface TreeNodeDatum extends RawNodeDatum {
  children?: TreeNodeDatum[]
  __node_attrs: {
    id: string
    collapsed?: boolean
    collapsiable?: boolean
    isNodeDetailVisible: boolean
    nodeFlexSize?: {
      width: number
      height: number
    }
  }
}

export interface TreeDiagramProps {
  /**
   * The root node object, in which child nodes (also of type `RawNodeDatum`)
   * are recursively defined in the `children` key.
   */
  data: RawNodeDatum[] | RawNodeDatum

  /**
   * The dimensions of the tree container,
   */
  viewPort?: {
    width: number
    height: number
  }

  /**
   * Sets the time (in milliseconds) for the transition to center a node once clicked.
   */
  centeringTransitionDuration?: number

  /**
   * Determines whether the tree's nodes can collapse/expand.
   */
  collapsible?: boolean

  /**
   * Sets the minimum/maximum extent to which the tree can be scaled if `zoomable` is true.
   *
   */
  scaleExtent?: {
    min?: number
    max?: number
  }

  /**
   * The amount of space each node element occupies.
   */
  nodeSize?: {
    width: number
    height: number
  }

  /**
   * The size of button, which is attached on collapsiable node.
   */
  collapsiableButtonSize?: {
    width: number
    height: number
  }

  /**
   * Margins between slibings and children.
   */
  nodeMargin?: {
    siblingMargin: number
    childrenMargin: number
  }
  /**
   * The ration of minimap and main chart.
   */
  minimapScale?: number
}
