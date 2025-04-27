import { defineConfig } from "orval"

export default defineConfig({
  azores: {
    input: "./api-specs/azores.json",
    output: {
      target: "packages/api/client/src/azores/index.ts",
      schemas: "packages/api/client/src/azores/models",
      client: "react-query",
      mode: "tags-split",
      clean: true,
      prettier: true,
      override: {
        mutator: {
          path: "packages/api/client/src/http/client.ts",
          name: "httpClient",
        },
      },
    },
  },
  azoresHono: {
    input: "./api-specs/azores.json",
    output: {
      mode: "split",
      client: "hono",
      target: "packages/api/server/src/azores/index.ts",
      override: {
        hono: {
          handlers: "packages/api/server/src/azores/handlers",
        },
      },
    },
  },
})
