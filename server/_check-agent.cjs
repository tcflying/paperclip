const postgres = require("postgres");
const sql = postgres("postgres://paperclip:paperclip@localhost:54329/paperclip");

async function main() {
  const companies = await sql`SELECT id, name FROM companies LIMIT 50`;
  console.log("All companies:");
  companies.forEach(c => console.log(`  ${c.id}: ${c.name}`));

  const cmpaaa = companies.find(c => c.name && (c.name.includes("CMPAAA") || c.name.includes("CMPAA")));
  if (cmpaaa) {
    console.log("\nFound:", cmpaaa.name);
    
    const agents = await sql`SELECT id, name, role, status, adapter_type, adapter_config FROM agents WHERE company_id = ${cmpaaa.id}`;
    console.log("\nAgents:", JSON.stringify(agents, null, 2));
  }

  await sql.end();
}
main().catch(console.error);
