const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  // 查 CMPA-16 的完整内容
  var issues = await sql`SELECT id, identifier, title, description FROM issues WHERE identifier = 'CMPA-16'`;
  
  for (var issue of issues) {
    console.log("Title:", issue.title);
    console.log("\nDescription:", issue.description);
    console.log("\nDescription bytes (hex):", Buffer.from(issue.description || "", "utf8").slice(0, 100).toString("hex"));
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
