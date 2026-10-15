import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    watch: {
      // 发布目录会在打包时重命名；监听这些产物会在 Windows 锁目录并触发无关热更新。
      ignored: ["**/release/**", "**/dist-electron/**", "**/output/**", "**/.playwright-cli/**"]
    }
  },
  optimizeDeps: {
    entries: ["index.html"]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@codemirror") || id.includes("node_modules/@lezer")) {
            return "codemirror";
          }

          if (id.includes("node_modules/prosemirror") || id.includes("node_modules/markdown-it")) {
            return "prosemirror";
          }

          return undefined;
        }
      }
    }
  }
});
