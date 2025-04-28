import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetSlowQueryListContext } from '../index.context';
import { diagnosisServiceGetSlowQueryListParams,
diagnosisServiceGetSlowQueryListQueryParams,
diagnosisServiceGetSlowQueryListResponse } from '../index.zod';

import slowQueryListData from '../sample-res/slow-query-list.json'

const factory = createFactory();


export const diagnosisServiceGetSlowQueryListHandlers = factory.createHandlers(
// zValidator('param', diagnosisServiceGetSlowQueryListParams),
// zValidator('query', diagnosisServiceGetSlowQueryListQueryParams),
zValidator('response', diagnosisServiceGetSlowQueryListResponse),
async (c: DiagnosisServiceGetSlowQueryListContext) => {
    return c.json(slowQueryListData)
  },
);
