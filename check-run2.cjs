const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  // 查所有 runs，按时间排序
  var runs = await sql`SELECT id, agent_id, status, created_at, result_json FROM heartbeat_runs WHERE company_id = '9b60bd0b-cb4e-4673-b34c-2cf4d60646ea' ORDER BY created_at DESC LIMIT 10`;
  
  console.log("Recent runs:", runs.length);
  for (var run of runs) {
    console.log("\nRun:", run.id.slice(0,8), "at", run.created_at);
    var rj = run.result_json || {};
    console.log("  summary:", String(rj.summary || "").substring(0, 100));
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
