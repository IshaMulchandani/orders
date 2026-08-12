import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// Phase 6 fills in the full PWA manifest (icons, theme colors). Left
// minimal here so the plugin is wired up from day one without blocking
// earlier phases on icon assets.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Ordering System",
        short_name: "Orders",
        theme_color: "#0B2447",
        background_color: "#ffffff",
        display: "standalone",
        icons: [],
      },
      workbox: {
        // App-shell cached for instant load; API calls are not cached
        // here since order data must always be fresh (online-only).
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
});
