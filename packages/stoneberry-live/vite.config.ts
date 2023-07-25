import react from "@vitejs/plugin-react";
import sourceFiles from "rollup-plugin-sourcefiles";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), sourceFiles(process.env.PWD)],
  build: {
    cssCodeSplit: false,
    lib: {
      formats: ["es", "cjs"],
      entry: "src/StoneberryLive.tsx",
      name: "StoneberryLive",
      fileName: "StoneberryLive",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "monaco-editor",
        "@monaco-editor/react",
        "thimbleberry",
        "stoneberry",
        "sucrase",
        "code-example",
      ],
    },
  },
});
