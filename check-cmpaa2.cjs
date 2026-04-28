const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var companyId = "9b60bd0b-cb4e-4673-b34c-2cf4d60646ea";
  
  // 查 agents
  var agents = await sql`SELECT id, name, instructions FROM agents WHERE company_id = ${companyId}`;
  console.log("Agents:", agents.length);
  for (var a of agents) {
    console.log("\nAgent:", a.name);
    console.log("  Raw instructions:", a.instructions);
    console.log("  Length:", (a.instructions || "").length);
    console.log("  First 100 chars:", (a.instructions || "").substring(0, 100));
  }
  
  // 查 issues
  var issues = await sql`SELECT id, identifier, title FROM issues WHERE company_id = ${companyId} ORDER BY identifier LIMIT 10`;
  console.log("\n\nIssues:", issues.length);
  for (var issue of issues) {
    console.log("  " + issue.identifier + ":", issue.title);
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
