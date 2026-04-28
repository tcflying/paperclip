import postgres from "postgres";

const sql = postgres("postgres://paperclip:paperclip@localhost:54329/paperclip");

async function main() {
  // 查找 CMPAAA 公司
  const companies = await sql`
    SELECT id, name FROM companies WHERE name ILIKE '%CMPAAA%' OR name ILIKE '%CMPA%' LIMIT 10
  `;
  console.log("Companies:", JSON.stringify(companies, null, 2));

  if (companies.length > 0) {
    const companyId = companies[0].id;
    console.log("\nCompany ID:", companyId);

    // 查找 agents
    const agents = await sql`
      SELECT id, name, role, status, adapter_type, adapter_config, created_at 
      FROM agents 
      WHERE company_id = ${companyId}
    `;
    console.log("\nAgents:", JSON.stringify(agents, null, 2));

    // 查找最近的 heartbeat runs
    const runs = await sql`
      SELECT id, agent_id, status, error, created_at 
      FROM heartbeat_runs 
      WHERE agent_id IN (${sql(agents.map(a => a.id))})
      ORDER BY created_at DESC
      LIMIT 5
    `;
    console.log("\nRecent runs:", JSON.stringify(runs, null, 2));
  }

  await sql.end();
}
main().catch(console.error);
