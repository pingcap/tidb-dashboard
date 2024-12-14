import { createFactory } from "hono/factory"
import { zValidator } from "../index.validator"
import { ApiKeyServiceDeleteApiKeyContext } from "../index.context"
import {
  apiKeyServiceDeleteApiKeyParams,
  apiKeyServiceDeleteApiKeyResponse,
} from "../index.zod"

const factory = createFactory()

export const apiKeyServiceDeleteApiKeyHandlers = factory.createHandlers(
  zValidator("param", apiKeyServiceDeleteApiKeyParams),
  zValidator("response", apiKeyServiceDeleteApiKeyResponse),
  async (c: ApiKeyServiceDeleteApiKeyContext) => {},
)
