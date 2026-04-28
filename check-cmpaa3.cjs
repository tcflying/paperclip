const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  // 查 agents 表的列
  var cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'agents' ORDER BY ordinal_position`;
  console.log("Agent columns:", cols.map(c => c.column_name).join(", "));
  
  var companyId = "9b60bd0b-cb4e-4673-b34c-2cf4d60646ea";
  
  // 查所有列
  var agents = await sql`SELECT * FROM agents WHERE company_id = ${companyId} LIMIT 3`;
  console.log("\nAgents count:", agents.length);
  
  if (agents.length > 0) {
    var a = agents[0];
    console.log("\nAgent keys:", Object.keys(a).join(", "));
    
    for (var key of Object.keys(a)) {
      var val = a[key];
      if (typeof val === 'string' && val.length > 0) {
        console.log("\n" + key + ":");
        console.log("  " + val.substring(0, 200));
      }
    }
  }
  
  // 查 issues
  var issues = await sql`SELECT identifier, title FROM issues WHERE company_id = ${companyId} ORDER BY identifier LIMIT 10`;
  console.log("\n\nIssues:");
  for (var issue of issues) {
    console.log("  " + issue.identifier + ":", issue.title);
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
