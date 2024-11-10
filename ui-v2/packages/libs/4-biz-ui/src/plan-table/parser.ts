const _PLAN_COLUMN_KEYS = [
  "id",
  "estRows",
  "estCost",
  "actRows",
  "task",
  "accessObject",
  "executionInfo",
  "operatorInfo",
  "memory",
  "disk",
] as const
type PLAN_COLUMN_KEYS_UNION = (typeof _PLAN_COLUMN_KEYS)[number]
type PlanFiledPosition = Record<
  PLAN_COLUMN_KEYS_UNION,
  {
    start: number
    len: number
  }
>
export type PlanItem = Record<PLAN_COLUMN_KEYS_UNION, string>

// see binary_plan_text example from sample-data/slow-query-detail.json
// plan field in the sample-data/slow-query-detail.json is the plan v1 format, it is outdate
// binary_plan field is the plan v2 format
export function parsePlanV2TextToArray(planV2Text: string): PlanItem[] {
  const result: PlanItem[] = []
  let positions: PlanFiledPosition | null = null

  // we can't simply split by '\n', because operator info column may contain '\n'
  // for example, execution plan for "select `tidb_decode_binary_plan` ( ? ) as `binary_plan_text`;"
  // const lines = binaryPlanText.split('\n')

  const headerEndPos = planV2Text.indexOf("\n", 1)
  const headerLine = planV2Text.slice(1, headerEndPos)
  if (!headerLine.startsWith("| id")) {
    console.error("invalid plan text format")
    return result
  }
  const headerLineLen = headerLine.length

  const headers = headerLine.split("|")
  // 0: ""
  // 1: " id                      "
  // 2: " estRows  "
  // 3: " estCost    "
  // 4: " actRows "
  // 5: " task "
  // 6: " access object      "
  // 7: " execution info     "
  // 8: " operator info                                   "
  // 9: " memory   "
  // 10: " disk     "
  // 11: ""
  if (headers.length !== 12) {
    console.error("invalid plan text format")
    return result
  }
  positions = {
    id: {
      start: 0,
      len: headers[1].length,
    },
    estRows: {
      start: 0,
      len: headers[2].length,
    },
    estCost: {
      start: 0,
      len: headers[3].length,
    },
    actRows: {
      start: 0,
      len: headers[4].length,
    },
    task: {
      start: 0,
      len: headers[5].length,
    },
    accessObject: {
      start: 0,
      len: headers[6].length,
    },
    executionInfo: {
      start: 0,
      len: headers[7].length,
    },
    operatorInfo: {
      start: 0,
      len: headers[8].length,
    },
    memory: {
      start: 0,
      len: headers[9].length,
    },
    disk: {
      start: 0,
      len: headers[10].length,
    },
  }
  positions.id.start = 1
  positions.estRows.start = positions.id.start + positions.id.len + 1
  positions.estCost.start = positions.estRows.start + positions.estRows.len + 1
  positions.actRows.start = positions.estCost.start + positions.estCost.len + 1
  positions.task.start = positions.actRows.start + positions.actRows.len + 1
  positions.accessObject.start = positions.task.start + positions.task.len + 1
  positions.executionInfo.start =
    positions.accessObject.start + positions.accessObject.len + 1
  positions.operatorInfo.start =
    positions.executionInfo.start + positions.executionInfo.len + 1
  positions.memory.start =
    positions.operatorInfo.start + positions.operatorInfo.len + 1
  positions.disk.start = positions.memory.start + positions.memory.len + 1

  let lineIdx = 1
  while (true) {
    const lineStart = 1 + (headerLineLen + 1) * lineIdx
    const lineEnd = 1 + (headerLineLen + 1) * (lineIdx + 1)
    if (lineEnd > planV2Text.length) {
      break
    }
    lineIdx++

    const line = planV2Text.slice(lineStart, lineEnd)
    const item: PlanItem = {
      id: line
        .slice(positions.id.start + 1, positions.id.start + positions.id.len)
        .trimEnd(), // start+1 for removing the leading white space
      estRows: line
        .slice(
          positions.estRows.start,
          positions.estRows.start + positions.estRows.len,
        )
        .trim(),
      estCost: line
        .slice(
          positions.estCost.start,
          positions.estCost.start + positions.estCost.len,
        )
        .trim(),
      actRows: line
        .slice(
          positions.actRows.start,
          positions.actRows.start + positions.actRows.len,
        )
        .trim(),
      task: line
        .slice(positions.task.start, positions.task.start + positions.task.len)
        .trim(),
      accessObject: line
        .slice(
          positions.accessObject.start,
          positions.accessObject.start + positions.accessObject.len,
        )
        .trim(),
      executionInfo: line
        .slice(
          positions.executionInfo.start,
          positions.executionInfo.start + positions.executionInfo.len,
        )
        .trim(),
      operatorInfo: line
        .slice(
          positions.operatorInfo.start,
          positions.operatorInfo.start + positions.operatorInfo.len,
        )
        .trim(),
      memory: line
        .slice(
          positions.memory.start,
          positions.memory.start + positions.memory.len,
        )
        .trim(),
      disk: line
        .slice(positions.disk.start, positions.disk.start + positions.disk.len)
        .trim(),
    }
    result.push(item)
  }

  return result
}
