export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

export enum LogLevel {
  Unknown = 0,
  Debug,
  Info,
  Warn,
  Trace,
  Critical,
  Error,
}

export const LogLevelText = {
  [LogLevel.Unknown]: 'UNKNOWN',
  [LogLevel.Debug]: 'DEBUG',
  [LogLevel.Info]: 'INFO',
  [LogLevel.Warn]: 'WARN',
  [LogLevel.Trace]: 'TRACE',
  [LogLevel.Critical]: 'CRITICAL',
  [LogLevel.Error]: 'ERROR',
}

export const ValidLogLevels = [
  LogLevel.Debug,
  LogLevel.Info,
  LogLevel.Warn,
  // LogLevel.Trace,
  LogLevel.Critical,
  LogLevel.Error,
]

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

export const NodeKindList = [
  NodeKind.TiDB,
  NodeKind.TiKV,
  NodeKind.PD,
  NodeKind.TiFlash,
]
