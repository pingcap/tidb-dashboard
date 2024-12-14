import { createFactory } from "hono/factory"
import { zValidator } from "../index.validator"
import { UserServiceUpdateUserContext } from "../index.context"
import {
  userServiceUpdateUserParams,
  userServiceUpdateUserBody,
  userServiceUpdateUserResponse,
} from "../index.zod"

const factory = createFactory()

export const userServiceUpdateUserHandlers = factory.createHandlers(
  zValidator("param", userServiceUpdateUserParams),
  zValidator("json", userServiceUpdateUserBody),
  zValidator("response", userServiceUpdateUserResponse),
  async (c: UserServiceUpdateUserContext) => {},
)
