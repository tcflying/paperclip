const postgres = require("postgres");
const sql = postgres("postgres://paperclip:paperclip@localhost:54329/paperclip");

async function main() {
  const companies = await sql`SELECT id, name FROM companies LIMIT 20`;
  console.log("All companies:", companies.map(c => c.name));

  const cmpaaa = companies.find(c => c.name && (c.name.includes("CMPAAA") || c.name.includes("CMPAA")));
  if (cmpaaa) {
    console.log("\nCMPAAA Company:", cmpaaa);

    const agents = await sql`SELECT id, name, role, status, adapter_type FROM agents WHERE company_id = ${cmpaaa.id}`;
    console.log("\nAgents:", agents);

    if (agents.length > 0) {
      const runs = await sql`
        SELECT id, agent_id, status, error, created_at 
        FROM heartbeat_runs 
        WHERE agent_id = ${agents[0].id}
        ORDER BY created_at DESC
        LIMIT 5
      `;
      console.log("\nRecent runs:", runs);
    }
  }

  await sql.end();
}
main().catch(console.error);
