import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetTopSqlAvailableFieldsContext } from '../index.context';
import { diagnosisServiceGetTopSqlAvailableFieldsParams,
diagnosisServiceGetTopSqlAvailableFieldsResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetTopSqlAvailableFieldsHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetTopSqlAvailableFieldsParams),
zValidator('response', diagnosisServiceGetTopSqlAvailableFieldsResponse),
async (c: DiagnosisServiceGetTopSqlAvailableFieldsContext) => {

  },
);
