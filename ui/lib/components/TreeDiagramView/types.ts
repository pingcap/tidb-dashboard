// Raw node data get from /api/slow_query/detail.
export interface RawNodeDatum {
  name: string
  cost: number
  estRows: number
  actRows: number
  duration: string
  labels: []
  storeType: string
  diskBytes: string
  taskType: string
  memoryBytes: string
  operatorInfo: string
  rootBasicExecInfo: {}
  rootGroupExecInfo: []
  copExecInfo: {}
  accessObjects: []
  diagnosis: []
  children?: RawNodeDatum[]
}

export interface rectBound {
  width: number
  height: number
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
  viewport?: rectBound
}
