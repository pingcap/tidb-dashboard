import { createFactory } from "hono/factory"
import { zValidator } from "../index.validator"
import { UserServiceLogoutContext } from "../index.context"
import { userServiceLogoutResponse } from "../index.zod"

const factory = createFactory()

export const userServiceLogoutHandlers = factory.createHandlers(
  zValidator("response", userServiceLogoutResponse),
  async (c: UserServiceLogoutContext) => {},
)
