export interface Translate {
  x: number
  y: number
  k: number
}

export interface nodeMarginType {
  siblingMargin: number
  childrenMargin: number
}

export interface rectBound {
  width: number
  height: number
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
  data: RawNodeDatum[]

  /**
   * The dimensions of the tree container,
   */
  viewport: rectBound

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
  nodeSize?: rectBound

  /**
   * The size of button, which is attached on collapsiable node.
   */
  collapsiableButtonSize?: rectBound

  /**
   * Margins between slibings and children.
   */
  nodeMargin?: nodeMarginType

  /**
   * The ration of minimap and main chart.
   */
  minimapScale?: number

  /**
   * Indicate whether show a minimap for the main chart or not.
   */
  showMinimap?: boolean

  customNodeElement: any

  customLinkElement: any

  customNodeDetailElement: any

  translate?: Translate

  // Disables zoom behavior is isThumbnail is true
  isThumbnail?: boolean

  gapBetweenTrees?: number
}
