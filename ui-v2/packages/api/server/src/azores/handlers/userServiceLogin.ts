import { createFactory } from "hono/factory"
import { zValidator } from "../index.validator"
import { UserServiceLoginContext } from "../index.context"
import { userServiceLoginBody, userServiceLoginResponse } from "../index.zod"

const factory = createFactory()

export const userServiceLoginHandlers = factory.createHandlers(
  zValidator("json", userServiceLoginBody),
  zValidator("response", userServiceLoginResponse),
  async (c: UserServiceLoginContext) => {},
)
