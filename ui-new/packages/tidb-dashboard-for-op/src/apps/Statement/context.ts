import {
  IStatementDataSource,
  IStatementContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, {
  StatementEditableConfig,
  StatementGetStatementsRequest
} from '~/client'

class DataSource implements IStatementDataSource {
  infoListDatabases(options?: ReqConfig) {
    return client.getInstance().infoListDatabases(options)
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
}

const ds = new DataSource()

export const ctx: IStatementContext = {
  ds,
  config: { basePath: client.getBasePath() }
}
