import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { LicenseServiceActivateFreeLicenseContext } from '../index.context';
import { licenseServiceActivateFreeLicenseResponse } from '../index.zod';

const factory = createFactory();


export const licenseServiceActivateFreeLicenseHandlers = factory.createHandlers(
zValidator('response', licenseServiceActivateFreeLicenseResponse),
async (c: LicenseServiceActivateFreeLicenseContext) => {

  },
);
