import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetTopSqlListContext } from '../index.context';
import { diagnosisServiceGetTopSqlListParams,
diagnosisServiceGetTopSqlListQueryParams,
diagnosisServiceGetTopSqlListResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetTopSqlListHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetTopSqlListParams),
zValidator('query', diagnosisServiceGetTopSqlListQueryParams),
zValidator('response', diagnosisServiceGetTopSqlListResponse),
async (c: DiagnosisServiceGetTopSqlListContext) => {

  },
);
