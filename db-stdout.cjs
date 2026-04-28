const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");

  const runs = await sql`SELECT id, result_json, stdout_excerpt FROM heartbeat_runs WHERE id::text LIKE 'd000bbed%'`;
  if (runs.length === 0) { console.log("not found"); await sql.end(); return; }
  
  const run = runs[0];
  const rj = run.result_json || {};
  
  console.log("=== RESULT JSON ===");
  console.log("summary:", JSON.stringify(rj.summary).substring(0, 500));
  console.log("result:", JSON.stringify(rj.result).substring(0, 500));
  
  console.log("\n=== STDOUT EXCERPT (first 3000 chars) ===");
  console.log((run.stdout_excerpt || "").substring(0, 3000));
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
