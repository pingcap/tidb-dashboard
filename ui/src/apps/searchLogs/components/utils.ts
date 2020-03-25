import {
  ClusterinfoClusterInfo,
  LogsearchSearchTarget,
  LogsearchTaskGroupResponse,
  LogsearchTaskModel,
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

export enum ServerType {
  Unknown = 0,
  TiDB,
  TiKV,
  PD,
}

export const namingMap = {
  [ServerType.TiDB]: 'TiDB',
  [ServerType.TiKV]: 'TiKV',
  [ServerType.PD]: 'PD',
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
      kind: ServerType.TiDB,
      ip: item.ip,
      port: item.port,
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
      kind: ServerType.TiKV,
      ip: item.ip,
      port: item.port,
      status_port: item.status_port,
    })
  })
  info?.pd?.nodes?.forEach((item) => {
    if (item.ip === undefined || item.port === undefined) {
      return
    }
    targets.push({
      kind: ServerType.PD,
      ip: item.ip,
      port: item.port,
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
  return target?.kind === ServerType.TiDB
    ? `${target.ip}:${target.status_port}`
    : `${target.ip}:${target.port}`
}

export function getAddress(target: LogsearchSearchTarget | undefined): string {
  if (target === undefined) {
    return ''
  }
  return `${target.ip}:${target.port}`
}

export const ServerTypeList = [ServerType.TiDB, ServerType.TiKV, ServerType.PD]
