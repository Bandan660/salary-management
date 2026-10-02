import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for pure client logic (formatting, redirect safety). No DOM needed.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
