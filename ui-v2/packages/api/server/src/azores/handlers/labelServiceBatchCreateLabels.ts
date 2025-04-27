import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceBatchCreateLabelsContext } from '../index.context';
import { labelServiceBatchCreateLabelsBody,
labelServiceBatchCreateLabelsResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceBatchCreateLabelsHandlers = factory.createHandlers(
zValidator('json', labelServiceBatchCreateLabelsBody),
zValidator('response', labelServiceBatchCreateLabelsResponse),
async (c: LabelServiceBatchCreateLabelsContext) => {

  },
);
