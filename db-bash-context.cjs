const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");

  var daId = "7ed6fcfe-3586-485b-a2bd-bf97806648ed";

  var runs = await sql`SELECT id, agent_id, stdout_excerpt FROM heartbeat_runs WHERE company_id = ${daId} AND status = 'succeeded' ORDER BY created_at DESC LIMIT 3`;
  
  for (var run of runs) {
    var stdout = run.stdout_excerpt || "";
    var bashIdx = stdout.indexOf('"name":"Bash"');
    if (bashIdx >= 0) {
      var ctx = stdout.substring(Math.max(0, bashIdx - 100), bashIdx + 500);
      console.log("Run", run.id.slice(0,8), "Bash context:");
      console.log(ctx);
      console.log("---");
    }
  }

  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
