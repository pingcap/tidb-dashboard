import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetSqlPlanBindingListContext } from '../index.context';
import { diagnosisServiceGetSqlPlanBindingListParams,
diagnosisServiceGetSqlPlanBindingListQueryParams,
diagnosisServiceGetSqlPlanBindingListResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetSqlPlanBindingListHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetSqlPlanBindingListParams),
zValidator('query', diagnosisServiceGetSqlPlanBindingListQueryParams),
zValidator('response', diagnosisServiceGetSqlPlanBindingListResponse),
async (c: DiagnosisServiceGetSqlPlanBindingListContext) => {

  },
);
