const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  const runId = "86077ca2-14a8-4d39-9736-3fc5ad85fbbb";
  
  const runs = await sql`SELECT id, agent_id, status, result_json, stdout_excerpt, created_at FROM heartbeat_runs WHERE id = ${runId}`;
  
  if (runs.length === 0) {
    console.log("Run not found");
    await sql.end();
    return;
  }
  
  const run = runs[0];
  console.log("Run:", run.id);
  console.log("Status:", run.status);
  console.log("Created:", run.created_at);
  
  const rj = run.result_json || {};
  const summary = rj.summary || "";
  const result = rj.result || "";
  
  console.log("\n=== SUMMARY ===");
  console.log(summary.substring(0, 2000));
  
  console.log("\n=== RESULT ===");
  console.log(String(result).substring(0, 2000));
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
