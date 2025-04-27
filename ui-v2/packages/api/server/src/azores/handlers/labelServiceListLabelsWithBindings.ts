import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceListLabelsWithBindingsContext } from '../index.context';
import { labelServiceListLabelsWithBindingsQueryParams,
labelServiceListLabelsWithBindingsResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceListLabelsWithBindingsHandlers = factory.createHandlers(
zValidator('query', labelServiceListLabelsWithBindingsQueryParams),
zValidator('response', labelServiceListLabelsWithBindingsResponse),
async (c: LabelServiceListLabelsWithBindingsContext) => {

  },
);
