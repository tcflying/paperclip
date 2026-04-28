const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  // 查各公司的 agents adapter
  var companies = await sql`SELECT c.id, c.name, a.adapter_type FROM companies c JOIN agents a ON c.id = a.company_id WHERE a.role = 'ceo' ORDER BY c.created_at DESC NULLS LAST LIMIT 10`;
  console.log("Recent companies CEO agents:");
  for (var row of companies) {
    console.log("  " + row.name + ": " + row.adapter_type);
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
