const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  var daId = "7ed6fcfe-3586-485b-a2bd-bf97806648ed";
  var issueId = "7228437f-5597-4501-b63d-96b20bf9d313";

  var runs = await sql`SELECT id, status, result_json, stdout_excerpt, created_at FROM heartbeat_runs WHERE company_id = ${daId} ORDER BY created_at DESC LIMIT 3`;
  
  for (var run of runs) {
    console.log("\nRun:", run.id.slice(0,8), "status:", run.status, "at:", run.created_at.toISOString().substring(0,19));
    var rj = run.result_json || {};
    var summary = rj.summary || "";
    var garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪"];
    var garbled = false;
    for (var gc of garbledChars) {
      if (String(summary).includes(gc)) { garbled = true; break; }
    }
    console.log("  summary garbled=" + garbled);
    console.log("  summary: " + String(summary).substring(0, 200));
  }

  var comments = await sql`SELECT id, body, author_agent_id, created_at FROM issue_comments WHERE issue_id = ${issueId} ORDER BY created_at DESC LIMIT 5`;
  console.log("\n=== Latest comments ===");
  for (var c of comments) {
    var body = c.body || "";
    var garbled = false;
    for (var gc of ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪"]) {
      if (body.includes(gc)) { garbled = true; break; }
    }
    console.log("  " + c.created_at.toISOString().substring(0,19) + " garbled=" + garbled + " agent=" + (c.author_agent_id ? "yes" : "no") + ": " + body.substring(0, 100));
  }

  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
