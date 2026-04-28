const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var companyId = "9b60bd0b-cb4e-4673-b34c-2cf4d60646ea";
  
  // 查所有 agents 的所有字段
  var agents = await sql`SELECT id, name, role, title, status, runtime_config, metadata FROM agents WHERE company_id = ${companyId}`;
  console.log("Agents:", agents.length);
  
  for (var a of agents) {
    console.log("\n=== Agent:", a.name, "===");
    console.log("role:", a.role);
    console.log("title:", a.title);
    console.log("status:", a.status);
    
    // 检查 runtime_config
    var rc = a.runtime_config;
    if (rc && typeof rc === 'object') {
      console.log("\nruntime_config keys:", Object.keys(rc).join(", "));
      for (var key of Object.keys(rc)) {
        var val = rc[key];
        if (typeof val === 'string' && val.length > 0) {
          console.log("  " + key + ":", val.substring(0, 200));
        }
      }
    }
    
    // 检查 metadata
    var m = a.metadata;
    if (m && typeof m === 'object') {
      console.log("\nmetadata keys:", Object.keys(m).join(", "));
      for (var key of Object.keys(m)) {
        var val = m[key];
        if (typeof val === 'string' && val.length > 0) {
          console.log("  " + key + ":", val.substring(0, 200));
        }
      }
    }
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
