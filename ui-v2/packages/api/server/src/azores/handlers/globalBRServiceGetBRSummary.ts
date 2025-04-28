import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { GlobalBRServiceGetBRSummaryContext } from '../index.context';
import { globalBRServiceGetBRSummaryQueryParams,
globalBRServiceGetBRSummaryResponse } from '../index.zod';

const factory = createFactory();


export const globalBRServiceGetBRSummaryHandlers = factory.createHandlers(
zValidator('query', globalBRServiceGetBRSummaryQueryParams),
zValidator('response', globalBRServiceGetBRSummaryResponse),
async (c: GlobalBRServiceGetBRSummaryContext) => {

  },
);
