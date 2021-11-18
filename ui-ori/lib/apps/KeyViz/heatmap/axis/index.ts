import _ from 'lodash'

export type Section<T> = {
  val: T
  startIdx: number
  endIdx: number
}

export type DisplaySection<T> = {
  val: T
  startIdx: number
  endIdx: number
  startPos: number
  endPos: number
  focus: boolean
}

const mergeWidth = 3

export function scaleSections<T>(
  sections: Section<T>[],
  focusDomain: [number, number] | null,
  range: [number, number],
  scale: (idx: number) => number,
  merge: (origin: T, val: T) => T
): DisplaySection<T>[] {
  let result: DisplaySection<T>[] = []
  let mergedSmallSection: DisplaySection<T> | null = null
  let oneSectionRendered = false

  for (const section of sections) {
    const canvasStart = range[0]
    const canvasEnd = range[1]
    const startPos = scale(section.startIdx)
    const endPos = scale(section.endIdx)
    const commonStart = Math.max(startPos, canvasStart)
    const commonEnd = Math.min(endPos, canvasEnd)
    const focus = focusDomain
      ? Math.min(scale(focusDomain[1]), endPos) -
          Math.max(scale(focusDomain[0]), startPos) >
        0
      : false

    if (mergedSmallSection) {
      if (
        mergedSmallSection.endPos - mergedSmallSection.startPos >= mergeWidth ||
        commonStart - mergedSmallSection.startPos > mergeWidth ||
        (!oneSectionRendered && section.startIdx % 2 === 0)
      ) {
        result.push(mergedSmallSection)
        oneSectionRendered = true
        mergedSmallSection = null
      }
    }

    if (commonEnd - commonStart > 0) {
      if (commonEnd - commonStart > mergeWidth) {
        result.push(
          _.assign(
            { startPos: commonStart, endPos: commonEnd, focus: focus },
            section
          )
        )
        oneSectionRendered = true
        mergedSmallSection = null
      } else {
        if (mergedSmallSection === null) {
          mergedSmallSection = _.assign(
            { startPos: commonStart, endPos: commonEnd, focus: focus },
            section
          )
        } else {
          mergedSmallSection.val = merge(mergedSmallSection.val, section.val)
          mergedSmallSection.endPos = commonEnd
          mergedSmallSection.focus = mergedSmallSection.focus || focus
        }
      }
    }
  }

  return result
}
