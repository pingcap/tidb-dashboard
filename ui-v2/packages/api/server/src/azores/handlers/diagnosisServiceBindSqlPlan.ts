import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceBindSqlPlanContext } from '../index.context';
import { diagnosisServiceBindSqlPlanParams,
diagnosisServiceBindSqlPlanResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceBindSqlPlanHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceBindSqlPlanParams),
zValidator('response', diagnosisServiceBindSqlPlanResponse),
async (c: DiagnosisServiceBindSqlPlanContext) => {
    return c.json({})
  },
);
