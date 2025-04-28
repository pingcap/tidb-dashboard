import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceGetTopSqlAvailableAdvancedFiltersContext } from '../index.context';
import { diagnosisServiceGetTopSqlAvailableAdvancedFiltersParams,
diagnosisServiceGetTopSqlAvailableAdvancedFiltersResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceGetTopSqlAvailableAdvancedFiltersHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceGetTopSqlAvailableAdvancedFiltersParams),
zValidator('response', diagnosisServiceGetTopSqlAvailableAdvancedFiltersResponse),
async (c: DiagnosisServiceGetTopSqlAvailableAdvancedFiltersContext) => {

  },
);
