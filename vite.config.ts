import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    tailwindcss(),
    tsconfigPaths(),
    react()
  ],
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: false
  }
});
