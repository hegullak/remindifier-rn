import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/drizzle",
  dialect: "sqlite",
  strict: true,
  verbose: true,
});
