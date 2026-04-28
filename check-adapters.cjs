const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var companyId = "9b60bd0b-cb4e-4673-b34c-2cf4d60646ea";
  
  // 查所有 agents 的 adapter_type
  var agents = await sql`SELECT id, name, role, adapter_type FROM agents WHERE company_id = ${companyId}`;
  console.log("Agents:");
  for (var a of agents) {
    console.log("  " + a.name + " (" + a.role + "): adapter_type = " + a.adapter_type);
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
