import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceUnbindSqlPlanContext } from '../index.context';
import { diagnosisServiceUnbindSqlPlanParams,
diagnosisServiceUnbindSqlPlanQueryParams,
diagnosisServiceUnbindSqlPlanResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceUnbindSqlPlanHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceUnbindSqlPlanParams),
zValidator('query', diagnosisServiceUnbindSqlPlanQueryParams),
zValidator('response', diagnosisServiceUnbindSqlPlanResponse),
async (c: DiagnosisServiceUnbindSqlPlanContext) => {

    return c.json({})
  },
);
