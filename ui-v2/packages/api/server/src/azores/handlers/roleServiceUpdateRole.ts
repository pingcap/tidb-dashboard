import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { RoleServiceUpdateRoleContext } from '../index.context';
import { roleServiceUpdateRoleParams,
roleServiceUpdateRoleBody,
roleServiceUpdateRoleResponse } from '../index.zod';

const factory = createFactory();


export const roleServiceUpdateRoleHandlers = factory.createHandlers(
zValidator('param', roleServiceUpdateRoleParams),
zValidator('json', roleServiceUpdateRoleBody),
zValidator('response', roleServiceUpdateRoleResponse),
async (c: RoleServiceUpdateRoleContext) => {

  },
);
