import {
  ClusterinfoClusterInfo,
  LogsearchSearchTarget,
  LogsearchTaskGroupResponse,
  LogsearchTaskModel,
  UtilsRequestTargetStatistics,
} from '@pingcap-incubator/dashboard_client'
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
): LogsearchSearchTarget[] {
  const targets: LogsearchSearchTarget[] = []
  info?.tidb?.nodes?.forEach((item) => {
    if (
      item.ip === undefined ||
      item.port === undefined ||
      item.status_port === undefined
    ) {
      return
    }
    targets.push({
      target: {
        kind: NodeKind.TiDB,
        ip: item.ip,
        port: item.port,
        display_name: `${item.ip}:${item.port}`,
      },
      status_port: item.status_port,
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
      target: {
        kind: NodeKind.TiKV,
        ip: item.ip,
        port: item.port,
        display_name: `${item.ip}:${item.port}`,
      },
      status_port: item.status_port,
    })
  })
  info?.pd?.nodes?.forEach((item) => {
    if (item.ip === undefined || item.port === undefined) {
      return
    }
    targets.push({
      target: {
        kind: NodeKind.PD,
        ip: item.ip,
        port: item.port,
        display_name: `${item.ip}:${item.port}`,
      },
      status_port: item.port,
    })
  })
  return targets
}

interface Params {
  timeRange: RangeValue<moment.Moment>
  logLevel: number
  components: LogsearchSearchTarget[]
  searchValue: string
}

interface StatsParams {
  timeRange: RangeValue<moment.Moment>
  logLevel: number
  stats?: UtilsRequestTargetStatistics
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

export function parseHistoryStatsParams(
  resp: LogsearchTaskGroupResponse
): StatsParams {
  const { task_group, tasks } = resp
  const { start_time, end_time, min_level, patterns } =
    task_group?.search_request || {}
  const startTime = start_time ? moment(start_time) : null
  const endTime = end_time ? moment(end_time) : null
  return {
    timeRange: [startTime, endTime] as RangeValue<moment.Moment>,
    logLevel: min_level ?? 0,
    searchValue: patterns && patterns.length > 0 ? patterns.join(' ') : '',
    stats: task_group?.target_stats,
  }
}

function getComponents(tasks: LogsearchTaskModel[]): LogsearchSearchTarget[] {
  const targets: LogsearchSearchTarget[] = []
  tasks.forEach((task) => {
    if (task.search_target === undefined) {
      return
    }
    targets.push(task.search_target)
  })
  return targets
}

export function getGRPCAddress(
  target: LogsearchSearchTarget | undefined
): string {
  if (target === undefined) {
    return ''
  }
  return target?.target?.kind === NodeKind.TiDB
    ? `${target.target.ip}:${target.status_port}`
    : `${target?.target?.ip}:${target?.target?.port}`
}

export function getAddress(target: LogsearchSearchTarget | undefined): string {
  if (target === undefined) {
    return ''
  }
  return `${target.target?.ip}:${target.target?.port}`
}

export const NodeKindList = [NodeKind.TiDB, NodeKind.TiKV, NodeKind.PD]
