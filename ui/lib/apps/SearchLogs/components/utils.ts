import {
  ClusterinfoClusterInfo,
  LogsearchTaskGroupResponse,
  LogsearchTaskModel,
  UtilsRequestTargetNode,
} from '@lib/client'
import { RangeValue } from 'rc-picker/lib/interface'
import moment from 'moment'

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
}

export const namingMap = {
  [NodeKind.TiDB]: 'TiDB',
  [NodeKind.TiKV]: 'TiKV',
  [NodeKind.PD]: 'PD',
}

export const AllLogLevel = [1, 2, 3, 4, 5, 6]

export function parseClusterInfo(
  info: ClusterinfoClusterInfo
): UtilsRequestTargetNode[] {
  const targets: UtilsRequestTargetNode[] = []
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
  return targets
}

interface Params {
  timeRange: RangeValue<moment.Moment>
  logLevel: number
  components: UtilsRequestTargetNode[]
  searchValue: string
}

export function parseSearchingParams(resp: LogsearchTaskGroupResponse): Params {
  const { task_group, tasks } = resp
  const { start_time, end_time, min_level, patterns } =
    task_group?.search_request || {}
  const startTime = start_time ? moment(start_time) : null
  const endTime = end_time ? moment(end_time) : null
  return {
    timeRange: [startTime, endTime] as RangeValue<moment.Moment>,
    logLevel: min_level ?? 0,
    searchValue: patterns && patterns.length > 0 ? patterns.join(' ') : '',
    components: tasks && tasks.length > 0 ? getComponents(tasks) : [],
  }
}

function getComponents(tasks: LogsearchTaskModel[]): UtilsRequestTargetNode[] {
  const targets: UtilsRequestTargetNode[] = []
  tasks.forEach((task) => {
    if (task.target === undefined) {
      return
    }
    targets.push(task.target)
  })
  return targets
}

export const NodeKindList = [NodeKind.TiDB, NodeKind.TiKV, NodeKind.PD]
