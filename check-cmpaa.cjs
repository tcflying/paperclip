const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  // 找 CMPAA 公司
  var companies = await sql`SELECT id, name, issue_prefix FROM companies WHERE issue_prefix = 'CMPAA' OR name LIKE '%CMPAA%'`;
  console.log("Companies:", JSON.stringify(companies, null, 2));
  
  if (companies.length > 0) {
    var companyId = companies[0].id;
    
    // 查 agents
    var agents = await sql`SELECT id, name, description FROM agents WHERE company_id = ${companyId}`;
    console.log("\nAgents:", agents.length);
    for (var a of agents) {
      console.log("\nAgent:", a.name);
      console.log("  Raw:", a.description);
      console.log("  Length:", (a.description || "").length);
    }
    
    // 查 issues
    var issues = await sql`SELECT id, identifier, title FROM issues WHERE company_id = ${companyId} LIMIT 10`;
    console.log("\nIssues:", issues.length);
    for (var issue of issues) {
      console.log("\n  " + issue.identifier + ":", issue.title);
    }
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
