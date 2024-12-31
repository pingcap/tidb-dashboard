import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LicenseServiceGetLicenseContext } from '../index.context';
import { licenseServiceGetLicenseResponse } from '../index.zod';

const factory = createFactory();


export const licenseServiceGetLicenseHandlers = factory.createHandlers(
zValidator('response', licenseServiceGetLicenseResponse),
async (c: LicenseServiceGetLicenseContext) => {

  },
);
