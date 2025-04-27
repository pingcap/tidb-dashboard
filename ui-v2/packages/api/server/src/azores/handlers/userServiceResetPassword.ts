import { createFactory } from 'hono/factory';
import { zValidator } from '../index.validator';
import { UserServiceResetPasswordContext } from '../index.context';
import { userServiceResetPasswordParams,
userServiceResetPasswordBody,
userServiceResetPasswordResponse } from '../index.zod';

const factory = createFactory();


export const userServiceResetPasswordHandlers = factory.createHandlers(
zValidator('param', userServiceResetPasswordParams),
zValidator('json', userServiceResetPasswordBody),
zValidator('response', userServiceResetPasswordResponse),
async (c: UserServiceResetPasswordContext) => {

  },
);
