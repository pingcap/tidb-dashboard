import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceAddSqlLimitContext } from '../index.context';
import { diagnosisServiceAddSqlLimitParams,
diagnosisServiceAddSqlLimitBody,
diagnosisServiceAddSqlLimitResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceAddSqlLimitHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceAddSqlLimitParams),
zValidator('json', diagnosisServiceAddSqlLimitBody),
zValidator('response', diagnosisServiceAddSqlLimitResponse),
async (c: DiagnosisServiceAddSqlLimitContext) => {

  },
);
