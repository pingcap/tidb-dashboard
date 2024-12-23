import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { UserServiceChangePasswordContext } from '../index.context';
import { userServiceChangePasswordBody,
userServiceChangePasswordResponse } from '../index.zod';

const factory = createFactory();


export const userServiceChangePasswordHandlers = factory.createHandlers(
zValidator('json', userServiceChangePasswordBody),
zValidator('response', userServiceChangePasswordResponse),
async (c: UserServiceChangePasswordContext) => {

  },
);
