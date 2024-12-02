import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      generatedRouteTree: "./src/router/routeTree.gen.ts",
    }),
    react(),
  ],
})
