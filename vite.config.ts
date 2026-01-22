import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    allowedHosts: ["eruditeaic.com", "www.eruditeaic.com"],
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase chunk size warning limit since highlight.js (~920KB) is inherently large
    // and already lazy-loaded on demand. It bundles syntax highlighting for all languages.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React core into its own chunk
          "vendor-react": ["react", "react-dom"],
          // Split routing into its own chunk
          "vendor-router": ["react-router-dom"],
          // Split markdown rendering into its own chunk
          "vendor-markdown": [
            "react-markdown",
            "remark-gfm",
            "rehype-highlight",
          ],
          // Split syntax highlighting (heavy) into its own chunk - lazy loaded
          "vendor-highlight": ["highlight.js"],
          // Split icons into their own chunk
          "vendor-icons": ["lucide-react"],
        },
      },
    },
  },
});
