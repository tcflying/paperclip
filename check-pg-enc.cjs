const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  // 查 PostgreSQL 客户端和服务器编码
  var result = await sql`SELECT current_setting('client_encoding') as client_encoding, current_setting('server_encoding') as server_encoding`;
  console.log("PostgreSQL encoding:", JSON.stringify(result));
  
  // 查表列的编码
  var cols = await sql`SELECT column_name, character_set_name FROM information_schema.columns c WHERE table_name = 'issues' AND column_name IN ('title', 'description')`;
  console.log("Column charsets:", JSON.stringify(cols, null, 2));
  
  // 测试：读一个已知正确的记录
  var issues = await sql`SELECT identifier, title FROM issues WHERE identifier = 'CMPAA-1'`;
  console.log("\nCMPAA-1 (should be correct):", issues[0]?.title);
  
  // 读乱码记录
  issues = await sql`SELECT identifier, title FROM issues WHERE identifier = 'CMPAA-2'`;
  console.log("\nCMPAA-2 (garbled):", issues[0]?.title);
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
