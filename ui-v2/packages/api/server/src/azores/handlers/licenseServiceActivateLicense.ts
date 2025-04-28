import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LicenseServiceActivateLicenseContext } from '../index.context';
import { licenseServiceActivateLicenseBody,
licenseServiceActivateLicenseResponse } from '../index.zod';

const factory = createFactory();


export const licenseServiceActivateLicenseHandlers = factory.createHandlers(
zValidator('json', licenseServiceActivateLicenseBody),
zValidator('response', licenseServiceActivateLicenseResponse),
async (c: LicenseServiceActivateLicenseContext) => {

  },
);
