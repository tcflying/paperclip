import postgres from "postgres";
const sql = postgres("postgres://paperclip:paperclip@localhost:54329/paperclip");

async function main() {
  // 获取 run 的日志
  const run = await sql`
    SELECT id, created_at, status, stdout, stderr 
    FROM heartbeat_runs 
    WHERE id = '370b1460-4ef7-49cf-8539-2cdd72f5e1a5'
  `;
  
  if (run.length > 0) {
    console.log("Run:", JSON.stringify(run[0], null, 2));
  } else {
    console.log("Run not found");
  }
  
  await sql.end();
}
main().catch(console.error);
