import postgres from "postgres";
const sql = postgres("postgres://paperclip:paperclip@localhost:54329/paperclip");

async function main() {
  // 查看所有公司
  const companies = await sql`SELECT id, name FROM companies ORDER BY created_at DESC LIMIT 50`;
  console.log("All companies:");
  companies.forEach(c => console.log(`  ${c.id}: ${c.name}`));

  // 查找名称包含 CMPAAA 或 CMPAA 的公司
  const cmpa = await sql`SELECT id, name FROM companies WHERE name ILIKE '%CMPAA%' OR name ILIKE '%CMP%A%' LIMIT 10`;
  console.log("\nCMPAA companies:", JSON.stringify(cmpa, null, 2));

  await sql.end();
}
main().catch(console.error);
