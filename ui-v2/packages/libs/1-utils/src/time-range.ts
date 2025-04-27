import { dayjs } from "@tidbcloud/uikit/utils"

////////////////////////////////////////////////////////////

export type TimeRangeValue = [from: number, to: number]

export interface RelativeTimeRange {
  // to be compatible, keep "relative", and "before-now" has same meaning with "relative"
  type: "relative" | "before-to-now" | "now-to-future"
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
    if (timeRange.type === "now-to-future") {
      return [now + offset, now + timeRange.value + offset]
    }
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
  if (timeRange.type === "absolute") {
    return { from: timeRange.value[0] + "", to: timeRange.value[1] + "" }
  }
  if (timeRange.type === "now-to-future") {
    return { from: "now", to: timeRange.value + "" }
  }
  return { from: `${timeRange.value}`, to: "now" }
}

export const urlToTimeRange = (urlTimeRange: URLTimeRange): TimeRange => {
  if (urlTimeRange.from === "now") {
    return { type: "now-to-future", value: Number(urlTimeRange.to) }
  }
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
