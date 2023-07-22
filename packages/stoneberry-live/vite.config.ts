import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import remapImports from "rollup-plugin-remap-imports";
import typeFiles from "rollup-plugin-typefiles";

export default defineConfig({
  plugins: [react(), remapImports(process.env.PWD), typeFiles(process.env.PWD)],
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
