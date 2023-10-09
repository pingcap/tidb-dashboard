import { IColumn } from 'office-ui-fabric-react'
import React, { useMemo } from 'react'
import CardTable from '../CardTable'
import { Tooltip } from 'antd'
import { CopyLink, TxtDownloadLink } from '@lib/components'
import { BinaryPlanColsSelector } from './BinaryPlanColsSelector'
import { EyeOutlined } from '@ant-design/icons'

import styles from './index.module.less'

const COLUM_KEYS = [
  'id',
  'estRows',
  'estCost',
  'actRows',
  'task',
  'accessObject',
  'executionInfo',
  'operatorInfo',
  'memory',
  'disk'
] as const
type COLUM_KEYS_UNION = typeof COLUM_KEYS[number]
type BinaryPlanItem = Record<COLUM_KEYS_UNION, string>
type BinaryPlanFiledPosition = Record<
  COLUM_KEYS_UNION,
  {
    start: number
    len: number
  }
>

type BinaryPlanTableProps = {
  data: string
  downloadFileName: string
}

// see binary_plan_text example from sample-data/detail-res.json
function convertBinaryPlanTextToArray(
  binaryPlanText: string
): BinaryPlanItem[] {
  const result: BinaryPlanItem[] = []
  let positions: BinaryPlanFiledPosition | null = null

  // we can't simply split by '\n', because operator info column may contain '\n'
  // for example, execution plan for "select `tidb_decode_binary_plan` ( ? ) as `binary_plan_text`;"
  // const lines = binaryPlanText.split('\n')

  const headerEndPos = binaryPlanText.indexOf('\n', 1)
  const headerLine = binaryPlanText.slice(1, headerEndPos)
  if (!headerLine.startsWith('| id')) {
    console.error('invalid binary plan text format')
    return result
  }
  const headerLineLen = headerLine.length

  const headers = headerLine.split('|')
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
    return result
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
    if (lineEnd > binaryPlanText.length) {
      break
    }
    lineIdx++

    const line = binaryPlanText.slice(lineStart, lineEnd)
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

  function hideColumn(columnKey: COLUM_KEYS_UNION) {
    setVisibleColumnKeys((prev) => {
      return {
        ...prev,
        [columnKey]: false
      }
    })
  }

  const columns: IColumn[] = useMemo(() => {
    return [
      {
        name: (
          <div className={styles.colHeader}>
            id <EyeOutlined onClick={() => hideColumn('id')} />
          </div>
        ) as any,
        extra: 'id',
        key: 'id',
        minWidth: 200,
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
        name: (
          <div className={styles.colHeader}>
            estRows <EyeOutlined onClick={() => hideColumn('estRows')} />
          </div>
        ) as any,
        extra: 'estRows',
        key: 'estRows',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: BinaryPlanItem) => {
          return row.estRows
        }
      },
      {
        name: (
          <div className={styles.colHeader}>
            estCost <EyeOutlined onClick={() => hideColumn('estCost')} />
          </div>
        ) as any,
        extra: 'estCost',
        key: 'estCost',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: BinaryPlanItem) => {
          return row.estCost
        }
      },
      {
        name: (
          <div className={styles.colHeader}>
            actRows <EyeOutlined onClick={() => hideColumn('actRows')} />
          </div>
        ) as any,
        extra: 'actRows',
        key: 'actRows',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: BinaryPlanItem) => {
          return row.actRows
        }
      },
      {
        name: (
          <div className={styles.colHeader}>
            task <EyeOutlined onClick={() => hideColumn('task')} />
          </div>
        ) as any,
        extra: 'task',
        key: 'task',
        minWidth: 60,
        maxWidth: 100,
        onRender: (row: BinaryPlanItem) => {
          return row.task
        }
      },
      {
        name: (
          <div className={styles.colHeader}>
            access object{' '}
            <EyeOutlined onClick={() => hideColumn('accessObject')} />
          </div>
        ) as any,
        extra: 'access object',
        key: 'accessObject',
        minWidth: 120,
        maxWidth: 140,
        onRender: (row: BinaryPlanItem) => {
          return <Tooltip title={row.accessObject}>{row.accessObject}</Tooltip>
        }
      },
      {
        name: (
          <div className={styles.colHeader}>
            execution info{' '}
            <EyeOutlined onClick={() => hideColumn('executionInfo')} />
          </div>
        ) as any,
        extra: 'execution info',
        key: 'executionInfo',
        minWidth: 120,
        maxWidth: 300,
        onRender: (row: BinaryPlanItem) => {
          return (
            <Tooltip title={row.executionInfo}>{row.executionInfo}</Tooltip>
          )
        }
      },
      {
        name: (
          <div className={styles.colHeader}>
            operator info{' '}
            <EyeOutlined onClick={() => hideColumn('operatorInfo')} />
          </div>
        ) as any,
        extra: 'operator info',
        key: 'operatorInfo',
        minWidth: 120,
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
        name: (
          <div className={styles.colHeader}>
            memory <EyeOutlined onClick={() => hideColumn('memory')} />
          </div>
        ) as any,
        extra: 'memory',
        key: 'memory',
        minWidth: 80,
        maxWidth: 100,
        onRender: (row: BinaryPlanItem) => {
          return row.memory
        }
      },
      {
        name: (
          <div className={styles.colHeader}>
            disk <EyeOutlined onClick={() => hideColumn('disk')} />
          </div>
        ) as any,
        extra: 'disk',
        key: 'disk',
        minWidth: 60,
        maxWidth: 100,
        onRender: (row: BinaryPlanItem) => {
          return row.disk
        }
      }
    ]
  }, [])

  const [visibleColumnKeys, setVisibleColumnKeys] = React.useState(() => {
    return COLUM_KEYS.reduce((acc, cur) => {
      acc[cur] = true
      return acc
    }, {})
  })

  const filteredColumns = useMemo(() => {
    return columns.filter((c) => visibleColumnKeys[c.key as COLUM_KEYS_UNION])
  }, [columns, visibleColumnKeys])

  if (arr.length > 0) {
    return (
      <>
        <div style={{ display: 'flex', gap: 16 }}>
          <CopyLink data={data} />
          <TxtDownloadLink data={data} fileName={downloadFileName} />
          <div style={{ marginLeft: 'auto' }}>
            <BinaryPlanColsSelector
              columns={columns}
              visibleColumnKeys={visibleColumnKeys}
              onChange={setVisibleColumnKeys}
            />
          </div>
        </div>
        <CardTable cardNoMargin columns={filteredColumns} items={arr} />
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
