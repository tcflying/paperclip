const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var companyId = "9b60bd0b-cb4e-4673-b34c-2cf4d60646ea";
  
  // 查 issues 的创建时间和 agent
  var issues = await sql`SELECT identifier, title, created_at FROM issues WHERE company_id = ${companyId} ORDER BY created_at`;
  console.log("Issues:", issues.length);
  for (var issue of issues) {
    console.log("  " + issue.identifier + ": " + issue.created_at);
  }
  
  // 查 heartbeat runs 的时间
  var runs = await sql`SELECT id, agent_id, status, created_at FROM heartbeat_runs WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT 10`;
  console.log("\nRecent runs:", runs.length);
  for (var run of runs) {
    console.log("  " + run.id.slice(0,8) + ": " + run.created_at + " agent:" + (run.agent_id || "").slice(0,8));
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
