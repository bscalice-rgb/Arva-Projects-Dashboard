// Runs `prisma migrate deploy` reliably against serverless Postgres (Neon on
// Vercel), where the injected DATABASE_URL is typically the POOLED endpoint
// and the compute may be cold:
//  - prefers an unpooled/direct URL when the platform provides one
//  - falls back to de-pooling a Neon "-pooler" hostname
//  - raises Prisma's 5s connect_timeout to ride out cold starts
//  - retries transient failures (P1002 timeouts) with backoff
// Queries at runtime still use DATABASE_URL as-is; this only affects migrations.

import { spawnSync } from "node:child_process";

function resolveMigrateUrl() {
  // Unpooled URLs injected by the Vercel/Neon integrations, in order of preference.
  const direct =
    process.env.DIRECT_DATABASE_URL ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING;
  let url = direct || process.env.DATABASE_URL;
  if (!url) {
    console.error("migrate-deploy: DATABASE_URL is not set.");
    process.exit(1);
  }

  try {
    const u = new URL(url);
    // Neon pooled hosts look like "<endpoint>-pooler.<region>.aws.neon.tech".
    // Migrations want the direct host.
    if (!direct && u.hostname.endsWith(".neon.tech")) {
      u.hostname = u.hostname.replace("-pooler.", ".");
      u.searchParams.delete("pgbouncer");
    }
    if (!u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", "30");
    }
    url = u.toString();
  } catch {
    // Not URL-parseable (unusual DSN form) — use it untouched.
  }
  return url;
}

function sleepSeconds(s) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, s * 1000);
}

const url = resolveMigrateUrl();
const attempts = 3;

for (let i = 1; i <= attempts; i++) {
  const res = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
  if (res.status === 0) process.exit(0);
  if (i < attempts) {
    const wait = i * 10;
    console.error(
      `migrate-deploy: attempt ${i} of ${attempts} failed; retrying in ${wait}s (serverless databases can be slow to wake)…`,
    );
    sleepSeconds(wait);
  }
}

console.error("migrate-deploy: all attempts failed.");
process.exit(1);
