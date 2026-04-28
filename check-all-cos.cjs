const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var companies = await sql`SELECT id, name, issue_prefix FROM companies ORDER BY created_at DESC LIMIT 20`;
  console.log("All companies:", companies.length);
  for (var c of companies) {
    console.log("  " + c.name + " prefix=" + c.issue_prefix + " id=" + c.id.slice(0,8));
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
