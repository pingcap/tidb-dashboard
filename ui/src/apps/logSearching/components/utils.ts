import {
  ClusterinfoClusterInfo,
  UtilsRequestTargetNode,
  LogsearchTaskGroupResponse,
  LogsearchTaskModel,
} from '@/utils/dashboard_client'
import { RangePickerValue } from 'antd/lib/date-picker/interface'
import moment from 'moment'

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

export const namingMap = {
  tidb: 'TiDB',
  tikv: 'TiKV',
  pd: 'PD',
}

export const AllLogLevel = [1, 2, 3, 4, 5, 6]

export function parseClusterInfo(
  info: ClusterinfoClusterInfo
): UtilsRequestTargetNode[] {
  const targets: UtilsRequestTargetNode[] = []
  info?.tidb?.nodes?.forEach(item => {
    const display_name = `${item.ip}:${item.port}`
    targets.push({
      kind: 'tidb',
      display_name,
      ip: item.ip,
      port: item.status_port,
    })
  })
  info?.tikv?.nodes?.forEach(item => {
    const display_name = `${item.ip}:${item.port}`
    targets.push({
      kind: 'tikv',
      display_name,
      ip: item.ip,
      port: item.port,
    })
  })
  info?.pd?.nodes?.forEach(item => {
    const display_name = `${item.ip}:${item.port}`
    targets.push({
      kind: 'pd',
      display_name,
      ip: item.ip,
      port: item.port,
    })
  })
  return targets
}

interface Params {
  timeRange: RangePickerValue
  logLevel: number
  components: UtilsRequestTargetNode[]
  searchValue: string
}

export function parseSearchingParams(resp: LogsearchTaskGroupResponse): Params {
  const { task_group, tasks } = resp
  const { start_time, end_time, levels, patterns } =
    task_group?.search_request || {}
  const startTime = start_time ? moment(start_time) : null
  const endTime = end_time ? moment(end_time) : null
  return {
    timeRange: [startTime, endTime] as RangePickerValue,
    logLevel: levels && levels.length > 0 ? levels[0] : 0,
    searchValue: patterns && patterns.length > 0 ? patterns.join(' ') : '',
    components: tasks && tasks.length > 0 ? getComponents(tasks) : [],
  }
}

function getComponents(tasks: LogsearchTaskModel[]): UtilsRequestTargetNode[] {
  const targets: UtilsRequestTargetNode[] = []
  tasks.forEach(task => {
    if (task.search_target === undefined) {
      return
    }
    targets.push(task.search_target)
  })
  return targets
}
