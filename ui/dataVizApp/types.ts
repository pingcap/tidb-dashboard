// Modified from github.com/microsoft/SandDance under the MIT license.
import { DataFile, SandDance } from '@msrvida/sanddance-explorer'

export type DataSourceType = 'dashboard' | 'local' | 'url'

export interface DataSource extends DataFile {
  dataSourceType: DataSourceType
  id: string
  withToken?: boolean
  columnsTransformer?: (columns: SandDance.types.Column[]) => void
}

export interface InsightMap {
  [id: string]: Partial<SandDance.specs.Insight>
}

export interface DataSourceSnapshot extends SandDance.types.Snapshot {
  dataSource: DataSource
}
