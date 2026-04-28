const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var runs = await sql`SELECT id, agent_id, status, result_json, stdout_excerpt, created_at, log_store, log_ref FROM heartbeat_runs WHERE id = '86077ca2-14a8-4d39-9736-3fc5ad85fbbb'`;
  
  if (runs.length === 0) {
    console.log("Run not found");
    await sql.end();
    return;
  }
  
  var run = runs[0];
  console.log("Run:", run.id);
  console.log("Status:", run.status);
  console.log("Agent:", run.agent_id);
  console.log("Log store:", run.log_store);
  console.log("Log ref:", run.log_ref);
  console.log("Created:", run.created_at);
  
  var rj = run.result_json || {};
  console.log("\nResult JSON keys:", Object.keys(rj).join(", "));
  console.log("Summary:", JSON.stringify(rj.summary).substring(0, 500));
  
  var stdout = run.stdout_excerpt || "";
  console.log("\nStdout excerpt length:", stdout.length);
  
  if (stdout.length > 0) {
    var buf = Buffer.from(stdout, "utf8");
    console.log("Stdout HEX preview:", buf.slice(0, 100).toString("hex"));
    console.log("Stdout text preview:", stdout.substring(0, 500));
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
