import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { DiagnosisServiceDownloadSlowQueryListContext } from '../index.context';
import { diagnosisServiceDownloadSlowQueryListParams,
diagnosisServiceDownloadSlowQueryListQueryParams,
diagnosisServiceDownloadSlowQueryListResponse } from '../index.zod';

const factory = createFactory();


export const diagnosisServiceDownloadSlowQueryListHandlers = factory.createHandlers(
zValidator('param', diagnosisServiceDownloadSlowQueryListParams),
zValidator('query', diagnosisServiceDownloadSlowQueryListQueryParams),
zValidator('response', diagnosisServiceDownloadSlowQueryListResponse),
async (c: DiagnosisServiceDownloadSlowQueryListContext) => {

  },
);
