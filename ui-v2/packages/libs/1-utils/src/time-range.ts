import { dayjs } from "@tidbcloud/uikit/utils"

////////////////////////////////////////////////////////////

export type TimeRangeValue = [from: number, to: number]

export interface RelativeTimeRange {
  type: "relative"
  value: number // unit: seconds
}

export interface AbsoluteTimeRange {
  type: "absolute"
  value: TimeRangeValue // unit: seconds
}

export type TimeRange = RelativeTimeRange | AbsoluteTimeRange

////////////////////////////////////////////////////////////

export const toTimeRangeValue = (
  timeRange: TimeRange,
  offset = 0,
): TimeRangeValue => {
  if (timeRange.type === "absolute") {
    return timeRange.value.map((t) => t + offset) as TimeRangeValue
  } else {
    const now = dayjs().unix()
    return [now - timeRange.value + offset, now + offset]
  }
}

export function fromTimeRangeValue(v: TimeRangeValue): AbsoluteTimeRange {
  return {
    type: "absolute",
    value: [...v],
  }
}

////////////////////////////////////////////////////////////

export type URLTimeRange = { from: string; to: string }

export const toURLTimeRange = (timeRange: TimeRange): URLTimeRange => {
  if (timeRange.type === "relative") {
    return { from: `${timeRange.value}`, to: "now" }
  }

  const timeRangeValue = toTimeRangeValue(timeRange)
  return { from: `${timeRangeValue[0]}`, to: `${timeRangeValue[1]}` }
}

export const urlToTimeRange = (urlTimeRange: URLTimeRange): TimeRange => {
  if (urlTimeRange.to === "now") {
    return { type: "relative", value: Number(urlTimeRange.from) }
  }
  return {
    type: "absolute",
    value: [Number(urlTimeRange.from), Number(urlTimeRange.to)],
  }
}

export const urlToTimeRangeValue = (
  urlTimeRange: URLTimeRange,
): TimeRangeValue => {
  return toTimeRangeValue(urlToTimeRange(urlTimeRange))
}
