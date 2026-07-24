import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ["ancient-drivable-cupping.ngrok-free.dev"],
    proxy: {
      "/predict": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
