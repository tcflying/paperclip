const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var companyId = "dccefb46-6225-4fb4-92c8-969afc082740";
  
  var agents = await sql`SELECT id, name FROM agents WHERE company_id = ${companyId}`;
  console.log("Agents:", agents.length);
  for (var a of agents) {
    console.log("  " + a.name + " id=" + a.id);
  }
  
  var runs = await sql`SELECT id, agent_id, status, result_json, created_at FROM heartbeat_runs WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT 10`;
  console.log("\nRecent runs:", runs.length);
  
  for (var run of runs) {
    var rj = run.result_json || {};
    var summary = rj.summary || "";
    console.log("\nRun:", run.id.slice(0,8), "agent:", run.agent_id.slice(0,8), "status:", run.status, "at:", run.created_at.toISOString().substring(0,19));
    
    var garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪"];
    var garbled = false;
    for (var gc of garbledChars) {
      if (String(summary).includes(gc)) { garbled = true; break; }
    }
    console.log("  garbled=" + garbled + " summary:", String(summary).substring(0, 200));
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
