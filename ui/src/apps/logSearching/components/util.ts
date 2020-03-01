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
