import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceCreateLabelContext } from '../index.context';
import { labelServiceCreateLabelBody,
labelServiceCreateLabelResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceCreateLabelHandlers = factory.createHandlers(
zValidator('json', labelServiceCreateLabelBody),
zValidator('response', labelServiceCreateLabelResponse),
async (c: LabelServiceCreateLabelContext) => {

  },
);
