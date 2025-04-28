import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { RoleServiceCreateRoleContext } from '../index.context';
import { roleServiceCreateRoleBody,
roleServiceCreateRoleResponse } from '../index.zod';

const factory = createFactory();


export const roleServiceCreateRoleHandlers = factory.createHandlers(
zValidator('json', roleServiceCreateRoleBody),
zValidator('response', roleServiceCreateRoleResponse),
async (c: RoleServiceCreateRoleContext) => {

  },
);
