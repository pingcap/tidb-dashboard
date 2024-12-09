import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [
      TanStackRouterVite({
        generatedRouteTree: "./src/router/routeTree.gen.ts",
      }),
      react(),
    ],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_SERVER,
          changeOrigin: true,
        },
      },
    },
  }
})
