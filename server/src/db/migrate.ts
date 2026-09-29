import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rebuildAuditChain } from "../modules/audit/service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: path.join(__dirname, "../../drizzle") });
  console.log("Migrations applied.");
  await pool.end();

  // Re-open via app client for chain helpers
  const { pool: appPool } = await import("./client.js");
  await rebuildAuditChain();
  console.log("Audit chain rebuild complete.");
  await appPool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
