export type Pos = {
  x: number
  y: number
}
export type Window = {
  left: number
  right: number
}
export type TimeRange = {
  start: number
  end: number
}
export enum Action {
  None,
  SelectWindow,
  MoveWindowLeft,
  MoveWindowRight,
  MoveWindow,
}

export type TimeRangeChangeListener = (timeRange: TimeRange) => void
