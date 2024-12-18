import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetSqlLimitListContext } from '../index.context';
import { diagnosisServiceGetSqlLimitListParams,
diagnosisServiceGetSqlLimitListQueryParams,
diagnosisServiceGetSqlLimitListResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetSqlLimitListHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetSqlLimitListParams),
zValidator('query', diagnosisServiceGetSqlLimitListQueryParams),
zValidator('response', diagnosisServiceGetSqlLimitListResponse),
async (c: DiagnosisServiceGetSqlLimitListContext) => {

  },
);
