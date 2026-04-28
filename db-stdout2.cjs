const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");

  const runs = await sql`SELECT id, stdout_excerpt FROM heartbeat_runs WHERE id::text LIKE 'd000bbed%'`;
  if (runs.length === 0) { console.log("not found"); await sql.end(); return; }
  
  const stdout = runs[0].stdout_excerpt || "";
  
  console.log("Total stdout length:", stdout.length);
  
  var garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪"];
  var hasGarbled = false;
  for (var gc of garbledChars) {
    if (stdout.includes(gc)) { hasGarbled = true; break; }
  }
  console.log("Stdout has garbled:", hasGarbled);
  
  var idx = stdout.indexOf("PATCH");
  if (idx >= 0) {
    console.log("\n=== Found PATCH at", idx, "===");
    console.log(stdout.substring(Math.max(0, idx - 200), idx + 500));
  }
  
  idx = stdout.indexOf("comment");
  if (idx >= 0) {
    console.log("\n=== Found 'comment' at", idx, "===");
    console.log(stdout.substring(Math.max(0, idx - 100), idx + 500));
  }
  
  idx = stdout.indexOf("paperclip-issue-update");
  if (idx >= 0) {
    console.log("\n=== Found paperclip-issue-update at", idx, "===");
    console.log(stdout.substring(Math.max(0, idx - 200), idx + 800));
  }
  
  idx = stdout.indexOf("Bash");
  if (idx >= 0) {
    console.log("\n=== Found 'Bash' at", idx, "===");
    console.log(stdout.substring(Math.max(0, idx - 100), idx + 500));
  }

  console.log("\n=== LAST 3000 chars of stdout ===");
  console.log(stdout.substring(stdout.length - 3000));
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
