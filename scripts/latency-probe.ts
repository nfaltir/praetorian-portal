/*
  Measures what one database round trip costs from this machine, to find
  out how much of a slow page is network distance vs. app code.

    npm run probe

  Read-only: runs SELECT 1 and a few small reads. Changes nothing.
*/
import { Pool } from "pg";

const ms = (start: bigint) => Number(process.hrtime.bigint() - start) / 1e6;
const fmt = (n: number) => `${n.toFixed(0).padStart(5)} ms`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  console.log(`Database: ${new URL(url).host}\n`);

  // 1. A brand-new connection: TCP + TLS + Postgres login
  const pool = new Pool({ connectionString: url, max: 1 });
  let t = process.hrtime.bigint();
  const client = await pool.connect();
  const firstConnect = ms(t);
  console.log(`New connection (TCP + TLS + login): ${fmt(firstConnect)}`);

  // 2. Round trips on that warm connection
  const trips: number[] = [];
  for (let i = 0; i < 10; i++) {
    t = process.hrtime.bigint();
    await client.query("SELECT 1");
    trips.push(ms(t));
  }
  const sorted = [...trips].sort((a, b) => a - b);
  const median = sorted[5]!;
  console.log(`Warm round trip (SELECT 1), median of 10: ${fmt(median)}   (min ${sorted[0]!.toFixed(0)}, max ${sorted[9]!.toFixed(0)})`);

  // 3. A real query the dashboard runs
  t = process.hrtime.bigint();
  await client.query('SELECT id, name, target_cents FROM "user"');
  console.log(`Roster query (warm): ${fmt(ms(t))}`);
  client.release();
  await pool.end();

  // 4. What happens after the app's pool lets connections go idle
  const pool2 = new Pool({ connectionString: url, max: 5 });
  t = process.hrtime.bigint();
  await Promise.all(Array.from({ length: 4 }, () => pool2.query("SELECT 1")));
  console.log(`4 parallel queries on a cold pool: ${fmt(ms(t))}`);
  await pool2.end();

  console.log(`
How to read this:
  A page that does N database steps one after another costs about
  N x ${median.toFixed(0)} ms of pure waiting from this machine, plus
  ${firstConnect.toFixed(0)} ms each time a connection has to be reopened.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});