import {
  IKeyVizDataSource,
  IKeyVizContext,
  ReqConfig,
  IKeyVizConfig
} from '@pingcap/tidb-dashboard-lib'
import client, { ConfigKeyVisualConfig } from '~/client'

class DataSource implements IKeyVizDataSource {
  keyvisualConfigGet(options?: ReqConfig) {
    return client.getInstance().keyvisualConfigGet(options)
  }

  keyvisualConfigPut(request: ConfigKeyVisualConfig, options?: ReqConfig) {
    return client.getInstance().keyvisualConfigPut({ request }, options)
  }
  keyvisualHeatmapsGet(
    startkey?: string,
    endkey?: string,
    starttime?: number,
    endtime?: number,
    type?:
      | 'written_bytes'
      | 'read_bytes'
      | 'written_keys'
      | 'read_keys'
      | 'integration',
    options?: ReqConfig
  ) {
    return client.getInstance().keyvisualHeatmapsGet(
      {
        startkey,
        endkey,
        starttime,
        type
      },
      options
    )
  }
}

const ds = new DataSource()

export function ctx(cfg: Partial<IKeyVizConfig>): IKeyVizContext {
  return {
    ds,
    cfg: {
      showHelp: true,
      showSetting: true,
      ...cfg
    }
  }
}
