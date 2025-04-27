import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceCheckSqlPlanSupportContext } from '../index.context';
import { diagnosisServiceCheckSqlPlanSupportParams,
diagnosisServiceCheckSqlPlanSupportResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceCheckSqlPlanSupportHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceCheckSqlPlanSupportParams),
zValidator('response', diagnosisServiceCheckSqlPlanSupportResponse),
async (c: DiagnosisServiceCheckSqlPlanSupportContext) => {
    return c.json({isSupport: true})
  },
);
