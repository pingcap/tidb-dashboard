import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LabelServiceGetLabelWithBindingsContext } from '../index.context';
import { labelServiceGetLabelWithBindingsParams,
labelServiceGetLabelWithBindingsResponse } from '../index.zod';

const factory = createFactory();


export const labelServiceGetLabelWithBindingsHandlers = factory.createHandlers(
zValidator('param', labelServiceGetLabelWithBindingsParams),
zValidator('response', labelServiceGetLabelWithBindingsResponse),
async (c: LabelServiceGetLabelWithBindingsContext) => {

  },
);
