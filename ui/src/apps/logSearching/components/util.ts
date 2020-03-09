import { LogsearchTaskGroupResponse, ClusterinfoClusterInfo, LogsearchTaskModel } from "@/utils/dashboard_client"
import moment from "moment"
import { RangePickerValue } from "antd/lib/date-picker/interface"

export const namingMap = {
  tidb: 'TiDB',
  tikv: 'TiKV',
  pd: 'PD'
}

export const LogLevelMap = {
  0: 'UNKNOWN',
  1: 'DEBUG',
  2: 'INFO',
  3: 'WARN',
  4: 'TRACE',
  5: 'CRITICAL',
  6: 'ERROR'
}

export enum TaskState {
  Running = 1,
  Finished,
  Error
}

export const AllLogLevel = [1, 2, 3, 4, 5, 6]

export class Component {
  kind: string
  ip: string
  port: number
  statusPort: number

  constructor(kind: string, ip : string, port: number, statusPort: number) {
    this.kind = kind
    this.ip = ip
    this.port = port
    this.statusPort = statusPort
  }

  addr():string {
    return `${this.ip}:${this.port}`
  }

  grpcPort(): number {
    return this.kind === 'tidb' ?
      this.statusPort :
      this.port
  }

  match(task: LogsearchTaskModel):boolean {
    const kind = task.search_target?.kind
    if (kind === this.kind) {
      return false
    }
    const rpcPort = kind === 'tidb' ? this.statusPort : this.port
    if (task.search_target?.ip === this.ip && task.search_target.port === rpcPort) {
      return true
    }
    return false
  }
}

export function parseClusterInfo(info: ClusterinfoClusterInfo): Component[] {
  const components: Component[] = []
  info?.tidb?.nodes?.forEach(item => {
    if (item.ip === undefined || item.port === undefined || item.status_port === undefined) {
        return
    }
    const component = new Component('tidb', item.ip, item.port, item.status_port)
    components.push(component)
  })
  info?.tikv?.nodes?.forEach(item => {
    if (item.ip === undefined || item.port === undefined || item.status_port === undefined) {
      return
  }
    const component = new Component('tikv', item.ip, item.port, item.status_port)
    components.push(component)
  })
  info?.pd?.nodes?.forEach(item => {
    if (item.ip === undefined || item.port === undefined) {
      return
    }
    const component = new Component('pd', item.ip, item.port, item.port)
    components.push(component)
  })
  return components
}

interface Params {
  timeRange: RangePickerValue,
  logLevel: number,
  components: Component[],
  searchValue: string,
}

export function parseSearchingParams(resp: LogsearchTaskGroupResponse, components: Component[]):Params {
  const { task_group, tasks } = resp
  const { start_time, end_time, levels, patterns } = task_group?.search_request || {}
  const startTime = start_time ? moment(start_time) : null
  const endTime = end_time ? moment(end_time) : null
  return {
    timeRange: [startTime, endTime] as RangePickerValue,
    logLevel: levels && levels.length > 0 ? levels[0] : 0,
    searchValue: patterns && patterns.length > 0 ? patterns.join(' ') : '',
    components: tasks && tasks.length > 0 ? getComponents(tasks, components) : [],
  }
}

function getComponents(tasks: LogsearchTaskModel[], components: Component[]): Component[] {
  const res: Component[] = []
  tasks.forEach(task => {
    const component = components.find(item => item.match(task))
    if (component === undefined) {
      return
    }
    res.push(component)
  })
  return res
}
