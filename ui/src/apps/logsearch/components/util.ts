export const namingMap = {
  tidb: 'TiDB',
  tikv: 'TiKV',
  pd: 'PD'
}

export const LogLevelMap = {
  0: 'Unknown',
  1: 'Debug',
  2: 'Info',
  3: 'Warn',
  4: 'Trace',
  5: 'Critical',
  6: 'Error'
}

export enum TaskState {
  Running = 1,
  Finished,
  Error
}

export const AllLogLevel = [1, 2, 3, 4, 5, 6]
