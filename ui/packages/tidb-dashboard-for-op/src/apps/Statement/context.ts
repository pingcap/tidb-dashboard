import {
  IStatementDataSource,
  IStatementContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, {
  StatementEditableConfig,
  StatementGetStatementsRequest
} from '~/client'
import auth from '~/utils/auth'

class DataSource implements IStatementDataSource {
  getDatabaseList(
    beginTime: number,
    endTime: number,
    options?: ReqConfig | undefined
  ) {
    return client.getInstance().infoListDatabases(options)
  }

  infoListResourceGroupNames(options?: ReqConfig) {
    return client.getInstance().resourceManagerInformationGroupNamesGet(options)
  }

  statementsAvailableFieldsGet(options?: ReqConfig) {
    return client.getInstance().statementsAvailableFieldsGet(options)
  }

  statementsConfigGet(options?: ReqConfig) {
    return client.getInstance().statementsConfigGet(options)
  }

  statementsConfigPost(request: StatementEditableConfig, options?: ReqConfig) {
    return client.getInstance().statementsConfigPost({ request }, options)
  }

  statementsDownloadGet(token: string, options?: ReqConfig) {
    return client.getInstance().statementsDownloadGet({ token }, options)
  }

  statementsDownloadTokenPost(
    request: StatementGetStatementsRequest,
    options?: ReqConfig
  ) {
    return client
      .getInstance()
      .statementsDownloadTokenPost({ request }, options)
  }

  statementsListGet(
    beginTime?: number,
    endTime?: number,
    fields?: string,
    schemas?: Array<string>,
    resourceGroups?: Array<string>,
    stmtTypes?: Array<string>,
    text?: string,
    options?: ReqConfig
  ) {
    return client.getInstance().statementsListGet(
      {
        beginTime,
        endTime,
        fields,
        schemas,
        resourceGroups,
        stmtTypes,
        text
      },
      options
    )
  }

  statementsPlanDetailGet(
    beginTime?: number,
    digest?: string,
    endTime?: number,
    plans?: Array<string>,
    schemaName?: string,
    options?: ReqConfig
  ) {
    return client.getInstance().statementsPlanDetailGet(
      {
        beginTime,
        digest,
        endTime,
        plans,
        schemaName
      },
      options
    )
  }

  statementsPlansGet(
    beginTime?: number,
    digest?: string,
    endTime?: number,
    schemaName?: string,
    options?: ReqConfig
  ) {
    return client.getInstance().statementsPlansGet(
      {
        beginTime,
        digest,
        endTime,
        schemaName
      },
      options
    )
  }

  statementsStmtTypesGet(options?: ReqConfig) {
    return client.getInstance().statementsStmtTypesGet(options)
  }

  statementsTimeRangesGet(options?: ReqConfig) {
    return client.getAxiosInstance().get('/statements/time_ranges', {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: auth.getAuthTokenAsBearer() || ''
      }
    })
  }

  statementsPlanBindStatusGet(
    sqlDigest: string,
    beginTime: number,
    endTime: number,
    options?: ReqConfig
  ) {
    return client.getInstance().statementsPlanBindingGet(
      {
        sqlDigest,
        beginTime,
        endTime
      },
      options
    )
  }

  statementsPlanBindCreate(planDigest: string, options?: ReqConfig) {
    return client.getInstance().statementsPlanBindingPost(
      {
        planDigest
      },
      options
    )
  }

  statementsPlanBindDelete(sqlDigest: string, options?: ReqConfig) {
    return client.getInstance().statementsPlanBindingDelete(
      {
        sqlDigest
      },
      options
    )
  }

  // slow query
  slowQueryAvailableFieldsGet(options?: ReqConfig) {
    return client.getInstance().slowQueryAvailableFieldsGet(options)
  }

  slowQueryListGet(
    beginTime?: number,
    db?: Array<string>,
    desc?: boolean,
    digest?: string,
    endTime?: number,
    fields?: string,
    limit?: number,
    orderBy?: string,
    plans?: Array<string>,
    resourceGroup?: Array<string>,
    text?: string,
    options?: ReqConfig
  ) {
    return client.getInstance().slowQueryListGet(
      {
        beginTime,
        db,
        desc,
        digest,
        endTime,
        fields,
        limit,
        orderBy,
        plans,
        resourceGroup,
        text
      },
      options
    )
  }

  slowQueryDetailGet(
    connectId?: string,
    digest?: string,
    timestamp?: number,
    options?: ReqConfig
  ) {
    return client.getInstance().slowQueryDetailGet(
      {
        connectId,
        digest,
        timestamp
      },
      options
    )
  }

  slowQueryDownloadTokenPost(request: any, options?: ReqConfig) {
    return client.getInstance().slowQueryDownloadTokenPost({ request }, options)
  }
}

const ds = new DataSource()

export const ctx: IStatementContext = {
  ds,
  cfg: {
    apiPathBase: client.getBasePath(),
    enableExport: true,
    enablePlanBinding: true
    // instantQuery: false
  }
}
