const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");

  const runs = await sql`SELECT id, stdout_excerpt FROM heartbeat_runs WHERE id::text LIKE 'd000bbed%'`;
  const stdout = runs[0].stdout_excerpt || "";
  
  var idx = stdout.indexOf('"command":"curl');
  if (idx >= 0) {
    console.log("=== CURL COMMAND at", idx, "===");
    var end = stdout.indexOf('",', idx + 10);
    if (end < 0) end = idx + 2000;
    console.log(stdout.substring(idx, Math.min(end + 1, idx + 3000)));
  }

  idx = stdout.indexOf('"command":"curl', idx + 100);
  while (idx >= 0) {
    console.log("\n=== ANOTHER CURL at", idx, "===");
    var end = stdout.indexOf('",', idx + 10);
    if (end < 0) end = idx + 2000;
    console.log(stdout.substring(idx, Math.min(end + 1, idx + 3000)));
    idx = stdout.indexOf('"command":"curl', idx + 100);
  }

  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
