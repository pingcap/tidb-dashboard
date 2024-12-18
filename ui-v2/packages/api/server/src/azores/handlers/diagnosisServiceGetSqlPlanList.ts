import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetSqlPlanListContext } from '../index.context';
import { diagnosisServiceGetSqlPlanListParams,
diagnosisServiceGetSqlPlanListQueryParams,
diagnosisServiceGetSqlPlanListResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetSqlPlanListHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetSqlPlanListParams),
zValidator('query', diagnosisServiceGetSqlPlanListQueryParams),
zValidator('response', diagnosisServiceGetSqlPlanListResponse),
async (c: DiagnosisServiceGetSqlPlanListContext) => {

  },
);
