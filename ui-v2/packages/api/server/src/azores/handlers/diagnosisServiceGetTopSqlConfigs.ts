import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetTopSqlConfigsContext } from '../index.context';
import { diagnosisServiceGetTopSqlConfigsParams,
diagnosisServiceGetTopSqlConfigsResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetTopSqlConfigsHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetTopSqlConfigsParams),
zValidator('response', diagnosisServiceGetTopSqlConfigsResponse),
async (c: DiagnosisServiceGetTopSqlConfigsContext) => {

  },
);
