const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  // 查 CMPAA 公司所有 agents 的 adapter 配置
  var agents = await sql`SELECT id, name, adapter_type, adapter_config FROM agents WHERE company_id = '9b60bd0b-cb4e-4673-b34c-2cf4d60646ea'`;
  console.log("Agents:");
  for (var a of agents) {
    var config = a.adapter_config || {};
    console.log("\n" + a.name + ":");
    console.log("  adapter_type:", a.adapter_type);
    console.log("  command:", config.command || "(default)");
    console.log("  model:", config.model || "(default)");
  }
  
  // 也查其他正常公司的 adapter 配置
  console.log("\n\n=== Other companies (DA, CMPA) ===");
  var otherCos = await sql`SELECT c.name, a.name as agent_name, a.adapter_type, a.adapter_config->>'command' as command FROM companies c JOIN agents a ON c.id = a.company_id WHERE a.role = 'ceo' ORDER BY c.created_at DESC LIMIT 5`;
  for (var row of otherCos) {
    console.log(row.name + " CEO: adapter=" + row.adapter_type + " command=" + (row.command || "(default)"));
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
