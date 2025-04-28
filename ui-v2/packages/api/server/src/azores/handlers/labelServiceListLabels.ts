import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceListLabelsContext } from '../index.context';
import { labelServiceListLabelsQueryParams,
labelServiceListLabelsResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceListLabelsHandlers = factory.createHandlers(
zValidator('query', labelServiceListLabelsQueryParams),
zValidator('response', labelServiceListLabelsResponse),
async (c: LabelServiceListLabelsContext) => {

  },
);
