import { TraceQueryTraceResponse, TraceSpan } from '@lib/client'

export interface IFullSpan extends TraceSpan {
  node_type: string
  children: IFullSpan[]
  parent?: IFullSpan

  relative_begin_unix_time_ns: number
  relative_end_unix_time_ns: number
  max_relative_end_time_ns: number // include children span

  depth: number // which layer it should be drawed in, rootSpan is 0
  max_child_depth: number
}

export type FullSpanMap = Record<string, IFullSpan>

export interface IFlameGraph {
  rootSpan: IFullSpan
  spansObj: FullSpanMap
}

export function genFlameGraph(source: TraceQueryTraceResponse): IFlameGraph {
  // step 1: flatten the spans
  const allSpans: IFullSpan[] = []
  source.span_sets?.forEach((spanSet) => {
    spanSet.spans?.forEach((span) => {
      allSpans.push({
        ...span,

        node_type: spanSet.node_type!,
        children: [],

        relative_begin_unix_time_ns: 0,
        relative_end_unix_time_ns: 0,
        max_relative_end_time_ns: 0,
        depth: 0,
        max_child_depth: 0,
      })
    })
  })

  // step 2: update time
  const rootSpan = allSpans.find((span) => span.parent_id === 0)!
  const startTime = rootSpan.begin_unix_time_ns!
  allSpans.forEach((span) => {
    span.relative_begin_unix_time_ns = span.begin_unix_time_ns! - startTime
    span.relative_end_unix_time_ns =
      span.relative_begin_unix_time_ns + span.duration_ns!
    span.max_relative_end_time_ns = span.relative_end_unix_time_ns
  })

  // step 3: build tree
  const spansObj = buildTree(allSpans)
  calcMaxEndTime(spansObj)
  calcDepth(rootSpan)

  return {
    rootSpan,
    spansObj,
  }
}

//////////////////

function buildTree(allSpans: IFullSpan[]): FullSpanMap {
  let spansObj = allSpans.reduce((accu, cur) => {
    accu[cur.span_id!] = cur
    return accu
  }, {} as FullSpanMap)

  // set children and parent
  Object.values(spansObj).forEach((span) => {
    const parent = spansObj[span.parent_id!]
    span.parent = parent
    // the root span has no parent
    if (parent) {
      parent.children.push(span)
    }
  })

  // sort children
  // notice: we can't sort it by span_id
  Object.values(spansObj).forEach((span) => {
    span.children.sort((a, b) => {
      let delta = a.relative_begin_unix_time_ns - b.relative_begin_unix_time_ns
      if (delta === 0) {
        // make the span with longer duration in the front when they have the same begin time
        // so we can draw the span with shorter duration first
        // to make them closer to the parent span
        delta = b.duration_ns! - a.duration_ns!
      }
      return delta
    })
  })
  return spansObj
}

//////////////////

function calcMaxEndTime(spansObj: FullSpanMap) {
  Object.values(spansObj)
    .filter((span) => span.children.length === 0) // find leaf spans
    .forEach(calcParentMaxEndTime)
}

// from bottom to top
function calcParentMaxEndTime(span: IFullSpan) {
  const parent = span.parent
  if (parent === undefined) return

  // check whether it is the parent's last child
  // nope!
  // other children may have larger max_end_time_ns
  //
  // const lastSlibing = parent.children[parent.children.length - 1]
  // if (lastSlibing.span_id !== span.span_id) return

  if (span.max_relative_end_time_ns > parent.max_relative_end_time_ns) {
    parent.max_relative_end_time_ns = span.max_relative_end_time_ns
  }
  calcParentMaxEndTime(parent)
}

/////////////////////

// from top to bottom
function calcDepth(parentSpan: IFullSpan) {
  const childrenMaxIdx = parentSpan.children.length - 1
  // keep the same logic as datadog
  // compare the spans from right to left
  for (let i = childrenMaxIdx; i >= 0; i--) {
    const curSpan = parentSpan.children[i]

    if (i === childrenMaxIdx) {
      curSpan.depth = parentSpan.depth + 1
    } else {
      const lastSpan = parentSpan.children[i + 1]
      if (
        curSpan.max_relative_end_time_ns >
          lastSpan.relative_begin_unix_time_ns ||
        curSpan.relative_begin_unix_time_ns ===
          lastSpan.relative_begin_unix_time_ns
      ) {
        if (lastSpan.max_child_depth === lastSpan.depth) {
          // lastSpan has no children
          curSpan.depth = lastSpan.max_child_depth + 1
        } else {
          // keep the same logic as datadog
          // add a more empty layer
          curSpan.depth = lastSpan.max_child_depth + 2
        }
      } else {
        curSpan.depth = parentSpan.depth + 1
      }
    }
    curSpan.max_child_depth = curSpan.depth
    updateParentChildDepth(curSpan)
    calcDepth(curSpan)
  }
}

function updateParentChildDepth(span: IFullSpan) {
  const parent = span.parent
  if (parent === undefined) return

  if (span.max_child_depth > parent.max_child_depth) {
    parent.max_child_depth = span.max_child_depth
    updateParentChildDepth(parent)
  }
}
