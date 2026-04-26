import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` MUST match the GitHub Pages subpath ("/middle-earth-dm-screen/").
// If you ever rename the repo, update this string.
export default defineConfig({
  base: "/middle-earth-dm-screen/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false
  }
});
