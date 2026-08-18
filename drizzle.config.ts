import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig(
  databaseUrl
    ? {
        dialect: "postgresql",
        schema: "./src/lib/db/schema.ts",
        out: "./drizzle",
        dbCredentials: { url: databaseUrl },
        strict: true,
        verbose: true,
      }
    : {
        dialect: "postgresql",
        driver: "pglite",
        schema: "./src/lib/db/schema.ts",
        out: "./drizzle",
        dbCredentials: { url: process.env.PGLITE_DATA_DIR ?? "./.data/pglite" },
        strict: true,
        verbose: true,
      },
);
