import {
  ClusterinfoClusterInfo,
  LogsearchTaskGroupResponse,
  LogsearchTaskModel,
  ModelRequestTargetNode,
} from '@lib/client'
import { TimeRange } from '@lib/components'

export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

export const LogLevelMap = {
  0: 'UNKNOWN',
  1: 'DEBUG',
  2: 'INFO',
  3: 'WARN',
  4: 'TRACE',
  5: 'CRITICAL',
  6: 'ERROR',
}

export enum TaskState {
  Running = 1,
  Finished,
  Error,
}

export enum NodeKind {
  TiDB = 'tidb',
  TiKV = 'tikv',
  PD = 'pd',
  TiFlash = 'tiflash',
}

export const namingMap = {
  [NodeKind.TiDB]: 'TiDB',
  [NodeKind.TiKV]: 'TiKV',
  [NodeKind.PD]: 'PD',
  [NodeKind.TiFlash]: 'TiFlash',
}

export const AllLogLevel = [1, 2, 3, 4, 5, 6]

export function parseClusterInfo(
  info: ClusterinfoClusterInfo
): ModelRequestTargetNode[] {
  const targets: ModelRequestTargetNode[] = []
  info?.tidb?.nodes?.forEach((item) => {
    if (
      item.ip === undefined ||
      item.port === undefined ||
      item.status_port === undefined
    ) {
      return
    }
    // TiDB has a different behavior: it use "status_port" for grpc, "port" for display.
    targets.push({
      kind: NodeKind.TiDB,
      ip: item.ip,
      port: item.status_port,
      display_name: `${item.ip}:${item.port}`,
    })
  })
  info?.tikv?.nodes?.forEach((item) => {
    if (
      item.ip === undefined ||
      item.port === undefined ||
      item.status_port === undefined
    ) {
      return
    }
    targets.push({
      kind: NodeKind.TiKV,
      ip: item.ip,
      port: item.port,
      display_name: `${item.ip}:${item.port}`,
    })
  })
  info?.pd?.nodes?.forEach((item) => {
    if (item.ip === undefined || item.port === undefined) {
      return
    }
    targets.push({
      kind: NodeKind.PD,
      ip: item.ip,
      port: item.port,
      display_name: `${item.ip}:${item.port}`,
    })
  })
  info?.tiflash?.nodes?.forEach((item) => {
    if (!(item.ip && item.port)) {
      return
    }
    targets.push({
      kind: NodeKind.TiFlash,
      ip: item.ip,
      port: item.port,
      display_name: `${item.ip}:${item.port}`,
    })
  })
  return targets
}

interface Params {
  timeRange: TimeRange
  logLevel: number
  components: ModelRequestTargetNode[]
  searchValue: string
}

export function parseSearchingParams(resp: LogsearchTaskGroupResponse): Params {
  const { task_group, tasks } = resp
  const { start_time, end_time, min_level, patterns } =
    task_group?.search_request || {}
  let timeRange: TimeRange = {
    type: 'absolute',
    value: [start_time! / 1000, end_time! / 1000],
  }
  return {
    timeRange: timeRange,
    logLevel: min_level ?? 2,
    searchValue: patterns && patterns.length > 0 ? patterns.join(' ') : '',
    components: tasks && tasks.length > 0 ? getComponents(tasks) : [],
  }
}

function getComponents(tasks: LogsearchTaskModel[]): ModelRequestTargetNode[] {
  const targets: ModelRequestTargetNode[] = []
  tasks.forEach((task) => {
    if (task.target === undefined) {
      return
    }
    targets.push(task.target)
  })
  return targets
}

export const NodeKindList = [
  NodeKind.TiDB,
  NodeKind.TiKV,
  NodeKind.PD,
  NodeKind.TiFlash,
]
