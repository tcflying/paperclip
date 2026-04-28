const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var companyId = "9b60bd0b-cb4e-4673-b34c-2cf4d60646ea";
  
  // 查 CMPAA-2 issue
  var issues = await sql`SELECT id, identifier, title, description FROM issues WHERE company_id = ${companyId} AND identifier = 'CMPAA-2'`;
  
  for (var issue of issues) {
    console.log("=== CMPAA-2 ===");
    console.log("Title:", issue.title);
    console.log("Title length:", (issue.title || "").length);
    console.log("Title bytes (hex):", Buffer.from(issue.title || "", "utf8").toString("hex"));
    
    console.log("\nDescription:", issue.description ? issue.description.substring(0, 200) : "null");
    console.log("Description length:", (issue.description || "").length);
    if (issue.description) {
      console.log("Description bytes (hex):", Buffer.from(issue.description, "utf8").slice(0, 100).toString("hex"));
    }
  }
  
  // 查所有 issues
  issues = await sql`SELECT identifier, title FROM issues WHERE company_id = ${companyId} ORDER BY identifier`;
  console.log("\n\nAll issues:");
  for (var issue of issues) {
    console.log("  " + issue.identifier + ":", issue.title);
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
