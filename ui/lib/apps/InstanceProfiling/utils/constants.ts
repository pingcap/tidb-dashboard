export enum ProfileState {
  Error = 'error',
  Running = 'running',
  Succeeded = 'succeeded',
  Skipped = 'skipped',
}

export enum BundleState {
  Running = 'running',
  AllSucceeded = 'all_succeeded',
  PartialSucceeded = 'partial_succeeded',
  AllFailed = 'all_failed',
}

export enum ProfKind {
  CPU = 'cpu',
  Heap = 'heap',
  Goroutine = 'goroutine',
  Mutex = 'mutex',
}

export enum ProfDataType {
  Unknown = 'unknown',
  Protobuf = 'protobuf',
  Text = 'text',
}
