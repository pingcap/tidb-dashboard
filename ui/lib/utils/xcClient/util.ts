import client, { QueryeditorRunResponse } from '@lib/client'
import _ from 'lodash'
import { NewColumnFieldTypeDefinition } from './database'
import formatSql from '../formatSql'

export interface IEvalSqlOptions {
  maxRows?: number
  debug?: boolean
}

export async function evalSql(
  statements: string,
  options?: IEvalSqlOptions
): Promise<QueryeditorRunResponse> {
  let formatted = statements
  try {
    formatted = formatSql(statements)
  } catch (e) {}
  if (options?.debug ?? true) {
    console.log('Evaluate: %s', formatted)
  }
  const r = await client.getInstance().queryEditorRun({
    statements: statements,
    max_rows: options?.maxRows ?? 2000,
  })
  if (r?.data?.error_msg) {
    let errMsg = r.data.error_msg
    if (options?.debug ?? true) {
      errMsg =
        'Execute SQL statement failed.\n\n' +
        formatted +
        '\n\nMessage: ' +
        errMsg
    }
    throw new Error(errMsg)
  }
  return r.data
}

export async function evalSqlObj(
  statements: string,
  options?: IEvalSqlOptions
): Promise<any[]> {
  const r = await evalSql(statements, options)
  const cn = (r.column_names ?? []).map((n) => n.toUpperCase())
  return r.rows?.map((row) => _.zipObject(cn, row)) ?? []
}

export const parseColumnRelatedValues = (values: any) => {
  const { typeName, length, decimals, isNotNull, isUnsigned } = values

  const fieldType: NewColumnFieldTypeDefinition = {
    typeName,
    length,
    decimals,
    isNotNull,
    isUnsigned,
  }

  delete values.typeName
  delete values.length
  delete values.decimals
  delete values.isNotNull
  delete values.isUnsigned

  return {
    ...values,
    ...{ fieldType },
  }
}
