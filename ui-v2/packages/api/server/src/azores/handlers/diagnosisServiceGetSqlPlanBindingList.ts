import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetSqlPlanBindingListContext } from '../index.context';
import {
  diagnosisServiceGetSqlPlanBindingListParams,
  diagnosisServiceGetSqlPlanBindingListQueryParams,
  diagnosisServiceGetSqlPlanBindingListResponse
} from '../index.zod';

import plansListData from '../sample-res/statement-plans-list.json'

const factory = createFactory();


export const diagnosisServiceGetSqlPlanBindingListHandlers = factory.createHandlers(
  zValidator('param', diagnosisServiceGetSqlPlanBindingListParams),
  zValidator('query', diagnosisServiceGetSqlPlanBindingListQueryParams),
  zValidator('response', diagnosisServiceGetSqlPlanBindingListResponse),
  async (c: DiagnosisServiceGetSqlPlanBindingListContext) => {

    const plansDigest = plansListData.data.map((plan) => {
      return {
        planDigest: plan.plan_digest
      }
    })
    return c.json({
      data: plansDigest
    })
  },
);
