import { afterAll } from "vitest";

import { closeDatabase } from "@/lib/db/client";

delete process.env.DATABASE_URL;
process.env.PGLITE_DATA_DIR = "memory://";

afterAll(async () => {
  await closeDatabase();
});
