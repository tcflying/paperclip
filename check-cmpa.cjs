const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var companies = await sql`SELECT id, name FROM companies WHERE name = 'CMPA' OR name LIKE '%CMPA%'`;
  console.log("Companies:", JSON.stringify(companies));
  
  if (companies.length > 0) {
    var companyId = companies[0].id;
    
    var agents = await sql`SELECT id, name FROM agents WHERE company_id = ${companyId} AND name LIKE '%content%'`;
    console.log("Agents:", JSON.stringify(agents));
    
    if (agents.length > 0) {
      var agentId = agents[0].id;
      
      var runs = await sql`SELECT id, status, result_json, created_at FROM heartbeat_runs WHERE agent_id = ${agentId} ORDER BY created_at DESC LIMIT 5`;
      console.log("Recent runs:", runs.length);
      
      for (var run of runs) {
        console.log("\nRun:", run.id.slice(0,8), "status:", run.status, "at:", run.created_at);
        var rj = run.result_json || {};
        var summary = rj.summary || "";
        console.log("  summary:", String(summary).substring(0, 200));
      }
    }
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
