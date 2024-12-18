import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceCheckSqlLimitSupportContext } from '../index.context';
import { diagnosisServiceCheckSqlLimitSupportParams,
diagnosisServiceCheckSqlLimitSupportResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceCheckSqlLimitSupportHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceCheckSqlLimitSupportParams),
zValidator('response', diagnosisServiceCheckSqlLimitSupportResponse),
async (c: DiagnosisServiceCheckSqlLimitSupportContext) => {

  },
);
