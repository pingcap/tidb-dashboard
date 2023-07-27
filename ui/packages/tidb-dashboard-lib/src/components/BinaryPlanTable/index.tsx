import { IColumn } from 'office-ui-fabric-react'
import React, { useMemo } from 'react'
import CardTable from '../CardTable'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { Tooltip } from 'antd'

type BinaryPlanItem = {
  name: string // id

  estRows: number
  cost: number // estCost
  actRows: number

  taskType: string // task
  storeType: string // task

  accessObjects: any[] // access object

  rootBasicExecInfo: object // execution info
  rootGroupExecInfo: any[] // execution info
  copExecInfo: object // execution info

  operatorInfo: string // operator info

  memoryBytes: string // memory
  diskBytes: string // disk

  children?: BinaryPlanItem[]
  level: number
}

type BinaryPlan = {
  discardedDueToTooLong: boolean
  withRuntimeStats: boolean
  main: BinaryPlanItem
}

type BinaryPlanTableProps = {
  data: BinaryPlan
}

function convertBinaryPlanToArray(binaryPlan: BinaryPlan): BinaryPlanItem[] {
  const result: BinaryPlanItem[] = []
  const stack: BinaryPlanItem[] = [binaryPlan.main]
  stack[0].level = 0
  while (stack.length > 0) {
    const item = stack.pop()!
    result.push(item)

    if (item.children !== undefined) {
      for (let i = item.children.length - 1; i >= 0; i--) {
        const child = item.children[i]
        child.level = item.level + 1
        stack.push(child)
      }
    }
  }
  return result
}

function getTableName(item: BinaryPlanItem): string {
  let tableName = ''
  if (!item?.accessObjects?.length) return ''

  const scanObject = item.accessObjects.find((obj) =>
    Object.keys(obj).includes('scanObject')
  )

  if (scanObject) {
    tableName = scanObject['scanObject']['table']
  }

  return tableName
}

function getExecutionInfo(item: BinaryPlanItem) {
  let execInfo: string[] = []
  if (Object.keys(item.rootBasicExecInfo).length > 0) {
    execInfo.push(JSON.stringify(item.rootBasicExecInfo))
  }
  if (item.rootGroupExecInfo.length > 0) {
    item.rootGroupExecInfo
      .filter((i) => !!i) // filter out the NULL value
      .forEach((info) => {
        execInfo.push(JSON.stringify(info))
      })
  }
  if (Object.keys(item.copExecInfo).length > 0) {
    execInfo.push(JSON.stringify(item.copExecInfo))
  }
  execInfo = execInfo.map((info) =>
    info.replaceAll('"', '').replaceAll(',', ', ')
  )
  return execInfo
}

function getMemorySize(item: BinaryPlanItem): string {
  if (item.memoryBytes === 'N/A') {
    return 'N/A'
  }
  return getValueFormat('bytes')(Number(item.memoryBytes), 1)
}

function getDiskSize(item: BinaryPlanItem): string {
  if (item.diskBytes === 'N/A') {
    return 'N/A'
  }
  return getValueFormat('bytes')(Number(item.diskBytes), 1)
}

export const BinaryPlanTable: React.FC<BinaryPlanTableProps> = ({ data }) => {
  const arr = useMemo(() => convertBinaryPlanToArray(data), [data])
  const columns: IColumn[] = useMemo(() => {
    return [
      {
        name: 'id',
        key: 'name',
        minWidth: 100,
        maxWidth: 300,
        onRender: (row: BinaryPlanItem) => {
          return (
            <span style={{ marginLeft: Math.max(24 * (row.level - 1), 0) }}>
              {row.level > 0 && '└─'}
              {row.name}
            </span>
          )
        }
      },
      {
        name: 'estRows',
        key: 'estRows',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: BinaryPlanItem) => {
          return row.estRows.toFixed(2)
        }
      },
      {
        name: 'estCost',
        key: 'estCost',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: BinaryPlanItem) => {
          return (row.cost ?? 0).toFixed(2)
        }
      },
      {
        name: 'actRows',
        key: 'actRows',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: BinaryPlanItem) => {
          return row.actRows.toFixed(2)
        }
      },
      {
        name: 'task',
        key: 'taskType',
        minWidth: 60,
        maxWidth: 100,
        onRender: (row: BinaryPlanItem) => {
          let task = row.taskType
          if (task !== 'root') {
            task += `[${row.storeType}]`
          }
          return task
        }
      },
      {
        name: 'access object',
        key: 'accessObjects',
        minWidth: 100,
        maxWidth: 120,
        onRender: (row: BinaryPlanItem) => {
          const tableName = getTableName(row)
          let content = !!tableName ? `table: ${tableName}` : ''
          return content && <Tooltip title={content}>{content}</Tooltip>
        }
      },
      {
        name: 'execution info',
        key: 'rootGroupExecInfo',
        minWidth: 100,
        maxWidth: 300,
        onRender: (row: BinaryPlanItem) => {
          const execInfo = getExecutionInfo(row)
          return (
            <Tooltip
              title={
                <>
                  {execInfo.map((info, idx) => (
                    <div key={idx}>{info}</div>
                  ))}
                </>
              }
            >
              {execInfo.join(', ')}
            </Tooltip>
          )
        }
      },
      {
        name: 'operator info',
        key: 'operatorInfo',
        minWidth: 100,
        maxWidth: 300,
        onRender: (row: BinaryPlanItem) => {
          return <Tooltip title={row.operatorInfo}>{row.operatorInfo}</Tooltip>
        }
      },
      {
        name: 'memory',
        key: 'memoryBytes',
        minWidth: 60,
        maxWidth: 100,
        onRender: (row: BinaryPlanItem) => {
          return getMemorySize(row)
        }
      },
      {
        name: 'disk',
        key: 'diskBytes',
        minWidth: 60,
        maxWidth: 100,
        onRender: (row: BinaryPlanItem) => {
          return getDiskSize(row)
        }
      }
    ]
  }, [])

  return <CardTable cardNoMargin columns={columns} items={arr} />
}
