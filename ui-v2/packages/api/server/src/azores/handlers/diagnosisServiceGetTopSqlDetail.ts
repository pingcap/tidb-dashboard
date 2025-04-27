import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetTopSqlDetailContext } from '../index.context';
import { diagnosisServiceGetTopSqlDetailParams,
diagnosisServiceGetTopSqlDetailQueryParams,
diagnosisServiceGetTopSqlDetailResponse } from '../index.zod';

import statementDetailData from '../sample-res/statement-plans-detail.json'

const factory = createFactory();


export const diagnosisServiceGetTopSqlDetailHandlers = factory.createHandlers(
// zValidator('param', diagnosisServiceGetTopSqlDetailParams),
// zValidator('query', diagnosisServiceGetTopSqlDetailQueryParams),
zValidator('response', diagnosisServiceGetTopSqlDetailResponse),
async (c: DiagnosisServiceGetTopSqlDetailContext) => {
    return c.json(statementDetailData)
  },
);
