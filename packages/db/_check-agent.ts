import postgres from "postgres";
const sql = postgres("postgres://paperclip:paperclip@localhost:54329/paperclip");

async function main() {
  const companyId = "dccefb46-6225-4fb4-92c8-969afc082740";
  
  const agents = await sql`
    SELECT id, name, role, status, adapter_type, adapter_config, company_id 
    FROM agents 
    WHERE company_id = ${companyId}
  `;
  console.log("CMPAAA Agents:", JSON.stringify(agents, null, 2));

  if (agents.length > 0) {
    for (const agent of agents) {
      console.log(`\n=== Agent: ${agent.name} (${agent.role}) ===`);
      console.log("Status:", agent.status);
      console.log("Adapter:", agent.adapter_type);
      
      // 检查最近的 heartbeat runs
      const runs = await sql`
        SELECT id, status, error, error_code, created_at 
        FROM heartbeat_runs 
        WHERE agent_id = ${agent.id}
        ORDER BY created_at DESC
        LIMIT 3
      `;
      console.log("Recent runs:", JSON.stringify(runs, null, 2));
    }
  }

  await sql.end();
}
main().catch(console.error);
