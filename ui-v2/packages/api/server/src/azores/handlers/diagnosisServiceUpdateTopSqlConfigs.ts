import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceUpdateTopSqlConfigsContext } from '../index.context';
import { diagnosisServiceUpdateTopSqlConfigsParams,
diagnosisServiceUpdateTopSqlConfigsBody,
diagnosisServiceUpdateTopSqlConfigsResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceUpdateTopSqlConfigsHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceUpdateTopSqlConfigsParams),
zValidator('json', diagnosisServiceUpdateTopSqlConfigsBody),
zValidator('response', diagnosisServiceUpdateTopSqlConfigsResponse),
async (c: DiagnosisServiceUpdateTopSqlConfigsContext) => {

  },
);
