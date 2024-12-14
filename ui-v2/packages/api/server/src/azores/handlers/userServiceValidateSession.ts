import { createFactory } from "hono/factory"
import { zValidator } from "../index.validator"
import { UserServiceValidateSessionContext } from "../index.context"
import { userServiceValidateSessionResponse } from "../index.zod"

const factory = createFactory()

export const userServiceValidateSessionHandlers = factory.createHandlers(
  zValidator("response", userServiceValidateSessionResponse),
  async (c: UserServiceValidateSessionContext) => {},
)
