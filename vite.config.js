import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const base = isGitHubPages ? "/pitchpilot-generator/" : "/";

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    sourcemap: "hidden",
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          calcEngine: ["./src/calcEngine.js"],
        },
      },
    },
  },
});
