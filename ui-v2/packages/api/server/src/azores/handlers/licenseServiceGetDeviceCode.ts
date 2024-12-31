import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LicenseServiceGetDeviceCodeContext } from '../index.context';
import { licenseServiceGetDeviceCodeResponse } from '../index.zod';

const factory = createFactory();


export const licenseServiceGetDeviceCodeHandlers = factory.createHandlers(
zValidator('response', licenseServiceGetDeviceCodeResponse),
async (c: LicenseServiceGetDeviceCodeContext) => {

  },
);
