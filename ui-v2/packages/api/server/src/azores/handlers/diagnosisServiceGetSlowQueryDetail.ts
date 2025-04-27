import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetSlowQueryDetailContext } from '../index.context';
import { diagnosisServiceGetSlowQueryDetailParams,
diagnosisServiceGetSlowQueryDetailQueryParams,
diagnosisServiceGetSlowQueryDetailResponse } from '../index.zod';

import slowQueryDetailData from '../sample-res/slow-query-detail.json'

const factory = createFactory();


export const diagnosisServiceGetSlowQueryDetailHandlers = factory.createHandlers(
// zValidator('param', diagnosisServiceGetSlowQueryDetailParams),
// zValidator('query', diagnosisServiceGetSlowQueryDetailQueryParams),
// zValidator('response', diagnosisServiceGetSlowQueryDetailResponse),
async (c: DiagnosisServiceGetSlowQueryDetailContext) => {
  return c.json(slowQueryDetailData)
  },
);
