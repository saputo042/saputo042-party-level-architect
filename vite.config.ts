import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        mobile: "mobile.html",
      },
    },
  },
  server: {
    // vite単体dev時もWSをwrangler dev(8787)へ流す
    proxy: {
      "/ws": { target: "ws://localhost:8787", ws: true },
    },
  },
});
