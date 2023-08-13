import { IColumn } from 'office-ui-fabric-react'
import React, { useMemo } from 'react'
import CardTable from '../CardTable'
import { Tooltip, Space } from 'antd'
import { CopyLink, TxtDownloadLink } from '@lib/components'

type BinaryPlanItem = Record<
  | 'id'
  | 'estRows'
  | 'estCost'
  | 'actRows'
  | 'task'
  | 'accessObject'
  | 'executionInfo'
  | 'operatorInfo'
  | 'memory'
  | 'disk',
  string
>
type BinaryPlanFiledPosition = Record<
  | 'id'
  | 'estRows'
  | 'estCost'
  | 'actRows'
  | 'task'
  | 'accessObject'
  | 'executionInfo'
  | 'operatorInfo'
  | 'memory'
  | 'disk',
  {
    start: number
    len: number
  }
>

type BinaryPlanTableProps = {
  data: string
  downloadFileName: string
}

function convertBinaryPlanTextToArray(
  binaryPlanText: string
): BinaryPlanItem[] {
  const result: BinaryPlanItem[] = []
  let positions: BinaryPlanFiledPosition | null = null

  const lines = binaryPlanText.split('\n')
  for (const line of lines) {
    if (line === '') {
      continue
    }
    // headers
    if (line.startsWith('| id')) {
      let headers = line.split('|')
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
        console.error('invalid binary plan text format')
        break
      }
      positions = {
        id: {
          start: 0,
          len: headers[1].length
        },
        estRows: {
          start: 0,
          len: headers[2].length
        },
        estCost: {
          start: 0,
          len: headers[3].length
        },
        actRows: {
          start: 0,
          len: headers[4].length
        },
        task: {
          start: 0,
          len: headers[5].length
        },
        accessObject: {
          start: 0,
          len: headers[6].length
        },
        executionInfo: {
          start: 0,
          len: headers[7].length
        },
        operatorInfo: {
          start: 0,
          len: headers[8].length
        },
        memory: {
          start: 0,
          len: headers[9].length
        },
        disk: {
          start: 0,
          len: headers[10].length
        }
      }
      positions.id.start = 1
      positions.estRows.start = positions.id.start + positions.id.len + 1
      positions.estCost.start =
        positions.estRows.start + positions.estRows.len + 1
      positions.actRows.start =
        positions.estCost.start + positions.estCost.len + 1
      positions.task.start = positions.actRows.start + positions.actRows.len + 1
      positions.accessObject.start =
        positions.task.start + positions.task.len + 1
      positions.executionInfo.start =
        positions.accessObject.start + positions.accessObject.len + 1
      positions.operatorInfo.start =
        positions.executionInfo.start + positions.executionInfo.len + 1
      positions.memory.start =
        positions.operatorInfo.start + positions.operatorInfo.len + 1
      positions.disk.start = positions.memory.start + positions.memory.len + 1
      continue
    }
    if (positions === null) {
      continue
    }
    const item: BinaryPlanItem = {
      id: line
        .slice(positions.id.start + 1, positions.id.start + positions.id.len)
        .trimEnd(), // start+1 for removing the leading white space
      estRows: line
        .slice(
          positions.estRows.start,
          positions.estRows.start + positions.estRows.len
        )
        .trim(),
      estCost: line
        .slice(
          positions.estCost.start,
          positions.estCost.start + positions.estCost.len
        )
        .trim(),
      actRows: line
        .slice(
          positions.actRows.start,
          positions.actRows.start + positions.actRows.len
        )
        .trim(),
      task: line
        .slice(positions.task.start, positions.task.start + positions.task.len)
        .trim(),
      accessObject: line
        .slice(
          positions.accessObject.start,
          positions.accessObject.start + positions.accessObject.len
        )
        .trim(),
      executionInfo: line
        .slice(
          positions.executionInfo.start,
          positions.executionInfo.start + positions.executionInfo.len
        )
        .trim(),
      operatorInfo: line
        .slice(
          positions.operatorInfo.start,
          positions.operatorInfo.start + positions.operatorInfo.len
        )
        .trim(),
      memory: line
        .slice(
          positions.memory.start,
          positions.memory.start + positions.memory.len
        )
        .trim(),
      disk: line
        .slice(positions.disk.start, positions.disk.start + positions.disk.len)
        .trim()
    }
    result.push(item)
  }

  return result
}

export const BinaryPlanTable: React.FC<BinaryPlanTableProps> = ({
  data,
  downloadFileName
}) => {
  const arr = useMemo(() => convertBinaryPlanTextToArray(data), [data])
  const columns: IColumn[] = useMemo(() => {
    return [
      {
        name: 'id',
        key: 'name',
        minWidth: 100,
        maxWidth: 600,
        onRender: (row: BinaryPlanItem) => {
          return (
            <Tooltip title={row.id}>
              <span style={{ whiteSpace: 'pre', fontFamily: 'monospace' }}>
                {row.id}
              </span>
            </Tooltip>
          )
        }
      },
      {
        name: 'estRows',
        key: 'estRows',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: BinaryPlanItem) => {
          return row.estRows
        }
      },
      {
        name: 'estCost',
        key: 'estCost',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: BinaryPlanItem) => {
          return row.estCost
        }
      },
      {
        name: 'actRows',
        key: 'actRows',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: BinaryPlanItem) => {
          return row.actRows
        }
      },
      {
        name: 'task',
        key: 'taskType',
        minWidth: 60,
        maxWidth: 100,
        onRender: (row: BinaryPlanItem) => {
          return row.task
        }
      },
      {
        name: 'access object',
        key: 'accessObjects',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: BinaryPlanItem) => {
          return <Tooltip title={row.accessObject}>{row.accessObject}</Tooltip>
        }
      },
      {
        name: 'execution info',
        key: 'rootGroupExecInfo',
        minWidth: 100,
        maxWidth: 300,
        onRender: (row: BinaryPlanItem) => {
          return (
            <Tooltip title={row.executionInfo}>{row.executionInfo}</Tooltip>
          )
        }
      },
      {
        name: 'operator info',
        key: 'operatorInfo',
        minWidth: 100,
        maxWidth: 300,
        onRender: (row: BinaryPlanItem) => {
          // truncate the string if it's too long
          // operation info may be super super long
          const truncateLength = 100
          let truncatedStr = row.operatorInfo ?? ''
          if (truncatedStr.length > truncateLength) {
            truncatedStr = row.operatorInfo.slice(0, truncateLength) + '...'
          }
          const truncateTooltipLen = 2000
          let truncatedTooltipStr = row.operatorInfo ?? ''
          if (truncatedTooltipStr.length > truncateTooltipLen) {
            truncatedTooltipStr =
              row.operatorInfo.slice(0, truncateTooltipLen) +
              '...(too long to show, copy or download to analyze)'
          }
          return <Tooltip title={truncatedTooltipStr}>{truncatedStr}</Tooltip>
        }
      },
      {
        name: 'memory',
        key: 'memoryBytes',
        minWidth: 60,
        maxWidth: 100,
        onRender: (row: BinaryPlanItem) => {
          return row.memory
        }
      },
      {
        name: 'disk',
        key: 'diskBytes',
        minWidth: 60,
        maxWidth: 100,
        onRender: (row: BinaryPlanItem) => {
          return row.disk
        }
      }
    ]
  }, [])

  if (arr.length > 0) {
    return (
      <>
        <Space size="middle">
          <CopyLink data={data} />
          <TxtDownloadLink data={data} fileName={downloadFileName} />
        </Space>
        <CardTable cardNoMargin columns={columns} items={arr} />
      </>
    )
  }
  return (
    <div>
      Parse plan text failed, original content:
      <div>{data}</div>
    </div>
  )
}
